import { createTeachingClassSchema, updateTeachingClassSchema } from '../teachingValidator';

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
