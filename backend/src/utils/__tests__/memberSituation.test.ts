import {
  activeToSituation,
  isMemberSituation,
  memberSituationLabel,
  resolveSituationFromStatusBody,
  situationToActive,
  situationWriteFields,
} from '../memberSituation';

describe('memberSituation', () => {
  it('maps situation to active', () => {
    expect(situationToActive('ativo')).toBe(true);
    expect(situationToActive('inativo')).toBe(false);
    expect(situationToActive('transferido')).toBe(false);
    expect(situationToActive('desligado')).toBe(false);
    expect(situationToActive('falecido')).toBe(false);
  });

  it('maps active boolean to Ativo/Inativo', () => {
    expect(activeToSituation(true)).toBe('ativo');
    expect(activeToSituation(false)).toBe('inativo');
  });

  it('validates situation values', () => {
    expect(isMemberSituation('ativo')).toBe(true);
    expect(isMemberSituation('falecido')).toBe(true);
    expect(isMemberSituation('pending')).toBe(false);
    expect(isMemberSituation(null)).toBe(false);
  });

  it('resolves PATCH body preferring situation', () => {
    expect(resolveSituationFromStatusBody({ situation: 'transferido', active: true })).toEqual({
      ok: true,
      situation: 'transferido',
    });
    expect(resolveSituationFromStatusBody({ active: false })).toEqual({
      ok: true,
      situation: 'inativo',
    });
    expect(resolveSituationFromStatusBody({}).ok).toBe(false);
    expect(resolveSituationFromStatusBody({ situation: 'xyz' }).ok).toBe(false);
  });

  it('labels with active fallback', () => {
    expect(memberSituationLabel('desligado')).toBe('Desligado');
    expect(memberSituationLabel(null, true)).toBe('Ativo');
    expect(memberSituationLabel(undefined, false)).toBe('Inativo');
  });

  it('builds write fields with derived active', () => {
    const fields = situationWriteFields('falecido', '2026-11-23T12:00:00.000Z');
    expect(fields).toEqual({
      situation: 'falecido',
      active: false,
      situation_changed_at: '2026-11-23T12:00:00.000Z',
    });
  });
});
