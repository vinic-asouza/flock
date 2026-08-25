import { exportCongregationMembersListSchema } from '../congregationValidator';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('exportCongregationMembersListSchema', () => {
  it('should accept congregationId UUID and fields array', () => {
    const { error, value } = exportCongregationMembersListSchema.validate({
      congregationId: VALID_UUID,
      fields: ['name', 'phone'],
    });
    expect(error).toBeUndefined();
    expect(value.congregationId).toBe(VALID_UUID);
    expect(value.fields).toEqual(['name', 'phone']);
  });

  it('should reject missing congregationId', () => {
    const { error } = exportCongregationMembersListSchema.validate({
      fields: ['name'],
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid congregationId UUID', () => {
    const { error } = exportCongregationMembersListSchema.validate({
      congregationId: 'not-a-uuid',
      fields: ['name'],
    });
    expect(error).toBeDefined();
  });

  it('should reject empty fields', () => {
    const { error } = exportCongregationMembersListSchema.validate({
      congregationId: VALID_UUID,
      fields: [],
    });
    expect(error).toBeDefined();
  });

  it('should reject missing fields', () => {
    const { error } = exportCongregationMembersListSchema.validate({
      congregationId: VALID_UUID,
    });
    expect(error).toBeDefined();
  });
});
