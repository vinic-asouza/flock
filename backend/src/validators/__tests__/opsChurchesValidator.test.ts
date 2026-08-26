import {
  validateOpsChurchIdParams,
  validateOpsChurchListQuery,
} from '../opsChurchesValidator';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('validateOpsChurchListQuery', () => {
  it('should apply defaults for an empty query', () => {
    const { error, value } = validateOpsChurchListQuery({});

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    expect(value.q).toBeUndefined();
  });

  it('should convert string page/limit and commercially_active', () => {
    const { error, value } = validateOpsChurchListQuery({
      page: '2',
      limit: '50',
      commercially_active: 'true',
      q: '  Igreja  ',
    });

    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(50);
    expect(value.commercially_active).toBe(true);
    expect(value.q).toBe('Igreja');
  });

  it('should reject limit above 100', () => {
    const { error } = validateOpsChurchListQuery({ limit: 101 });
    expect(error).toBeDefined();
  });

  it('should reject invalid sort_by', () => {
    const { error } = validateOpsChurchListQuery({ sort_by: 'email' });
    expect(error).toBeDefined();
  });

  it('should reject unknown plan_type', () => {
    const { error } = validateOpsChurchListQuery({ plan_type: 'premium' });
    expect(error).toBeDefined();
  });

  it('should strip unknown query keys', () => {
    const { error, value } = validateOpsChurchListQuery({
      page: 1,
      extra: 'nope',
    });
    expect(error).toBeUndefined();
    expect(value).not.toHaveProperty('extra');
  });
});

describe('validateOpsChurchIdParams', () => {
  it('should accept a UUID', () => {
    const { error, value } = validateOpsChurchIdParams({ id: VALID_UUID });
    expect(error).toBeUndefined();
    expect(value.id).toBe(VALID_UUID);
  });

  it('should reject an invalid UUID', () => {
    const { error } = validateOpsChurchIdParams({ id: 'not-a-uuid' });
    expect(error).toBeDefined();
  });
});
