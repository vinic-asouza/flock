import { validateIntegrationMember } from '../integrationMemberValidator';

describe('validateIntegrationMember ecclesiastical questionnaire', () => {
  const base = { name: 'Maria Silva' };

  it('accepts a payload without questionnaire fields', () => {
    const { error } = validateIntegrationMember(base);
    expect(error).toBeUndefined();
  });

  it('accepts optional questionnaire values', () => {
    const { error, value } = validateIntegrationMember({
      ...base,
      years_evangelical: '5',
      evangelical_family: true,
      is_baptized: true,
      baptism_type: 'adulto_outra_igreja',
      baptism_other_church_name: 'Igreja Central',
      previous_church_active: false,
      reason_joining: 'Acolhimento',
      time_attending: '2 anos',
      sunday_attendance: 'regularmente',
      weekly_activities: true,
      weekly_activities_which: 'Célula',
    });
    expect(error).toBeUndefined();
    expect(value.baptism_type).toBe('adulto_outra_igreja');
    expect(value.sunday_attendance).toBe('regularmente');
  });

  it('converts empty enum strings to undefined so CHECK is not violated', () => {
    const { error, value } = validateIntegrationMember({
      ...base,
      baptism_type: '',
      sunday_attendance: '',
      years_evangelical: '',
    } as never);
    expect(error).toBeUndefined();
    expect(value.baptism_type).toBeUndefined();
    expect(value.sunday_attendance).toBeUndefined();
    expect(value.years_evangelical).toBeUndefined();
  });

  it('rejects an invalid baptism_type', () => {
    const { error } = validateIntegrationMember({
      ...base,
      baptism_type: 'invalido',
    } as never);
    expect(error).toBeDefined();
    expect(error?.details.some((d) => d.message.includes('Tipo de batismo'))).toBe(true);
  });

  it('rejects an invalid sunday_attendance', () => {
    const { error } = validateIntegrationMember({
      ...base,
      sunday_attendance: 'sempre',
    } as never);
    expect(error).toBeDefined();
    expect(error?.details.some((d) => d.message.includes('Frequência de cultos'))).toBe(true);
  });
});
