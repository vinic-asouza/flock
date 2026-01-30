/**
 * Calcula a idade de uma pessoa a partir da data de nascimento
 * Considera timezone local para evitar problemas de conversão
 * 
 * @param birthDate - Data de nascimento (string no formato YYYY-MM-DD ou Date object)
 * @returns Idade em anos ou null se a data for inválida
 * 
 * @example
 * calculateAge('1990-05-15') // Retorna idade atual
 * calculateAge(new Date('1990-05-15')) // Retorna idade atual
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;

  // Tentar extrair a data "YYYY-MM-DD" de forma segura
  let raw: string;
  if (birthDate instanceof Date) {
    // Se for Date, converter para string YYYY-MM-DD
    const year = birthDate.getFullYear();
    const month = String(birthDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthDate.getDate()).padStart(2, '0');
    raw = `${year}-${month}-${day}`;
  } else {
    raw = birthDate.includes('T') ? birthDate.split('T')[0] : birthDate;
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let birth: Date;

  if (match) {
    const [, year, month, day] = match;
    // Criar Date no timezone local a partir de componentes numéricos (evita interpretar como UTC)
    birth = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  } else {
    // Fallback para outros formatos
    birth = new Date(birthDate);
  }

  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // Ajustar idade se o aniversário ainda não ocorreu este ano
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}
