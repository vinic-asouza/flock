# Flock — Levantamento Estruturado de Fluxos por Módulo

> **Tipo:** Documento de análise de produto  
> **Elaborado por:** Analista de Produto + QA Sênior (IA)  
> **Data:** Abril 2026  
> **Versão:** 1.0  
> **Escopo:** Monorepo completo — `backend/`, `frontend/`, `landing/`

---

## 1. Resumo Executivo

### Visão geral do produto

O **Flock** é uma plataforma SaaS B2B de **gestão eclesiástica** (church management system), voltada para igrejas brasileiras. O produto permite que uma organização religiosa gerencie sua membresia de forma completa: cadastro e acompanhamento de membros, processo de integração de novos membros, estrutura organizacional (congregações e grupos), calendário de eventos, relatórios analíticos e configurações administrativas.

O modelo de negócio é **multi-tenant**: cada igreja opera em silo isolado por `church_id`. A monetização é via **Stripe** com planos escalonados por limite de membros (grátis/200/500/800). A entrada no produto se dá pela **landing page** (aguardar waitlist ou ir direto para registro), com cadastro próprio no **frontend**.

### Stack técnica resumida

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js + Express + TypeScript + Supabase (PostgreSQL) |
| Frontend | Next.js 15 App Router + React 19 + Tailwind CSS 4 |
| Landing | Next.js 15 + Tailwind CSS |
| Auth | Supabase Auth + cookies HttpOnly + JWT |
| Pagamentos | Stripe (checkout, portal, webhook) |
| E-mail | Resend |
| PDF | PDFKit |
| Validação BE | Joi |
| Validação FE | Zod + React Hook Form |

### Quantidade de módulos/features identificados

**11 módulos de negócio** foram identificados:

1. Autenticação e Sessão
2. Onboarding e Registro de Igreja
3. Gestão de Membros
4. Integração de Novos Membros (pré-membros)
5. Gestão de Congregações
6. Gestão de Grupos
7. Calendário e Eventos
8. Relatórios e Dashboard Analytics
9. Configurações e Administração
10. Assinatura e Billing
11. Links Públicos (autocadastro e autointegração sem login)

**2 módulos auxiliares/transversais:**
- Landing / Aquisição (waitlist, pricing, CTAs)
- Tutoriais (placeholder, incompleto)

### Grau de clareza arquitetural

**Média-alta.** A estrutura é consistente e bem organizada. O isolamento multi-tenant está implementado na camada de aplicação (filtros por `church_id`). A maior opacidade está em:
- Proteção de rotas no frontend (não há `middleware.ts`; apenas a home tem `ProtectedRoute`)
- Blacklist de tokens em memória (risco em produção multi-instância)
- Módulo de billing tem fluxo complexo com múltiplos estados e edge cases pouco visíveis no frontend

---

## 2. Mapa Geral de Módulos/Features

| # | Módulo/Feature | Objetivo de Negócio | Tipo de Usuário | Área | Criticidade | Confiança |
|---|---------------|---------------------|-----------------|------|-------------|-----------|
| 1 | Autenticação e Sessão | Garantir acesso seguro e isolado por tenant | Todos os usuários logados | BE + FE | **Crítica** | Alta |
| 2 | Onboarding / Registro de Igreja | Converter novo cliente e criar tenant | Novo owner | BE + FE + Landing | **Alta** | Alta |
| 3 | Gestão de Membros | Core do produto: gerenciar membresia | Admin, Editor, Reader | BE + FE | **Crítica** | Alta |
| 4 | Integração de Novos Membros | Capturar e qualificar pré-membros | Admin, Editor; Público (link) | BE + FE | **Alta** | Alta |
| 5 | Gestão de Congregações | Estrutura organizacional da igreja | Admin, Editor | BE + FE | **Alta** | Alta |
| 6 | Gestão de Grupos | Subgrupos, ministérios, células | Admin, Editor | BE + FE | **Média** | Alta |
| 7 | Calendário e Eventos | Agenda de atividades da igreja | Admin, Editor, Reader | BE + FE | **Média** | Alta |
| 8 | Relatórios e Dashboard | Inteligência sobre a membresia | Todos os logados | BE + FE | **Alta** | Alta |
| 9 | Configurações e Administração | Gerenciar church, conta, equipe, logs | Owner, Admin | BE + FE | **Alta** | Alta |
| 10 | Assinatura e Billing | Receita e controle de limites | Owner, Admin | BE + FE + Landing | **Crítica** | Média |
| 11 | Links Públicos | Captação sem fricção de login | Público externo | BE + FE | **Alta** | Alta |
| 12 | Landing / Aquisição | Marketing, aquisição, entrada no funil | Visitante anônimo | Landing | **Alta** | Alta |
| 13 | Tutoriais | Onboarding educacional pós-login | Todos os logados | FE | **Baixa** | Alta (incompleto) |

---

## 3. Fluxos por Módulo

---

### ✅ Módulo 1 — Autenticação e Sessão

**Objetivo:** Controlar acesso ao sistema, garantir identidade do usuário, isolar o tenant correto e manter a sessão válida.

**Atores:** Qualquer usuário que acesse o sistema. Papel resolvido em cada request via `getChurchContextForUser`.

**Pré-condições:** E-mail confirmado no Supabase; conta com vínculo a uma church.

#### Fluxo principal — Login

1. Usuário acessa `/login`
2. Preenche e-mail e senha (validação Zod no FE)
3. Frontend chama `POST /api/auth/login`
4. Backend autentica via `supabase.auth.signInWithPassword`
5. Resolve `churchId` e `role` via `getChurchContextForUser`
6. Seta 3 cookies HttpOnly: `access_token`, `refresh_token`, `session_id`
7. Retorna `{ church }` no JSON
8. Frontend atualiza `AuthContext` com `user`, `currentRole`
9. Redireciona para `/` (dashboard)

#### Subfluxo — Refresh de token

- `POST /api/refresh/refresh` renova cookies a partir do `refresh_token`
- `GET /api/refresh/check` verifica autenticação atual e retorna `{ authenticated, user, church, role }`
- Interceptor Axios no FE captura 401 e redireciona para `/login` (exceto rotas públicas)

#### Subfluxo — Logout

- `POST /api/auth/logout`
- Token adicionado à **blacklist em memória** (`global.tokenBlacklist`)
- Cookies limpos
- FE redireciona para `/login`

#### Subfluxo — Callback de e-mail (confirmação)

- Supabase redireciona para `/auth/callback` (hash com tokens)
- Frontend faz `POST /api/auth/callback` via `fetch` direto (não pelo `apiService`)
- Backend processa, cria cookies, redireciona para `/`

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/login` | `src/app/(auth)/login/page.tsx` |
| `/auth/callback` | `src/app/auth/callback/page.tsx` |

#### Endpoints Backend

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/auth/login` | Público + rate limit |
| POST | `/api/auth/logout` | Cookie/JWT |
| POST | `/api/auth/callback` | Público + rate limit |
| POST | `/api/refresh/refresh` | Cookie refresh + rate limit |
| GET | `/api/refresh/check` | Opcional (sem falha) |

