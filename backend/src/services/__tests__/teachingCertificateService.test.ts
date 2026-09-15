import {
  CERTIFICATE_MAX_ENROLLMENTS,
  detectImageMime,
  isHexColor,
  parseEnrollmentIds,
  resolveCertificateStudents,
  slugifyForFilename,
  validateLogoBuffer,
} from '../teachingCertificateService';

describe('teachingCertificateService', () => {
  describe('parseEnrollmentIds', () => {
    it('parses JSON array string', () => {
      expect(parseEnrollmentIds('["a","b","a"]')).toEqual(['a', 'b']);
    });

    it('parses csv and arrays', () => {
      expect(parseEnrollmentIds('a, b;c')).toEqual(['a', 'b', 'c']);
      expect(parseEnrollmentIds(['x', 'y', 'x'])).toEqual(['x', 'y']);
    });
  });

  describe('isHexColor', () => {
    it('accepts #RRGGBB', () => {
      expect(isHexColor('#1E3A5F')).toBe(true);
      expect(isHexColor('#abc')).toBe(false);
      expect(isHexColor('1E3A5F')).toBe(false);
    });
  });

  describe('detectImageMime / validateLogoBuffer', () => {
    it('detects png magic bytes', () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      expect(detectImageMime(png)).toBe('image/png');
      expect(validateLogoBuffer(png, 'Logo').ok).toBe(true);
    });

    it('rejects empty or unknown buffers', () => {
      expect(validateLogoBuffer(undefined, 'Logo').ok).toBe(false);
      expect(validateLogoBuffer(Buffer.from('hello-world!!'), 'Logo').ok).toBe(false);
    });
  });

  describe('resolveCertificateStudents', () => {
    const rows = [
      { id: '1', kind: 'member', display_name: 'Ana', removed_at: null },
      { id: '2', kind: 'guest', display_name: 'Bruno', removed_at: null },
      { id: '3', kind: 'possible_member', display_name: 'Carla', removed_at: null },
    ];

    it('accepts member and guest in request order', () => {
      const result = resolveCertificateStudents(['2', '1'], rows);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.students.map((s) => s.id)).toEqual(['2', '1']);
      }
    });

    it('rejects possible_member', () => {
      const result = resolveCertificateStudents(['3'], rows);
      expect(result.ok).toBe(false);
    });

    it('rejects unknown ids and empty selection', () => {
      expect(resolveCertificateStudents([], rows).ok).toBe(false);
      expect(resolveCertificateStudents(['missing'], rows).ok).toBe(false);
    });

    it(`rejects more than ${CERTIFICATE_MAX_ENROLLMENTS} ids`, () => {
      const ids = Array.from({ length: CERTIFICATE_MAX_ENROLLMENTS + 1 }, (_, i) => String(i));
      expect(resolveCertificateStudents(ids, rows).ok).toBe(false);
    });
  });

  describe('slugifyForFilename', () => {
    it('slugifies accents', () => {
      expect(slugifyForFilename('Turma São José')).toBe('turma-sao-jose');
    });
  });
});
