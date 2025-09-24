/**
 * Validação de CNPJ com verificação de dígitos verificadores
 */

/**
 * Valida se um CNPJ é válido verificando os dígitos verificadores
 * @param cnpj - CNPJ como string (apenas números)
 * @returns true se o CNPJ for válido, false caso contrário
 */
export function isValidCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  // Verifica o primeiro dígito
  if (parseInt(cleanCNPJ[12]) !== firstDigit) {
    return false;
  }
  
  // Calcula o segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  // Verifica o segundo dígito
  if (parseInt(cleanCNPJ[13]) !== secondDigit) {
    return false;
  }
  
  return true;
}

/**
 * Formata um CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 * @param cnpj - CNPJ como string (apenas números)
 * @returns CNPJ formatado ou string vazia se inválido
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    return '';
  }
  
  return cleanCNPJ.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Remove formatação de um CNPJ (mantém apenas números)
 * @param cnpj - CNPJ formatado ou não
 * @returns CNPJ apenas com números
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Gera um CNPJ válido para testes
 * @returns CNPJ válido gerado
 */
export function generateValidCNPJ(): string {
  // Gera os primeiros 12 dígitos aleatoriamente
  let cnpj = '';
  for (let i = 0; i < 12; i++) {
    cnpj += Math.floor(Math.random() * 10).toString();
  }
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  cnpj += firstDigit.toString();
  
  // Calcula o segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  cnpj += secondDigit.toString();
  
  return cnpj;
}

/**
 * Valida e formata um CNPJ
 * @param cnpj - CNPJ como string
 * @returns Objeto com validação e formatação
 */
export function validateAndFormatCNPJ(cnpj: string): {
  isValid: boolean;
  formatted: string;
  clean: string;
  error?: string;
} {
  const clean = cleanCNPJ(cnpj);
  const isValid = isValidCNPJ(clean);
  const formatted = isValid ? formatCNPJ(clean) : '';
  
  let error: string | undefined;
  
  if (clean.length === 0) {
    error = 'CNPJ é obrigatório';
  } else if (clean.length !== 14) {
    error = 'CNPJ deve ter 14 dígitos';
  } else if (!/^[0-9]+$/.test(clean)) {
    error = 'CNPJ deve conter apenas números';
  } else if (!isValid) {
    error = 'CNPJ inválido - dígitos verificadores incorretos';
  }
  
  return {
    isValid,
    formatted,
    clean,
    error
  };
}
