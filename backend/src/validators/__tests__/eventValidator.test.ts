import {
  createEventRegistrationSchema,
  createEventSchema,
  patchEventPublicLinkSchema,
  publicEventEnrollSchema,
  resolveEventRegistrationSchema,
  updateEventSchema,
} from '../eventValidator';
import {
  computeSpotsRemaining,
  isEventFull,
} from '../../services/eventCapacity';

const baseCreate = {
  name: 'Retiro de Jovens',
  starts_at: '2026-12-10T19:00:00.000Z',
  responsible_id: '33333333-3333-4333-8333-333333333333',
};

describe('createEventSchema', () => {
  it('accepts a minimal event and applies defaults', () => {
    const { error, value } = createEventSchema.validate(baseCreate);
    expect(error).toBeUndefined();
    expect(value.status).toBe('draft');
    expect(value.congregation_id).toBeNull();
    expect(value.capacity).toBeNull();
    expect(value.group_id).toBeNull();
    expect(value.organizer_ids).toEqual([]);
  });

  it('rejects ends_at before starts_at', () => {
    const { error } = createEventSchema.validate({
      ...baseCreate,
      ends_at: '2026-12-10T18:00:00.000Z',
    });
    expect(error).toBeDefined();
  });

  it('accepts ends_at equal to starts_at', () => {
    const { error } = createEventSchema.validate({
      ...baseCreate,
      ends_at: baseCreate.starts_at,
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid status and non-positive capacity', () => {
    expect(createEventSchema.validate({ ...baseCreate, status: 'foo' }).error).toBeDefined();
    expect(createEventSchema.validate({ ...baseCreate, capacity: 0 }).error).toBeDefined();
    expect(createEventSchema.validate({ ...baseCreate, capacity: null }).error).toBeUndefined();
  });

  it('rejects short name and missing starts_at', () => {
    expect(createEventSchema.validate({ ...baseCreate, name: 'A' }).error).toBeDefined();
    const { starts_at, ...rest } = baseCreate;
    expect(createEventSchema.validate(rest).error).toBeDefined();
  });
});

describe('updateEventSchema', () => {
  it('requires at least one field', () => {
    expect(updateEventSchema.validate({}).error).toBeDefined();
  });

  it('allows clearing congregation and group with null', () => {
    const { error } = updateEventSchema.validate({ congregation_id: null, group_id: null });
    expect(error).toBeUndefined();
  });
});

describe('createEventRegistrationSchema (member XOR guest)', () => {
  it('accepts a member registration', () => {
    const { error } = createEventRegistrationSchema.validate({
      type: 'member',
      member_id: '44444444-4444-4444-8444-444444444444',
    });
    expect(error).toBeUndefined();
  });

  it('accepts a guest registration', () => {
    const { error } = createEventRegistrationSchema.validate({
      type: 'guest',
      full_name: 'Maria Souza',
      whatsapp: '11999998888',
      birth_date: '1990-05-20',
    });
    expect(error).toBeUndefined();
  });

  it('rejects member mixed with guest fields', () => {
    const { error } = createEventRegistrationSchema.validate({
      type: 'member',
      member_id: '44444444-4444-4444-8444-444444444444',
      full_name: 'Maria Souza',
    });
    expect(error).toBeDefined();
  });

  it('rejects guest without birth_date', () => {
    const { error } = createEventRegistrationSchema.validate({
      type: 'guest',
      full_name: 'Maria Souza',
      whatsapp: '11999998888',
    });
    expect(error).toBeDefined();
  });
});

describe('resolveEventRegistrationSchema', () => {
  it('requires member_id for link_member and forbids it for keep_guest', () => {
    expect(resolveEventRegistrationSchema.validate({ action: 'link_member' }).error).toBeDefined();
    expect(
      resolveEventRegistrationSchema.validate({
        action: 'keep_guest',
        member_id: '44444444-4444-4444-8444-444444444444',
      }).error
    ).toBeDefined();
    expect(resolveEventRegistrationSchema.validate({ action: 'keep_guest' }).error).toBeUndefined();
  });
});

describe('publicEventEnrollSchema / link patch', () => {
  it('validates public enroll payload', () => {
    expect(
      publicEventEnrollSchema.validate({
        full_name: 'Maria Souza',
        whatsapp: '11999998888',
        birth_date: '1990-05-20',
      }).error
    ).toBeUndefined();
    expect(publicEventEnrollSchema.validate({ full_name: 'Maria Souza' }).error).toBeDefined();
  });

  it('requires is_active on link patch', () => {
    expect(patchEventPublicLinkSchema.validate({}).error).toBeDefined();
    expect(patchEventPublicLinkSchema.validate({ is_active: false }).error).toBeUndefined();
  });
});

describe('event capacity helpers', () => {
  it('computes spots remaining', () => {
    expect(computeSpotsRemaining(null, 10)).toBeNull();
    expect(computeSpotsRemaining(10, 3)).toBe(7);
    expect(computeSpotsRemaining(10, 12)).toBe(0);
  });

  it('detects full events', () => {
    expect(isEventFull(null, 100)).toBe(false);
    expect(isEventFull(5, 4)).toBe(false);
    expect(isEventFull(5, 5)).toBe(true);
  });
});
