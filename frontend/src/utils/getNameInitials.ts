const NAME_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Iniciais para avatar: primeiro nome + primeiro sobrenome (ignorando partículas).
 * Nome único → uma letra. Vazio → "?".
 */
export function getNameInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !NAME_PARTICLES.has(part.toLowerCase()));

  if (parts.length === 0) return '?';

  const first = parts[0].charAt(0);
  if (parts.length === 1) return first.toUpperCase();

  return `${first}${parts[1].charAt(0)}`.toUpperCase();
}
