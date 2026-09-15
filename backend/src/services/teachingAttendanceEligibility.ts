export type AttendanceEnrollmentKind = 'member' | 'guest' | 'possible_member';

export interface AttendanceEligibilityInput {
  kind: AttendanceEnrollmentKind;
  lessonDate: string;
  attendanceEligibleFrom: string | null | undefined;
  removedAt: string | null | undefined;
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

/**
 * PostgREST filter matching date-only removal semantics:
 * eligible when removed_at is null OR calendar day of removal is after lesson_date.
 */
export function attendanceRemovedAtOrFilter(lessonDate: string): string {
  const day = datePart(lessonDate);
  const [year, month, date] = day.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  return `removed_at.is.null,removed_at.gte.${nextDay}T00:00:00.000Z`;
}

/**
 * Elegibilidade é temporal e inclusiva no início. A remoção passa a valer
 * no próprio dia, impedindo novas chamadas sem apagar histórico anterior.
 */
export function isTeachingEnrollmentEligible(input: AttendanceEligibilityInput): boolean {
  if (input.kind === 'possible_member' || !input.attendanceEligibleFrom) return false;

  const lessonDate = datePart(input.lessonDate);
  if (lessonDate < datePart(input.attendanceEligibleFrom)) return false;
  if (input.removedAt && lessonDate >= datePart(input.removedAt)) return false;

  return true;
}

export function filterEligibleTeachingEnrollments<T extends AttendanceEligibilityInput>(
  enrollments: T[],
  lessonDate: string
): T[] {
  return enrollments.filter((enrollment) =>
    isTeachingEnrollmentEligible({ ...enrollment, lessonDate })
  );
}
