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
