/**
 * Unit tests for BR-INT-002 name uniqueness (DEV-127).
 * Mocks the Supabase query chain used by validateIntegrationMemberNameUniqueness.
 */

const mockLimit = jest.fn();
const mockNeq = jest.fn();
const mockIlike = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { validateIntegrationMemberNameUniqueness } from '../integrationValidations';

type QueryResult = { data: Array<{ id: string; name: string }> | null; error: null };

function buildQuery(result: QueryResult) {
  // Chain mirrors production: from → select → eq → ilike → limit → (optional) neq → await
  const terminal: Record<string, unknown> = {
    then: (onFulfilled?: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  terminal.limit = mockLimit.mockImplementation(() => terminal);
  terminal.neq = mockNeq.mockImplementation(() => terminal);
  terminal.ilike = mockIlike.mockImplementation(() => terminal);
  terminal.eq = mockEq.mockImplementation(() => terminal);
  terminal.select = mockSelect.mockImplementation(() => terminal);
  mockFrom.mockReturnValue(terminal);
  return terminal;
}

describe('validateIntegrationMemberNameUniqueness', () => {
  const churchId = 'church-1';
  const selfId = 'member-self';
  const otherId = 'member-other';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject when a duplicate exists and no exclude is provided (create path)', async () => {
    buildQuery({
      data: [{ id: otherId, name: 'Maria Silva' }],
      error: null,
    });

    const result = await validateIntegrationMemberNameUniqueness('Maria Silva', churchId);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/Já existe um integrante/);
    expect(mockFrom).toHaveBeenCalledWith('integration_members');
    expect(mockNeq).not.toHaveBeenCalled();
  });

  it('should accept when the only match is the excluded id (update same name)', async () => {
    // With exclude applied, the query returns no other rows
    buildQuery({ data: [], error: null });

    const result = await validateIntegrationMemberNameUniqueness(
      'Maria Silva',
      churchId,
      selfId
    );

    expect(result.isValid).toBe(true);
    expect(mockNeq).toHaveBeenCalledWith('id', selfId);
  });

  it('should reject when another member already has the name even with exclude', async () => {
    buildQuery({
      data: [{ id: otherId, name: 'João Santos' }],
      error: null,
    });

    const result = await validateIntegrationMemberNameUniqueness(
      'João Santos',
      churchId,
      selfId
    );

    expect(result.isValid).toBe(false);
    expect(mockNeq).toHaveBeenCalledWith('id', selfId);
  });

  it('should accept empty name (schema validates required separately)', async () => {
    const result = await validateIntegrationMemberNameUniqueness('   ', churchId);
    expect(result.isValid).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
