import { exportCalendarPdfSchema } from '../calendarValidator';

describe('exportCalendarPdfSchema', () => {
  it('should accept month and year as query strings', () => {
    const { error, value } = exportCalendarPdfSchema.validate({
      period: 'month',
      month: '8',
      year: '2026',
    });
    expect(error).toBeUndefined();
    expect(value.month).toBe(8);
    expect(value.year).toBe(2026);
  });

  it('should accept a single type or an array of types', () => {
    expect(exportCalendarPdfSchema.validate({ type: 'Evento' }).error).toBeUndefined();
    expect(
      exportCalendarPdfSchema.validate({ type: ['Evento', 'Reunião'] }).error
    ).toBeUndefined();
  });

  it('should reject an invalid type', () => {
    const { error } = exportCalendarPdfSchema.validate({ type: 'Aniversário' });
    expect(error).toBeDefined();
  });

  it('should reject month outside 1-12', () => {
    const { error } = exportCalendarPdfSchema.validate({ month: 13, year: 2026 });
    expect(error).toBeDefined();
  });

  it('should accept empty congregation_id as no filter', () => {
    const { error, value } = exportCalendarPdfSchema.validate({ congregation_id: '' });
    expect(error).toBeUndefined();
    expect(value.congregation_id).toBe('');
  });
});
