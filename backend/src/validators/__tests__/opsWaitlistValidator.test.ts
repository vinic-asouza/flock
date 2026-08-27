import { validateOpsWaitlistListQuery } from '../opsWaitlistValidator';

describe('validateOpsWaitlistListQuery', () => {
  it('should apply defaults for an empty query', () => {
    const { error, value } = validateOpsWaitlistListQuery({});

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    expect(value.q).toBeUndefined();
    expect(value.plan).toBeUndefined();
  });

  it('should convert string page/limit and trim q', () => {
    const { error, value } = validateOpsWaitlistListQuery({
      page: '2',
      limit: '50',
      q: '  igreja@test.com  ',
      plan: '500',
    });

    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(50);
    expect(value.q).toBe('igreja@test.com');
    expect(value.plan).toBe('500');
  });

  it('should reject limit above 100', () => {
    const { error } = validateOpsWaitlistListQuery({ limit: 101 });
    expect(error).toBeDefined();
  });

  it('should reject invalid sort_by', () => {
    const { error } = validateOpsWaitlistListQuery({ sort_by: 'email' });
    expect(error).toBeDefined();
  });

  it('should reject billing custom plan (waitlist uses personalizado)', () => {
    const { error } = validateOpsWaitlistListQuery({ plan: 'custom' });
    expect(error).toBeDefined();
  });

  it('should accept personalizado', () => {
    const { error, value } = validateOpsWaitlistListQuery({ plan: 'personalizado' });
    expect(error).toBeUndefined();
    expect(value.plan).toBe('personalizado');
  });

  it('should strip unknown query keys', () => {
    const { error, value } = validateOpsWaitlistListQuery({
      page: 1,
      extra: 'nope',
    });
    expect(error).toBeUndefined();
    expect(value).not.toHaveProperty('extra');
  });
});
