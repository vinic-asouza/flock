/** Extrai dia livre + HH:mm de um schedule persistido. */
export function splitTeachingSchedule(schedule?: string | null): {
  day: string;
  time: string;
} {
  if (!schedule?.trim()) return { day: '', time: '' };
  const trimmed = schedule.trim();
  const timeOnly = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnly) {
    return {
      day: '',
      time: `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`,
    };
  }
  const withDay = trimmed.match(/^(.*?)\s*[·\-–]\s*(\d{1,2}):(\d{2})\s*$/);
  if (withDay) {
    return {
      day: withDay[1].trim(),
      time: `${withDay[2].padStart(2, '0')}:${withDay[3]}`,
    };
  }
  const trailingTime = trimmed.match(/^(.*?)(\d{1,2}):(\d{2})\s*$/);
  if (trailingTime && trailingTime[1].trim()) {
    return {
      day: trailingTime[1].trim(),
      time: `${trailingTime[2].padStart(2, '0')}:${trailingTime[3]}`,
    };
  }
  return { day: trimmed, time: '' };
}

/** Monta schedule para persistência: "Domingo · 09:00" ou só "09:00". */
export function joinTeachingSchedule(day: string, time: string): string | null {
  const d = day.trim();
  const t = time.trim();
  if (!d && !t) return null;
  if (d && t) return `${d} · ${t}`;
  return d || t;
}
