# Documentação Back-End - Sistema Flock

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
3. [Autenticação e Segurança](#autenticação-e-segurança)
4. [Estrutura de Dados](#estrutura-de-dados)
5. [Endpoints da API](#endpoints-da-api)
6. [Paginação e Filtros Avançados](#paginação-e-filtros-avançados)
7. [Lógicas de Negócio](#lógicas-de-negócio)
8. [Validações e Tratamento de Erros](#validações-e-tratamento-de-erros)
9. [Exemplos de Implementação](#exemplos-de-implementação)
10. [Considerações de Performance](#considerações-de-performance)
11. [Boas Práticas](#boas-práticas)

---

## 🎯 Visão Geral do Sistema

O **Flock** é um sistema micro-SaaS para gerenciamento de membros de igrejas, desenvolvido com arquitetura multi-tenant que isola completamente os dados por igreja. O sistema permite o gerenciamento completo de membros, cargos, congregações e geração de relatórios estatísticos.

### Características Principais

- **Multi-tenant**: Cada igreja tem seus dados completamente isolados
- **Autenticação robusta**: Usando Supabase Auth com JWT
- **CRUD completo**: Para membros, cargos e congregações
- **Filtros avançados**: Busca e filtros complexos para membros
- **Relatórios estatísticos**: Análises demográficas e estruturais
- **Paginação eficiente**: Para grandes volumes de dados
- **Validações rigorosas**: Em todos os endpoints

---

## 🏗️ Arquitetura e Tecnologias

### Backend
- **Runtime**: Node.js com TypeScript
- **Framework**: Express.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Validação**: Joi
- **Segurança**: Helmet, CORS, Rate Limiting

### Estrutura de Arquivos
```
backend/
├── src/
│   ├── app.ts                 # Configuração principal do servidor
│   ├── controllers/           # Lógica de negócio
│   ├── routes/               # Definição de rotas
│   ├── middlewares/          # Middlewares (auth, validação)
│   ├── services/             # Serviços (Supabase)
│   ├── types/                # Tipos TypeScript
│   └── validators/           # Schemas de validação
├── docs/                     # Documentação
└── tests/                    # Exemplos e testes
```

### Configuração do Servidor
- **Porta**: 4000 (configurável via `PORT`)
- **Rate Limiting**: 100 requisições por 15 minutos
- **CORS**: Habilitado para desenvolvimento
- **Logging**: Morgan para logs de desenvolvimento

---

## 🔐 Autenticação e Segurança

### Fluxo de Autenticação

#### 1. Registro de Igreja
```typescript
POST /api/auth/register
Content-Type: application/json

{
  "email": "igreja@exemplo.com",
  "password": "senha123456",
  "phone": "(11) 99999-9999",
  "name": "Igreja Exemplo",
  "denomination": "Batista",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "cnpj": "12345678901234",
  "email_church": "contato@igreja.com",
  "phone_church": "(11) 3333-3333"
}
```

**Campos Opcionais:**
- `email_church`: Email de contato da igreja
- `phone_church`: Telefone de contato da igreja

**Campos Obrigatórios:**
- `phone`: Telefone do usuário administrador (apenas números, 10-11 dígitos)

**Resposta de Sucesso (201):**
```json
{
  "message": "Igreja registrada com sucesso",
  "church": {
    "id": "uuid-da-igreja",
    "user_id": "uuid-do-usuario",
    "name": "Igreja Exemplo",
    "denomination": "Batista",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "cnpj": "12345678901234",
    "email_church": "contato@igreja.com",
    "phone_church": "(11) 3333-3333",
    "created_at": "2024-01-10T10:00:00.000Z"
  }
}
```

#### 2. Login
```typescript
POST /api/auth/login
Content-Type: application/json

{
  "email": "igreja@exemplo.com",
  "password": "senha123456"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Login realizado com sucesso",
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "expires_at": 1704881400
  },
  "church": {
    "id": "uuid-da-igreja",
    "name": "Igreja Exemplo",
    "denomination": "Batista",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "cnpj": "12345678901234"
  }
}
```

### Uso do Token

**Todos os endpoints protegidos requerem o header:**
```
Authorization: Bearer <access_token>
```

### Recuperação de Senha

#### 1. Solicitar Recuperação
```typescript
POST /api/password/forgot
Content-Type: application/json

{
  "email": "igreja@exemplo.com"
}
```

#### 2. Alterar Senha (Logado)
```typescript
POST /api/password/change
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "senha123456",
  "newPassword": "novaSenha789"
}
```

#### 3. Redefinir Senha (Com Token)
```typescript
POST /api/password/reset
Content-Type: application/json

{
  "newPassword": "novaSenha789"
}
```

---

## 📊 Estrutura de Dados

### Entidades Principais

#### 1. Church (Igreja)
```typescript
interface Church {
  id: string;                    // UUID único
  user_id: string;              // ID do usuário no Supabase Auth
  name: string;                 // Nome da igreja
  denomination: string;         // Denominação
  address: string;              // Endereço completo
  city: string;                 // Cidade
  state: string;                // Estado (2 caracteres)
  cnpj: string;                 // CNPJ (14 dígitos)
  created_at: Date;             // Data de criação
}
```

#### 2. Member (Membro)
```typescript
interface Member {
  id: string;                   // UUID único
  church_id: string;            // ID da igreja (foreign key)
  name: string;                 // Nome completo
  birth: Date;                  // Data de nascimento
  gender: 'Masculino' | 'Feminino';
  marital_status: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
  nationality?: string;         // Nacionalidade
  document?: string;            // Documento (CPF, RG, etc.)
  spouse?: string;              // Nome do cônjuge
  address?: string;             // Endereço
  complement?: string;          // Complemento
  cep?: string;                 // CEP (8 dígitos)
  neighborhood?: string;        // Bairro
  city?: string;                // Cidade
  state?: string;               // Estado (2 caracteres)
  phone?: string;               // Telefone
  whatsapp?: string;            // WhatsApp
  email?: string;               // Email
  baptism_date?: Date;          // Data de batismo
  role_id?: string;             // ID do cargo (foreign key)
  occupation?: string;          // Profissão
  admission?: string;           // Tipo de admissão
  admission_date?: Date;        // Data de admissão
  congregation_id?: string;     // ID da congregação (foreign key)
  active: boolean;              // Status ativo/inativo
  created_at: Date;             // Data de criação
  updated_at: Date;             // Data de atualização
}
```

#### 3. Role (Cargo)
```typescript
interface Role {
  id: string;                   // UUID único
  church_id: string;            // ID da igreja (foreign key)
  name: string;                 // Nome do cargo
  description?: string;         // Descrição
  created_at: Date;             // Data de criação
  updated_at: Date;             // Data de atualização
}
```

#### 4. Congregation (Congregação)
```typescript
interface Congregation {
  id: string;                   // UUID único
  church_id: string;            // ID da igreja (foreign key)
  name: string;                 // Nome da congregação
  address: string;              // Endereço
  city: string;                 // Cidade
  state: string;                // Estado (2 caracteres)
  leader?: string;              // Nome do líder
  phone?: string;               // Telefone
  created_at: Date;             // Data de criação
  updated_at: Date;             // Data de atualização
}
```

### Relacionamentos

```
Church (1) ←→ (N) Member
Church (1) ←→ (N) Role
Church (1) ←→ (N) Congregation
Member (N) ←→ (1) Role
Member (N) ←→ (1) Congregation
```

---

## 🔌 Endpoints da API

### Base URL
```
http://localhost:4000/api
```

### 1. Autenticação (`/auth`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/register` | Registrar nova igreja | ❌ |
| POST | `/auth/login` | Login da igreja | ❌ |

### 2. Senha (`/password`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/password/forgot` | Solicitar recuperação | ❌ |
| POST | `/password/change` | Alterar senha | ✅ |
| POST | `/password/reset` | Redefinir senha | ❌ |

### 3. Membros (`/members`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/members` | Listar membros (com filtros) | ✅ |
| GET | `/members/:id` | Buscar membro específico | ✅ |
| POST | `/members` | Criar novo membro | ✅ |
| PUT | `/members/:id` | Atualizar membro | ✅ |
| DELETE | `/members/:id` | Remover membro | ✅ |
| POST | `/members/batch` | Criar múltiplos membros | ✅ |
| GET | `/members/reports` | Gerar relatórios | ✅ |

### 4. Cargos (`/roles`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/roles` | Listar cargos | ✅ |
| GET | `/roles/:id` | Buscar cargo específico | ✅ |
| POST | `/roles` | Criar novo cargo | ✅ |
| PUT | `/roles/:id` | Atualizar cargo | ✅ |
| DELETE | `/roles/:id` | Remover cargo | ✅ |
| POST | `/roles/batch` | Criar múltiplos cargos | ✅ |

### 5. Congregações (`/congregations`)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/congregations` | Listar congregações | ✅ |
| GET | `/congregations/:id` | Buscar congregação específica | ✅ |
| POST | `/congregations` | Criar nova congregação | ✅ |
| PUT | `/congregations/:id` | Atualizar congregação | ✅ |
| DELETE | `/congregations/:id` | Remover congregação | ✅ |
| POST | `/congregations/batch` | Criar múltiplas congregações | ✅ |

---

## 📊 Paginação e Filtros Avançados

A API de membros suporta paginação completa e filtros avançados para busca e relatórios, permitindo consultas complexas e eficientes.

### Endpoints de Paginação

#### Listar Membros com Filtros
```
GET /api/members
```

#### Gerar Relatórios
```
GET /api/members/reports
```

### Parâmetros de Query - Listagem

#### Paginação
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Número de itens por página (padrão: 10, máximo: 100)

#### Ordenação
- `sort_by` (opcional): Campo para ordenação (padrão: 'name')
- `sort_order` (opcional): Ordem da classificação - 'asc' ou 'desc' (padrão: 'asc')

#### Busca Geral
- `search` (opcional): Busca por nome, email, telefone, WhatsApp, cônjuge ou documento

#### Filtros Básicos
- `active` (opcional): Filtra por status ativo (true/false)
- `role_id` (opcional): Filtra por cargo específico
- `congregation_id` (opcional): Filtra por congregação específica. Use "sede" para filtrar membros sem congregação

#### Filtros por Campos Específicos
- `gender` (opcional): Filtra por gênero ('Masculino' ou 'Feminino')
- `marital_status` (opcional): Filtra por estado civil ('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro')
- `nationality` (opcional): Filtra por nacionalidade (busca parcial)
- `occupation` (opcional): Filtra por ocupação (busca parcial)
- `city` (opcional): Filtra por cidade (busca parcial)
- `state` (opcional): Filtra por estado (exato)

#### Filtros por Datas
- `birth_date_from` (opcional): Data de nascimento a partir de (YYYY-MM-DD)
- `birth_date_to` (opcional): Data de nascimento até (YYYY-MM-DD)
- `baptism_date_from` (opcional): Data de batismo a partir de (YYYY-MM-DD)
- `baptism_date_to` (opcional): Data de batismo até (YYYY-MM-DD)
- `admission_date_from` (opcional): Data de admissão a partir de (YYYY-MM-DD)
- `admission_date_to` (opcional): Data de admissão até (YYYY-MM-DD)

#### Filtros por Faixa Etária
- `age_from` (opcional): Idade mínima (0-150)
- `age_to` (opcional): Idade máxima (0-150)

### Exemplos de Uso - Listagem

#### Listar primeira página com 10 membros
```
GET /api/members?page=1&limit=10
```

#### Buscar membros por nome
```
GET /api/members?search=João&page=1&limit=20
```

#### Filtrar membros ativos de um cargo específico
```
GET /api/members?active=true&role_id=123&page=1&limit=15
```

#### Filtrar membros da sede (sem congregação)
```
GET /api/members?congregation_id=sede&page=1&limit=15
```

#### Filtrar por faixa etária
```
GET /api/members?age_from=18&age_to=35&page=1&limit=20
```

#### Filtrar por data de batismo
```
GET /api/members?baptism_date_from=2020-01-01&baptism_date_to=2023-12-31&page=1&limit=10
```

#### Filtrar por gênero e estado civil
```
GET /api/members?gender=Masculino&marital_status=Casado&page=1&limit=15
```

#### Ordenar por data de nascimento
```
GET /api/members?sort_by=birth&sort_order=desc&page=1&limit=10
```

#### Combinação de filtros complexa
```
GET /api/members?search=Maria&active=true&role_id=123&congregation_id=456&gender=Feminino&age_from=25&age_to=50&baptism_date_from=2020-01-01&sort_by=name&sort_order=asc&page=2&limit=10
```

### Resposta - Listagem

A resposta inclui os dados dos membros, informações de paginação e filtros aplicados:

```json
{
  "data": [
    {
      "id": "1",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "(11) 99999-9999",
      "birth": "1990-05-15",
      "gender": "Masculino",
      "marital_status": "Casado",
      "baptism_date": "2015-03-20",
      "admission_date": "2015-04-01",
      "active": true,
      "role": {
        "id": "123",
        "name": "Membro",
        "description": "Membro da igreja"
      },
      "congregation": {
        "id": "456",
        "name": "Congregação Central",
        "address": "Rua das Flores, 123",
        "city": "São Paulo",
        "state": "SP",
        "leader": "Pastor José",
        "phone": "(11) 88888-8888"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "search": "João",
    "active": true,
    "role_id": "123",
    "congregation_id": null,
    "gender": "Masculino",
    "marital_status": null,
    "nationality": null,
    "occupation": null,
    "city": null,
    "state": null,
    "birth_date_from": null,
    "birth_date_to": null,
    "baptism_date_from": null,
    "baptism_date_to": null,
    "admission_date_from": null,
    "admission_date_to": null,
    "age_from": null,
    "age_to": null
  },
  "sorting": {
    "sort_by": "name",
    "sort_order": "asc"
  }
}
```

### Endpoint de Relatórios

#### GET /api/members/reports

Retorna estatísticas agregadas dos membros para relatórios.

#### Resposta - Relatórios

```json
{
  "summary": {
    "totalMembers": 150,
    "activeMembers": 140,
    "inactiveMembers": 10,
    "recentMembers": 5,
    "recentBaptisms": 3,
    "activePercentage": 93
  },
  "demographics": {
    "gender": {
      "Masculino": 75,
      "Feminino": 70,
      "Não informado": 5
    },
    "maritalStatus": {
      "Casado": 80,
      "Solteiro": 45,
      "Divorciado": 15,
      "Viúvo": 8,
      "Outro": 2
    },
    "ageRanges": {
      "0-12": 15,
      "13-17": 20,
      "18-25": 25,
      "26-35": 30,
      "36-50": 35,
      "51-65": 20,
      "65+": 5
    },
    "cities": {
      "São Paulo": 100,
      "Campinas": 30,
      "Santos": 20
    },
    "states": {
      "SP": 150
    }
  },
  "churchStructure": {
    "roles": {
      "Membro": 100,
      "Líder": 20,
      "Pastor": 5,
      "Sem cargo": 25
    },
    "congregations": {
      "Congregação Central": 80,
      "Congregação Norte": 40,
      "Congregação Sul": 30
    }
  },
  "timeline": {
    "baptismsByYear": {
      "2020": 15,
      "2021": 20,
      "2022": 25,
      "2023": 30
    },
    "admissionsByYear": {
      "2020": 18,
      "2021": 22,
      "2022": 28,
      "2023": 35
    },
    "baptismsByMonth": {
      "2023-01": 3,
      "2023-02": 2,
      "2023-03": 4
    },
    "admissionsByMonth": {
      "2023-01": 4,
      "2023-02": 3,
      "2023-03": 5
    },
    "membersByYear": {
      "2023": [
        {
          "id": "uuid-1",
          "name": "João Silva",
          "birth": "1990-05-15",
          "congregation": {
            "name": "Congregação Central"
          }
        }
      ]
    },
    "membersByMonth": {
      "2023-03": [
        {
          "id": "uuid-2",
          "name": "Maria Santos",
          "birth": "1985-08-20",
          "congregation": {
            "name": "Congregação Norte"
          }
        }
      ]
    }
  },
  "topOccupations": [
    { "occupation": "Professor", "count": 25 },
    { "occupation": "Engenheiro", "count": 20 },
    { "occupation": "Médico", "count": 15 },
    { "occupation": "Advogado", "count": 10 },
    { "occupation": "Administrador", "count": 8 }
  ],
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Campos da Resposta

#### data (Listagem)
Array com os membros da página atual

#### pagination (Listagem)
- `page`: Página atual
- `limit`: Itens por página
- `total`: Total de registros encontrados
- `totalPages`: Total de páginas
- `hasNextPage`: Se existe próxima página
- `hasPrevPage`: Se existe página anterior
- `nextPage`: Número da próxima página (null se não existir)
- `prevPage`: Número da página anterior (null se não existir)

#### filters (Listagem)
Valores dos filtros aplicados na consulta

#### sorting (Listagem)
Informações sobre a ordenação aplicada

#### summary (Relatórios)
Estatísticas gerais dos membros

#### demographics (Relatórios)
Estatísticas demográficas por categoria (apenas membros ativos)

#### churchStructure (Relatórios)
Estatísticas da estrutura da igreja (apenas membros ativos)

#### timeline (Relatórios)
Análise temporal de batismos e admissões

#### topOccupations (Relatórios)
Top 10 ocupações mais comuns

### Validações de Paginação

- `page` deve ser maior que 0
- `limit` deve estar entre 1 e 100
- `age_from` e `age_to` devem estar entre 0 e 150
- `age_from` deve ser menor que `age_to` quando ambos são fornecidos
- Datas devem estar no formato YYYY-MM-DD
- Todos os parâmetros são opcionais
- Se não especificado, `page` = 1, `limit` = 10, `sort_by` = 'name', `sort_order` = 'asc'

### Performance de Paginação

- A busca é otimizada com índices no banco de dados
- O count é calculado de forma eficiente
- Os filtros são aplicados no nível do banco de dados
- A busca por faixa etária é calculada em memória após a consulta
- Relatórios são gerados a partir de todos os dados para precisão

---

## 🎯 Lógicas de Negócio

### 1. Multi-Tenancy

**IMPORTANTE**: Todos os dados são isolados por igreja. O sistema automaticamente:
- Filtra todos os dados pelo `church_id` do usuário autenticado
- Impede acesso a dados de outras igrejas
- Valida permissões em todas as operações

### 2. Validações de Unicidade

#### Igreja
- **CNPJ**: Deve ser único no sistema
- **Email**: Deve ser único no sistema

#### Cargos
- **Nome**: Deve ser único dentro da mesma igreja

#### Congregações
- **Nome**: Deve ser único dentro da mesma igreja

#### Membros
- Não há restrições de unicidade específicas

### 3. Regras de Exclusão

#### Cargos
- **NÃO** podem ser excluídos se estiverem sendo usados por membros
- Erro: "Não é possível excluir um cargo que está sendo usado por membros"

#### Congregações
- **NÃO** podem ser excluídas se possuírem membros
- Erro: "Não é possível excluir uma congregação que possui membros"

#### Membros
- Soft delete (campo `active: false`)
- Não são fisicamente removidos do banco

### 4. Relacionamentos

#### Membros com Cargos
- Campo `role_id` opcional
- Se fornecido, deve referenciar um cargo válido da mesma igreja
- Retorna dados completos do cargo no endpoint de listagem

#### Membros com Congregações
- Campo `congregation_id` opcional
- Se fornecido, deve referenciar uma congregação válida da mesma igreja
- Retorna dados completos da congregação no endpoint de listagem

### 5. Cálculo de Idade

- Calculado automaticamente a partir da data de nascimento
- Usado nos filtros de faixa etária
- Considera mês e dia para cálculo preciso

---

## 🔍 Validações e Tratamento de Erros

### Códigos de Status HTTP

| Código | Descrição | Uso |
|--------|-----------|-----|
| 200 | OK | Sucesso na operação |
| 201 | Created | Recurso criado com sucesso |
| 204 | No Content | Recurso removido com sucesso |
| 400 | Bad Request | Dados inválidos ou regras de negócio violadas |
| 401 | Unauthorized | Token inválido ou ausente |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Server Error | Erro interno do servidor |

### Estrutura de Erro Padrão

```json
{
  "error": "Descrição do erro",
  "details": "Detalhes adicionais ou mensagem específica"
}
```

### Validações Comuns

#### 1. Campos Obrigatórios
- **Nome**: Sempre obrigatório
- **Data de Nascimento**: Sempre obrigatória
- **Gênero**: Sempre obrigatório
- **Estado Civil**: Sempre obrigatório

#### 2. Formatos Específicos
- **CEP**: 8 dígitos numéricos
- **CNPJ**: 14 dígitos numéricos
- **Estado**: 2 caracteres
- **Email**: Formato válido de email
- **Datas**: Formato ISO (YYYY-MM-DD)

#### 3. Validações de Negócio
- **Idade**: Entre 0 e 150 anos
- **Faixa Etária**: Idade inicial deve ser menor que a final
- **Datas**: Data de batismo não pode ser anterior ao nascimento
- **Limite de Paginação**: Entre 1 e 100 itens por página

### Mensagens de Erro Comuns

#### Autenticação
```json
{
  "error": "Token não fornecido",
  "details": "O header Authorization é obrigatório"
}
```

```json
{
  "error": "Token inválido ou expirado",
  "details": "Faça login novamente"
}
```

#### Validação de Dados
```json
{
  "error": "Dados inválidos",
  "details": [
    "Nome é obrigatório",
    "Data de nascimento é obrigatória",
    "Gênero deve ser Masculino ou Feminino"
  ]
}
```

#### Regras de Negócio
```json
{
  "error": "CNPJ já cadastrado",
  "details": "Já existe uma igreja cadastrada com este CNPJ"
}
```

```json
{
  "error": "Não é possível excluir um cargo que está sendo usado por membros"
}
```

---

## 💡 Exemplos de Implementação

### 1. Configuração do Cliente HTTP

```typescript
// api/client.ts
class FlockAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:4000/api') {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }

    return response.json();
  }

  // Métodos da API...
}
```

### 2. Autenticação

```typescript
// api/auth.ts
export class AuthAPI {
  constructor(private client: FlockAPI) {}

  async register(churchData: ChurchRegistrationData) {
    return this.client.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(churchData),
    });
  }

  async login(email: string, password: string) {
    const response = await this.client.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Salvar token
    this.client.setToken(response.session.access_token);
    
    return response;
  }

  async forgotPassword(email: string) {
    return this.client.request('/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.client.request('/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
}
```

### 3. Gerenciamento de Membros

```typescript
// api/members.ts
export class MembersAPI {
  constructor(private client: FlockAPI) {}

  async listMembers(params: MemberListParams = {}) {
    const queryParams = new URLSearchParams();
    
    // Paginação
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    // Busca
    if (params.search) queryParams.append('search', params.search);
    
    // Filtros básicos
    if (params.active !== undefined) queryParams.append('active', params.active.toString());
    if (params.role_id) queryParams.append('role_id', params.role_id);
    if (params.congregation_id) queryParams.append('congregation_id', params.congregation_id);
    
    // Filtros demográficos
    if (params.gender) queryParams.append('gender', params.gender);
    if (params.marital_status) queryParams.append('marital_status', params.marital_status);
    if (params.nationality) queryParams.append('nationality', params.nationality);
    if (params.occupation) queryParams.append('occupation', params.occupation);
    if (params.city) queryParams.append('city', params.city);
    if (params.state) queryParams.append('state', params.state);
    
    // Filtros de data
    if (params.birth_date_from) queryParams.append('birth_date_from', params.birth_date_from);
    if (params.birth_date_to) queryParams.append('birth_date_to', params.birth_date_to);
    if (params.baptism_date_from) queryParams.append('baptism_date_from', params.baptism_date_from);
    if (params.baptism_date_to) queryParams.append('baptism_date_to', params.baptism_date_to);
    if (params.admission_date_from) queryParams.append('admission_date_from', params.admission_date_from);
    if (params.admission_date_to) queryParams.append('admission_date_to', params.admission_date_to);
    
    // Filtros de idade
    if (params.age_from) queryParams.append('age_from', params.age_from.toString());
    if (params.age_to) queryParams.append('age_to', params.age_to.toString());
    
    // Ordenação
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const endpoint = `/members?${queryParams.toString()}`;
    return this.client.request(endpoint);
  }

  async getReports() {
    return this.client.request('/members/reports');
  }
}

#### Tipos para Paginação

```typescript
// types/members.ts
export interface MemberListParams {
  // Paginação
  page?: number;
  limit?: number;
  
  // Busca
  search?: string;
  
  // Filtros básicos
  active?: boolean;
  role_id?: string;
  congregation_id?: string;
  
  // Filtros demográficos
  gender?: 'Masculino' | 'Feminino';
  marital_status?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
  nationality?: string;
  occupation?: string;
  city?: string;
  state?: string;
  
  // Filtros de data
  birth_date_from?: string;
  birth_date_to?: string;
  baptism_date_from?: string;
  baptism_date_to?: string;
  admission_date_from?: string;
  admission_date_to?: string;
  
  // Filtros de idade
  age_from?: number;
  age_to?: number;
  
  // Ordenação
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface MembersResponse {
  data: Member[];
  pagination: PaginationInfo;
  filters: Partial<MemberListParams>;
  sorting: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
}

export interface ReportsResponse {
  summary: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    recentMembers: number;
    recentBaptisms: number;
    activePercentage: number;
  };
  demographics: {
    gender: Record<string, number>;
    maritalStatus: Record<string, number>;
    ageRanges: Record<string, number>;
    cities: Record<string, number>;
    states: Record<string, number>;
  };
  churchStructure: {
    roles: Record<string, number>;
    congregations: Record<string, number>;
  };
  timeline: {
    baptismsByYear: Record<string, number>;
    admissionsByYear: Record<string, number>;
  };
  topOccupations: Array<{ occupation: string; count: number }>;
  generatedAt: string;
}

  async getMember(id: string) {
    return this.client.request(`/members/${id}`);
  }

  async createMember(memberData: CreateMemberData) {
    return this.client.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id: string, memberData: UpdateMemberData) {
    return this.client.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id: string) {
    return this.client.request(`/members/${id}`, {
      method: 'DELETE',
    });
  }

  async createBatchMembers(members: CreateMemberData[]) {
    return this.client.request('/members/batch', {
      method: 'POST',
      body: JSON.stringify(members),
    });
  }

  async getReports() {
    return this.client.request('/members/reports');
  }
}
```

### 4. Gerenciamento de Cargos

```typescript
// api/roles.ts
export class RolesAPI {
  constructor(private client: FlockAPI) {}

  async listRoles() {
    return this.client.request('/roles');
  }

  async getRole(id: string) {
    return this.client.request(`/roles/${id}`);
  }

  async createRole(roleData: CreateRoleData) {
    return this.client.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async updateRole(id: string, roleData: UpdateRoleData) {
    return this.client.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async deleteRole(id: string) {
    return this.client.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  async createBatchRoles(roles: CreateRoleData[]) {
    return this.client.request('/roles/batch', {
      method: 'POST',
      body: JSON.stringify(roles),
    });
  }
}
```

### 5. Gerenciamento de Congregações

```typescript
// api/congregations.ts
export class CongregationsAPI {
  constructor(private client: FlockAPI) {}

  async listCongregations() {
    return this.client.request('/congregations');
  }

  async getCongregation(id: string) {
    return this.client.request(`/congregations/${id}`);
  }

  async createCongregation(congregationData: CreateCongregationData) {
    return this.client.request('/congregations', {
      method: 'POST',
      body: JSON.stringify(congregationData),
    });
  }

  async updateCongregation(id: string, congregationData: UpdateCongregationData) {
    return this.client.request(`/congregations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(congregationData),
    });
  }

  async deleteCongregation(id: string) {
    return this.client.request(`/congregations/${id}`, {
      method: 'DELETE',
    });
  }

  async createBatchCongregations(congregations: CreateCongregationData[]) {
    return this.client.request('/congregations/batch', {
      method: 'POST',
      body: JSON.stringify(congregations),
    });
  }
}
```

### 6. Hook React para Autenticação

```typescript
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';

interface AuthContextType {
  user: any | null;
  church: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [church, setChurch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar token salvo no localStorage
    const token = localStorage.getItem('flock_token');
    const savedChurch = localStorage.getItem('flock_church');
    
    if (token && savedChurch) {
      api.setToken(token);
      setChurch(JSON.parse(savedChurch));
      setUser({ token }); // Simplificado
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      
      // Salvar dados
      localStorage.setItem('flock_token', response.session.access_token);
      localStorage.setItem('flock_church', JSON.stringify(response.church));
      
      setUser({ token: response.session.access_token });
      setChurch(response.church);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('flock_token');
    localStorage.removeItem('flock_church');
    setUser(null);
    setChurch(null);
  };

  return (
    <AuthContext.Provider value={{ user, church, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
```

### 7. Hook React para Membros

```typescript
// hooks/useMembers.ts
import { useState, useCallback } from 'react';
import { MembersAPI, MemberListParams, MembersResponse, ReportsResponse } from '../api/members';

export function useMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [filters, setFilters] = useState<Partial<MemberListParams>>({});
  const [sorting, setSorting] = useState({ sort_by: 'name', sort_order: 'asc' as const });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMembers = useCallback(async (params: MemberListParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: MembersResponse = await api.members.listMembers(params);
      setMembers(response.data);
      setPagination(response.pagination);
      setFilters(response.filters);
      setSorting(response.sorting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMember = useCallback(async (memberData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.members.createMember(memberData);
      // Recarregar lista com filtros atuais
      await listMembers({ ...filters, ...sorting });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar membro');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [listMembers, filters, sorting]);

  const updateMember = useCallback(async (id: string, memberData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.members.updateMember(id, memberData);
      // Recarregar lista com filtros atuais
      await listMembers({ ...filters, ...sorting });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar membro');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [listMembers, filters, sorting]);

  const deleteMember = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.members.deleteMember(id);
      // Recarregar lista com filtros atuais
      await listMembers({ ...filters, ...sorting });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [listMembers, filters, sorting]);

  return {
    members,
    pagination,
    filters,
    sorting,
    loading,
    error,
    listMembers,
    createMember,
    updateMember,
    deleteMember,
  };
}
```

### 8. Hook React para Relatórios

```typescript
// hooks/useReports.ts
import { useState, useCallback } from 'react';
import { ReportsResponse } from '../api/members';

export function useReports() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: ReportsResponse = await api.members.getReports();
      setReports(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports,
    loading,
    error,
    getReports,
  };
}
```

### 9. Hook React para Filtros Avançados

```typescript
// hooks/useAdvancedFilters.ts
import { useState, useCallback, useMemo } from 'react';
import { MemberListParams } from '../api/members';

export function useAdvancedFilters() {
  const [filters, setFilters] = useState<Partial<MemberListParams>>({});
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [congregationFilter, setCongregationFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'Masculino' | 'Feminino' | ''>('');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState<string>('');
  const [ageRange, setAgeRange] = useState<{ from: number; to: number } | null>(null);
  const [dateFilters, setDateFilters] = useState({
    birth: { from: '', to: '' },
    baptism: { from: '', to: '' },
    admission: { from: '', to: '' }
  });

  const buildQueryParams = useCallback(() => {
    const params: Partial<MemberListParams> = {
      page: 1, // Reset para primeira página
      limit: 20
    };

    if (search) params.search = search;
    if (activeFilter !== null) params.active = activeFilter;
    if (roleFilter) params.role_id = roleFilter;
    if (congregationFilter) params.congregation_id = congregationFilter;
    if (genderFilter) params.gender = genderFilter;
    if (maritalStatusFilter) params.marital_status = maritalStatusFilter as any;
    if (ageRange) {
      params.age_from = ageRange.from;
      params.age_to = ageRange.to;
    }
    if (dateFilters.birth.from) params.birth_date_from = dateFilters.birth.from;
    if (dateFilters.birth.to) params.birth_date_to = dateFilters.birth.to;
    if (dateFilters.baptism.from) params.baptism_date_from = dateFilters.baptism.from;
    if (dateFilters.baptism.to) params.baptism_date_to = dateFilters.baptism.to;
    if (dateFilters.admission.from) params.admission_date_from = dateFilters.admission.from;
    if (dateFilters.admission.to) params.admission_date_to = dateFilters.admission.to;

    return params;
  }, [search, activeFilter, roleFilter, congregationFilter, genderFilter, maritalStatusFilter, ageRange, dateFilters]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveFilter(null);
    setRoleFilter('');
    setCongregationFilter('');
    setGenderFilter('');
    setMaritalStatusFilter('');
    setAgeRange(null);
    setDateFilters({
      birth: { from: '', to: '' },
      baptism: { from: '', to: '' },
      admission: { from: '', to: '' }
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return search || 
           activeFilter !== null || 
           roleFilter || 
           congregationFilter || 
           genderFilter || 
           maritalStatusFilter || 
           ageRange || 
           Object.values(dateFilters).some(dates => dates.from || dates.to);
  }, [search, activeFilter, roleFilter, congregationFilter, genderFilter, maritalStatusFilter, ageRange, dateFilters]);

  return {
    filters: buildQueryParams(),
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    roleFilter,
    setRoleFilter,
    congregationFilter,
    setCongregationFilter,
    genderFilter,
    setGenderFilter,
    maritalStatusFilter,
    setMaritalStatusFilter,
    ageRange,
    setAgeRange,
    dateFilters,
    setDateFilters,
    clearFilters,
    hasActiveFilters
  };
}
```

---

## ⚡ Considerações de Performance

### 1. Paginação e Filtros
- **Limite padrão**: 10 itens por página
- **Limite máximo**: 100 itens por página
- **Recomendação**: Use 20-50 itens para melhor UX
- **Busca geral**: Inclui nome, email, telefone, WhatsApp, cônjuge e documento
- **Filtros de data**: Use índices no banco para melhor performance
- **Filtros de idade**: Calculados em memória após busca
- **Otimização**: A busca é otimizada com índices no banco de dados
- **Contagem**: O count é calculado de forma eficiente usando `count: 'exact'` do Supabase

### 2. Relatórios
- **Cache**: Considere implementar cache para relatórios
- **Geração assíncrona**: Para relatórios complexos
- **Limite de dados**: Relatórios baseados nos últimos 5 anos
- **Precisão**: Relatórios são gerados a partir de todos os dados para precisão

### 3. Rate Limiting
- **Limite**: 100 requisições por 15 minutos
- **Headers de resposta**: Incluem informações sobre limites
- **Tratamento**: Implemente retry com backoff exponencial

### 4. Otimizações Recomendadas

#### Frontend
```typescript
// Debounce para busca
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Cache de dados
const useCache = <T>(key: string, fetcher: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const cached = localStorage.getItem(key);
    if (cached) {
      setData(JSON.parse(cached));
      return;
    }

    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      localStorage.setItem(key, JSON.stringify(result));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  return { data, loading, refetch: fetchData };
};

// Hook para paginação otimizada
const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const nextPage = () => {
    if (hasNextPage) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setPage(page - 1);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const changeLimit = (newLimit: number) => {
    setLimit(Math.min(newLimit, 100)); // Máximo 100
    setPage(1); // Reset para primeira página
  };

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    reset: () => {
      setPage(initialPage);
      setLimit(initialLimit);
      setTotal(0);
    }
  };
};

// Hook para filtros com debounce
const useFilteredSearch = (searchFunction: (params: any) => Promise<any>, delay = 300) => {
  const [filters, setFilters] = useState({});
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Debounce dos filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, delay);

    return () => clearTimeout(timer);
  }, [filters, delay]);

  // Executar busca quando filtros mudarem
  useEffect(() => {
    if (Object.keys(debouncedFilters).length > 0) {
      setLoading(true);
      searchFunction(debouncedFilters)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [debouncedFilters, searchFunction]);

  return {
    filters,
    setFilters,
    loading,
    data,
    debouncedFilters
  };
};
```

#### Backend (Considerações)
- **Índices**: Implementados no Supabase para campos de busca
- **Joins**: Otimizados para retornar dados relacionados
- **Contagem**: Usa `count: 'exact'` do Supabase para eficiência

---

## 🛡️ Boas Práticas

### 1. Segurança

#### Autenticação
- **Token**: Sempre use HTTPS em produção
- **Expiração**: Tokens expiram em 1 hora
- **Refresh**: Implemente refresh automático de token
- **Logout**: Sempre limpe tokens ao fazer logout

#### Validação
- **Frontend**: Valide dados antes de enviar
- **Backend**: Confie apenas nas validações do servidor
- **Sanitização**: Limpe dados de entrada

### 2. Tratamento de Erros

#### Estrutura Padrão
```typescript
try {
  const result = await api.members.createMember(data);
  // Sucesso
} catch (error) {
  if (error instanceof Error) {
    // Erro conhecido
    showNotification(error.message, 'error');
  } else {
    // Erro desconhecido
    showNotification('Erro inesperado', 'error');
  }
}
```

#### Retry Strategy
```typescript
const retryRequest = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 3. UX/UI

#### Loading States
- **Skeleton**: Para listagens
- **Spinner**: Para ações pontuais
- **Progress**: Para uploads em lote

#### Feedback
- **Sucesso**: Notificações de confirmação
- **Erro**: Mensagens claras e acionáveis
- **Validação**: Feedback em tempo real

#### Paginação
- **Infinite Scroll**: Para listagens longas
- **Load More**: Alternativa ao infinite scroll
- **Pagination**: Para navegação precisa

### 4. Estado da Aplicação

#### Gerenciamento
- **Context API**: Para estado global
- **React Query**: Para cache e sincronização
- **Zustand**: Para estado simples

#### Persistência
- **LocalStorage**: Para preferências
- **SessionStorage**: Para dados temporários
- **Cookies**: Para dados essenciais

### 5. Testes

#### Unitários
- **API Client**: Teste todas as funções
- **Hooks**: Teste lógica de estado
- **Utils**: Teste funções auxiliares

#### Integração
- **Fluxos**: Teste fluxos completos
- **Erros**: Teste cenários de erro
- **Performance**: Teste com dados reais

---

## 📝 Checklist de Implementação

### ✅ Autenticação
- [ ] Tela de login
- [ ] Tela de registro
- [ ] Recuperação de senha
- [ ] Alteração de senha
- [ ] Logout
- [ ] Proteção de rotas

### ✅ Membros
- [ ] Listagem com paginação
- [ ] Busca e filtros avançados
- [ ] Filtros por data e faixa etária
- [ ] Ordenação por campos
- [ ] Criação de membro
- [ ] Edição de membro
- [ ] Remoção de membro
- [ ] Upload em lote
- [ ] Relatórios estatísticos
- [ ] Filtros demográficos

### ✅ Cargos
- [ ] Listagem de cargos
- [ ] Criação de cargo
- [ ] Edição de cargo
- [ ] Remoção de cargo
- [ ] Criação em lote

### ✅ Congregações
- [ ] Listagem de congregações
- [ ] Criação de congregação
- [ ] Edição de congregação
- [ ] Remoção de congregação
- [ ] Criação em lote

### ✅ Funcionalidades Avançadas
- [ ] Filtros avançados
- [ ] Relatórios estatísticos
- [ ] Exportação de dados
- [ ] Notificações
- [ ] Responsividade

### ✅ Qualidade
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] Validações
- [ ] Testes
- [ ] Documentação

---

## 🔗 Recursos Adicionais

### Documentação Relacionada
- [Exemplos de Filtros Avançados](../tests/advanced-filters-examples.json)
- [Coleção do Insomnia](../tests/insomnia_collection.json)

### Ferramentas Recomendadas
- **HTTP Client**: Axios ou Fetch API
- **Estado**: React Query, Zustand ou Context API
- **Formulários**: React Hook Form ou Formik
- **Validação**: Yup ou Zod
- **UI**: Material-UI, Chakra UI ou Tailwind CSS
- **Testes**: Jest + React Testing Library

### Contato e Suporte
- **Issues**: [GitHub Issues](../issues.md)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)
- **Documentação**: Esta pasta (`docs/`)

---

**Última atualização**: Janeiro 2024  
**Versão da API**: 1.0.0  
**Status**: ✅ Produção 