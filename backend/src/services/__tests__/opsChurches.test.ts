import { buildChurchSearchOrFilter } from '../../utils/opsChurchSearch';
import {
  aggregateOpsOverview,
  buildPagination,
  countActiveMembersByChurch,
  countChurchUsersByStatus,
  countMembersByActive,
  countMembersByChurch,
  toOpsAuditLog,
  toOpsChurchDetail,
  toOpsChurchListItem,
  toOpsSubscriptionEvent,
} from '../opsChurchMappers';

describe('buildChurchSearchOrFilter', () => {
  it('should search name when q has no digits', () => {
    expect(buildChurchSearchOrFilter('3IPI')).toBe('name.ilike."%3IPI%"');
  });

  it('should search name and CNPJ digits together', () => {
    expect(buildChurchSearchOrFilter('12.345.678/0001-90')).toContain('cnpj.ilike."%12345678000190%"');
    expect(buildChurchSearchOrFilter('12.345.678/0001-90')).toContain('name.ilike.');
  });

  it('should escape LIKE wildcards in the name term', () => {
    expect(buildChurchSearchOrFilter('IPI%')).toBe('name.ilike."%IPI\\%%"');
  });

  it('should ignore commas that would split PostgREST or()', () => {
    const filter = buildChurchSearchOrFilter('Foo,Bar');
    expect(filter).toBe('name.ilike."%Foo Bar%"');
    expect(filter).not.toContain(',');
  });
});

describe('aggregateOpsOverview', () => {
  it('should count totals and treat null status as none / inactive', () => {
    const overview = aggregateOpsOverview([
      { plan_type: '200', subscription_status: 'active' },
      { plan_type: '200', subscription_status: 'trialing' },
      { plan_type: '100', subscription_status: 'canceled' },
      { plan_type: null, subscription_status: null },
    ]);

    expect(overview).toEqual({
      total: 4,
      commercially_active: 2,
      commercially_inactive: 2,
      by_plan_type: { '200': 2, '100': 1, none: 1 },
      by_subscription_status: { active: 1, trialing: 1, canceled: 1, none: 1 },
    });
  });

  it('should return zeros for an empty set', () => {
    expect(aggregateOpsOverview([])).toEqual({
      total: 0,
      commercially_active: 0,
      commercially_inactive: 0,
      by_plan_type: {},
      by_subscription_status: {},
    });
  });
});

describe('member and church_user counts', () => {
  it('should count active members per church without listing people', () => {
    const counts = countActiveMembersByChurch([
      { church_id: 'a', active: true },
      { church_id: 'a', active: false },
      { church_id: 'b', active: true },
      { church_id: 'b', active: true },
    ]);

    expect(counts.get('a')).toBe(1);
    expect(counts.get('b')).toBe(2);
  });

  it('should split active and inactive members per church', () => {
    const counts = countMembersByChurch([
      { church_id: 'a', active: true },
      { church_id: 'a', active: false },
      { church_id: 'b', active: true },
    ]);
    expect(counts.get('a')).toEqual({ active: 1, inactive: 1 });
    expect(counts.get('b')).toEqual({ active: 1, inactive: 0 });
  });

  it('should split members into active and inactive', () => {
    expect(
      countMembersByActive([
        { church_id: 'a', active: true },
        { church_id: 'a', active: false },
        { church_id: 'a', active: false },
      ])
    ).toEqual({ active: 1, inactive: 2 });
  });

  it('should group church_users by status', () => {
    expect(
      countChurchUsersByStatus([{ status: 'active' }, { status: 'invited' }, { status: 'disabled' }])
    ).toEqual({ active: 1, invited: 1, disabled: 1, total: 3 });
  });
});

