import {
  birthKey,
  collectDuplicateWarnings,
  normalizeMemberName,
  resolveConsentForCreate,
  resolveConsentForUpdate,
} from '../memberIdentity';

describe('memberIdentity', () => {
  it('normalizes accents, case and extra spaces', () => {
    expect(normalizeMemberName('  José   da   SILVA ')).toBe('jose da silva');
  });

  it('warns on the same normalized name and birth date', () => {
    const warnings = collectDuplicateWarnings(
      { name: 'José Silva', birth: '1990-01-15', email: '' },
      [{ id: '1', name: 'jose  silva', birth: '1990-01-15T00:00:00.000Z', email: null }]
    );
    expect(warnings).toEqual(['name_birth']);
  });

  it('does not warn when only the name matches', () => {
    const warnings = collectDuplicateWarnings(
      { name: 'José Silva', birth: '1991-01-15', email: '' },
      [{ id: '1', name: 'José Silva', birth: '1990-01-15', email: null }]
    );
    expect(warnings).toEqual([]);
  });

  it('warns on a shared email without exposing the other member', () => {
    const warnings = collectDuplicateWarnings(
      { name: 'Ana', birth: '2000-02-02', email: ' Casa@Igreja.com ' },
      [{ id: '1', name: 'Outra', birth: '1980-01-01', email: 'casa@igreja.com' }]
    );
    expect(warnings).toEqual(['email']);
  });

  it('ignores the member being edited', () => {
    const warnings = collectDuplicateWarnings(
      { name: 'Ana', birth: '2000-02-02', email: 'ana@igreja.com' },
      [{ id: '1', name: 'Ana', birth: '2000-02-02', email: 'ana@igreja.com' }],
      '1'
    );
    expect(warnings).toEqual([]);
  });

  it('keeps an existing consent when the checkbox stays marked', () => {
    const resolved = resolveConsentForUpdate(true, {
      communication_consent_at: '2020-01-01T00:00:00.000Z',
      communication_consent_source: 'public',
    });
    expect(resolved).toEqual({
      communication_consent_at: '2020-01-01T00:00:00.000Z',
      communication_consent_source: 'public',
    });
  });

  it('clears consent when unmarked and stamps import on create', () => {
    expect(resolveConsentForUpdate(false, {
      communication_consent_at: '2020-01-01T00:00:00.000Z',
      communication_consent_source: 'public',
    })).toEqual({
      communication_consent_at: null,
      communication_consent_source: null,
    });
    const created = resolveConsentForCreate(true, 'import', new Date('2026-10-26T12:00:00.000Z'));
    expect(created.communication_consent_source).toBe('import');
    expect(created.communication_consent_at).toBe('2026-10-26T12:00:00.000Z');
  });

  it('reads a date prefix from birth values', () => {
    expect(birthKey(new Date('1990-05-20T00:00:00.000Z'))).toBe('1990-05-20');
    expect(birthKey('1990-05-20')).toBe('1990-05-20');
  });
});
