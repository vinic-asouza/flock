import {
  attendanceRemovedAtOrFilter,
  isTeachingEnrollmentEligible,
} from '../teachingAttendanceEligibility';

describe('attendanceRemovedAtOrFilter', () => {
  it('excludes removals on the lesson day by requiring removed_at on the next day', () => {
    expect(attendanceRemovedAtOrFilter('2026-09-14')).toBe(
      'removed_at.is.null,removed_at.gte.2026-09-15T00:00:00.000Z'
    );
  });

  it('rolls over month boundaries', () => {
    expect(attendanceRemovedAtOrFilter('2026-09-30')).toBe(
      'removed_at.is.null,removed_at.gte.2026-10-01T00:00:00.000Z'
    );
  });
});

describe('isTeachingEnrollmentEligible', () => {
  it('accepts effective enrollments inside their lifecycle', () => {
    expect(
      isTeachingEnrollmentEligible({
        kind: 'member',
        lessonDate: '2026-09-20',
        attendanceEligibleFrom: '2026-09-14',
        removedAt: null,
      })
    ).toBe(true);
  });

  it('rejects possible members until resolution', () => {
    expect(
      isTeachingEnrollmentEligible({
        kind: 'possible_member',
        lessonDate: '2026-09-20',
        attendanceEligibleFrom: null,
        removedAt: null,
      })
    ).toBe(false);
  });

  it('does not grant retroactive eligibility after resolution', () => {
    expect(
      isTeachingEnrollmentEligible({
        kind: 'guest',
        lessonDate: '2026-09-13',
        attendanceEligibleFrom: '2026-09-14',
        removedAt: null,
      })
    ).toBe(false);
  });

  it('keeps history before removal and rejects removal day onward', () => {
    const base = {
      kind: 'member' as const,
      attendanceEligibleFrom: '2026-01-01',
      removedAt: '2026-09-14T12:00:00.000Z',
    };

    expect(isTeachingEnrollmentEligible({ ...base, lessonDate: '2026-09-13' })).toBe(true);
    expect(isTeachingEnrollmentEligible({ ...base, lessonDate: '2026-09-14' })).toBe(false);
  });
});
