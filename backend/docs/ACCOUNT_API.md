# API de Gerenciamento de Conta

Esta documentação descreve os endpoints para gerenciamento de conta do usuário.

## Base URL
```
/api/account
```

## Autenticação
Todos os endpoints requerem autenticação via token JWT no header `Authorization: Bearer <token>`.

## Endpoints

### 1. Buscar Dados da Conta
**GET** `/api/account`

Retorna os dados da conta do usuário autenticado.

**Resposta de Sucesso (200):**
```json
{
  "message": "Dados da conta recuperados com sucesso",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+5511999999999",
    "email_confirmed_at": "2024-01-01T00:00:00Z",
    "phone_confirmed_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "last_sign_in_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Alterar Email
**PUT** `/api/account/email`

Altera o email da conta do usuário.

**Body:**
```json
{
  "newEmail": "novo@email.com",
  "password": "senha_atual"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Email alterado com sucesso",
  "details": "Um email de confirmação foi enviado para o novo endereço. Verifique sua caixa de entrada."
}
```

**Validações:**
- `newEmail`: Deve ser um email válido
- `password`: Senha atual obrigatória

### 3. Alterar Senha
**PUT** `/api/account/password`

Altera a senha da conta do usuário.

**Body:**
```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha_forte"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Senha alterada com sucesso",
  "details": "Sua senha foi atualizada. Use a nova senha para seus próximos logins."
}
```

**Validações:**
- `currentPassword`: Senha atual obrigatória
- `newPassword`: Mínimo 8 caracteres, deve conter pelo menos uma letra minúscula, uma maiúscula e um número

### 4. Alterar Telefone
**PUT** `/api/account/phone`

Altera o telefone da conta do usuário.

**Body:**
```json
{
  "newPhone": "+5511999999999",
  "password": "senha_atual"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Telefone alterado com sucesso",
  "details": "Seu telefone foi atualizado com sucesso."
}
```

### 5. Excluir Conta
**DELETE** `/api/account`

Exclui permanentemente a conta do usuário.

**Body:**
```json
{
  "password": "senha_atual",
  "confirmation": "EXCLUIR CONTA"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Conta excluída com sucesso",
  "details": "Sua conta e todos os dados associados foram permanentemente removidos."
}
```

**Validações:**
- `password`: Senha atual obrigatória
- `confirmation`: Deve ser exatamente "EXCLUIR CONTA"

### 6. Reenviar Confirmação de Email
**POST** `/api/account/resend-confirmation`

Reenvia o email de confirmação para o usuário.

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Email de confirmação reenviado",
  "details": "Verifique sua caixa de entrada para confirmar seu email."
}
```

## Rate Limiting

- **Operações gerais**: 20 operações por IP em 15 minutos
- **Operações sensíveis** (alterar email, senha, excluir conta): 5 operações por IP em 1 hora

## Códigos de Erro

### 400 - Bad Request
```json
{
  "error": "Dados inválidos",
  "details": ["Lista de erros de validação"]
}
```

### 401 - Unauthorized
```json
{
  "error": "Não autorizado",
  "details": "Usuário não está autenticado"
}
```

### 404 - Not Found
```json
{
  "error": "Usuário não encontrado",
  "details": "Não foi possível encontrar os dados do usuário"
}
```

### 429 - Too Many Requests
```json
{
  "error": "Muitas operações na conta",
  "details": "Você excedeu o limite de operações. Tente novamente em 15 minutos."
}
```

### 500 - Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "details": "Mensagem de erro específica"
}
```

## Segurança

- Todas as operações sensíveis requerem confirmação da senha atual
- Rate limiting implementado para prevenir ataques de força bruta
- Validação rigorosa de dados de entrada
- Exclusão de conta requer confirmação explícita
- Integração com Supabase Auth para operações de autenticação
