import { CalendarItem } from '@/types/calendar';

/**
 * Interpreta a data para exibição no fuso local.
 * Evita que datas em UTC (ex: 2026-02-28T00:00:00.000Z) apareçam como dia anterior.
 */
export function parseCalendarDateForDisplay(dateStr: string, timeStr?: string | null): Date {
  const [y, mo, d] = dateStr.slice(0, 10).split('-').map(Number);
  const local = new Date(y, mo - 1, d);
  if (timeStr) {
    const [hh, mm] = timeStr.split(':').map(Number);
    local.setHours(hh, mm, 0, 0);
  } else if (dateStr.length > 10 && dateStr.includes('T')) {
    const utc = new Date(dateStr);
    local.setHours(utc.getUTCHours(), utc.getUTCMinutes(), 0, 0);
  }
  return local;
}

export function getCalendarItemDisplayDate(item: CalendarItem): Date {
  return parseCalendarDateForDisplay(
    item.start_date,
    item.is_recurring ? item.recurrence_time : undefined
  );
}
