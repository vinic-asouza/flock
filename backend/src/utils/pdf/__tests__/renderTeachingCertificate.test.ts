import { PassThrough } from 'stream';
import {
  buildCertificateFilename,
  renderTeachingCertificatePdf,
} from '../renderTeachingCertificate';

describe('renderTeachingCertificatePdf', () => {
  it('builds filename with slug and date', () => {
    expect(buildCertificateFilename('Turma Adultos', new Date('2026-09-15T12:00:00.000Z'))).toBe(
      'certificados-turma-adultos-2026-09-15.pdf'
    );
  });

  it('streams a landscape multipage PDF', async () => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    Object.assign(stream, { setHeader: jest.fn(), headersSent: false });

    const finished = new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    // Minimal 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );

    renderTeachingCertificatePdf(stream as never, {
      churchName: 'Igreja Teste',
      programName: 'EBD',
      className: 'Adultos',
      primaryColor: '#1E3A5F',
      secondaryColor: '#94A3B8',
      churchLogo: png,
      students: [{ display_name: 'Ana' }, { display_name: 'Bruno' }],
    });

    await finished;

    const pdf = Buffer.concat(chunks).toString('latin1');
    expect(pdf.startsWith('%PDF')).toBe(true);
    // Landscape A4 MediaBox
    expect(pdf).toContain('/MediaBox [0 0 841.89 595.28]');
    expect(pdf).toContain('/Count 2');
  });
});
