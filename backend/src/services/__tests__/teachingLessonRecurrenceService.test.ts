import {
  TeachingRecurrenceError,
  expandTeachingRecurrence,
} from '../teachingLessonRecurrenceService';

describe('expandTeachingRecurrence', () => {
  it('expands multiple weekdays inside an inclusive range', () => {
    const result = expandTeachingRecurrence({
      type: 'weekly',
      startsOn: '2026-09-14',
      endsOn: '2026-09-23',
      weekdays: [1, 3],
    });

    expect(result).toEqual({
      dates: ['2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23'],
      skippedMonths: [],
    });
  });

  it('reports months that do not contain the selected day', () => {
    const result = expandTeachingRecurrence({
      type: 'monthly',
      startsOn: '2026-01-01',
      endsOn: '2026-04-30',
      dayOfMonth: 31,
    });

    expect(result.dates).toEqual(['2026-01-31', '2026-03-31']);
    expect(result.skippedMonths).toEqual(['2026-02', '2026-04']);
  });

  it('expands a custom interval from the start date', () => {
    const result = expandTeachingRecurrence({
      type: 'interval_days',
      startsOn: '2026-09-01',
      endsOn: '2026-09-10',
      intervalDays: 3,
    });

    expect(result.dates).toEqual([
      '2026-09-01',
      '2026-09-04',
      '2026-09-07',
      '2026-09-10',
    ]);
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      expandTeachingRecurrence({
        type: 'interval_days',
        startsOn: '2026-02-30',
        endsOn: '2026-03-10',
        intervalDays: 1,
      })
    ).toThrow(TeachingRecurrenceError);
  });

  it('enforces the occurrence ceiling', () => {
    expect(() =>
      expandTeachingRecurrence({
        type: 'interval_days',
        startsOn: '2026-01-01',
        endsOn: '2027-12-31',
        intervalDays: 1,
      })
    ).toThrow(/366/);
  });
});
