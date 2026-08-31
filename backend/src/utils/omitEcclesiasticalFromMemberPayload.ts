/** Questionário eclesiástico — fonte da verdade em integration_members (BR-INT-016). */
export const MEMBER_ECCLESIASTICAL_KEYS = [
  'years_evangelical',
  'evangelical_family',
  'is_baptized',
  'baptism_type',
  'baptism_other_church_name',
  'previous_religion',
  'previous_church_active',
  'reason_joining',
  'time_attending',
  'sunday_attendance',
  'weekly_activities',
  'weekly_activities_which',
] as const;

export function omitEcclesiasticalFromMemberPayload<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const key of MEMBER_ECCLESIASTICAL_KEYS) {
    delete next[key];
  }
  return next;
}
