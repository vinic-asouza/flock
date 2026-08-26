/**
 * Allowlist of platform operators for Admin OPS (`PLATFORM_ADMIN_EMAILS`).
 * Fail closed when the list is empty (including production).
 */

export function parsePlatformAdminEmails(raw: string | undefined | null): string[] {
  if (!raw) {
    return [];
  }

  const emails = raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(emails)];
}

export function getPlatformAdminAllowlist(): string[] {
  return parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS);
}

export function isEmailInPlatformAdminAllowlist(
  email: string | undefined | null,
  allowlist: string[] = getPlatformAdminAllowlist()
): boolean {
  if (!email) {
    return false;
  }
  return allowlist.includes(email.trim().toLowerCase());
}

export type PlatformOperatorDecision =
  | { allowed: true }
  | { allowed: false; status: 403; error: string; details: string };

export function evaluatePlatformOperatorAccess(input: {
  email?: string | null;
  membershipCount: number;
  allowlist?: string[];
}): PlatformOperatorDecision {
  const allowlist = input.allowlist ?? getPlatformAdminAllowlist();

  if (allowlist.length === 0) {
    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado',
      details: 'Admin OPS não está configurado.',
    };
  }

  if (!isEmailInPlatformAdminAllowlist(input.email, allowlist)) {
    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado',
      details: 'Este e-mail não tem acesso ao Admin OPS.',
    };
  }

  if (input.membershipCount > 0) {
    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado',
      details: 'Contas vinculadas a uma igreja não podem acessar o Admin OPS.',
    };
  }

  return { allowed: true };
}
