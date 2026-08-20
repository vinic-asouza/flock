/** Shared PDF format helpers */

export function formatDateSafe(date: string | null | undefined): string {
  if (!date) return '—';
  const raw = typeof date === 'string' ? date : String(date);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function calculateAgeSafe(birth: string | null | undefined): number | null {
  if (!birth) return null;
  try {
    const raw = birth.includes('T') ? birth.split('T')[0] : birth;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let date: Date;
    if (match) {
      const [, year, month, day] = match;
      date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    } else {
      date = new Date(birth);
    }
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return '—';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function dash(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
