import { omitEcclesiasticalFromMemberPayload } from '../omitEcclesiasticalFromMemberPayload';

describe('omitEcclesiasticalFromMemberPayload', () => {
  it('should strip questionnaire keys and keep member fields', () => {
    const result = omitEcclesiasticalFromMemberPayload({
      name: 'Maria Silva',
      admission: 'Batismo',
      congregation_id: '11111111-1111-4111-8111-111111111111',
      years_evangelical: '10',
      evangelical_family: true,
      is_baptized: true,
      baptism_type: 'catolica',
      baptism_other_church_name: 'Paróquia Central',
      previous_religion: 'Católica',
      previous_church_active: false,
      reason_joining: 'Acolhimento',
      time_attending: '2 anos',
      sunday_attendance: 'regularmente',
      weekly_activities: true,
      weekly_activities_which: 'Célula',
    });

    expect(result).toEqual({
      name: 'Maria Silva',
      admission: 'Batismo',
      congregation_id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('should return a shallow copy when no questionnaire keys are present', () => {
    const payload = { name: 'João', active: true };
    const result = omitEcclesiasticalFromMemberPayload(payload);

    expect(result).toEqual(payload);
    expect(result).not.toBe(payload);
  });
});
