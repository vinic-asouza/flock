import { isTeachingEnrollmentEligible } from './teachingAttendanceEligibility';

export type StatisticsEnrollmentKind = 'member' | 'guest' | 'possible_member';

export interface StatisticsEnrollmentInput {
  id: string;
  kind: StatisticsEnrollmentKind;
  displayName: string;
  attendanceEligibleFrom: string | null;
  removedAt: string | null;
}

export interface StatisticsLessonInput {
  id: string;
  lessonDate: string;
  startTime: string | null;
  title: string | null;
}

export interface StatisticsMarkInput {
  lessonId: string;
  enrollmentId: string;
  status: string | null;
}

export interface TeachingClassStatistics {
  enrollments: {
    active_members: number;
    active_guests: number;
    queue: number;
  };
  lessons_count: number;
  attendance: {
    present: number;
    absent: number;
    unregistered: number;
  };
  rate: number | null;
  by_lesson: Array<{
    lesson_id: string;
    lesson_date: string;
    start_time: string | null;
    title: string | null;
    present: number;
    absent: number;
  }>;
  by_enrollment: Array<{
    enrollment_id: string;
    display_name: string;
    kind: 'member' | 'guest';
    present: number;
    absent: number;
    unregistered: number;
    rate: number | null;
  }>;
}

export function attendanceRate(present: number, absent: number): number | null {
  const denominator = present + absent;
  if (denominator <= 0) return null;
  return Math.round((present / denominator) * 100);
}

function markKey(lessonId: string, enrollmentId: string): string {
  return `${lessonId}:${enrollmentId}`;
}

function compareEnrollments(
  a: TeachingClassStatistics['by_enrollment'][number],
  b: TeachingClassStatistics['by_enrollment'][number]
): number {
  if (a.rate === null && b.rate === null) {
    return a.display_name.localeCompare(b.display_name, 'pt-BR');
  }
  if (a.rate === null) return 1;
  if (b.rate === null) return -1;
  if (a.rate !== b.rate) return a.rate - b.rate;
  return a.display_name.localeCompare(b.display_name, 'pt-BR');
}

export function buildTeachingClassStatistics(input: {
  enrollments: StatisticsEnrollmentInput[];
  lessons: StatisticsLessonInput[];
  marks: StatisticsMarkInput[];
}): TeachingClassStatistics {
  const active = input.enrollments.filter((row) => !row.removedAt);
  const marks = new Map<string, 'present' | 'absent'>();
  for (const mark of input.marks) {
    if (mark.status === 'present' || mark.status === 'absent') {
      marks.set(markKey(mark.lessonId, mark.enrollmentId), mark.status);
    }
  }

  const lessons = [...input.lessons].sort((a, b) => {
    if (a.lessonDate !== b.lessonDate) return a.lessonDate < b.lessonDate ? -1 : 1;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  let present = 0;
  let absent = 0;
  let unregistered = 0;

  const byLesson = lessons.map((lesson) => {
    let lessonPresent = 0;
    let lessonAbsent = 0;
    for (const enrollment of input.enrollments) {
      if (
        !isTeachingEnrollmentEligible({
          kind: enrollment.kind,
          lessonDate: lesson.lessonDate,
          attendanceEligibleFrom: enrollment.attendanceEligibleFrom,
          removedAt: enrollment.removedAt,
        })
      ) {
        continue;
      }
      const status = marks.get(markKey(lesson.id, enrollment.id));
      if (status === 'present') {
        lessonPresent += 1;
        present += 1;
      } else if (status === 'absent') {
        lessonAbsent += 1;
        absent += 1;
      } else {
        unregistered += 1;
      }
    }
    return {
      lesson_id: lesson.id,
      lesson_date: lesson.lessonDate,
      start_time: lesson.startTime,
      title: lesson.title,
      present: lessonPresent,
      absent: lessonAbsent,
    };
  });

  const byEnrollment = active
    .filter((row): row is StatisticsEnrollmentInput & { kind: 'member' | 'guest' } =>
      row.kind === 'member' || row.kind === 'guest'
    )
    .map((enrollment) => {
      let rowPresent = 0;
      let rowAbsent = 0;
      let rowUnregistered = 0;
      for (const lesson of lessons) {
        if (
          !isTeachingEnrollmentEligible({
            kind: enrollment.kind,
            lessonDate: lesson.lessonDate,
            attendanceEligibleFrom: enrollment.attendanceEligibleFrom,
            removedAt: enrollment.removedAt,
          })
        ) {
          continue;
        }
        const status = marks.get(markKey(lesson.id, enrollment.id));
        if (status === 'present') rowPresent += 1;
        else if (status === 'absent') rowAbsent += 1;
        else rowUnregistered += 1;
      }
      return {
        enrollment_id: enrollment.id,
        display_name: enrollment.displayName,
        kind: enrollment.kind,
        present: rowPresent,
        absent: rowAbsent,
        unregistered: rowUnregistered,
        rate: attendanceRate(rowPresent, rowAbsent),
      };
    })
    .sort(compareEnrollments);

  return {
    enrollments: {
      active_members: active.filter((row) => row.kind === 'member').length,
      active_guests: active.filter((row) => row.kind === 'guest').length,
      queue: active.filter((row) => row.kind === 'possible_member').length,
    },
    lessons_count: lessons.length,
    attendance: { present, absent, unregistered },
    rate: attendanceRate(present, absent),
    by_lesson: byLesson,
    by_enrollment: byEnrollment,
  };
}
