<!--
================================================================================
ANÁLISE DO PROJETO (referência para preenchimento deste template)
================================================================================
Stack identificado (jul/2026):

- Backend: Node.js + Express + TypeScript
- Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- Data fetching (frontend): TanStack Query + Axios (`frontend/src/services`)
- Landing: Next.js (site institucional)
- Banco: PostgreSQL via Supabase
- Acesso a dados: @supabase/supabase-js (sem ORM tipo Prisma/Drizzle)
  - `supabase` → auth (anon key)
  - `db` / `supabaseAdmin` → queries PostgREST com service_role (bypassa RLS)
- Schema de referência: `backend/bd-structure.sql` (dump contextual; migrations
  aplicadas no Supabase / SQL, não via Prisma Migrate)
- API: REST sob `/api/*` (rotas em `backend/src/routes`)
- Camadas backend: routes → controllers → services
  (+ middlewares, validators, jobs, utils, config)
- Auth: JWT + cookies; multi-tenant via header `X-Church-Id`
- Roles: owner | admin | editor | reader (`requireRole`)
- Assíncrono: jobs agendados com `node-cron` em `backend/src/jobs/`
  (cleanup subscriptions, downgrade, expiration, webhook cleanup, integrity).
  Não há fila tipo Bull/Redis no repositório.
- Integrações externas: Stripe, Resend, Sentry; rate limit via express-rate-limit

Adaptações feitas neste template:
- Seção de banco orientada a SQL Supabase (tabelas, enums, índices, RLS,
  atualização de `bd-structure.sql`) — não Prisma
- Seção de API orientada a contratos REST (Method | Path | Auth/Roles)
- Plano de implementação e performance consideram jobs `node-cron` quando
  houver processamento periódico
- Segurança alinhada a roles, multi-tenant e rate limit já existentes
================================================================================
-->

---
type: arquitetura-issue
issue_id:
titulo:
status: Draft # Draft | Em Revisão | Aprovado
data:
complexidade: # P1 · Trivial | P2 · Simples | P3 · Médio | P4 · Complexo | P5 · Muito Complexo
estimativa_dias:
stack_impactado: [] # ex.: [backend, frontend, supabase, stripe, cron-jobs]
---

# Arquitetura da Issue — {{titulo}}

> Documento técnico gerado após o Refinement. Define **como** a solução será implementada no stack Flock (Express REST + Supabase + Next.js). Deve estar **Aprovado** antes de iniciar o desenvolvimento.

---

## 🏗️ Resumo Técnico

<!-- Qual é a solução? Seja direto. -->

_2–3 frases: abordagem escolhida e por que é a mais adequada neste contexto._



---

## 📊 Análise de Impacto

| Componente / Módulo | Tipo de Mudança | Nível de Risco |
| --- | --- | --- |
| | Novo / Alterado / Removido | Baixo / Médio / Alto |

Exemplos de componentes: `routes/*`, `controllers/*`, `services/*`, `middlewares/*`, `validators/*`, `jobs/*`, tabelas Supabase, páginas Next.js, `frontend/src/services/*`.

---

## 🔧 Abordagem Técnica

Descreva a solução em detalhes: fluxo de dados, camadas tocadas e decisões de design.

**Fluxo de dados (alto nível):**

1.
2.
3.

**Camadas backend envolvidas** _(quando aplicável):_

- Route (`backend/src/routes/`):
- Controller (`backend/src/controllers/`):
- Service (`backend/src/services/`):
- Middleware / Validator:
- Job cron (`backend/src/jobs/`) _(opcional):_

**Frontend** _(quando aplicável):_

- Página / rota App Router:
- Service / hook (Axios + React Query):
- Componentes:

**Diagrama ou pseudocódigo** _(opcional):_

```text
// Cole aqui um diagrama ASCII, sequência ou pseudocódigo se ajudar
```

---

## 🗄️ Mudanças no Banco de Dados

<!-- Se não aplicável, escreva 'N/A' com justificativa -->

_Stack: PostgreSQL no Supabase via `@supabase/supabase-js` (sem ORM). Schema de referência em `backend/bd-structure.sql`. Considere RLS, enums e isolamento multi-tenant (`church_id`)._

**Aplicável?** Sim / N/A — _(se N/A, justifique aqui)_

### Objetos afetados

| Objeto (tabela / enum / índice / função / trigger) | Mudança | Observação |
| --- | --- | --- |
| | Nova / Alterada / Removida | |

### Esboço de migration (SQL Supabase)