#### Arquivos relevantes

- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/auth/callback/page.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/services/api.ts` (interceptor 401)
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/authCallbackController.ts`
- `backend/src/controllers/refreshController.ts`
- `backend/src/middlewares/auth.ts`
- `backend/src/services/churchContext.ts`

#### Dependências com outros módulos

- **Todos os módulos autenticados** dependem deste fluxo
- **Billing**: resolução do plano ativo vem junto com `church` no `checkAuth`
- **Configurações**: papel (`role`) determina o que o usuário pode ver/fazer

#### Status do mapeamento: **Confirmado**

#### Riscos identificados (para análise QA)

- `ProtectedRoute` só está presente na home `/`; rotas `(main)/*` não têm proteção de layout explícita no FE
- Blacklist de tokens em memória não sobrevive a reinícios ou múltiplas instâncias do backend
- Callback de e-mail usa `fetch` direto (sem `apiService`), portanto sem interceptor de erros padrão

---

### ✅ Módulo 2 — Onboarding e Registro de Igreja

**Objetivo:** Criar um novo tenant (church) com seu owner, vincular ao plano escolhido, confirmar e-mail e dar acesso ao sistema.

**Atores:** Novo usuário/administrador de uma igreja que nunca usou o Flock.

**Pré-condições:** Acesso à landing page ou URL direta `/register`; e-mail válido não cadastrado.

#### Fluxo principal

1. Usuário acessa `/register` (via landing ou URL direta)
2. Preenche formulário grande: e-mail, senha, confirmação de senha, telefone pessoal + dados da igreja (nome, denominação, endereço, cidade/UF via IBGE, CNPJ opcional, e-mail/telefone da igreja)
3. Validação Zod no FE
4. Frontend chama `POST /api/auth/register`
5. Backend:
   a. Valida payload via Joi (`validateChurch`)
   b. Cria usuário no Supabase Auth (`signUp`)
   c. Cria registro em `churches`
   d. Cria entrada em `church_users` como `owner`
   e. Cria `pending_subscriptions` com plano selecionado
   f. Envia e-mail de boas-vindas em background (Resend)
   g. Retorna `{ church, subscriptionLinked }` com **201**
6. FE recebe resposta; exibe mensagem de confirmação de e-mail
7. Usuário clica no link do e-mail → `/auth/callback` (Módulo 1)
8. Após confirmação, acessa `/checkout` para escolher plano

#### Subfluxo — Seleção de plano (checkout)

- `/checkout` lista planos via `GET /api/plans`
- Usuário escolhe plano grátis: `POST /api/stripe/activate-free-plan`
- Usuário escolhe plano pago: vai para Stripe via `POST /api/stripe/create-checkout-session`
- Retorno: `/subscription/success` (polling `GET /api/stripe/checkout-status`) ou `/subscription/cancel`

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/register` | `src/app/(auth)/register/page.tsx` |
| `/checkout` | `src/app/(auth)/checkout/page.tsx` |
| `/subscription/success` | `src/app/subscription/success/page.tsx` |
| `/subscription/cancel` | `src/app/subscription/cancel/page.tsx` |
| `/auth/callback` | `src/app/auth/callback/page.tsx` |

#### Endpoints Backend

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/auth/register` | Público + rate limit |
| GET | `/api/plans` | Público |
| GET | `/api/plans/paid` | Público |
| POST | `/api/stripe/activate-free-plan` | Auth + Admin |
| POST | `/api/stripe/create-checkout-session` | optionalAuth |
| GET | `/api/stripe/checkout-status` | Auth + Admin |

#### Arquivos relevantes

- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/app/(auth)/checkout/page.tsx`
- `frontend/src/app/subscription/success/page.tsx`
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/stripeController.ts`
- `backend/src/controllers/plansController.ts`
- `backend/src/config/plans.ts`
- `backend/src/validators/churchValidator.ts`

#### Dependências

- Módulo 1 (Auth): confirmação de e-mail necessária para acessar o sistema
- Módulo 10 (Billing): vínculo de plano criado aqui

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- Fluxo de confirmação de e-mail pode ser longo; estado intermediário da conta (criada mas não confirmada) precisa de tratamento
- `checkout/page.tsx` usa `axios` diretamente (não via `apiService`), sem interceptor padrão
- O `pending_subscription` criado no registro precisa ser limpo se o usuário abandonar o onboarding

---

### ✅ Módulo 3 — Gestão de Membros

**Objetivo:** Permitir o gerenciamento completo da membresia: criação, edição, exclusão, visualização, importação em lote, exportação e autocadastro público.

**Atores:** Editor (CRUD), Reader (visualização), Admin/Owner (tudo + links públicos).

**Pré-condições:** Usuário autenticado, com papel mínimo `reader`. Plano ativo com limite de membros disponível para operações de criação.

#### Fluxo principal — Listagem e navegação

1. Usuário acessa `/members`
2. `MembersContext` inicializa, chama `listMembers` (`GET /api/members`)
3. Lista exibida com paginação, filtros e opções de visualização (lista/cards, via `useViewMode`)
4. Header exibe alerta se limite de membros atingido

#### Subfluxo — Criar membro

1. Editor clica em "Adicionar membro"
2. Abre `CreateMemberModal` com `MemberForm` (schema Zod extenso: nome, contatos, datas, gênero, estado civil, documentos, endereço, batismo, cargo, congregação, etc.)
3. Submissão: `POST /api/members`
4. Backend valida Joi (`validateMember`), verifica limite de plano (`checkMemberLimit`)
5. Insere em `members` com `church_id`
6. FE atualiza contexto e dispara `window.dispatchEvent('memberUpdated')` para Header

#### Subfluxo — Editar membro

1. Click no membro → abre `EditMemberModal`
2. Carrega dados: `GET /api/members/:id`
3. Edição com `MemberForm`
4. Submissão: `PUT /api/members/:id` (papel `editor` obrigatório)
5. FE atualiza estado via contexto

#### Subfluxo — Excluir membro

1. Confirmação modal
2. `DELETE /api/members/:id` (soft delete no banco)
3. FE remove da lista

#### Subfluxo — Importação CSV

1. Editor abre modal de importação
2. Upload arquivo `.csv` (max 10MB, via Multer)
3. `POST /api/members/import/validate` — valida e retorna preview/erros
4. Usuário confirma
5. `POST /api/members/import` — importa lote
6. Backend usa `memberImportService.ts` para parse, validação e inserção

#### Subfluxo — Exportação

