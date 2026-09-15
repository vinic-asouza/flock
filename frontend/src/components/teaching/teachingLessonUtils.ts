import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  TeachingAttendanceStatus,
  TeachingLesson,
} from '@/types';

export const WEEKDAY_OPTIONS = [
  { value: 0, short: 'Dom', label: 'Domingo' },
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
] as const;

export const ATTENDANCE_LABELS: Record<TeachingAttendanceStatus, string> = {
  unregistered: 'Não registrada',
  present: 'Presente',
  absent: 'Ausente',
};

export function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function getVisibleMonthRange(month: Date) {
  const from = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const to = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function getVisibleMonthDays(month: Date) {
  const range = getVisibleMonthRange(month);
  return eachDayOfInterval({
    start: parseISO(range.from),
    end: parseISO(range.to),
  });
}

export function groupLessonsByDate(lessons: TeachingLesson[]) {
  return lessons.reduce<Record<string, TeachingLesson[]>>((groups, lesson) => {
    const day = groups[lesson.lesson_date] || [];
    day.push(lesson);
    groups[lesson.lesson_date] = day;
    return groups;
  }, {});
}

export function formatLessonDate(date: string) {
  return format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function formatLessonTime(time: string) {
  return time.slice(0, 5);
}