```sql
-- Migration proposta (aplicar no Supabase / acompanhar em bd-structure.sql)
-- Ex.: CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE TYPE ... AS ENUM

```

**Checklist schema:**

- [ ] Enums novos/alterados documentados
- [ ] Índices para filtros/joins frequentes considerados
- [ ] `church_id` / isolamento multi-tenant respeitado
- [ ] Impacto em RLS / uso de `db` (service_role) revisado
- [ ] `backend/bd-structure.sql` atualizado após aplicar

---

## 🌐 Mudanças na API

<!-- Especifique breaking changes com atenção -->

_API REST sob `/api/*`. Documente contratos novos ou alterados. Marque breaking changes explicitamente._

| Método | Path | Auth / Roles | Descrição | Breaking? |
| --- | --- | --- | --- | --- |
| GET / POST / PUT / PATCH / DELETE | `/api/...` | JWT + role(s) / público / interno | | Sim / Não |

### Contratos (request / response)

**Endpoint:** `METHOD /api/...`

```json
// Request body / query (exemplo)
```

```json
// Response 200 (exemplo)
```

**Breaking changes** _(se houver):_

-
-

**Headers relevantes** _(quando aplicável):_ `Authorization`, `Cookie`, `X-Church-Id`, tokens internos.

---

## 📦 Dependências Técnicas

### Internas

Módulos/rotas/services do monorepo que esta issue depende ou altera:

-
-

### Externas

Serviços já usados no projeto (Stripe, Resend, Sentry, Supabase Auth, etc.):

-
-

### Novas instalações necessárias

Libs npm ou serviços novos _(se nenhuma, escreva "Nenhuma"):_

-
-

---

## 🔒 Considerações de Segurança

Validações, autorizações e dados sensíveis envolvidos:


**Checklist:**

- [ ] Auth verificada (JWT / cookie / rota pública consciente)
- [ ] Input sanitizado (validators Joi / express-validator / Zod no frontend)
- [ ] Rate limit considerado (`express-rate-limit` ou limiters públicos existentes)
- [ ] Dados sensíveis não expostos (PII, chaves Stripe, service_role)
- [ ] Permissões por role validadas (`owner` | `admin` | `editor` | `reader`)
- [ ] Isolamento multi-tenant (`church_id` / `X-Church-Id`) respeitado _(quando aplicável)_

---

## ⚡ Considerações de Performance

<!-- Estime impacto em ms para operações críticas -->

- **Queries Supabase / Postgres:** _(filtros, joins, N+1, necessidade de índice)_
- **Cache** _(opcional):_
- **Processamento assíncrono:** jobs `node-cron` existentes/novos? webhook? fire-and-forget?
- **Estimativa de latência** em operações críticas: ~\_\_\_ ms (p50/p95 se disponível)

---

## ⚠️ Riscos Técnicos

| Risco | Probabilidade | Impacto | Estratégia de Mitigação |
| --- | --- | --- | --- |
| | Alta / Média / Baixa | Alto / Médio / Baixo | |

---

## 📋 Plano de Implementação

<!-- Esta lista vira as sub-tasks no Linear -->

Checklist ordenado de sub-tarefas técnicas.

### Backend

- [ ]
- [ ]

### Frontend

- [ ]
- [ ]

### Infra

_(Supabase SQL, env vars, cron `ENABLE_CRON_JOBS`, Stripe, deploy Railway, etc.)_

- [ ]
- [ ]

### Testes

- [ ]
- [ ]

---

## ✅ Critérios de Conclusão Técnica

O que define que a implementação está **tecnicamente completa**:

- [ ] Endpoints / UI cobertos conforme escopo do Refinement
- [ ] Validadores e middlewares de auth/roles aplicados
- [ ] Migration SQL aplicada e `bd-structure.sql` sincronizado _(se houver mudança de schema)_
- [ ] Testes automatizados relevantes passando (Jest / Supertest no backend)
- [ ] Sem erros de lint (`tsc` / `next lint` nos pacotes tocados)
- [ ] Jobs cron validados manualmente ou em staging _(se aplicável)_
- [ ] Sem regressão em fluxos críticos tocados (auth, billing, membros, etc.)

---

## ❓ Perguntas Técnicas em Aberto

Dúvidas a resolver **antes** ou **durante** o desenvolvimento. Preferencialmente zeradas antes de marcar status como Aprovado.

- [ ]
- [ ]
- [ ]

---

## Histórico de Revisões

| Data | Autor | Descrição da Alteração |
| --- | --- | --- |
| | | Versão inicial (Draft) |
