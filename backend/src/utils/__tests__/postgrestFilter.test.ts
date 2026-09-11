import {
  buildIlikeContainsOrFilter,
  escapeIlikePattern,
  sanitizePostgrestOrValue,
  toIlikeContains,
} from '../postgrestFilter';

describe('sanitizePostgrestOrValue', () => {
  it('should strip commas and parentheses used by PostgREST or()', () => {
    expect(sanitizePostgrestOrValue('Foo, (Bar)')).toBe('Foo Bar');
  });
});

describe('escapeIlikePattern', () => {
  it('should escape LIKE wildcards', () => {
    expect(escapeIlikePattern('100%_off')).toBe('100\\%\\_off');
  });
});

describe('toIlikeContains', () => {
  it('should wrap a sanitized term for contains match', () => {
    expect(toIlikeContains('  IPI  ')).toBe('%IPI%');
  });

  it('should return null when the term is only reserved characters', () => {
    expect(toIlikeContains(',()')).toBeNull();
    expect(toIlikeContains('   ')).toBeNull();
  });
});

describe('buildIlikeContainsOrFilter', () => {
  it('should quote a sanitized contains pattern per column', () => {
    expect(buildIlikeContainsOrFilter(['full_name', 'email'], 'Ana, (Silva)')).toBe(
      'full_name.ilike."%Ana Silva%",email.ilike."%Ana Silva%"'
    );
  });

  it('should escape LIKE wildcards inside the quoted pattern', () => {
    expect(buildIlikeContainsOrFilter(['whatsapp'], '100%_off')).toBe(
      'whatsapp.ilike."%100\\%\\_off%"'
    );
  });

  it('should return null when the term is unusable', () => {
    expect(buildIlikeContainsOrFilter(['full_name'], ',()')).toBeNull();
    expect(buildIlikeContainsOrFilter([], 'Ana')).toBeNull();
  });
});
