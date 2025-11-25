# Documentação do Backend - Flock

## Visão Geral

O backend do Flock é uma API RESTful construída com **Node.js**, **Express** e **TypeScript**, utilizando **Supabase** como banco de dados e serviço de autenticação. O sistema segue uma arquitetura em camadas (MVC) e implementa multi-tenancy para isolar dados por igreja.

---

## Arquitetura

### Stack Tecnológica

- **Runtime**: Node.js
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth (JWT)
- **Validação**: Joi
- **Segurança**: Helmet, CORS, Rate Limiting

### Estrutura de Pastas

```
backend/src/
├── app.ts                    # Configuração principal do Express
├── controllers/              # Lógica de negócio (handlers de requisições)
├── middlewares/             # Middlewares (autenticação, etc)
├── routes/                  # Definição de rotas
├── services/                # Serviços externos (Supabase)
├── types/                   # Definições TypeScript
├── utils/                   # Utilitários (cookies, logs)
└── validators/             # Schemas de validação (Joi)
```

---

## Fluxo de Requisições

### 1. Entrada da Requisição

Toda requisição passa pelos seguintes middlewares globais (em ordem):

1. **Helmet**: Proteção de headers HTTP
2. **CORS**: Controle de origem e credenciais
3. **Morgan**: Logging de requisições
4. **Rate Limiting**: Limitação de requisições por IP
5. **JSON Parser**: Parse do body JSON
6. **Cookie Parser**: Parse de cookies

### 2. Roteamento

As rotas são organizadas por módulo funcional:

- `/api/auth` - Autenticação (login, registro, logout)
- `/api/password` - Gerenciamento de senha
- `/api/members` - CRUD de membros
- `/api/roles` - CRUD de cargos
- `/api/congregations` - CRUD de congregações
- `/api/integration` - Integrantes em processo de integração
- `/api/church` - Dados da igreja
- `/api/account` - Gerenciamento de conta do usuário
- `/api/export` - Exportação de dados (PDF)
- `/api/refresh` - Renovação de tokens
- `/api/waitlist` - Lista de espera

### 3. Autenticação (Middleware)

Para rotas protegidas, o middleware de autenticação:

1. **Busca o token**: Primeiro em cookies, depois no header Authorization
2. **Verifica expiração**: Se expirado, tenta renovar automaticamente
3. **Renovação automática**: Usa refresh token para obter novo access token
4. **Validação**: Verifica token com Supabase Auth
5. **Blacklist**: Verifica se token foi revogado
6. **Injeta usuário**: Adiciona `req.user` com `id` e `email`

### 4. Validação de Dados

Antes de processar, os controllers validam os dados usando schemas Joi:

- Validação de tipos e formatos
- Validação de regras de negócio
- Mensagens de erro padronizadas
- Retorno 400 com detalhes em caso de erro

### 5. Processamento

O controller:

1. **Obtém church_id**: Busca a igreja associada ao usuário autenticado
2. **Aplica multi-tenancy**: Filtra dados pela igreja do usuário
3. **Executa operação**: CRUD no Supabase
4. **Registra auditoria**: Log de operações importantes
5. **Retorna resposta**: JSON com dados ou erro

### 6. Tratamento de Erros

Erros são capturados e retornados em formato padronizado:

```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais (apenas em desenvolvimento)"
}
```

---

## Autenticação e Autorização

### Fluxo de Autenticação

1. **Registro**:
   - Valida dados da igreja (CNPJ único)
   - Cria usuário no Supabase Auth
   - Cria registro da igreja no banco
   - Envia email de confirmação

2. **Login**:
   - Valida credenciais com Supabase Auth
   - Gera tokens (access + refresh)
   - Armazena tokens em cookies HttpOnly
   - Retorna dados do usuário

3. **Renovação de Token**:
   - Detecta token expirado automaticamente
   - Usa refresh token para obter novo access token
   - Atualiza cookies automaticamente
   - Transparente para o cliente

4. **Logout**:
   - Adiciona token à blacklist (memória)
   - Remove cookies de autenticação
   - Invalida sessão no Supabase

### Autorização (Multi-tenancy)

O sistema garante isolamento de dados por igreja:

- Cada usuário pertence a uma igreja (`churches.user_id`)
- Todas as queries filtram por `church_id`
- Não há acesso cruzado entre igrejas
- Validação automática em todas as operações

---

## Validação de Dados

### Estrutura de Validação

Cada módulo possui validators específicos:

- **Schemas Joi**: Definem estrutura e regras
- **Validação no Controller**: Antes de processar
- **Mensagens Personalizadas**: Erros claros e específicos

### Validações Comuns

- **CNPJ**: Formato e dígitos verificadores
- **Email**: Formato e unicidade
- **Telefone**: Formato brasileiro
- **Datas**: Formato e consistência
- **Campos Obrigatórios**: Verificação de preenchimento
- **Unicidade**: Prevenção de duplicatas

---

## Multi-tenancy

### Isolamento de Dados

O sistema implementa multi-tenancy através de:

1. **Associação Usuário-Igreja**: Cada usuário pertence a uma igreja
2. **Filtro Automático**: Todas as queries incluem `church_id`
3. **Validação de Acesso**: Verificação antes de operações
4. **Row Level Security**: Supabase RLS como camada adicional

### Fluxo de Isolamento

1. Usuário autenticado → `req.user.id`
2. Busca igreja → `churches.user_id = req.user.id`
3. Obtém `church_id` da igreja
4. Todas as operações filtram por `church_id`
5. Garante que dados retornados pertencem à igreja do usuário

---

## Segurança

### Medidas Implementadas

1. **Rate Limiting**:
   - Geral: 1000 req/15min por IP
   - Login: 10 tentativas/15min
   - Registro: 10 tentativas/15min
   - Recuperação de senha: 5 tentativas/hora

