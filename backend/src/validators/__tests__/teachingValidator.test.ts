import {
  createTeachingClassSchema,
  saveTeachingAttendanceSchema,
  teachingLessonSeriesSchema,
  updateTeachingClassSchema,
  updateTeachingLessonSchema,
} from '../teachingValidator';

const baseCreate = {
  program_id: '11111111-1111-4111-8111-111111111111',
  congregation_id: '22222222-2222-4222-8222-222222222222',
  name: 'Turma 1',
  start_date: '2026-03-01',
  responsible_id: '33333333-3333-4333-8333-333333333333',
};

describe('createTeachingClassSchema', () => {
  it('accepts a class with required start_date and optional end_date', () => {
    const { error, value } = createTeachingClassSchema.validate({
      ...baseCreate,
      end_date: '2026-06-30',
    });
    expect(error).toBeUndefined();
    expect(value.start_date).toBe('2026-03-01');
    expect(value.end_date).toBe('2026-06-30');
  });

  it('rejects missing start_date', () => {
    const { program_id, congregation_id, name, responsible_id } = baseCreate;
    const { error } = createTeachingClassSchema.validate({
      program_id,
      congregation_id,
      name,
      responsible_id,
    });
    expect(error).toBeDefined();
  });

  it('rejects end_date before start_date', () => {
    const { error } = createTeachingClassSchema.validate({
      ...baseCreate,
      end_date: '2026-02-01',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/término/i);
  });
});

describe('updateTeachingClassSchema', () => {
  it('accepts clearing end_date', () => {
    const { error, value } = updateTeachingClassSchema.validate({ end_date: '' });
    expect(error).toBeUndefined();
    expect(value.end_date).toBe('');
  });

  it('rejects end_date before start_date when both are sent', () => {
    const { error } = updateTeachingClassSchema.validate({
      start_date: '2026-04-01',
      end_date: '2026-03-01',
    });
    expect(error).toBeDefined();
  });
});

describe('teachingLessonSeriesSchema', () => {
  const base = {
    title: 'Doutrina',
    start_time: '19:30',
    starts_on: '2026-09-14',
    ends_on: '2026-12-31',
  };

  it('accepts multiple weekly weekdays', () => {
    const { error } = teachingLessonSeriesSchema.validate({
      ...base,
      recurrence_type: 'weekly',
      weekdays: [1, 3, 5],
    });

    expect(error).toBeUndefined();
  });

  it('accepts monthly and custom interval rules', () => {
    expect(
      teachingLessonSeriesSchema.validate({
        ...base,
        recurrence_type: 'monthly',
        day_of_month: 31,
      }).error
    ).toBeUndefined();
    expect(
      teachingLessonSeriesSchema.validate({
        ...base,
        recurrence_type: 'interval_days',
        interval_days: 10,
      }).error
    ).toBeUndefined();
  });

  it('rejects missing conditional recurrence fields', () => {
    const { error } = teachingLessonSeriesSchema.validate({
      ...base,
      recurrence_type: 'weekly',
    });

    expect(error).toBeDefined();
  });

  it('rejects an inverted period', () => {
    const { error } = teachingLessonSeriesSchema.validate({
      ...base,
      starts_on: '2027-01-01',
      recurrence_type: 'monthly',
      day_of_month: 1,
    });

    expect(error?.message).toMatch(/data final/i);
  });
});

describe('updateTeachingLessonSchema', () => {
  it('allows recurrence only for following scope', () => {
    const recurrence = {
      recurrence_type: 'interval_days',
      starts_on: '2026-09-14',
      ends_on: '2026-10-14',
      interval_days: 7,
    };

    expect(
      updateTeachingLessonSchema.validate({ scope: 'following', recurrence }).error
    ).toBeUndefined();
    expect(
      updateTeachingLessonSchema.validate({ scope: 'single', recurrence }).error
    ).toBeDefined();
  });
});

describe('saveTeachingAttendanceSchema', () => {
  it('accepts batch attendance changes', () => {
    const { error } = saveTeachingAttendanceSchema.validate({
      changes: [
        {
          enrollment_id: '11111111-1111-4111-8111-111111111111',
          status: 'present',
        },
        {
          enrollment_id: '22222222-2222-4222-8222-222222222222',
          status: null,
        },
      ],
    });

    expect(error).toBeUndefined();
  });

  it('rejects overwrite without mark-all operation', () => {
    const { error } = saveTeachingAttendanceSchema.validate({
      changes: [],
      overwrite_absent: true,
    });

    expect(error).toBeDefined();
  });
});