| Tipo | Endpoint |
|------|----------|
| PDF individual | `GET /api/export/member/:id/pdf` |
| Lista PDF | `POST /api/export/members/list` |
| Lista CSV | `POST /api/export/members/list/csv` |

#### Subfluxo — Autocadastro público (link)

1. Admin cria link em `RegistrationLinksModal`
2. Link gerado aponta para `/public/register/[token]`
3. Visitante (sem login) preenche `PublicMemberForm`
4. `POST /api/public/registration/:token` (middleware `publicRegistrationAuth` valida token)
5. Membro criado diretamente na base

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/members` | `src/app/(main)/members/page.tsx` |
| `/public/register/[token]` | `src/app/public/register/[token]/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/members` | reader |
| GET | `/api/members/:id` | reader |
| POST | `/api/members` | editor |
| POST | `/api/members/batch` | editor |
| PUT | `/api/members/:id` | editor |
| DELETE | `/api/members/:id` | editor |
| POST | `/api/members/import/validate` | editor + upload |
| POST | `/api/members/import` | editor + upload |
| GET | `/api/members/reports` | reader |
| GET | `/api/members/birthdays/count` | reader |
| GET | `/api/members/birthdays/list` | reader |
| GET | `/api/export/member/:id/pdf` | reader |
| POST | `/api/export/members/list` | reader |
| POST | `/api/export/members/list/csv` | reader |
| GET | `/api/public/registration/:token` | Público (token) |
| POST | `/api/public/registration/:token` | Público (token) |

#### Arquivos relevantes

- `frontend/src/app/(main)/members/page.tsx`
- `frontend/src/context/MembersContext.tsx`
- `frontend/src/components/members/MemberForm.tsx`
- `frontend/src/app/public/register/[token]/page.tsx`
- `frontend/src/components/public/PublicMemberForm.tsx`
- `backend/src/controllers/memberController.ts`
- `backend/src/controllers/memberImportController.ts`
- `backend/src/controllers/publicRegistrationController.ts`
- `backend/src/services/memberImportService.ts`
- `backend/src/middlewares/publicRegistrationAuth.ts`
- `backend/src/validators/memberValidator.ts`

#### Dependências

- Módulo 1 (Auth): todas as rotas protegidas
- Módulo 4 (Integração): membros podem ser criados via conversão de integrante
- Módulo 5 (Congregações): campo `congregação` no formulário de membro
- Módulo 10 (Billing): limite de membros verificado a cada criação
- Módulo 8 (Relatórios): dados de membros alimentam o dashboard

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- Limite de membros verificado no backend mas o alerta visual no Header depende de evento customizado `memberUpdated` — race condition possível
- Importação CSV pode falhar silenciosamente para linhas individuais; relatório de erros precisa de análise
- Soft delete: membros deletados ainda existem no banco — impacto em relatórios precisa ser verificado

---

### ✅ Módulo 4 — Integração de Novos Membros

**Objetivo:** Gerenciar o processo de acolhimento/integração de visitantes e candidatos à membresia antes de se tornarem membros formais. Funciona como um funil pré-membresia.

**Atores:** Editor (CRUD), Reader (visualização), Público via link.

**Pré-condições:** Usuário autenticado com papel mínimo `reader`, ou visitante com link de integração válido.

#### Fluxo principal

1. Usuário acessa `/integration`
2. `IntegrationContext` carrega lista via `GET /api/integration`
3. Lista de integrantes com filtros (status, congregação, mentor, gênero, etc.)
4. Editor pode criar, editar, excluir integrantes
5. Ação especial: **converter integrante em membro** (`POST /api/integration/:id/convert`)

#### Subfluxo — Autointegração pública

1. Admin cria link via `IntegrationLinksModal`
2. Link aponta para `/public/integration/[token]`
3. Visitante preenche `PublicIntegrationForm` (campos: nome, nascimento, gênero, estado civil, telefone, WhatsApp, tipo de admissão esperada, congregação esperada, mentor, notas)
4. `POST /api/public/integration/:token`
5. Integrante criado com `church_id` e status inicial

#### Subfluxo — Conversão para membro

1. Editor abre modal do integrante
2. Clica em "Converter para membro"
3. `POST /api/integration/:id/convert`
4. Backend cria membro em `members`, possivelmente remove de `integration_members`
5. FE atualiza ambas as listas

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/integration` | `src/app/(main)/integration/page.tsx` |
| `/public/integration/[token]` | `src/app/public/integration/[token]/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/integration` | reader |
| GET | `/api/integration/:id` | reader |
| POST | `/api/integration` | editor |
| PUT | `/api/integration/:id` | editor |
| DELETE | `/api/integration/:id` | editor |
| POST | `/api/integration/:id/convert` | editor |
| GET | `/api/public/integration/:token` | Público |
| POST | `/api/public/integration/:token` | Público |
| POST | `/api/export/integration/list` | reader |
| GET | `/api/export/integration/:id/pdf` | reader |

#### Arquivos relevantes

- `frontend/src/app/(main)/integration/page.tsx`
- `frontend/src/context/IntegrationContext.tsx`
- `frontend/src/components/integration/IntegrationForm.tsx`
- `frontend/src/app/public/integration/[token]/page.tsx`
- `frontend/src/components/public/PublicIntegrationForm.tsx`
- `backend/src/controllers/integrationController.ts`
- `backend/src/controllers/publicIntegrationController.ts`
- `backend/src/middlewares/publicIntegrationAuth.ts`
- `backend/src/validators/integrationMemberValidator.ts`

#### Dependências

- Módulo 3 (Membros): conversão cria membro; limite de membros precisa ser verificado
- Módulo 5 (Congregações): campo de congregação esperada
- Módulo 1 (Auth): rotas protegidas

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- Conversão de integrante para membro: não está claro no código se verifica limite do plano
- Status do integrante após conversão precisa ser verificado (removido? arquivado?)

---

### ✅ Módulo 5 — Gestão de Congregações

**Objetivo:** Gerenciar as congregações (filiais, pontos de encontro) que compõem a estrutura organizacional da igreja.

**Atores:** Editor (CRUD), Reader (visualização), Admin.

**Pré-condições:** Usuário autenticado com papel mínimo `reader`.

#### Fluxo principal

1. Usuário acessa `/congregations`
2. Lista de congregações via `GET /api/congregations`
3. Editor pode criar, editar, excluir
4. Formulário: nome, endereço, cidade (IBGE), estado, líder (membro da church), telefone

#### Subfluxo — Criação em lote

