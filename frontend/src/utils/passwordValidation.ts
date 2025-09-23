// Utilitários para validação de senhas no frontend

export const passwordValidation = {
  // Critérios de validação de senha
  minLength: 8,
  
  // Regex para validar senha forte
  strongPasswordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  
  // Mensagens de erro
  messages: {
    minLength: 'A senha deve ter pelo menos 8 caracteres',
    strongPassword: 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
    required: 'Senha é obrigatória',
    confirmPassword: 'As senhas não coincidem'
  },
  
  // Função para validar senha
  validate: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!password) {
      errors.push(passwordValidation.messages.required);
      return { isValid: false, errors };
    }
    
    if (password.length < passwordValidation.minLength) {
      errors.push(passwordValidation.messages.minLength);
    }
    
    if (!passwordValidation.strongPasswordRegex.test(password)) {
      errors.push(passwordValidation.messages.strongPassword);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Função para validar confirmação de senha
  validateConfirmation: (password: string, confirmPassword: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    const passwordValidationResult = passwordValidation.validate(password);
    if (!passwordValidationResult.isValid) {
      errors.push(...passwordValidationResult.errors);
    }
    
    if (password !== confirmPassword) {
      errors.push(passwordValidation.messages.confirmPassword);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Schema Zod para validação de senha
export const passwordSchema = {
  minLength: passwordValidation.minLength,
  strongPasswordRegex: passwordValidation.strongPasswordRegex,
  messages: passwordValidation.messages
};
