import { validateWaitlist } from '../waitlistValidator';

const validLead = {
  name: 'Ana Silva',
  email: 'ana@igreja.com',
  phone: '11999999999',
  churchName: 'Igreja Esperança',
  city: 'São Paulo',
  state: 'sp',
  plan: '200',
};

describe('validateWaitlist', () => {
  it('should accept plan 100', () => {
    const { error, value } = validateWaitlist({ ...validLead, plan: '100' });
    expect(error).toBeUndefined();
    expect(value.plan).toBe('100');
  });

  it('should reject a plan outside the waitlist list', () => {
    const { error } = validateWaitlist({ ...validLead, plan: 'custom' });
    expect(error).toBeDefined();
  });
});