2. **CORS**:
   - Origens permitidas configuráveis
   - Credenciais habilitadas
   - Headers específicos permitidos

3. **Helmet**:
   - Headers de segurança HTTP
   - Proteção contra XSS, clickjacking, etc.

4. **Cookies Seguros**:
   - HttpOnly (não acessível via JavaScript)
   - Secure (apenas HTTPS em produção)
   - SameSite (proteção CSRF)

5. **Token Blacklist**:
   - Tokens revogados em memória
   - Verificação em cada requisição autenticada

6. **Validação Rigorosa**:
   - Validação de entrada em todas as rotas
   - Sanitização de dados
   - Prevenção de SQL injection (Supabase)

---

## Padrões e Convenções

### Nomenclatura

- **Controllers**: `nomeController.ts` (ex: `memberController.ts`)
- **Routes**: `nome.ts` (ex: `members.ts`)
- **Validators**: `nomeValidator.ts` (ex: `memberValidator.ts`)
- **Funções**: camelCase (ex: `createMember`)
- **Rotas**: kebab-case (ex: `/api/members`)

### Estrutura de Resposta

**Sucesso (200/201)**:
```json
{
  "data": {...},
  "message": "Operação realizada com sucesso"
}
```

**Erro (400/401/404/500)**:
```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais"
}
```

### Tratamento de Erros

- **400**: Dados inválidos ou regra de negócio violada
- **401**: Não autenticado ou token inválido
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

---

## Auditoria

### Sistema de Logs

O sistema registra operações importantes:

- **Entidades**: member, role, congregation, integration_member
- **Ações**: create, update, delete, convert
- **Dados**: Estado antes e depois da operação
- **Metadados**: Usuário, igreja, timestamp

### Implementação

- Logs são inseridos na tabela `audit_logs`
- Registro automático em operações críticas
- Consultável via endpoint `/api/account/logs`

---

## Exportação de Dados

### Funcionalidades

- **PDF Individual**: Dados completos de um membro/integrante
- **PDF Lista**: Lista filtrada com campos selecionáveis
- **PDF Dashboard**: Relatórios completos

### Tecnologia

- **PDFKit**: Geração de PDFs
- **Chart.js + Canvas**: Gráficos em PDFs
- **Streaming**: Resposta direta ao cliente

---

## Variáveis de Ambiente

### Obrigatórias

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_KEY`: Chave pública (anon key)
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (admin)
- `PORT`: Porta do servidor (padrão: 4000)

### Opcionais

- `FRONTEND_URL`: URL do frontend (CORS)
- `LANDING_URL`: URL da landing page (CORS)
- `NODE_ENV`: Ambiente (development/production)

---

## Desenvolvimento

### Scripts Disponíveis

- `npm run dev`: Desenvolvimento com hot-reload
- `npm run build`: Compilação TypeScript
- `npm start`: Execução em produção
- `npm test`: Execução de testes

### Estrutura de Desenvolvimento

1. **TypeScript**: Código fonte em `.ts`
2. **Compilação**: Gera JavaScript em `dist/`
3. **Hot Reload**: `ts-node-dev` em desenvolvimento
4. **Type Safety**: TypeScript para validação de tipos

---

## Fluxo de Dados Típico

### Exemplo: Criar Membro

1. **Cliente** → `POST /api/members` com dados do membro
2. **Middleware Auth** → Valida token, injeta `req.user`
3. **Route** → Roteia para `createMember` controller
4. **Controller** → Valida dados com Joi
5. **Controller** → Busca `church_id` do usuário
6. **Controller** → Insere membro no Supabase (com `church_id`)
7. **Controller** → Registra log de auditoria
8. **Controller** → Retorna membro criado (201)
9. **Cliente** → Recebe resposta com dados

### Exemplo: Listar Membros

1. **Cliente** → `GET /api/members?page=1&limit=20&status=active`
2. **Middleware Auth** → Valida token
3. **Route** → Roteia para `listMembers` controller
4. **Controller** → Valida parâmetros de query
5. **Controller** → Busca `church_id` do usuário
6. **Controller** → Query no Supabase com filtros + `church_id`
7. **Controller** → Aplica paginação
8. **Controller** → Retorna lista paginada (200)
9. **Cliente** → Recebe dados + metadados de paginação

---

## Considerações Importantes

### Multi-tenancy

- **Sempre** filtrar por `church_id` em queries
- **Nunca** confiar em `church_id` do cliente
- **Sempre** buscar `church_id` do usuário autenticado
- **Validar** que recursos pertencem à igreja do usuário

### Segurança

- **Nunca** expor detalhes de erro em produção
- **Sempre** validar entrada de dados
- **Sempre** usar HTTPS em produção
- **Monitorar** rate limiting e tentativas de acesso

### Performance

- **Paginação**: Sempre usar em listagens
- **Índices**: Garantir índices em `church_id` e campos de busca
- **Queries**: Otimizar queries do Supabase
- **Cache**: Considerar cache para dados estáticos

### Manutenção

- **Logs**: Usar console.log para debug, audit_logs para auditoria
- **Erros**: Sempre capturar e tratar erros
- **Validação**: Manter validators atualizados
- **Documentação**: Atualizar quando adicionar features

---

## Próximos Passos

Para adicionar uma nova funcionalidade:

1. Criar validator em `validators/`
2. Criar controller em `controllers/`
3. Criar rotas em `routes/`
4. Registrar rotas em `app.ts`
5. Implementar multi-tenancy (filtro por `church_id`)
6. Adicionar logs de auditoria
7. Testar validações e segurança

---

**Versão**: 1.0  
**Última Atualização**: 2024