- `POST /api/congregations/batch` (para importação)

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/congregations` | `src/app/(main)/congregations/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/congregations` | reader |
| GET | `/api/congregations/:id` | reader |
| POST | `/api/congregations` | editor |
| POST | `/api/congregations/batch` | editor |
| PUT | `/api/congregations/:id` | editor |
| DELETE | `/api/congregations/:id` | editor |
| POST | `/api/export/congregations/list` | reader |

#### Arquivos relevantes

- `frontend/src/app/(main)/congregations/page.tsx`
- `frontend/src/components/congregations/CongregationForm.tsx`
- `backend/src/controllers/congregationController.ts`
- `backend/src/validators/congregationValidator.ts`
- `frontend/src/types/congregation.ts`

#### Dependências

- Módulo 3 (Membros): campo congregação no formulário de membro
- Módulo 4 (Integração): campo congregação esperada do integrante
- Módulo 6 (Grupos): grupos podem ter sede em uma congregação
- Módulo 7 (Calendário): eventos podem ser associados a congregações
- Módulo 8 (Relatórios): breakdown de membros por congregação

#### Status do mapeamento: **Confirmado**

---

### ✅ Módulo 6 — Gestão de Grupos

**Objetivo:** Gerenciar grupos internos da igreja (ministérios, células, departamentos, classes) e sua composição.

**Atores:** Editor (CRUD), Reader (visualização).

**Pré-condições:** Usuário autenticado, papel mínimo `reader`.

#### Fluxo principal

1. Usuário acessa `/groups`
2. Lista de grupos via `GET /api/groups`
3. `GroupSummaryBar` mostra contagem resumida
4. Editor cria/edita via `GroupModal` com `GroupForm`
5. Formulário: nome, tipo (enum extenso de tipos de grupo), descrição, congregação/sede, responsável (membro), status ativo

#### Subfluxo — Membros do grupo

- Grupos têm membros vinculados via `member_groups`
- Endpoint para listar membros do grupo (presumível via `GET /api/groups/:id`)
- Export de lista de membros do grupo: `POST /api/export/group/members/list`

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/groups` | `src/app/(main)/groups/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/groups` | reader |
| GET | `/api/groups/:id` | reader |
| POST | `/api/groups` | editor |
| PUT | `/api/groups/:id` | editor |
| DELETE | `/api/groups/:id` | editor |
| POST | `/api/export/group/members/list` | reader |
| POST | `/api/export/groups/list` | reader |

#### Arquivos relevantes

- `frontend/src/app/(main)/groups/page.tsx`
- `frontend/src/components/groups/GroupForm.tsx`
- `frontend/src/components/groups/GroupList.tsx`
- `frontend/src/components/groups/GroupSummaryBar.tsx`
- `backend/src/controllers/groupController.ts`
- `backend/src/validators/groupValidator.ts`

#### Dependências

- Módulo 3 (Membros): responsável do grupo é um membro; composição do grupo
- Módulo 5 (Congregações): sede do grupo
- Módulo 7 (Calendário): eventos podem ser associados a grupos

#### Status do mapeamento: **Confirmado**

---

### ✅ Módulo 7 — Calendário e Eventos

**Objetivo:** Gerenciar a agenda de eventos, cultos, reuniões e atividades da igreja, com visualização mensal e anual, filtros e controle de participantes.

**Atores:** Editor (CRUD), Reader (visualização).

**Pré-condições:** Usuário autenticado.

#### Fluxo principal

1. Usuário acessa `/calendar`
2. Visualização padrão: calendário mensal (`CalendarMonth`) ou lista anual (`CalendarListView`)
3. Filtros horizontais por tipo, congregação, grupo
4. `GET /api/calendar` carrega itens do período
5. Click em evento: modal de detalhe
6. Editor cria/edita: `CalendarItemForm` (título, tipo, datas, recorrência, local, congregação, grupo, responsável, participantes)
7. `GET /api/calendar/groups` — lista grupos com itens de calendário

#### Subfluxo — Aniversariantes

- `GET /api/members/birthdays/count` — contagem
- `GET /api/members/birthdays/list` — lista completa
- `BirthdaysModal` exibe lista de aniversariantes do mês

#### Subfluxo — Participantes

- Adição de participantes (membros ou convidados externos) a eventos
- Gerenciados via `calendar_participants`

#### Subfluxo — Export

- `GET /api/calendar/export/pdf` — atenção: rota estática antes de `/:id`, potencial conflito de rota

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/calendar` | `src/app/(main)/calendar/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/calendar` | reader |
| GET | `/api/calendar/groups` | reader |
| GET | `/api/calendar/:id` | reader |
| POST | `/api/calendar` | editor |
| PUT | `/api/calendar/:id` | editor |
| DELETE | `/api/calendar/:id` | editor |
| GET | `/api/calendar/export/pdf` | reader |

#### Arquivos relevantes

- `frontend/src/app/(main)/calendar/page.tsx`
- `frontend/src/components/calendar/CalendarMonth.tsx`
- `frontend/src/components/calendar/CalendarListView.tsx`
- `frontend/src/components/calendar/CalendarItemForm.tsx`
- `frontend/src/types/calendar.ts`
- `backend/src/controllers/calendarController.ts`
- `backend/src/controllers/calendarParticipantController.ts`
- `backend/src/validators/calendarValidator.ts`
- `backend/src/validators/calendarParticipantValidator.ts`

#### Dependências

- Módulo 3 (Membros): aniversariantes, responsáveis e participantes
- Módulo 5 (Congregações): filtro e associação de eventos
- Módulo 6 (Grupos): filtro e associação de eventos

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- Rota `GET /api/calendar/export/pdf` pode conflitar com `GET /api/calendar/:id` dependendo da ordem de declaração no router (verificado no código: declarada antes de `/:id` — precisa de confirmação)

---

### ✅ Módulo 8 — Relatórios e Dashboard Analytics

**Objetivo:** Fornecer visão analítica completa da membresia: demografia, crescimento, estrutura, geografia, grupos, ocupações e tendências temporais.

**Atores:** Todos os usuários autenticados (reader+).

**Pré-condições:** Usuário autenticado, dados de membros existentes.

#### Fluxo principal

1. Usuário acessa `/` (home/painel)
2. `ProtectedRoute` verifica autenticação (único componente que faz isso no layout)
3. `ViewSelector` permite filtrar por: Todas, Sede, por Congregação
4. `GET /api/members/reports` com filtros retorna dados estruturados
5. Componentes de gráfico renderizam: `SummaryCards`, `DemographicsCharts`, `GroupsCharts`, `ChurchStructureCharts`, `TimelineCharts`, `GeographySection`, `OccupationsTable`
6. Export dashboard: `GET /api/export/dashboard/pdf`

#### Subfluxo — Export PDF dashboard

1. Botão "Exportar PDF"
2. `GET /api/export/dashboard/pdf` com parâmetros de filtro
3. Backend gera PDF com PDFKit
4. Response como stream de bytes → download no browser

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/` | `src/app/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/members/reports` | reader + rate limit |
| GET | `/api/members/birthdays/count` | reader |
| GET | `/api/export/dashboard/pdf` | reader |

#### Arquivos relevantes

