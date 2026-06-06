/**
 * Redação de PII para logs em produção.
 */

export function redactEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '[redacted]';
  }
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    return '[redacted]';
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal =
    local.length <= 2 ? '**' : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export function redactRecipients(
  to: string | string[] | null | undefined
): string | string[] {
  if (!to) return '[redacted]';
  if (Array.isArray(to)) {
    return to.map((e) => redactEmail(e));
  }
  return redactEmail(to);
}
