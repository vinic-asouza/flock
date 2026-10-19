import { validateRegistrationLink } from '../registrationLinkValidator';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

function futureIso(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

describe('validateRegistrationLink', () => {
  it('should accept payload with required default_congregation_id', () => {
    const { error, value } = validateRegistrationLink({
      expires_at: futureIso(),
      default_congregation_id: VALID_UUID,
    });

    expect(error).toBeUndefined();
    expect(value.default_congregation_id).toBe(VALID_UUID);
  });

  it('should reject missing default_congregation_id', () => {
    const { error } = validateRegistrationLink({
      expires_at: futureIso(),
    });

    expect(error).toBeDefined();
    expect(error?.details.some((d) => d.message.includes('Congregação'))).toBe(true);
  });

  it('should reject null default_congregation_id', () => {
    const { error } = validateRegistrationLink({
      expires_at: futureIso(),
      default_congregation_id: null as unknown as string,
    });

    expect(error).toBeDefined();
  });

  it('should reject invalid default_congregation_id UUID', () => {
    const { error } = validateRegistrationLink({
      expires_at: futureIso(),
      default_congregation_id: 'not-a-uuid',
    });

    expect(error).toBeDefined();
  });
});