- `frontend/src/app/page.tsx`
- `frontend/src/components/main/reports/` (múltiplos componentes)
- `frontend/src/hooks/useReports.ts`
- `frontend/src/types/reports.ts`
- `backend/src/controllers/memberController.ts` (getMemberReports)
- `backend/src/controllers/exportController.ts`

#### Dependências

- Módulo 3 (Membros): fonte de todos os dados
- Módulo 5 (Congregações): breakdown por congregação
- Módulo 1 (Auth): único módulo com `ProtectedRoute` explícito

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- `TanStack React Query` está instalado mas **não é utilizado** — dados de relatórios são carregados sem cache/stale-while-revalidate; re-renders podem gerar requests desnecessários
- Home é a única rota com `ProtectedRoute` explícito

---

### ✅ Módulo 9 — Configurações e Administração

**Objetivo:** Permitir o gerenciamento da conta de usuário, dados da igreja, equipe de usuários, plano de assinatura e auditoria de ações.

**Atores:** Segmentado por papel (tabs condicionais):
- Dados da Igreja: Admin+
- Plano/Pagamento: Owner/Admin
- Conta pessoal: Todos
- Usuários da Igreja: Admin+
- Logs de Auditoria: Admin+

**Pré-condições:** Usuário autenticado.

#### Fluxo principal

1. Usuário acessa `/settings`
2. Tab ativa controlada por `?tab=church|payment|account|users|logs`
3. Cada tab carrega seus dados independentemente

#### Subfluxo — Dados da Igreja (`ChurchManagement`)

- `GET /api/church` — carrega dados
- `PUT /api/church` — atualiza (papel `admin`)
- Campos: nome, denominação, endereço, CNPJ, contatos

#### Subfluxo — Plano/Pagamento (`PaymentManagement`)

- Exibe plano atual, limite de membros, status da assinatura
- Acesso ao portal Stripe: `POST /api/stripe/create-portal-session`
- Trocar plano: `POST /api/stripe/change-plan`
- Links rápidos para checkout

#### Subfluxo — Conta Pessoal (`AccountManagement`)

- `GET /api/account` — dados da conta
- `PUT /api/account/email` — troca e-mail (sensitive limiter)
- `PUT /api/account/password` — troca senha
- `PUT /api/account/phone` — troca telefone
- `DELETE /api/account` — excluir conta (sensitive limiter)
- `POST /api/account/resend-confirmation` — reenvio de confirmação

#### Subfluxo — Usuários da Igreja (`ChurchUsersManagement`)

- Visível apenas para admin/owner
- CRUD de usuários convidados com papéis
- Endpoints em `/api/church-users`

#### Subfluxo — Logs de Auditoria (`AuditLogs`)

- Visível apenas para admin
- `GET /api/account/logs` — lista eventos auditados
- Tabela de ações realizadas por usuários na church

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/settings` | `src/app/(main)/settings/page.tsx` |

#### Endpoints Backend

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/api/church` | reader |
| GET | `/api/church/member-limit` | reader |
| PUT | `/api/church` | admin |
| GET | `/api/account` | auth |
| PUT | `/api/account/email` | auth + sensitive |
| PUT | `/api/account/password` | auth + sensitive |
| PUT | `/api/account/phone` | auth |
| DELETE | `/api/account` | auth + sensitive |
| POST | `/api/account/resend-confirmation` | auth |
| GET | `/api/account/logs` | admin |
| GET/POST/PUT/DELETE | `/api/church-users/*` | admin |
| POST | `/api/stripe/create-portal-session` | auth + admin |
| POST | `/api/stripe/change-plan` | auth + admin |
| POST | `/api/stripe/sync-subscription` | auth + admin |

#### Arquivos relevantes

- `frontend/src/app/(main)/settings/page.tsx`
- `frontend/src/components/settings/ChurchManagement.tsx`
- `frontend/src/components/settings/AccountManagement.tsx`
- `frontend/src/components/settings/PaymentManagement.tsx`
- `frontend/src/components/settings/ChurchUsersManagement.tsx`
- `frontend/src/components/settings/AuditLogs.tsx`
- `backend/src/controllers/churchController.ts`
- `backend/src/controllers/accountController.ts`
- `backend/src/controllers/churchUserController.ts`
- `backend/src/controllers/stripeController.ts`

#### Dependências

- Módulo 1 (Auth): papel do usuário determina tabs visíveis
- Módulo 10 (Billing): tab de pagamento
- Todos os módulos: logs de auditoria registram ações transversais

#### Status do mapeamento: **Confirmado**

---

### Módulo 10 — Assinatura e Billing

**Objetivo:** Gerenciar planos, pagamentos, limites de membros e ciclo de vida da assinatura via Stripe.

**Atores:** Owner/Admin para operações; Backend via webhook para eventos automáticos.

**Pré-condições:** Igreja registrada; Stripe configurado com price IDs.

#### Fluxo principal — Contratação

1. Novo usuário conclui registro
2. É direcionado para `/checkout`
3. Seleciona plano (grátis ou pago)
4. Plano grátis: `POST /api/stripe/activate-free-plan`
5. Plano pago: `POST /api/stripe/create-checkout-session` → redirect para Stripe Checkout
6. Pagamento confirmado pelo Stripe → webhook `POST /api/stripe/webhook`
7. Backend atualiza `churches` com `subscription_status`, `plan_type`, `member_limit`
8. Usuário redirecionado para `/subscription/success` → polling `GET /api/stripe/checkout-status`

#### Subfluxo — Troca de plano

- Em `/settings?tab=payment`
- `POST /api/stripe/change-plan`
- Stripe atualiza assinatura, webhook confirma

#### Subfluxo — Portal do cliente

- `POST /api/stripe/create-portal-session`
- Redireciona para portal Stripe (gerenciar cartão, histórico, cancelamento)

#### Subfluxo — Jobs automáticos

- `checkSubscriptionExpiration.ts`: verifica assinaturas vencidas, envia e-mails de aviso
- `cleanupPendingSubscriptions.ts`: limpa `pending_subscriptions` abandonadas

#### Subfluxo — Webhook Stripe

- `POST /api/stripe/webhook` (raw body, validação por assinatura Stripe)
- Processa: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, etc.

#### Planos identificados (via docs)

| Plano | Limite | Preço (landing) | Preço (STRIPE-MAINTENANCE.md) |
|-------|--------|-----------------|-------------------------------|
| Grátis | 100 membros | — | R$ 0 |
| Básico | 200 membros | R$ 29/mês | R$ 29,99/mês |
| Intermediário | 500 membros | R$ 59/mês | R$ 59,99/mês |
| Avançado | 800 membros | R$ 89/mês | R$ 89,99/mês |

> ⚠️ **Inconsistência identificada:** preços na landing diferem dos valores documentados em `STRIPE-MAINTENANCE.md`.

#### Arquivos relevantes

