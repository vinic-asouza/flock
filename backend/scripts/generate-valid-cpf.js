/**
 * Gera CPF válido
 */
function generateCPF() {
  // Gera 9 dígitos aleatórios
  const digits = [];
  for (let i = 0; i < 9; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let remainder = sum % 11;
  digits.push(remainder < 2 ? 0 : 11 - remainder);

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  remainder = sum % 11;
  digits.push(remainder < 2 ? 0 : 11 - remainder);

  return digits.join('');
}

// Testa se o CPF gerado é válido
function validateCPF(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // Todos os dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(cpf[9]) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(cpf[10]) !== digit2) return false;

  return true;
}

// Gera CPFs válidos
const cpfs = [];
for (let i = 0; i < 35; i++) {
  let cpf;
  do {
    cpf = generateCPF();
  } while (!validateCPF(cpf) || cpfs.includes(cpf));
  cpfs.push(cpf);
}

console.log('CPFs válidos gerados:');
cpfs.forEach((cpf, index) => {
  console.log(`${index + 1}: ${cpf}`);
});

// Exporta para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateCPF, validateCPF };
}

