# Validação de Senhas - Política de Segurança

## Visão Geral

O sistema implementa validações rigorosas de senhas tanto no frontend quanto no backend para garantir a segurança das contas de usuário.

## Critérios de Validação

### 1. Comprimento Mínimo
- **Requisito**: 8 caracteres mínimos
- **Aplicação**: Frontend e Backend
- **Justificativa**: Senhas mais longas são mais resistentes a ataques de força bruta

### 2. Complexidade Obrigatória
- **Requisito**: Pelo menos uma letra minúscula, uma maiúscula e um número
- **Regex**: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`
- **Aplicação**: Frontend e Backend
- **Justificativa**: Aumenta significativamente a entropia da senha

### 3. Validação Consistente
- **Frontend**: Validação em tempo real com Zod
- **Backend**: Validação no servidor com Joi
- **Sincronização**: Critérios idênticos em ambos os lados

## Implementação Técnica

### Backend

#### 1. Validador de Registro (`churchValidator.ts`)
```typescript
password: Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'A senha deve ter no mínimo 8 caracteres',
    'string.pattern.base': 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
    'any.required': 'Senha é obrigatória'
  })
```

#### 2. Validador de Alteração de Senha (`passwordValidator.ts`)
```typescript
newPassword: Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
    'string.pattern.base': 'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
    'any.required': 'Nova senha é obrigatória'
  })
```

#### 3. Validador de Reset de Senha (`passwordValidator.ts`)
```typescript
newPassword: Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
    'string.pattern.base': 'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
    'any.required': 'Nova senha é obrigatória'
  })
```

### Frontend

#### 1. Login (`login/page.tsx`)
```typescript
password: z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
```

#### 2. Registro (`register/page.tsx`)
```typescript
password: z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
confirmPassword: z.string()
  .min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A confirmação de senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
```

#### 3. Reset de Senha (`reset-password/page.tsx`)
```typescript
newPassword: z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
confirmPassword: z.string()
  .min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A confirmação de senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
```

## Rotas Afetadas

### Backend
- `POST /api/auth/register` - Registro de igreja
- `POST /api/password/change` - Alteração de senha
- `POST /api/password/reset` - Reset de senha

### Frontend
- `/login` - Página de login
- `/register` - Página de registro
- `/reset-password` - Página de reset de senha

## Mensagens de Erro

### Frontend
- **Comprimento**: "A senha deve ter pelo menos 8 caracteres"
- **Complexidade**: "A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"
- **Confirmação**: "As senhas não coincidem"

### Backend
- **Comprimento**: "A senha deve ter no mínimo 8 caracteres"
- **Complexidade**: "A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"
- **Obrigatório**: "Senha é obrigatória"

## Exemplos de Senhas

### ✅ Senhas Válidas
- `MinhaSenh@123` - 12 caracteres, maiúscula, minúscula, número
- `Password1` - 9 caracteres, maiúscula, minúscula, número
- `Teste123` - 8 caracteres, maiúscula, minúscula, número

### ❌ Senhas Inválidas
- `12345678` - Apenas números
- `password` - Apenas minúsculas
- `PASSWORD` - Apenas maiúsculas
- `Pass1` - Muito curta (5 caracteres)
- `MinhaSenha` - Sem números

## Segurança Implementada

### 1. Validação Dupla
- **Frontend**: Validação em tempo real para UX
- **Backend**: Validação no servidor para segurança
- **Benefício**: Previne envio de dados inválidos e garante segurança

### 2. Critérios Rigorosos
- **Comprimento**: 8 caracteres mínimos
- **Complexidade**: Múltiplos tipos de caracteres
- **Benefício**: Senhas resistentes a ataques de força bruta

### 3. Mensagens Claras
- **Específicas**: Indicam exatamente o que está faltando
- **Consistentes**: Mesma linguagem em frontend e backend
- **Benefício**: Melhor experiência do usuário

## Testes

### 1. Teste de Validação Frontend
```bash
# Testar senha muito curta
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123","confirmPassword":"123"}'

# Resposta esperada: Erro de validação no frontend
```

### 2. Teste de Validação Backend
```bash
# Testar senha sem complexidade
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678","name":"Igreja Teste","denomination":"Teste","address":"Rua Teste","city":"Cidade","state":"SP","cnpj":"12345678000123"}'

# Resposta esperada: 400 Bad Request com erro de validação
```

### 3. Teste de Senha Válida
```bash
# Testar senha válida
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"MinhaSenh@123","name":"Igreja Teste","denomination":"Teste","address":"Rua Teste","city":"Cidade","state":"SP","cnpj":"12345678000123"}'

# Resposta esperada: 201 Created
```

## Monitoramento

### 1. Métricas Importantes
- Número de tentativas de registro com senha inválida
- Tipos de erro mais comuns (comprimento vs complexidade)
- Taxa de sucesso de validação

### 2. Logs de Segurança
```typescript
// Exemplo de log de tentativa de senha inválida
console.log({
  event: 'password_validation_failed',
  reason: 'insufficient_complexity',
  timestamp: new Date().toISOString(),
  ip: req.ip
});
```

## Melhorias Futuras

### 1. Validações Adicionais
- **Caracteres especiais**: `!@#$%^&*()_+-=[]{}|;:,.<>?`
- **Palavras comuns**: Lista de senhas comuns a evitar
- **Histórico**: Não permitir reutilização de senhas recentes

### 2. Indicador de Força da Senha
```typescript
// Implementação futura
const passwordStrength = {
  weak: 0-2,
  medium: 3-4,
  strong: 5-6
};
```

### 3. Validação Progressiva
```typescript
// Validação em tempo real com feedback visual
const validatePasswordStrength = (password: string) => {
  // Retorna pontuação e sugestões
};
```

## Conformidade

### 1. Padrões de Segurança
- **OWASP**: Password Policy Guidelines
- **NIST**: Digital Identity Guidelines
- **ISO 27001**: Information Security Management

### 2. Regulamentações
- **LGPD**: Proteção de dados pessoais
- **PCI DSS**: Segurança de dados de cartão
- **SOX**: Controles internos

## Troubleshooting

### Problemas Comuns

1. **Usuário não consegue criar senha válida**
   - Verificar se critérios estão claros na interface
   - Adicionar indicador de força da senha
   - Fornecer exemplos de senhas válidas

2. **Validação inconsistente entre frontend e backend**
   - Verificar se regex são idênticas
   - Confirmar que mensagens são consistentes
   - Testar ambos os lados

3. **Senhas válidas sendo rejeitadas**
   - Verificar se regex está correta
   - Testar com diferentes caracteres
   - Verificar logs de erro

### Debug
```typescript
// Habilitar logs detalhados de validação
DEBUG=joi npm run dev
```

## Conclusão

A implementação de validação de senhas está **completa e segura** com:

✅ **Critérios rigorosos** de 8 caracteres + complexidade  
✅ **Validação dupla** frontend e backend  
✅ **Mensagens claras** para o usuário  
✅ **Consistência** entre todas as rotas  
✅ **Segurança robusta** contra senhas fracas  

O sistema agora garante que apenas senhas fortes sejam aceitas, protegendo as contas dos usuários contra ataques de força bruta.
