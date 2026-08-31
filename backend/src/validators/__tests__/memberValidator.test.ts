import { validateMember } from '../memberValidator';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const validMember = {
  name: 'João Silva',
  birth: '1990-01-15',
  gender: 'Masculino',
  marital_status: 'Solteiro',
  address: 'Rua das Flores',
  city: 'São Paulo',
  state: 'SP',
  admission: 'Batismo',
  admission_date: '2020-05-10',
  congregation_id: VALID_UUID,
  active: true,
};

describe('validateMember ecclesiastical questionnaire', () => {
  it('accepts a member payload without questionnaire fields', () => {
    const { error } = validateMember(validMember as never);
    expect(error).toBeUndefined();
  });

  it('rejects years_evangelical on member payload', () => {
    const { error } = validateMember({
      ...validMember,
      years_evangelical: '10',
    } as never);
    expect(error).toBeDefined();
  });

  it('rejects baptism_type on member payload', () => {
    const { error } = validateMember({
      ...validMember,
      baptism_type: 'catolica',
    } as never);
    expect(error).toBeDefined();
  });

  it('rejects sunday_attendance on member payload', () => {
    const { error } = validateMember({
      ...validMember,
      sunday_attendance: 'regularmente',
    } as never);
    expect(error).toBeDefined();
  });
});
