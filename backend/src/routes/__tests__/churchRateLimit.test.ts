import express from 'express';
import type { Server } from 'http';
import {
  CHURCH_RATE_WINDOW_MS,
  CHURCH_READ_MAX,
  CHURCH_WRITE_MAX,
  createChurchReadLimiter,
  createChurchWriteLimiter,
} from '../churchRateLimit';

function appWithLimits(readMax: number, writeMax: number) {
  const app = express();
  app.use(createChurchReadLimiter(readMax));
  app.use(createChurchWriteLimiter(writeMax));
  app.all('/church', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

async function withServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>
) {
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function call(baseUrl: string, method: string) {
  const response = await fetch(`${baseUrl}/church`, { method });
  const text = await response.text();
  let body: { error?: string } = {};
  if (text) {
    body = JSON.parse(text) as { error?: string };
  }
  return { status: response.status, body };
}

describe('limites de /api/church', () => {
  it('mantém o teto de navegação nas leituras e o teto curto nas escritas', () => {
    expect(CHURCH_READ_MAX).toBe(600);
    expect(CHURCH_WRITE_MAX).toBe(40);
    expect(CHURCH_RATE_WINDOW_MS).toBe(15 * 60 * 1000);
    expect(CHURCH_READ_MAX).toBeGreaterThan(CHURCH_WRITE_MAX);
  });

  it('não conta leitura no limiter de escrita', async () => {
    await withServer(appWithLimits(2, 1), async (baseUrl) => {
      expect((await call(baseUrl, 'GET')).status).toBe(200);
      expect((await call(baseUrl, 'GET')).status).toBe(200);
      expect((await call(baseUrl, 'POST')).status).toBe(200);
    });
  });

  it('responde 429 na leitura seguinte ao teto, sem consumir escrita', async () => {
    await withServer(appWithLimits(2, 1), async (baseUrl) => {
      expect((await call(baseUrl, 'GET')).status).toBe(200);
      expect((await call(baseUrl, 'GET')).status).toBe(200);

      const blocked = await call(baseUrl, 'GET');
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe('Muitas consultas na igreja');

      expect((await call(baseUrl, 'PUT')).status).toBe(200);
    });
  });

  it('responde 429 na escrita seguinte ao teto, sem consumir leitura', async () => {
    await withServer(appWithLimits(2, 2), async (baseUrl) => {
      expect((await call(baseUrl, 'POST')).status).toBe(200);
      expect((await call(baseUrl, 'PUT')).status).toBe(200);

      const blocked = await call(baseUrl, 'POST');
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe('Muitas operações na igreja');

      expect((await call(baseUrl, 'GET')).status).toBe(200);
      expect((await call(baseUrl, 'HEAD')).status).toBe(200);
    });
  });

  it('não conta OPTIONS em nenhum dos dois limiters', async () => {
    await withServer(appWithLimits(1, 1), async (baseUrl) => {
      expect((await call(baseUrl, 'OPTIONS')).status).toBe(200);
      expect((await call(baseUrl, 'GET')).status).toBe(200);
      expect((await call(baseUrl, 'POST')).status).toBe(200);
    });
  });
});