describe('ops church mappers', () => {
  const church = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Igreja Teste',
    denomination: 'Batista',
    cnpj: '12345678000190',
    address: 'Rua A',
    city: 'Marília',
    state: 'SP',
    created_at: '2026-01-01T00:00:00.000Z',
    email_church: 'contato@igreja.test',
    phone_church: '14999999999',
    plan_type: '200',
    subscription_status: 'active',
    subscription_start_date: '2026-01-01T00:00:00.000Z',
    subscription_end_date: null,
    subscription_updated_at: '2026-01-02T00:00:00.000Z',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    user_id: 'owner-auth-id',
    last_stripe_event_created: 99,
    members: [{ name: 'João Silva', email: 'joao@hidden.test' }],
  };

  it('should map list items without member arrays or stripe ids', () => {
    const item = toOpsChurchListItem(church, 12, 3);
    expect(item.commercially_active).toBe(true);
    expect(item.members_active_count).toBe(12);
    expect(item.members_inactive_count).toBe(3);
    expect(item.city).toBe('Marília');
    expect(item.email_church).toBe('contato@igreja.test');
    expect(item).not.toHaveProperty('members');
    expect(item).not.toHaveProperty('stripe_customer_id');
    expect(item).not.toHaveProperty('user_id');
    expect(JSON.stringify(item)).not.toContain('João');
  });

  it('should omit audit diffs, ip, payload and member PII from the detail DTO', () => {
    const detail = toOpsChurchDetail({
      church,
      membersActive: 3,
      membersInactive: 1,
      churchUsers: { active: 2, invited: 0, disabled: 0, total: 2 },
      subscriptionEvents: [
        {
          id: 'evt-row',
          event_type: 'updated',
          old_plan: '100',
          new_plan: '200',
          old_status: 'canceled',
          new_status: 'active',
          source: 'webhook',
          stripe_event_id: 'evt_1',
          created_at: '2026-01-03T00:00:00.000Z',
          payload: { customer_email: 'owner@hidden.test', member_name: 'João Silva' },
        },
      ],
      auditLogs: [
        {
          id: 'log-1',
          created_at: '2026-01-04T00:00:00.000Z',
          user_id: 'user-1',
          entity: 'member',
          action: 'update',
          entity_id: 'member-1',
          changes_before: { name: 'João Silva', document: '111' },
          changes_after: { name: 'João Silva', active: false },
          ip: '1.1.1.1',
          user_agent: 'Mozilla',
        },
      ],
      actorsById: {
        'user-1': { id: 'user-1', email: 'admin@igreja.test', displayName: 'Admin Igreja' },
      },
    });

    const json = JSON.stringify(detail);
    expect(json).not.toContain('João Silva');
    expect(json).not.toContain('owner@hidden.test');
    expect(json).not.toContain('1.1.1.1');
    expect(detail).not.toHaveProperty('user_id');
    expect(detail).not.toHaveProperty('last_stripe_event_created');
    expect(detail).not.toHaveProperty('members');
    expect(detail.audit_logs[0]).not.toHaveProperty('changes_before');
    expect(detail.audit_logs[0]).not.toHaveProperty('changes_after');
    expect(detail.audit_logs[0]).not.toHaveProperty('ip');
    expect(detail.subscription_events[0]).not.toHaveProperty('payload');
    expect(detail.members_active_count).toBe(3);
    expect(detail.commercially_active).toBe(true);
  });

  it('should never copy forbidden keys even when mapping a single log or event', () => {
    const log = toOpsAuditLog(
      {
        id: 'log-1',
        created_at: '2026-01-04T00:00:00.000Z',
        user_id: 'user-1',
        entity: 'member',
        action: 'update',
        entity_id: 'member-1',
        changes_before: { name: 'Maria' },
      },
      { id: 'user-1', email: 'a@b.c', displayName: 'A' }
    );
    expect(log).not.toHaveProperty('changes_before');
    expect(JSON.stringify(log)).not.toContain('Maria');

    const event = toOpsSubscriptionEvent({
      id: 'e1',
      event_type: 'updated',
      old_plan: null,
      new_plan: '200',
      old_status: null,
      new_status: 'active',
      source: 'api',
      stripe_event_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      payload: { secret: true },
    });
    expect(event).not.toHaveProperty('payload');
  });
});

describe('buildPagination', () => {
  it('should expose next/prev pages in the members envelope shape', () => {
    expect(buildPagination(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
      nextPage: 2,
      prevPage: null,
    });
  });

  it('should handle an empty list', () => {
    expect(buildPagination(1, 20, 0).totalPages).toBe(0);
    expect(buildPagination(1, 20, 0).hasNextPage).toBe(false);
  });
});
