import { buildTeachingClassStatistics } from '../teachingStatisticsService';

const lesson = {
  id: 'lesson-1',
  lessonDate: '2026-09-20',
  startTime: '19:00:00',
  title: 'Aula 1',
};

function enrollment(
  id: string,
  kind: 'member' | 'guest' | 'possible_member',
  extra?: { removedAt?: string | null; from?: string | null; name?: string }
) {
  return {
    id,
    kind,
    displayName: extra?.name || id,
    attendanceEligibleFrom: extra?.from === undefined ? '2026-01-01' : extra.from,
    removedAt: extra?.removedAt ?? null,
  };
}

describe('buildTeachingClassStatistics', () => {
  it('ignores unregistered cells in the class rate', () => {
    const enrollments = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => enrollment(id, 'member'));
    const stats = buildTeachingClassStatistics({
      enrollments,
      lessons: [lesson],
      marks: [
        { lessonId: lesson.id, enrollmentId: 'a', status: 'present' },
        { lessonId: lesson.id, enrollmentId: 'b', status: 'present' },
        { lessonId: lesson.id, enrollmentId: 'c', status: 'absent' },
      ],
    });

    expect(stats.rate).toBe(67);
    expect(stats.attendance).toEqual({ present: 2, absent: 1, unregistered: 3 });
    expect(stats.by_lesson[0]).toMatchObject({ present: 2, absent: 1 });
  });

  it('returns a null rate when nothing was marked present or absent', () => {
    const stats = buildTeachingClassStatistics({
      enrollments: [enrollment('a', 'guest', { name: 'Ana' })],
      lessons: [lesson],
      marks: [],
    });

    expect(stats.rate).toBeNull();
    expect(stats.attendance.unregistered).toBe(1);
    expect(stats.by_lesson[0]).toMatchObject({ present: 0, absent: 0 });
    expect(stats.by_enrollment[0].rate).toBeNull();
  });

  it('keeps removed history in lesson totals and omits them from the student list', () => {
    const removed = enrollment('removed', 'member', {
      name: 'Removido',
      removedAt: '2026-09-21T12:00:00.000Z',
    });
    const active = enrollment('active', 'guest', { name: 'Ativo' });
    const stats = buildTeachingClassStatistics({
      enrollments: [removed, active],
      lessons: [lesson],
      marks: [
        { lessonId: lesson.id, enrollmentId: 'removed', status: 'present' },
        { lessonId: lesson.id, enrollmentId: 'active', status: 'absent' },
      ],
    });

    expect(stats.attendance).toEqual({ present: 1, absent: 1, unregistered: 0 });
    expect(stats.by_enrollment.map((row) => row.enrollment_id)).toEqual(['active']);
    expect(stats.enrollments.active_members).toBe(0);
    expect(stats.enrollments.active_guests).toBe(1);
  });

  it('excludes possible members and sorts the lowest rate first', () => {
    const stats = buildTeachingClassStatistics({
      enrollments: [
        enrollment('high', 'member', { name: 'Bia' }),
        enrollment('low', 'guest', { name: 'Ana' }),
        enrollment('queue', 'possible_member', { name: 'Fila', from: null }),
      ],
      lessons: [lesson],
      marks: [
        { lessonId: lesson.id, enrollmentId: 'high', status: 'present' },
        { lessonId: lesson.id, enrollmentId: 'low', status: 'absent' },
        { lessonId: lesson.id, enrollmentId: 'queue', status: 'present' },
      ],
    });

    expect(stats.enrollments.queue).toBe(1);
    expect(stats.attendance.present).toBe(1);
    expect(stats.by_enrollment.map((row) => row.enrollment_id)).toEqual(['low', 'high']);
    expect(stats.by_enrollment.map((row) => row.rate)).toEqual([0, 100]);
  });

  it('keeps enrollment cards when there are no lessons', () => {
    const stats = buildTeachingClassStatistics({
      enrollments: [enrollment('a', 'member'), enrollment('b', 'guest')],
      lessons: [],
      marks: [],
    });

    expect(stats.lessons_count).toBe(0);
    expect(stats.rate).toBeNull();
    expect(stats.by_lesson).toEqual([]);
    expect(stats.by_enrollment).toHaveLength(2);
    expect(stats.attendance).toEqual({ present: 0, absent: 0, unregistered: 0 });
  });
});
