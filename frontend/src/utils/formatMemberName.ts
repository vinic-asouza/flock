/**
 * Formata o nome do membro para exibição em uppercase
 * @param name - Nome do membro
 * @returns Nome formatado em uppercase ou string vazia se não fornecido
 */
export function formatMemberName(name: string | null | undefined): string {
  if (!name) return '';
  return name.toUpperCase().trim();
}
