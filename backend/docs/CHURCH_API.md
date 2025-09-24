# API de Gerenciamento da Igreja

Este documento descreve as rotas disponíveis para o gerenciamento dos dados da igreja.

## Base URL
```
/api/church
```

## Autenticação
Todas as rotas requerem autenticação. O token deve ser enviado via:
- Cookie: `access_token` (preferencial)
- Header: `Authorization: Bearer <token>` (fallback)

## Rotas Disponíveis

### 1. Buscar Dados da Igreja
**GET** `/api/church/`

Retorna os dados da igreja do usuário autenticado.

#### Resposta de Sucesso (200)
```json
{
  "message": "Dados da igreja recuperados com sucesso",
  "church": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Nome da Igreja",
    "denomination": "Denominação",
    "address": "Endereço",
    "city": "Cidade",
    "state": "SP",
    "cnpj": "12345678000195",
    "email_church": "contato@igreja.com",
    "phone_church": "11999999999",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Respostas de Erro
- **401**: Não autorizado
- **404**: Igreja não encontrada
- **500**: Erro interno do servidor

### 2. Atualizar Dados da Igreja
**PUT** `/api/church/`

Atualiza os dados da igreja do usuário autenticado.

#### Corpo da Requisição
```json
{
  "name": "Nome da Igreja",
  "denomination": "Denominação",
  "address": "Endereço",
  "city": "Cidade",
  "state": "SP",
  "cnpj": "12345678000195",
  "email_church": "contato@igreja.com",
  "phone_church": "11999999999"
}
```

**Nota**: Todos os campos são opcionais. Apenas os campos fornecidos serão atualizados.

#### Validações
- **name**: String (opcional)
- **denomination**: String (opcional)
- **address**: String (opcional)
- **city**: String (opcional)
- **state**: String com exatamente 2 caracteres (opcional)
- **cnpj**: CNPJ válido com dígitos verificadores (opcional)
- **email_church**: Email válido ou string vazia (opcional)
- **phone_church**: String numérica com 10-11 dígitos (opcional)

#### Resposta de Sucesso (200)
```json
{
  "message": "Igreja atualizada com sucesso",
  "church": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Nome Atualizado",
    "denomination": "Denominação Atualizada",
    "address": "Endereço Atualizado",
    "city": "Cidade Atualizada",
    "state": "RJ",
    "cnpj": "98765432000123",
    "email_church": "novo@igreja.com",
    "phone_church": "11888888888",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Respostas de Erro
- **400**: Dados inválidos ou CNPJ já cadastrado
- **401**: Não autorizado
- **500**: Erro interno do servidor

## Rate Limiting
- **Limite**: 50 operações por IP a cada 15 minutos
- **Resposta de erro**: 429 Too Many Requests

## Exemplos de Uso

### Exemplo 1: Buscar dados da igreja
```bash
curl -X GET http://localhost:4000/api/church/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Exemplo 2: Atualizar apenas o nome da igreja
```bash
curl -X PUT http://localhost:4000/api/church/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Novo Nome da Igreja"}'
```

### Exemplo 3: Atualizar múltiplos campos
```bash
curl -X PUT http://localhost:4000/api/church/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Igreja Atualizada",
    "city": "São Paulo",
    "state": "SP",
    "email_church": "contato@igreja.com"
  }'
```

## Segurança

1. **Autenticação obrigatória**: Todas as rotas requerem autenticação
2. **Validação de dados**: Todos os dados são validados antes da atualização
3. **Verificação de CNPJ**: Impede duplicação de CNPJ entre igrejas
4. **Rate limiting**: Proteção contra abuso
5. **Sanitização**: Dados são sanitizados antes de serem salvos

## Tratamento de Erros

### Erro de Validação (400)
```json
{
  "error": "Dados inválidos",
  "details": [
    "Estado deve ter 2 caracteres",
    "Telefone da igreja deve ter pelo menos 10 dígitos"
  ]
}
```

### CNPJ Duplicado (400)
```json
{
  "error": "CNPJ já cadastrado",
  "details": "Já existe uma igreja cadastrada com este CNPJ"
}
```

### Não Autorizado (401)
```json
{
  "error": "Não autorizado",
  "details": "Usuário não está autenticado"
}
```

### Igreja Não Encontrada (404)
```json
{
  "error": "Igreja não encontrada",
  "details": "Nenhuma igreja foi encontrada para este usuário"
}
```
