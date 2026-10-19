import { normalizeDateForDatabase, normalizeMemberDates } from '../dateNormalizer';

describe('normalizeDateForDatabase', () => {
  it('keeps YYYY-MM-DD civil dates unchanged', () => {
    expect(normalizeDateForDatabase('2015-03-01')).toBe('2015-03-01');
  });

  it('strips time from ISO strings without shifting the calendar day', () => {
    expect(normalizeDateForDatabase('2015-03-01T00:00:00.000Z')).toBe('2015-03-01');
    expect(normalizeDateForDatabase('2015-03-01T03:00:00.000Z')).toBe('2015-03-01');
  });
});

describe('normalizeMemberDates', () => {
  it('normalizes wedding_date alongside other civil dates', () => {
    const result = normalizeMemberDates({
      birth: '1990-05-10',
      wedding_date: '2015-03-01T00:00:00.000Z',
      admission_date: '2026-10-19',
    });
    expect(result.birth).toBe('1990-05-10');
    expect(result.wedding_date).toBe('2015-03-01');
    expect(result.admission_date).toBe('2026-10-19');
  });
});
