/**
 * Normaliza uma data para garantir que seja tratada como data local (sem conversão de timezone)
 * Converte Date objects ou strings ISO para formato "YYYY-MM-DD" que será tratado como data local pelo PostgreSQL
 * 
 * IMPORTANTE: Quando uma string "YYYY-MM-DD" é convertida para Date, o JavaScript interpreta como UTC meia-noite.
 * Para evitar problemas de timezone, extraímos os componentes da data original antes de qualquer conversão.
 */
export function normalizeDateForDatabase(date: string | Date | null | undefined): string | null {
  if (!date) return null;

  // Se já é uma string no formato YYYY-MM-DD, retornar como está (melhor caso)
  if (typeof date === 'string') {
    // Verificar se está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Se for uma string ISO completa, extrair apenas a parte da data (antes do T)
    if (date.includes('T')) {
      const datePart = date.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }
    }
    
    // Tentar parsear como data e extrair YYYY-MM-DD
    // IMPORTANTE: Se a string original era "2025-12-04", precisamos preservar isso
    // mesmo que tenha sido convertida para Date
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      // Se a string original era no formato YYYY-MM-DD, extrair diretamente da string
      // Caso contrário, usar os componentes UTC do Date object
      const yyyymmddMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (yyyymmddMatch) {
        // Preservar a data original da string (evita problemas de timezone)
        return `${yyyymmddMatch[1]}-${yyyymmddMatch[2]}-${yyyymmddMatch[3]}`;
      }
      
      // Se não for formato YYYY-MM-DD, usar UTC para evitar problemas de timezone
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  }

  // Se for um Date object, precisamos extrair a data original
  // O problema: se foi criado de "2025-12-04", pode ter sido interpretado como UTC
  // Solução: usar UTC para extrair, mas isso pode não ser ideal
  // Melhor: garantir que nunca chegue aqui como Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    
    // Usar UTC para garantir que a data não seja afetada pelo timezone do servidor
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Normaliza um objeto de membro, convertendo todas as datas para formato seguro
 */
export function normalizeMemberDates(member: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...member };

  // Normalizar campos de data conhecidos
  if (normalized.birth) {
    normalized.birth = normalizeDateForDatabase(normalized.birth as string | Date);
  }

  if (normalized.baptism_date) {
    normalized.baptism_date = normalizeDateForDatabase(normalized.baptism_date as string | Date);
  }

  if (normalized.admission_date) {
    normalized.admission_date = normalizeDateForDatabase(normalized.admission_date as string | Date);
  }

  // Normalizar datas dos filhos se existirem
  if (normalized.children && Array.isArray(normalized.children)) {
    normalized.children = (normalized.children as Array<{ name: string; birth?: string | Date | null }>).map(child => ({
      ...child,
      birth: child.birth ? normalizeDateForDatabase(child.birth) : null
    }));
  }

  return normalized;
}

