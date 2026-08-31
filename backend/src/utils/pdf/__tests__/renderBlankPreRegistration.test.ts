import { PassThrough } from 'stream';
import {
  buildPreRegistrationFilename,
  PRE_REGISTRATION_PDF_TITLE,
  renderBlankPreRegistrationPdf,
  slugifyChurchName,
} from '../renderBlankPreRegistration';

describe('renderBlankPreRegistration helpers', () => {
  it('should keep the PDF title as Ficha de pré-cadastro', () => {
    expect(PRE_REGISTRATION_PDF_TITLE).toBe('Ficha de pré-cadastro');
  });

  it('should slugify church names without accents or spaces', () => {
    expect(slugifyChurchName('Igreja São José')).toBe('igreja-sao-jose');
    expect(slugifyChurchName('')).toBe('igreja');
  });

  it('should build filename ficha-pre-cadastro-{slug}-{date}.pdf', () => {
    const date = new Date('2026-08-31T12:00:00.000Z');
    expect(buildPreRegistrationFilename('3ª IPI de Marília', date)).toBe(
      'ficha-pre-cadastro-3-ipi-de-marilia-2026-08-31.pdf'
    );
  });

  it('should stream a portrait A4 PDF of two pages', async () => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    Object.assign(stream, { setHeader: jest.fn(), headersSent: false });

    const finished = new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    renderBlankPreRegistrationPdf(stream as never, 'Igreja Teste');
    await finished;

    const pdf = Buffer.concat(chunks).toString('latin1');
    expect(pdf.startsWith('%PDF')).toBe(true);
    expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(pdf).toContain('/Count 2');
  });
});
