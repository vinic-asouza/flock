export type TeachingRecurrenceType = 'weekly' | 'monthly' | 'interval_days';

export interface TeachingRecurrenceRule {
  type: TeachingRecurrenceType;
  startsOn: string;
  endsOn: string;
  weekdays?: number[];
  dayOfMonth?: number;
  intervalDays?: number;
}

export interface TeachingRecurrenceExpansion {
  dates: string[];
  skippedMonths: string[];
}

export class TeachingRecurrenceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_DATE'
      | 'INVALID_RANGE'
      | 'INVALID_RULE'
      | 'OCCURRENCE_LIMIT_EXCEEDED'
  ) {
    super(message);
    this.name = 'TeachingRecurrenceError';
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_TEACHING_OCCURRENCES = 366;

function parseDateOnly(value: string): Date {
  if (!DATE_ONLY.test(value)) {
    throw new TeachingRecurrenceError('A data deve estar no formato YYYY-MM-DD', 'INVALID_DATE');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TeachingRecurrenceError('A data informada não existe', 'INVALID_DATE');
  }
  return date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function pushWithLimit(dates: string[], date: Date, limit: number): void {
  dates.push(formatDateOnly(date));
  if (dates.length > limit) {
    throw new TeachingRecurrenceError(
      `A recorrência não pode gerar mais de ${limit} aulas`,
      'OCCURRENCE_LIMIT_EXCEEDED'
    );
  }
}

export function expandTeachingRecurrence(
  rule: TeachingRecurrenceRule,
  limit = MAX_TEACHING_OCCURRENCES
): TeachingRecurrenceExpansion {
  const start = parseDateOnly(rule.startsOn);
  const end = parseDateOnly(rule.endsOn);
  if (end < start) {
    throw new TeachingRecurrenceError(
      'A data final deve ser igual ou posterior à data inicial',
      'INVALID_RANGE'
    );
  }

  const dates: string[] = [];
  const skippedMonths: string[] = [];

  if (rule.type === 'weekly') {
    const weekdays = [...new Set(rule.weekdays || [])].sort((a, b) => a - b);
    if (
      weekdays.length === 0 ||
      weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    ) {
      throw new TeachingRecurrenceError(
        'A recorrência semanal exige um ou mais dias válidos da semana',
        'INVALID_RULE'
      );
    }
    const accepted = new Set(weekdays);
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      if (accepted.has(cursor.getUTCDay())) pushWithLimit(dates, cursor, limit);
    }
  } else if (rule.type === 'monthly') {
    const day = rule.dayOfMonth;
    if (!Number.isInteger(day) || day == null || day < 1 || day > 31) {
      throw new TeachingRecurrenceError(
        'A recorrência mensal exige um dia entre 1 e 31',
        'INVALID_RULE'
      );
    }
    let year = start.getUTCFullYear();
    let month = start.getUTCMonth();
    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth();
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const candidate = new Date(Date.UTC(year, month, day));
      const monthKey = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
      if (candidate.getUTCMonth() !== month) {
        skippedMonths.push(monthKey);
      } else if (candidate >= start && candidate <= end) {
        pushWithLimit(dates, candidate, limit);
      }
      month += 1;
      if (month === 12) {
        month = 0;
        year += 1;
      }
    }
  } else if (rule.type === 'interval_days') {
    const interval = rule.intervalDays;
    if (!Number.isInteger(interval) || interval == null || interval < 1 || interval > 366) {
      throw new TeachingRecurrenceError(
        'O intervalo personalizado deve estar entre 1 e 366 dias',
        'INVALID_RULE'
      );
    }
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, interval)) {
      pushWithLimit(dates, cursor, limit);
    }
  } else {
    throw new TeachingRecurrenceError('Tipo de recorrência inválido', 'INVALID_RULE');
  }

  if (dates.length === 0) {
    throw new TeachingRecurrenceError(
      'A regra não gera aulas dentro do período informado',
      'INVALID_RULE'
    );
  }

  return { dates, skippedMonths };
}

export function recurrenceOccurrenceKey(date: string): string {
  parseDateOnly(date);
  return date;
}
