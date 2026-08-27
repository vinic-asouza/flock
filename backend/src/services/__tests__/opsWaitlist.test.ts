import { buildWaitlistSearchOrFilter } from '../../utils/opsWaitlistSearch';
import { toOpsWaitlistItem } from '../opsWaitlistMappers';

describe('buildWaitlistSearchOrFilter', () => {
  it('should search name, email and church_name', () => {
    const filter = buildWaitlistSearchOrFilter('Ana');
    expect(filter).toBe(
      'name.ilike."%Ana%",email.ilike."%Ana%",church_name.ilike."%Ana%"'
    );
  });

  it('should escape LIKE wildcards', () => {
    expect(buildWaitlistSearchOrFilter('Ana%')).toContain('Ana\\%');
  });

  it('should ignore commas that would split PostgREST or()', () => {
    const filter = buildWaitlistSearchOrFilter('Foo,Bar');
    expect(filter).toContain('name.ilike."%Foo Bar%"');
    expect(filter).not.toContain('Foo,Bar');
  });

  it('should return null for empty reserved-only input', () => {
    expect(buildWaitlistSearchOrFilter(' ,() ')).toBeNull();
  });
});

describe('toOpsWaitlistItem', () => {
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Ana Silva',
    email: 'ana@test.com',
    phone: '14999999999',
    church_name: 'Igreja Teste',
    city: 'Marília',
    state: 'SP',
    plan: '500',
    message: 'Quero falar com comercial',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-02T00:00:00.000Z',
    secret: 'should-not-leak',
  };

  it('should whitelist persisted waitlist fields without extras', () => {
    const item = toOpsWaitlistItem(row);

    expect(item).toEqual({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      church_name: row.church_name,
      city: row.city,
      state: row.state,
      plan: row.plan,
      message: row.message,
      created_at: row.created_at,
    });
    expect(item).not.toHaveProperty('updated_at');
    expect(item).not.toHaveProperty('secret');
  });

  it('should normalize missing message to null', () => {
    const item = toOpsWaitlistItem({ ...row, message: null });
    expect(item.message).toBeNull();
  });
});
