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

describe('validateMember contact and gender', () => {
  it('rejects Não informado', () => {
    const { error } = validateMember({
      ...validMember,
      gender: 'Não informado',
    } as never);
    expect(error?.details.map((detail) => detail.message).join(' ')).toContain('Masculino ou Feminino');
  });

  it('requires a contact on create unless the minor exception is set', () => {
    const withoutContact = validateMember(validMember as never, { mode: 'create' });
    expect(withoutContact.error?.details.map((detail) => detail.message).join(' ')).toContain('menor de 18 anos');

    const withException = validateMember({
      ...validMember,
      minor_without_own_contact: true,
    } as never, { mode: 'create' });
    expect(withException.error).toBeUndefined();

    const withEmail = validateMember({
      ...validMember,
      email: 'ana@igreja.com',
    } as never, { mode: 'create' });
    expect(withEmail.error).toBeUndefined();
  });

  it('allows an update without contact', () => {
    const { error } = validateMember(validMember as never, { mode: 'update' });
    expect(error).toBeUndefined();
  });

  it('does not require contact on import', () => {
    const { error } = validateMember(validMember as never, { mode: 'import' });
    expect(error).toBeUndefined();
  });

  it('keeps the phone validation message', () => {
    const { error } = validateMember({
      ...validMember,
      phone: '123',
      email: 'ana@igreja.com',
    } as never, { mode: 'create' });
    expect(error?.details.map((detail) => detail.message).join(' ')).toContain('Telefone inválido');
  });
});
