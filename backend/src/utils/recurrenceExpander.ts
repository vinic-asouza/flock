import { CalendarItem } from '../types';
import { 
  startOfDay, 
  addWeeks, 
  addMonths, 
  getDay, 
  getDate, 
  setDate, 
  setDay, 
  startOfMonth, 
  endOfMonth,
  isBefore,
  isAfter,
  isSameDay
} from 'date-fns';

/**
 * Expande um item recorrente em múltiplas ocorrências dentro de um intervalo de datas
 */
export function expandRecurringItem(
  item: CalendarItem,
  startDate: Date,
  endDate: Date
): CalendarItem[] {
  if (!item.is_recurring || !item.recurrence_pattern || !item.recurrence_time) {
    return [item];
  }

  const occurrences: CalendarItem[] = [];
  const itemStartDate = new Date(item.start_date);
  const recurrenceEndDate = item.recurrence_end_date ? new Date(item.recurrence_end_date) : null;

  // Parse do horário (formato HH:mm)
  const [hours, minutes] = item.recurrence_time.split(':').map(Number);

  // Data de início da recorrência (apenas data, sem hora)
  const recurrenceStart = startOfDay(itemStartDate);

  // Calcular data de término (usar o menor entre endDate e recurrence_end_date)
  const effectiveEndDate = recurrenceEndDate && isBefore(recurrenceEndDate, endDate)
    ? recurrenceEndDate
    : endDate;

  // Não expandir se a data de início da recorrência for depois do intervalo
  if (isAfter(recurrenceStart, effectiveEndDate)) {
    return [];
  }

  switch (item.recurrence_pattern) {
    case 'weekly':
      occurrences.push(...expandWeeklyRecurrence(
        item,
        recurrenceStart,
        effectiveEndDate,
        hours,
        minutes
      ));
      break;

    case 'monthly':
      occurrences.push(...expandMonthlyRecurrence(
        item,
        recurrenceStart,
        effectiveEndDate,
        hours,
        minutes
      ));
      break;

    default:
      // Padrão não reconhecido, retornar apenas o item original
      return [item];
  }

  // Filtrar ocorrências que estão dentro do intervalo solicitado
  return occurrences.filter(occurrence => {
    const occurrenceDate = new Date(occurrence.start_date);
    return (
      (isSameDay(occurrenceDate, startDate) || isAfter(occurrenceDate, startDate)) &&
      (isSameDay(occurrenceDate, endDate) || isBefore(occurrenceDate, endDate))
    );
  });
}

/**
 * Expande recorrência semanal
 */
function expandWeeklyRecurrence(
  item: CalendarItem,
  startDate: Date,
  endDate: Date,
  hours: number,
  minutes: number
): CalendarItem[] {
  if (item.recurrence_day_of_week === null || item.recurrence_day_of_week === undefined) {
    return [];
  }

  const occurrences: CalendarItem[] = [];
  const targetDayOfWeek = item.recurrence_day_of_week; // 0 = Domingo, 6 = Sábado

  // Encontrar o primeiro dia da semana desejado a partir da data de início
  let currentDate = new Date(startDate);
  const currentDayOfWeek = getDay(currentDate);

  // Calcular quantos dias até o próximo dia da semana desejado
  let daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
  
  // Se o dia da semana já passou hoje, ir para a próxima semana
  if (daysUntilTarget === 0 && currentDayOfWeek !== targetDayOfWeek) {
    daysUntilTarget = 7;
  }

  // Avançar para o primeiro dia da semana desejado
  currentDate = new Date(currentDate);
  currentDate.setDate(currentDate.getDate() + daysUntilTarget);

  // Gerar todas as ocorrências semanais até a data de término
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    const occurrenceDate = new Date(currentDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);

    // Criar ocorrência expandida
    const occurrence: CalendarItem = {
      ...item,
      start_date: occurrenceDate,
      end_date: item.recurrence_duration_minutes
        ? new Date(occurrenceDate.getTime() + item.recurrence_duration_minutes * 60 * 1000)
        : null
    };

    occurrences.push(occurrence);

    // Avançar uma semana
    currentDate = addWeeks(currentDate, 1);
  }

  return occurrences;
}

/**
 * Expande recorrência mensal
 */
function expandMonthlyRecurrence(
  item: CalendarItem,
  startDate: Date,
  endDate: Date,
  hours: number,
  minutes: number
): CalendarItem[] {
  const occurrences: CalendarItem[] = [];

  // Verificar se usa day_of_month ou week_of_month + day_of_week
  if (item.recurrence_day_of_month !== null && item.recurrence_day_of_month !== undefined) {
    // Recorrência por dia fixo do mês (ex: dia 15)
    occurrences.push(...expandMonthlyByDay(
      item,
      startDate,
      endDate,
      item.recurrence_day_of_month,
      hours,
      minutes
    ));
  } else if (
    item.recurrence_week_of_month !== null && 
    item.recurrence_week_of_month !== undefined &&
    item.recurrence_day_of_week !== null && 
    item.recurrence_day_of_week !== undefined
  ) {
    // Recorrência por semana do mês + dia da semana (ex: primeira terça-feira)
    occurrences.push(...expandMonthlyByWeek(
      item,
      startDate,
      endDate,
      item.recurrence_week_of_month,
      item.recurrence_day_of_week,
      hours,
      minutes
    ));
  }

  return occurrences;
}

/**
 * Expande recorrência mensal por dia fixo (ex: todo dia 15)
 */
