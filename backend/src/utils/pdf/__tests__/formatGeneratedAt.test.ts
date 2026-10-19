import { formatGeneratedAt } from '../document';

describe('formatGeneratedAt', () => {
  it('formats wall clock in America/Sao_Paulo (not bare UTC)', () => {
    // 14:00 UTC = 11:00 BRT
    const date = new Date('2026-10-19T14:00:00.000Z');
    const formatted = formatGeneratedAt(date);
    expect(formatted).toMatch(/Gerado em 19\/10\/2026 às 11:00/);
  });
});
