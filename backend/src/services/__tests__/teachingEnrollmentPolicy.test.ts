import {
  decideLinkMemberResolve,
  shouldSkipPossibleMemberQueue,
} from '../teachingEnrollmentPolicy';

describe('shouldSkipPossibleMemberQueue', () => {
  it('should skip when every possible-member candidate is already enrolled', () => {
    expect(
      shouldSkipPossibleMemberQueue({
        kind: 'possible_member',
        candidateIds: ['m1', 'm2'],
        enrolledMemberIds: ['m1', 'm2'],
      })
    ).toBe(true);
  });

  it('should not skip when at least one candidate is still outside the class', () => {
    expect(
      shouldSkipPossibleMemberQueue({
        kind: 'possible_member',
        candidateIds: ['m1', 'm2'],
        enrolledMemberIds: ['m1'],
      })
    ).toBe(false);
  });

  it('should not skip guest or auto-member enrollments', () => {
    expect(
      shouldSkipPossibleMemberQueue({
        kind: 'guest',
        candidateIds: ['m1'],
        enrolledMemberIds: ['m1'],
      })
    ).toBe(false);
    expect(
      shouldSkipPossibleMemberQueue({
        kind: 'member',
        candidateIds: ['m1'],
        enrolledMemberIds: ['m1'],
      })
    ).toBe(false);
  });

  it('should not skip when there are no candidates', () => {
    expect(
      shouldSkipPossibleMemberQueue({
        kind: 'possible_member',
        candidateIds: [],
        enrolledMemberIds: ['m1'],
      })
    ).toBe(false);
  });
});

describe('decideLinkMemberResolve', () => {
  it('should dismiss the queue item when the member is already enrolled', () => {
    expect(decideLinkMemberResolve(true)).toBe('dismiss_already_enrolled');
  });

  it('should link when the member is not in the class yet', () => {
    expect(decideLinkMemberResolve(false)).toBe('link');
  });
});
