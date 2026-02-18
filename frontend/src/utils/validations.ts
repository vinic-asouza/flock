/**
 * Funções utilitárias de validação
 */

/**
 * Valida CPF (Cadastro de Pessoa Física)
 * @param cpf - CPF sem formatação (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

/**
 * Valida CNPJ (Cadastro Nacional de Pessoa Jurídica)
 * @param cnpj - CNPJ sem formatação (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove formatação
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;

  // Verifica se todos os dígitos são iguais (ex: 11.111.111/1111-11)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Valida primeiro dígito verificador
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Valida segundo dígito verificador
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ (detecta automaticamente pelo tamanho)
 * @param document - CPF ou CNPJ sem formatação
 * @returns true se válido, false caso contrário
 */
export function validateCPFOrCNPJ(document: string): boolean {
  const clean = document.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return validateCPF(clean);
  } else if (clean.length === 14) {
    return validateCNPJ(clean);
  }
  
  return false;
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 * @param phone - Telefone sem formatação (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  
  // Telefone fixo: 10 dígitos (DDD + 8 dígitos)
  // Celular: 11 dígitos (DDD + 9 dígitos começando com 9)
  if (clean.length === 10) {
    return true; // Telefone fixo válido
  } else if (clean.length === 11) {
    // Celular deve começar com 9 após o DDD
    return clean.charAt(2) === '9';
  }
  
  return false;
}

/**
 * Valida CEP brasileiro (8 dígitos)
 * @param cep - CEP sem formatação (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validateCEP(cep: string): boolean {
  const clean = cep.replace(/\D/g, '');
  
  // CEP deve ter exatamente 8 dígitos
  if (clean.length !== 8) return false;
  
  // CEP não pode ser todos zeros
  if (/^0+$/.test(clean)) return false;
  
  return true;
}

/**
 * Consulta CEP na API ViaCEP
 * @param cep - CEP sem formatação (apenas números)
 * @returns Promise com dados do CEP ou null se inválido
 */
export async function fetchCEPData(cep: string): Promise<{
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
} | null> {
  const clean = cep.replace(/\D/g, '');
  
  if (!validateCEP(clean)) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await response.json();
    
    // ViaCEP retorna erro quando CEP não existe
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch {
    // Silenciar erro - não crítico, CEP é opcional
    return null;
  }
}

/**
 * Valida se a data está no formato exato DD/MM/YYYY
 * @param dateString - Data no formato DD/MM/YYYY
 * @returns true se válido, false caso contrário
 */
export function validateDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Deve ter exatamente 10 caracteres (DD/MM/YYYY)
  if (dateString.length !== 10) {
    return false;
  }

  // Deve seguir o padrão DD/MM/YYYY
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(datePattern);
  
  if (!match) {
    return false;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validar ranges
  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  // Validar ano (deve ser entre 1900 e ano atual + 1)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 1) {
    return false;
  }

  // Validar se a data existe (ex: 31/02/2024 não existe)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return true;
}