- `frontend/src/app/(auth)/checkout/page.tsx`
- `frontend/src/app/subscription/success/page.tsx`
- `frontend/src/components/settings/PaymentManagement.tsx`
- `backend/src/controllers/stripeController.ts`
- `backend/src/controllers/plansController.ts`
- `backend/src/services/stripe.ts`
- `backend/src/config/plans.ts`
- `backend/src/jobs/checkSubscriptionExpiration.ts`
- `backend/src/jobs/cleanupPendingSubscriptions.ts`
- `docs/STRIPE-MAINTENANCE.md`

#### Dependências

- Módulo 2 (Onboarding): billing iniciado no registro
- Módulo 3 (Membros): limite de membros controlado pelo plano
- Módulo 9 (Configurações): UI de gerenciamento do plano

#### Status do mapeamento: **Confirmado parcialmente** — fluxo de webhook e estados intermediários são mais opacos

#### Riscos identificados

- `checkout/page.tsx` usa axios diretamente, não `apiService`
- Polling em `/subscription/success` pode ficar em loop se webhook demorar
- Preços inconsistentes entre landing e documentação

---

### Módulo 11 — Links Públicos

**Objetivo:** Permitir que membros e integrantes sejam captados via links compartilháveis sem necessidade de login, com autenticação por token no path.

**Atores:** Administrador (cria links), Público externo (usa links).

**Pré-condições:** Admin autenticado para criar links; link válido, ativo e dentro do limite de usos para usar.

#### Fluxo principal — Link de Cadastro de Membro

1. Admin acessa `/members` → abre `RegistrationLinksModal`
2. Cria link: `POST /api/registration-links`
3. Compartilha URL: `[frontend]/public/register/[token]`
4. Visitante acessa a URL pública
5. Middleware `publicRegistrationAuth` valida: token existente, não expirado, dentro do limite de usos, church ativa
6. GET retorna dados da church para apresentação
7. Visitante preenche `PublicMemberForm`
8. POST cria membro com `church_id` do link
9. Limite de membros do plano é verificado

#### Fluxo principal — Link de Integração

