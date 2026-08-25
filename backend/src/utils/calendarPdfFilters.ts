/**
 * Helpers do recorte do PDF de calendário (tipos, rótulos de filtro).
 */

export function normalizeCalendarTypeFilter(type: unknown): string[] {
  if (Array.isArray(type)) {
    return type.map(String).filter((value) => value.length > 0);
  }
  if (typeof type === 'string' && type.length > 0) {
    return [type];
  }
  return [];
}

export function buildCalendarPdfFilterSummary(parts: {
  types: string[];
  congregationLabel?: string | null;
  groupLabel?: string | null;
}): string | undefined {
  const labels: string[] = [];
  if (parts.types.length > 0) {
    labels.push(parts.types.join(', '));
  }
  if (parts.congregationLabel) {
    labels.push(parts.congregationLabel);
  }
  if (parts.groupLabel) {
    labels.push(parts.groupLabel);
  }
  return labels.length > 0 ? labels.join(' • ') : undefined;
}

export function congregationPdfLabel(congregation: {
  name?: string | null;
  abbreviation?: string | null;
} | null | undefined): string | undefined {
  if (!congregation) return undefined;
  const abbreviation = congregation.abbreviation?.trim();
  if (abbreviation) return abbreviation;
  const name = congregation.name?.trim();
  return name || undefined;
}

export function groupPdfLabel(group: {
  name?: string | null;
  type?: string | null;
} | null | undefined): string | undefined {
  if (!group) return undefined;
  const name = group.name?.trim();
  if (!name) return undefined;
  const type = group.type?.trim();
  return type ? `${type}: ${name}` : name;
}

type JoinedCongregation = {
  id?: string | null;
  name?: string | null;
  abbreviation?: string | null;
} | null | undefined;

type JoinedGroup = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
} | null | undefined;

/** Reusa o join já carregado nos itens; `null` = lista vazia ou id ausente (caller faz fetch). */
export function findJoinedCongregation(
  items: Array<{ congregation?: JoinedCongregation }>,
  congregationId: string
): NonNullable<JoinedCongregation> | null {
  return items.find((item) => item.congregation?.id === congregationId)?.congregation ?? null;
}

export function findJoinedGroup(
  items: Array<{ group?: JoinedGroup }>,
  groupId: string
): NonNullable<JoinedGroup> | null {
  return items.find((item) => item.group?.id === groupId)?.group ?? null;
}
