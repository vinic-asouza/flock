import { buildRegistrationAuditRows } from '../registrationAudit';

describe('buildRegistrationAuditRows', () => {
  const base = {
    churchId: 'church-1',
    churchName: ' Igreja Nova ',
    userId: 'user-1',
    ip: null,
    userAgent: 'register',
  };

  it('grava cadastro e plano grátis quando não há plano pago', () => {
    const rows = buildRegistrationAuditRows({ ...base, paidPlanLinked: false });
    expect(rows.map((row) => row.changes_after.event)).toEqual([
      'church_registered',
      'free_plan_activated',
    ]);
    expect(rows[0].action).toBe('create');
    expect(rows[1].action).toBe('update');
    expect(rows[1].changes_after.new_plan).toBe('100');
    expect(rows[0].changes_after.name).toBe('Igreja Nova');
    expect(rows[0].changes_after.dedupe_key).toBe('church_registered:church-1');
    expect(rows[1].changes_after.dedupe_key).toBe('free_plan_activated:church-1');
  });

  it('grava só o cadastro quando o plano pago já foi vinculado', () => {
    const rows = buildRegistrationAuditRows({ ...base, paidPlanLinked: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].changes_after.event).toBe('church_registered');
  });
});