function expandMonthlyByDay(
  item: CalendarItem,
  startDate: Date,
  endDate: Date,
  dayOfMonth: number,
  hours: number,
  minutes: number
): CalendarItem[] {
  const occurrences: CalendarItem[] = [];
  let currentDate = new Date(startDate);

  // Ajustar para o primeiro mês válido
  const firstMonth = startOfMonth(currentDate);
  let firstOccurrence = setDate(firstMonth, dayOfMonth);
  
  // Se o dia já passou neste mês, ir para o próximo mês
  if (isBefore(firstOccurrence, startDate)) {
    firstOccurrence = addMonths(firstOccurrence, 1);
    firstOccurrence = setDate(startOfMonth(firstOccurrence), dayOfMonth);
  }

  currentDate = firstOccurrence;

  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    // Verificar se o mês tem esse dia (ex: 31 de fevereiro)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const maxDay = getDate(monthEnd);

    if (dayOfMonth <= maxDay) {
      const occurrenceDate = new Date(currentDate);
      occurrenceDate.setHours(hours, minutes, 0, 0);

      const occurrence: CalendarItem = {
        ...item,
        start_date: occurrenceDate,
        end_date: item.recurrence_duration_minutes
          ? new Date(occurrenceDate.getTime() + item.recurrence_duration_minutes * 60 * 1000)
          : null
      };

      occurrences.push(occurrence);
    }

    // Avançar para o próximo mês
    currentDate = addMonths(currentDate, 1);
    currentDate = setDate(startOfMonth(currentDate), Math.min(dayOfMonth, getDate(endOfMonth(currentDate))));
  }

  return occurrences;
}

/**
 * Retorna o último dia do mês que cai no dia da semana informado (0=Dom, 6=Sab).
 * setDay(monthEnd, dayOfWeek) pode retornar data no mês seguinte quando a semana
 * do último dia do mês cruza para o próximo mês; esta função garante resultado dentro do mês.
 */
function getLastWeekdayOfMonth(monthStart: Date, dayOfWeek: number): Date {
  let d = new Date(endOfMonth(monthStart));
  while (getDay(d) !== dayOfWeek) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * Expande recorrência mensal por semana do mês (ex: primeira terça-feira)
 */
function expandMonthlyByWeek(
  item: CalendarItem,
  startDate: Date,
  endDate: Date,
  weekOfMonth: number, // -1 = última, 1-4 = primeira a quarta
  dayOfWeek: number, // 0 = Domingo, 6 = Sábado
  hours: number,
  minutes: number
): CalendarItem[] {
  const occurrences: CalendarItem[] = [];
  let currentDate = new Date(startDate);

  // Ajustar para o primeiro mês válido
  const firstMonth = startOfMonth(currentDate);
  let firstOccurrence: Date;

  if (weekOfMonth === -1) {
    // Última semana: último dia da semana dentro do mês (ex: último sábado)
    firstOccurrence = getLastWeekdayOfMonth(firstMonth, dayOfWeek);
    if (isBefore(firstOccurrence, startDate)) {
      const nextMonth = addMonths(firstMonth, 1);
      firstOccurrence = getLastWeekdayOfMonth(nextMonth, dayOfWeek);
    }
  } else {
    // Primeira a quarta semana: encontrar o N-ésimo dia da semana do mês
    const firstDayOfWeek = setDay(firstMonth, dayOfWeek, { weekStartsOn: 0 });
    
    // Se o primeiro dia da semana do mês já passou, calcular a semana correta
    if (isBefore(firstDayOfWeek, startOfMonth(firstMonth))) {
      // O primeiro dia da semana está no mês anterior, então a primeira ocorrência é na segunda semana
      firstOccurrence = addWeeks(firstDayOfWeek, weekOfMonth);
    } else {
      firstOccurrence = addWeeks(firstDayOfWeek, weekOfMonth - 1);
    }

    // Se a primeira ocorrência já passou, ir para o próximo mês
    if (isBefore(firstOccurrence, startDate)) {
      const nextMonth = addMonths(firstMonth, 1);
      const nextFirstDayOfWeek = setDay(nextMonth, dayOfWeek, { weekStartsOn: 0 });
      if (isBefore(nextFirstDayOfWeek, startOfMonth(nextMonth))) {
        firstOccurrence = addWeeks(nextFirstDayOfWeek, weekOfMonth);
      } else {
        firstOccurrence = addWeeks(nextFirstDayOfWeek, weekOfMonth - 1);
      }
    }
  }

  currentDate = firstOccurrence;

  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    const occurrenceDate = new Date(currentDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);

    const occurrence: CalendarItem = {
      ...item,
      start_date: occurrenceDate,
      end_date: item.recurrence_duration_minutes
        ? new Date(occurrenceDate.getTime() + item.recurrence_duration_minutes * 60 * 1000)
        : null
    };

    occurrences.push(occurrence);

    // Avançar para o próximo mês e recalcular
    const nextMonth = addMonths(startOfMonth(currentDate), 1);
    
    if (weekOfMonth === -1) {
      currentDate = getLastWeekdayOfMonth(nextMonth, dayOfWeek);
    } else {
      // N-ésima semana do próximo mês
      const nextFirstDayOfWeek = setDay(nextMonth, dayOfWeek, { weekStartsOn: 0 });
      if (isBefore(nextFirstDayOfWeek, startOfMonth(nextMonth))) {
        currentDate = addWeeks(nextFirstDayOfWeek, weekOfMonth);
      } else {
        currentDate = addWeeks(nextFirstDayOfWeek, weekOfMonth - 1);
      }
    }
  }

  return occurrences;
}