1. Admin acessa `/integration` → abre `IntegrationLinksModal`
2. Cria link: `POST /api/integration-links`
3. Compartilha URL: `[frontend]/public/integration/[token]`
4. Visitante preenche `PublicIntegrationForm`
5. POST cria integrante com `church_id` do link

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/public/register/[token]` | `src/app/public/register/[token]/page.tsx` |
| `/public/integration/[token]` | `src/app/public/integration/[token]/page.tsx` |

#### Endpoints Backend

| Método | Rota | Auth |
|--------|------|------|
| GET/POST | `/api/registration-links/*` | auth + reader/editor |
| GET/POST | `/api/integration-links/*` | auth + reader/editor |
| GET | `/api/public/registration/:token` | Público (token) |
| POST | `/api/public/registration/:token` | Público (token) |
| GET | `/api/public/integration/:token` | Público (token) |
| POST | `/api/public/integration/:token` | Público (token) |

#### Arquivos relevantes

- `frontend/src/app/public/register/[token]/page.tsx`
- `frontend/src/app/public/integration/[token]/page.tsx`
- `frontend/src/components/public/PublicMemberForm.tsx`
- `frontend/src/components/public/PublicIntegrationForm.tsx`
- `backend/src/middlewares/publicRegistrationAuth.ts`
- `backend/src/middlewares/publicIntegrationAuth.ts`
- `backend/src/controllers/registrationLinkController.ts`
- `backend/src/controllers/integrationLinkController.ts`
- `backend/src/controllers/publicRegistrationController.ts`
- `backend/src/controllers/publicIntegrationController.ts`

#### Dependências

- Módulo 3 (Membros): link de cadastro cria membros
- Módulo 4 (Integração): link de integração cria integrantes
- Módulo 10 (Billing): limite do plano verificado no cadastro via link

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- Token expirado: tratamento da UX pública (o que o visitante vê?) precisa ser verificado
- Limite de usos do link: comportamento quando esgotado precisa de estado claro na UI pública

---

### ✅ Módulo 12 — Landing / Aquisição

**Objetivo:** Apresentar o produto, converter visitantes em leads (waitlist) ou novos clientes (registro direto), e comunicar proposta de valor.

**Atores:** Visitante anônimo.

#### Fluxo principal — Aquisição via landing

1. Visitante acessa `https://flockapp.com.br`
2. Vê hero com CTA "Assinar Agora" → âncora `#pricing`
3. Vê seções: Features, Demo (carrossel), ProcessSection, Pricing
4. Pricing: clica em plano → `CheckoutButton`
5. `CheckoutButton` (isAuthenticated padrão `false`): redireciona para `[frontend]/register`
6. Visitante se registra → fluxo Onboarding (Módulo 2)

#### Subfluxo — Waitlist

1. Visitante acessa `#waitlist` ou `/waitlist`
2. Preenche `WaitlistForm`: nome, e-mail, telefone, igreja, cidade, estado, plano de interesse
3. `POST /api/waitlist`
4. Backend valida Joi e salva em `waitlist`
5. Toast de confirmação

#### Telas / Rotas Landing

| Rota | Arquivo |
|------|---------|
| `/` | `landing/src/app/page.tsx` |
| `/waitlist` | `landing/src/app/waitlist/page.tsx` |

#### CTAs mapeados

| CTA | Destino |
|-----|---------|
| "Acessar Painel" (header) | `[frontend]/login` |
| "Assinar Agora" (pricing) | `[frontend]/register` (sempre, independente de auth) |
| "Entre em contato" (>800) | `#waitlist?plan=personalizado` |
| Formulário Waitlist | `POST /api/waitlist` |

#### Arquivos relevantes

- `landing/src/app/page.tsx`
- `landing/src/app/waitlist/page.tsx`
- `landing/src/components/Header.tsx`
- `landing/src/components/Pricing.tsx`
- `landing/src/components/CheckoutButton.tsx`
- `landing/src/components/WaitlistForm.tsx`
- `landing/src/services/waitlist.ts`
- `backend/src/controllers/waitlistController.ts`
- `backend/src/validators/waitlistValidator.ts`

#### Status do mapeamento: **Confirmado**

#### Riscos identificados

- `CheckoutButton` nunca usa o fluxo Stripe diretamente da landing; sempre envia para `/register` — comportamento esperado, mas pode confundir usuários que já têm conta
- Preços na landing (R$ 29, R$ 59, R$ 89) potencialmente diferentes do Stripe real
- `/waitlist` não está no sitemap
- OG image referenciada mas não confirmada nos assets

---

### Módulo 13 — Tutoriais

**Objetivo:** Fornecer guias e tutoriais de uso do sistema.

**Atores:** Todos os usuários autenticados.

**Status:** **Incompleto — placeholder**

A página `/tutorials` exibe apenas: ícone `Construction` + texto "Em desenvolvimento". Nenhuma chamada de API, nenhum conteúdo real.

#### Telas / Rotas Frontend

| Rota | Arquivo |
|------|---------|
| `/tutorials` | `src/app/(main)/tutorials/page.tsx` |

#### Status do mapeamento: **Confirmado como incompleto**

---

## 4. Fluxos Transversais

### 4.1 — Autenticação e Sessão

Já descrito no Módulo 1. Pontos de atenção transversais:

- **Proteção de rotas no FE:** apenas `/` tem `ProtectedRoute` explícito. As demais rotas em `(main)/*` dependem do comportamento do `AuthContext` e do redirecionamento 401 do interceptor Axios. Não há `middleware.ts` Next.js interceptando navegação.
- **AuthGuard em `(auth)/*`:** evita que usuário já logado veja telas de login/registro (com exceções para `/checkout` e quando há `redirect` na URL).
- **Papel do usuário:** `currentRole` carregado via `GET /api/refresh/check`; papéis: `owner` > `admin` > `editor` > `reader`. Conteúdo condicional e botões de ação dependem desse papel em praticamente todos os módulos.

### 4.2 — Permissões e Controle de Acesso

| Papel | Pode fazer |
|-------|-----------|
| reader | Visualizar tudo |
| editor | reader + criar/editar/excluir membros, integrantes, grupos, congregações, calendário |
| admin | editor + gerenciar church, conta, usuários, plano, logs |
| owner | admin + excluir conta, operações sensíveis |

- Aplicado via `requireRole` middleware no backend
- UI condicional no frontend via `canEdit` (derivado de `currentRole`)
- Tabs de settings visíveis condicionalmente

### 4.3 — Multi-tenancy

- Cada request autenticado resolve `churchId` via `getChurchContextForUser`
- Todas as queries têm `.eq('church_id', churchId)` explícito
- Isolamento é **por aplicação**, sem RLS Supabase confirmado no código analisado
- Links públicos têm `churchId` derivado do token (não da sessão)

### 4.4 — Limites de Plano (Billing Guard)

- `GET /api/church/member-limit` retorna `{ current, limit, percentage }`
- Verificação de limite em criação de membro (CRUD e link público)
- Header exibe alerta visual quando próximo ou no limite
- `window.dispatchEvent('memberUpdated')` dispara atualização do contador no Header
- **Hipótese:** conversão de integrante para membro pode não verificar limite — precisa de confirmação

### 4.5 — Exportação / PDF

Fluxo transversal presente em membros, integração, grupos, congregações e dashboard:

1. FE chama endpoint de export com filtros
2. Backend gera PDF via PDFKit
3. Response como stream (`Content-Type: application/pdf`)
4. FE faz download via link/blob

Endpoints de export centralizados em `/api/export/*`.

### 4.6 — E-mail Transacional

Enviados via **Resend** (`emailService.ts`):
- Boas-vindas após registro
- Confirmação de e-mail (Supabase)
- Recovery de senha
- Avisos de assinatura expirada (via job)
- Templates HTML em `backend/src/templates/emails/`

### 4.7 — Auditoria

- `utils/auditLogger.ts` grava em `audit_logs`
- Visível para admins em `/settings?tab=logs`
- Registra ações sensíveis (criação/exclusão de membros, mudanças de conta, etc.)

### 4.8 — Upload de Arquivo

- Multer (memória, CSV até 10MB) em `middlewares/upload.ts`
- Usado exclusivamente para importação de membros em lote
- Nenhum upload de imagem identificado

### 4.9 — Filtros e Paginação

- Padrão consistente: parâmetros de query (`page`, `limit`, `search`, filtros específicos por módulo)
- Validados via Joi no backend (`reportFiltersSchema`, `calendarValidator`, etc.)
- Contextos de membros e integração mantêm estado de filtros com `useState`
- `useFiltersData` carrega congregações para filtros de forma centralizada

### 4.10 — Navegação Global

- **Sidebar:** presente em todo `(main)/*`; links: Painel, Membros, Integração, Grupos, Congregações, Calendário, Configurações, Tutoriais
- **Header:** logo, nome da igreja, alerta de limite, badge de plano, e-mail do usuário, papel, logout
- **Sem busca global** identificada
- Tabs de settings controladas por `?tab=` na URL

---

## 5. Lacunas e Ambiguidades

### 5.1 — Proteção de rotas no frontend

**Problema:** Somente a home `/` tem `ProtectedRoute`. As rotas `(main)/*` (members, integration, groups, etc.) não têm proteção explícita de layout. A proteção real depende do 401 do backend e do interceptor Axios.

**Risco:** Um usuário com sessão expirada ou inválida pode ver o "shell" do app (header, sidebar) por alguns milissegundos antes de ser redirecionado, ou pode navegar para rotas que carregam dados vazios antes do redirecionamento.

**Arquivo:** `frontend/src/app/(main)/layout.tsx`

### 5.2 — Token blacklist em memória

**Problema:** `global.tokenBlacklist` (Set em memória) é perdido em restarts ou não compartilhado entre instâncias. Comentário no código menciona Redis para produção.

**Risco:** Token revogado pode ser reutilizado após restart do servidor.

**Arquivo:** `backend/src/middlewares/auth.ts`, `backend/src/controllers/authController.ts`

### 5.3 — TanStack React Query instalado mas não utilizado

**Problema:** `@tanstack/react-query` está na `package.json` mas não há `QueryClient` ou `useQuery` em uso no código.

**Risco:** Cache de dados ausente; requests duplicados; sem stale-while-revalidate.

**Arquivo:** `frontend/package.json`

### 5.4 — Inconsistência de preços (landing vs documentação vs Stripe)

**Problema:** Preços na landing (R$ 29, R$ 59, R$ 89) diferem dos valores em `STRIPE-MAINTENANCE.md` (R$ 29,99, R$ 59,99, R$ 89,99). Fonte de verdade é o Stripe.

**Risco:** Usuário pode esperar preço diferente do cobrado.

**Arquivos:** `landing/src/components/Pricing.tsx`, `docs/STRIPE-MAINTENANCE.md`

### 5.5 — Checkout na landing sempre direciona para /register

**Problema:** `CheckoutButton` recebe `isAuthenticated` com default `false` e nunca é chamado com valor dinâmico. Usuário já logado que clica em plano na landing é enviado para `/register`, não para `/checkout`.

**Arquivo:** `landing/src/components/CheckoutButton.tsx`

### 5.6 — Módulo de tutoriais vazio

**Problema:** `/tutorials` exibe apenas placeholder "Em desenvolvimento". Presença na sidebar pode confundir usuários.

**Arquivo:** `frontend/src/app/(main)/tutorials/page.tsx`

### 5.7 — Conversão de integrante para membro: verificação de limite

**Hipótese:** A rota `POST /api/integration/:id/convert` pode não verificar o limite de membros do plano antes de criar o membro. Precisa de confirmação no código do `integrationController.ts`.

### 5.8 — Rota de export do calendário potencialmente ambígua

**Problema:** `GET /api/calendar/export/pdf` é uma rota estática. Se declarada após `GET /api/calendar/:id`, o Express interpretaria "export" como um `id`. Verificado no código que parece estar em ordem correta, mas requer confirmação.

**Arquivo:** `backend/src/routes/calendar.ts`

### 5.9 — OG Image ausente na landing

**Problema:** `metadata` da landing referencia `/og-image.jpg` mas o arquivo não foi localizado nos assets.

**Arquivo:** `landing/src/app/layout.tsx`

### 5.10 — FEATURES_V1.0.md menciona React Query como feature implementada

**Problema:** O doc de features menciona React Query na seção de otimizações, mas o código não usa. Possível inconsistência entre documentação e código.

**Arquivo:** `docs/FEATURES_V1.0.md`

### 5.11 — Callback de e-mail usa fetch direto (fora do apiService)

**Problema:** `auth/callback/page.tsx` usa `fetch` nativo para `POST /api/auth/callback`, fora do `apiService` (que tem interceptores de erro, tratamento padronizado de 401, etc.).

**Arquivo:** `frontend/src/app/auth/callback/page.tsx`

### 5.12 — Situação do membro após conversão de integrante

**Ambiguidade:** Não está claro se o integrante é removido, arquivado ou marcado como convertido após `POST /api/integration/:id/convert`. Impacto em relatórios e no módulo de integração.

---

## 6. Prioridade para Próximas Análises de QA

| # | Fluxo/Módulo | Motivo da Prioridade | Risco para o Usuário | Tipo de Teste Recomendado |
|---|-------------|----------------------|----------------------|--------------------------|
| 1 | **Autenticação e Sessão** | Core de segurança; afeta todos os módulos; blacklist em memória é risco real | Acesso indevido, sessão quebrada, logout ineficaz | Auditoria de segurança, edge cases de token expirado, múltiplas abas, logout |
| 2 | **Gestão de Membros — CRUD** | Funcionalidade central do produto; envolve limite de plano, validações complexas, import CSV | Perda de dados, membros duplicados, import silenciosamente falhando | Testes de validação, importação em lote, limite de membros, soft delete |
| 3 | **Onboarding e Registro** | Primeira impressão do produto; fluxo complexo com e-mail, confirmação e checkout | Usuário não consegue acessar o produto, estado inconsistente pós-registro | Teste end-to-end do funil completo (registro → e-mail → checkout → acesso) |
| 4 | **Assinatura e Billing** | Receita do produto; webhook crítico; estados intermediários opacos | Pagamento confirmado mas sistema não desbloqueado; polling infinito | Testes de webhook, estados de checkout (sucesso/cancelamento/timeout), troca de plano |
| 5 | **Links Públicos** | Exposição externa; sem autenticação; potencial para abuso ou sobrecarga | Limite do plano atingido via link público; token inválido sem UX clara | Expiração de token, limite de usos, flood de cadastros, UX de erro |
| 6 | **Integração — Conversão para Membro** | Fluxo crítico de negócio; impacto em limite e em ambos os módulos | Membro duplicado ou limit bypass | Verificação de limite na conversão, estado do integrante pós-conversão |
| 7 | **Configurações — Conta e Usuários** | Operações sensíveis (troca de e-mail, senha, exclusão de conta) | Perda de acesso, dados sensíveis expostos | Sensitive rate limiter, confirmação de ações destrutivas, troca de e-mail com Supabase |
| 8 | **Relatórios/Dashboard** | Feature de alto valor; único ponto com `ProtectedRoute` | Dados incorretos, export PDF falho, performance com muitos membros | Verificar filtros, export com dados extremos, estados de loading/empty/erro |
| 9 | **Calendário** | Módulo com potencial conflito de rota; recorrência de eventos é feature complexa | Evento não criado, participantes perdidos, rota ambígua no backend | CRUD completo, recorrência, participantes, export PDF, rota `/export/pdf` |
| 10 | **Landing — Checkout Button** | Inconsistência de preço + fluxo quebrado para usuários já logados | Usuário logado com conta existente perde o contexto de plano | Verificar comportamento para usuário já autenticado |
| 11 | **Proteção de Rotas FE** | Apenas `/` tem `ProtectedRoute`; demais rotas `(main)/*` descobertas | Flash de conteúdo autenticado para sessão inválida | Acesso direto por URL com cookie expirado, navegação após logout |

---

## Apêndice — Estrutura Técnica de Referência

### Rotas Frontend (App Router)

```
/                          → Dashboard/Relatórios  [ProtectedRoute]
/(main)/
  /members                 → Gestão de Membros
  /integration             → Integração de Membros
  /groups                  → Gestão de Grupos
  /congregations           → Gestão de Congregações
  /calendar                → Calendário e Eventos
  /settings                → Configurações
  /tutorials               → Tutoriais [PLACEHOLDER]
/(auth)/
  /login                   → Login
  /register                → Registro de Igreja
  /checkout                → Seleção de Plano  [não protegido por AuthGuard completo]
  /forgot-password         → Recuperação de Senha
  /reset-password          → Redefinir Senha (token URL)
  /create-password         → Criar Senha
/auth/callback             → Callback de Confirmação de E-mail
/public/register/[token]   → Autocadastro de Membro (público)
/public/integration/[token]→ Autointegração (público)
/subscription/success      → Pós-Checkout: Sucesso
/subscription/cancel       → Pós-Checkout: Cancelamento
```

### Endpoints Backend — Resumo

```
/api/auth/*            → Login, registro, logout, callback
/api/password/*        → Forgot, reset, change
/api/refresh/*         → Check auth, refresh token
/api/members/*         → CRUD membros, reports, birthdays, import
/api/integration/*     → CRUD integrantes, conversão
/api/congregations/*   → CRUD congregações
/api/groups/*          → CRUD grupos
/api/calendar/*        → CRUD calendário, export PDF
/api/church/*          → Dados da igreja, limites
/api/church-users/*    → Equipe da igreja
/api/account/*         → Conta, senha, e-mail, logs
/api/export/*          → PDFs e CSVs (membros, dashboard, grupos, etc.)
/api/public/*          → Links públicos (registration, integration)
/api/registration-links/* → Gestão de links de registro
/api/integration-links/*  → Gestão de links de integração
/api/plans/*           → Planos (público)
/api/stripe/*          → Checkout, portal, webhook, plano grátis
/api/waitlist          → Inscrição waitlist (landing)
/health                → Health check
```

---

*Documento gerado com base em análise estática completa do monorepo. Evidências em arquivos de código, configuração e documentação existente. Hipóteses marcadas explicitamente onde a evidência é indireta.*
