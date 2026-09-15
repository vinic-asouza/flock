import {
  createTeachingClassSchema,
  updateTeachingClassSchema,
  createTeachingMaterialSchema,
  updateTeachingMaterialSchema,
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

describe('createTeachingMaterialSchema', () => {
  it('accepts a valid link', () => {
    const { error, value } = createTeachingMaterialSchema.validate({
      type: 'link',
      title: 'Slides',
      url: 'https://example.com/slides',
    });
    expect(error).toBeUndefined();
    expect(value.type).toBe('link');
    expect(value.url).toBe('https://example.com/slides');
  });

  it('accepts a valid note', () => {
    const { error, value } = createTeachingMaterialSchema.validate({
      type: 'note',
      title: 'Lembrete',
      content: 'Trazer Bíblia',
    });
    expect(error).toBeUndefined();
    expect(value.type).toBe('note');
    expect(value.content).toBe('Trazer Bíblia');
  });

  it('rejects link without url', () => {
    const { error } = createTeachingMaterialSchema.validate({
      type: 'link',
      title: 'Slides',
    });
    expect(error).toBeDefined();
  });

  it('rejects javascript protocol', () => {
    const { error } = createTeachingMaterialSchema.validate({
      type: 'link',
      title: 'Bad',
      url: 'javascript:alert(1)',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/http/i);
  });

  it('rejects note without content', () => {
    const { error } = createTeachingMaterialSchema.validate({
      type: 'note',
      title: 'Lembrete',
    });
    expect(error).toBeDefined();
  });
});

describe('updateTeachingMaterialSchema', () => {
  it('rejects type changes', () => {
    const { error } = updateTeachingMaterialSchema.validate({
      type: 'note',
      title: 'X',
    });
    expect(error).toBeDefined();
  });

  it('accepts title-only update', () => {
    const { error, value } = updateTeachingMaterialSchema.validate({ title: 'Novo título' });
    expect(error).toBeUndefined();
    expect(value.title).toBe('Novo título');
  });
});
