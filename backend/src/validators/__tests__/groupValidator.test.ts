import {
  createGroupSchema,
  updateGroupSchema,
  exportGroupsListFiltersSchema,
} from '../groupValidator';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('groupValidator (ministries)', () => {
  it('accepts create without type', () => {
    const { error } = createGroupSchema.validate({
      name: 'Louvor',
      congregation_id: VALID_UUID,
    });
    expect(error).toBeUndefined();
  });

  it('rejects create with type (unknown field)', () => {
    const { error } = createGroupSchema.validate({
      name: 'Louvor',
      congregation_id: VALID_UUID,
      type: 'Ministério',
    });
    expect(error).toBeDefined();
  });

  it('rejects update with type (unknown field)', () => {
    const { error } = updateGroupSchema.validate({
      name: 'Louvor',
      type: 'Célula',
    });
    expect(error).toBeDefined();
  });

  it('accepts export filters without types', () => {
    const { error } = exportGroupsListFiltersSchema.validate({
      search: 'louvor',
      status: 'active',
      congregation_id: VALID_UUID,
    });
    expect(error).toBeUndefined();
  });

  it('rejects export filters.types', () => {
    const { error } = exportGroupsListFiltersSchema.validate({
      types: ['Ministério'],
    });
    expect(error).toBeDefined();
  });
});
