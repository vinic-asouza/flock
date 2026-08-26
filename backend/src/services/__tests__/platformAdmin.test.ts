import {
  evaluatePlatformOperatorAccess,
  isEmailInPlatformAdminAllowlist,
  parsePlatformAdminEmails,
} from '../platformAdmin';

describe('parsePlatformAdminEmails', () => {
  it('should return empty list when raw is missing', () => {
    expect(parsePlatformAdminEmails(undefined)).toEqual([]);
    expect(parsePlatformAdminEmails(null)).toEqual([]);
    expect(parsePlatformAdminEmails('')).toEqual([]);
    expect(parsePlatformAdminEmails('   ')).toEqual([]);
  });

  it('should split, trim, lowercase and dedupe emails', () => {
    expect(
      parsePlatformAdminEmails('  Ada@Flock.app , bob@flock.app;ADA@flock.app\ncarol@flock.app ')
    ).toEqual(['ada@flock.app', 'bob@flock.app', 'carol@flock.app']);
  });
});

describe('isEmailInPlatformAdminAllowlist', () => {
  const allowlist = ['ops@flock.app'];

  it('should match email case-insensitively', () => {
    expect(isEmailInPlatformAdminAllowlist('OPS@Flock.app', allowlist)).toBe(true);
  });

  it('should reject email outside the allowlist', () => {
    expect(isEmailInPlatformAdminAllowlist('owner@igreja.com', allowlist)).toBe(false);
    expect(isEmailInPlatformAdminAllowlist('', allowlist)).toBe(false);
    expect(isEmailInPlatformAdminAllowlist(null, allowlist)).toBe(false);
  });
});

describe('evaluatePlatformOperatorAccess', () => {
  const allowlist = ['ops@flock.app'];

  it('should allow staff on the allowlist without church membership', () => {
    expect(
      evaluatePlatformOperatorAccess({
        email: 'ops@flock.app',
        membershipCount: 0,
        allowlist,
      })
    ).toEqual({ allowed: true });
  });

  it('should fail closed when the allowlist is empty', () => {
    const decision = evaluatePlatformOperatorAccess({
      email: 'ops@flock.app',
      membershipCount: 0,
      allowlist: [],
    });

    expect(decision).toEqual({
      allowed: false,
      status: 403,
      error: 'Acesso negado',
      details: 'Admin OPS não está configurado.',
    });
  });

  it('should refuse email outside the allowlist', () => {
    const decision = evaluatePlatformOperatorAccess({
      email: 'owner@igreja.com',
      membershipCount: 0,
      allowlist,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      return;
    }
    expect(decision.status).toBe(403);
    expect(decision.details).toMatch(/não tem acesso/i);
  });

  it('should refuse allowlisted email that has church membership', () => {
    const decision = evaluatePlatformOperatorAccess({
      email: 'ops@flock.app',
      membershipCount: 1,
      allowlist,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      return;
    }
    expect(decision.status).toBe(403);
    expect(decision.details).toMatch(/igreja/i);
  });
});
