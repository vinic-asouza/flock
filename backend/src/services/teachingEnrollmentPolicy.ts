export type TeachingEnrollmentKind = 'member' | 'guest' | 'possible_member';

/**
 * Public POST: do not insert a queue row when every possible-member
 * candidate is already enrolled in the class.
 */
export function shouldSkipPossibleMemberQueue(input: {
  kind: TeachingEnrollmentKind;
  candidateIds: string[];
  enrolledMemberIds: Iterable<string | null | undefined>;
}): boolean {
  if (input.kind !== 'possible_member') return false;

  const candidateIds = input.candidateIds.filter(Boolean);
  if (candidateIds.length === 0) return false;

  const enrolled = new Set(
    [...input.enrolledMemberIds].filter((id): id is string => Boolean(id))
  );
  return candidateIds.every((id) => enrolled.has(id));
}

export type LinkMemberResolveAction = 'dismiss_already_enrolled' | 'link';

/** Panel resolve: linking a member already in the class dismisses the queue item. */
export function decideLinkMemberResolve(alreadyEnrolled: boolean): LinkMemberResolveAction {
  return alreadyEnrolled ? 'dismiss_already_enrolled' : 'link';
}
