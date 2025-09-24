import { isValidCNPJ, formatCNPJ, cleanCNPJ, generateValidCNPJ, validateAndFormatCNPJ } from '../src/validators/cnpjValidator';

describe('CNPJ Validator', () => {
  describe('isValidCNPJ', () => {
    it('should validate correct CNPJ', () => {
      // CNPJ válido: 11.222.333/0001-81
      expect(isValidCNPJ('11222333000181')).toBe(true);
    });

    it('should reject CNPJ with all same digits', () => {
      expect(isValidCNPJ('11111111111111')).toBe(false);
      expect(isValidCNPJ('00000000000000')).toBe(false);
    });

    it('should reject CNPJ with wrong length', () => {
      expect(isValidCNPJ('1234567890123')).toBe(false); // 13 dígitos
      expect(isValidCNPJ('123456789012345')).toBe(false); // 15 dígitos
    });

    it('should reject CNPJ with invalid check digits', () => {
      // CNPJ com dígitos verificadores incorretos
      expect(isValidCNPJ('11222333000182')).toBe(false);
      expect(isValidCNPJ('11222333000180')).toBe(false);
    });

    it('should handle CNPJ with non-numeric characters', () => {
      expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
      expect(isValidCNPJ('11 222 333 0001 81')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidCNPJ('')).toBe(false);
    });

    it('should reject CNPJ with letters', () => {
      expect(isValidCNPJ('1122233300018a')).toBe(false);
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ correctly', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('should return empty string for invalid CNPJ', () => {
      expect(formatCNPJ('1234567890123')).toBe('');
      expect(formatCNPJ('')).toBe('');
    });
  });

  describe('cleanCNPJ', () => {
    it('should remove all non-numeric characters', () => {
      expect(cleanCNPJ('11.222.333/0001-81')).toBe('11222333000181');
      expect(cleanCNPJ('11 222 333 0001 81')).toBe('11222333000181');
      expect(cleanCNPJ('11-222-333-0001-81')).toBe('11222333000181');
    });

    it('should handle already clean CNPJ', () => {
      expect(cleanCNPJ('11222333000181')).toBe('11222333000181');
    });
  });

  describe('generateValidCNPJ', () => {
    it('should generate valid CNPJ', () => {
      const cnpj = generateValidCNPJ();
      expect(cnpj).toHaveLength(14);
      expect(isValidCNPJ(cnpj)).toBe(true);
    });

    it('should generate different CNPJs', () => {
      const cnpj1 = generateValidCNPJ();
      const cnpj2 = generateValidCNPJ();
      expect(cnpj1).not.toBe(cnpj2);
    });
  });

  describe('validateAndFormatCNPJ', () => {
    it('should validate and format valid CNPJ', () => {
      const result = validateAndFormatCNPJ('11222333000181');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('11.222.333/0001-81');
      expect(result.clean).toBe('11222333000181');
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid CNPJ', () => {
      const result = validateAndFormatCNPJ('11222333000182');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('');
      expect(result.clean).toBe('11222333000182');
      expect(result.error).toBe('CNPJ inválido - dígitos verificadores incorretos');
    });

    it('should handle empty CNPJ', () => {
      const result = validateAndFormatCNPJ('');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('');
      expect(result.clean).toBe('');
      expect(result.error).toBe('CNPJ é obrigatório');
    });

    it('should handle CNPJ with wrong length', () => {
      const result = validateAndFormatCNPJ('1234567890123');
      expect(result.isValid).toBe(false);
      expect(result.formatted).toBe('');
      expect(result.clean).toBe('1234567890123');
      expect(result.error).toBe('CNPJ deve ter 14 dígitos');
    });
  });

  describe('Real CNPJ examples', () => {
    it('should validate known valid CNPJs', () => {
      // CNPJs válidos conhecidos
      const validCNPJs = [
        '11222333000181', // Exemplo 1
        '11444777000161', // Exemplo 2
        '12345678000195', // Exemplo 3
      ];

      validCNPJs.forEach(cnpj => {
        expect(isValidCNPJ(cnpj)).toBe(true);
      });
    });

    it('should reject known invalid CNPJs', () => {
      // CNPJs inválidos conhecidos
      const invalidCNPJs = [
        '11222333000182', // Dígito verificador incorreto
        '11444777000162', // Dígito verificador incorreto
        '12345678000196', // Dígito verificador incorreto
        '11111111111111', // Todos os dígitos iguais
        '00000000000000', // Todos os dígitos iguais
      ];

      invalidCNPJs.forEach(cnpj => {
        expect(isValidCNPJ(cnpj)).toBe(false);
      });
    });
  });
});
