import {
  matchEnrollment,
  nameMatches,
  normalizeTeachingName,
  normalizeWhatsAppDigits,
  whatsappLast4National,
} from '../teachingMatchService';

describe('normalizeTeachingName', () => {
  it('strips accents and particles and requires 2+ tokens', () => {
    expect(normalizeTeachingName('José da Silva')).toEqual(['jose', 'silva']);
    expect(normalizeTeachingName('José')).toEqual([]);
    expect(normalizeTeachingName('Maria de Souza e Santos')).toEqual(['maria', 'souza', 'santos']);
  });
});

describe('nameMatches', () => {
  it('matches partial names in both directions', () => {
    expect(nameMatches(['jose', 'pereira'], ['jose', 'pereira', 'silva'])).toBe(true);
    expect(nameMatches(['jose', 'pereira', 'silva'], ['jose', 'pereira'])).toBe(true);
    expect(nameMatches(['jose', 'souza'], ['jose', 'pereira'])).toBe(false);
  });
});

describe('whatsapp helpers', () => {
  it('normalizes digits and strips country 55', () => {
    expect(normalizeWhatsAppDigits('(11) 98765-4321')).toBe('11987654321');
    expect(whatsappLast4National('5511987654321')).toBe('4321');
    expect(whatsappLast4National('11987654321')).toBe('4321');
  });
});

describe('matchEnrollment', () => {
  const members = [
    {
      id: 'm1',
      name: 'José Pereira Silva',
      whatsapp: '11987654321',
      birth: '1990-05-10',
    },
    {
      id: 'm2',
      name: 'Ana Souza',
      whatsapp: null,
      birth: '1992-01-01',
    },
    {
      id: 'm3',
      name: 'José Pereira Silva',
      whatsapp: '11987654321',
      birth: '1990-05-10',
    },
  ];

  it('auto-links unique strong match N+W+D', () => {
    const result = matchEnrollment(
      { fullName: 'José Pereira', whatsapp: '11987654321', birthDate: '1990-05-10' },
      [members[0], members[1]]
    );
    expect(result.kind).toBe('member');
    expect(result.memberId).toBe('m1');
  });

  it('queues when strong match has multiple candidates', () => {
    const result = matchEnrollment(
      { fullName: 'José Pereira Silva', whatsapp: '5511987654321', birthDate: '1990-05-10' },
      members
    );
    expect(result.kind).toBe('possible_member');
    expect(result.candidates).toHaveLength(2);
  });

  it('queues on N+D without W', () => {
    const result = matchEnrollment(
      { fullName: 'Ana Souza', whatsapp: '11999999999', birthDate: '1992-01-01' },
      members
    );
    expect(result.kind).toBe('possible_member');
    expect(result.candidates[0].id).toBe('m2');
  });

  it('creates guest when only name matches', () => {
    const result = matchEnrollment(
      { fullName: 'José Pereira', whatsapp: '11888888888', birthDate: '2000-01-01' },
      [members[0]]
    );
    expect(result.kind).toBe('guest');
  });

  it('creates guest when name has less than 2 tokens', () => {
    const result = matchEnrollment(
      { fullName: 'José', whatsapp: '11987654321', birthDate: '1990-05-10' },
      [members[0]]
    );
    expect(result.kind).toBe('guest');
  });

  it('queues on N+W without D', () => {
    const result = matchEnrollment(
      { fullName: 'José Pereira', whatsapp: '11987654321', birthDate: '2001-01-01' },
      [members[0]]
    );
    expect(result.kind).toBe('possible_member');
    expect(result.candidates[0].signals).toEqual({ N: true, W: true, D: false });
  });

  it('treats member without whatsapp/phone as W=false', () => {
    const result = matchEnrollment(
      {
        fullName: 'Carlos Lima',
        whatsapp: '11987654321',
        birthDate: '1988-03-03',
      },
      [{ id: 'm4', name: 'Carlos Lima', birth: '1988-03-03' }]
    );
    expect(result.kind).toBe('possible_member');
    expect(result.candidates[0].signals.W).toBe(false);
    expect(result.candidates[0].signals.D).toBe(true);
  });

  it('uses phone when member whatsapp is missing', () => {
    const result = matchEnrollment(
      {
        fullName: 'José Pereira',
        whatsapp: '11987654321',
        birthDate: '1990-05-10',
      },
      [
        {
          id: 'm5',
          name: 'José Pereira Silva',
          phone: '11987654321',
          birth: '1990-05-10',
        },
      ]
    );
    expect(result.kind).toBe('member');
    expect(result.memberId).toBe('m5');
  });
});
