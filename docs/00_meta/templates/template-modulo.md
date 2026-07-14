<!--
STACK IDENTIFICADO (jul/2026) — base para documentação de módulos Flock
================================================================================
Organização de módulos / domínios:
- Não há pasta `modules/` monorepo. Domínios são implícitos por feature,
  espelhados entre:
  - Backend: `routes/` + `controllers/` + `validators/` (+ `services/` quando
    há lógica compartilhada: Stripe, e-mail, import, churchContext)
  - Frontend: `app/(main)/[domínio]/` + `components/[domínio]/` + hooks
  - Domínios típicos: members, congregations, groups, calendar, integration,
    church/churchUsers, auth/account/password, stripe/plans, export, waitlist,
    registrationLinks, integrationLinks, public

Camadas (backend):
- `routes` → `controllers` → acesso a dados via `db`/`supabaseAdmin`
  (`@supabase/supabase-js`) OU `services` para integrações/fluxos complexos
- NÃO há camada `repositories` / `models` / ORM entities
- Validação: `validators/*` (Joi); middleware `auth` + `requireRole`
- Tipos TS: `backend/src/types/`

ORM / query:
- Sem Prisma, TypeORM, Drizzle ou Mongoose
- Postgres no Supabase; queries PostgREST `.from()` / `.rpc()` via service_role
- Schema de referência: `backend/bd-structure.sql` (SQL)

API:
- REST sob `/api/*` (Express Router)

Eventos / assíncrono:
- Sem barramento interno de eventos / filas (Bull/Redis)
- Jobs `node-cron` em `backend/src/jobs/`
- Webhooks externos (ex.: Stripe em `/api/stripe/webhook`)
- E-mail fire-and-forget (Resend) em alguns fluxos

Validação:
- Backend: Joi (+ express-validator disponível no package; padrão ativo = Joi)
- Frontend: Zod + react-hook-form

Convenções de nomenclatura:
- Arquivos: camelCase (`memberController.ts`, `memberValidator.ts`)
- Controllers: funções exportadas nomeadas (`listMembers`, `createMember`)
- Rotas: substantivos no plural / kebab em path (`/api/members`,
  `/api/church-users`, `/api/registration-links`)
- Roles: `owner` | `admin` | `editor` | `reader`
- Multi-tenant: `church_id` + header `X-Church-Id`
- Frontend app: route groups `(auth)`, `(main)`; pastas de domínio em inglês

Adaptações deste template:
- Estrutura de arquivos espelha routes/controllers/validators/services + UI
- Entidades documentadas via SQL Supabase + tipos TS (não schema Prisma)
- Interface pública = tabela REST
- Eventos = webhooks/jobs/e-mail (ou N/A)
- Testes = Jest/Supertest (quando existirem) + Insomnia + QA manual
================================================================================
-->

---
type: modulo
nome:
status: Ativo # Ativo | Em Desenvolvimento | Depreciado
versao:
owner:
ultima_atualizacao:
tags: []
dependencias: [] # módulos que este módulo consome
---

# Módulo — {{nome}}

> Documento-base em `docs/04_modulos/[nome-do-modulo]/overview.md`. Atualize quando a estrutura ou contratos mudarem.

---

## 📌 Overview

<!-- Uma frase sobre o que este módulo faz e seu papel no sistema -->

**Responsabilidade única:**



**Propósito no Flock:**



---

## ⚖️ Bounded Context

<!-- Limites claros evitam acoplamento indevido -->

### ✅ O que este módulo FAZ

-
-

### ❌ O que este módulo NÃO FAZ

_(responsabilidades de outros módulos)_

-
-

---

## 📁 Estrutura de Arquivos

<!-- Atualize sempre que a estrutura mudar -->

Organize pelos arquivos reais do domínio no monorepo Flock (`routes` / `controllers` / `validators` / `services` + UI Next.js).

```text
backend/src/
├── routes/[dominio].ts              # Rotas Express REST
├── controllers/[dominio]Controller.ts
├── validators/[dominio]Validator.ts # Joi (quando existir)
├── services/[arquivo].ts            # Apenas se houver service dedicado
├── jobs/[job].ts                    # Opcional — cron relacionado
└── types/                           # Tipos TS compartilhados

frontend/src/
├── app/(main)/[dominio]/           # Páginas App Router
├── components/[dominio]/           # Componentes do domínio
├── hooks/use[Dominio]*.ts           # Hooks (quando existirem)
└── services/api.ts                  # Cliente Axios (métodos do domínio)
```

| Arquivo | Descrição |
| --- | --- |
| `backend/src/routes/…` | |
| `backend/src/controllers/…` | |
| `backend/src/validators/…` | |
| `backend/src/services/…` _(se houver)_ | |
| `frontend/src/app/(main)/…` | |
| `frontend/src/components/…` | |

---

## 🗄️ Entidades e Models

_Sem ORM. Documente tabelas Postgres no Supabase e tipos TypeScript correspondentes. Schema de referência: `backend/bd-structure.sql`. Acesso via `db` / `supabaseAdmin` (service_role)._

### Tabela: `public.[nome_da_tabela]`

| Campo | Tipo (SQL) | Obrigatório | Descrição | Validações (Joi / Zod / CHECK) |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK | `gen_random_uuid()` |
| `church_id` | `uuid` | Sim _(se multi-tenant)_ | Isolamento por igreja | FK → `churches` |
| | | | | |

**Esboço SQL relevante** _(opcional — colar trecho de `bd-structure.sql`):_

```sql
-- CREATE TABLE / ALTER TABLE relevantes a este módulo
```

**Tipo TypeScript** _(ex.: `backend/src/types` ou `frontend/src/types`):_

```ts
// interface / type do domínio
```

**Enums relacionados:**

| Enum SQL / TS | Valores |
| --- | --- |
| | |

---

## 🌐 Interface Pública (Endpoints REST)

_API REST Express em `/api/*`. Auth típica: JWT/cookie + `requireRole` + `X-Church-Id`._

| Método | Rota | Auth / Roles | Descrição | Request | Response |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/…` | JWT + `reader`+ | | query / body | status + JSON |
| POST | `/api/…` | JWT + `editor`+ | | | |
| PUT / PATCH | `/api/…` | | | | |
| DELETE | `/api/…` | | | | |

### Contratos detalhados _(opcional para endpoints críticos)_

**`METHOD /api/...`**

```json
// Request
```

```json
// Response 200
```

**Erros comuns:** `401` · `403` · `404` · `422` / `400` · `429` · `500`

**UI / rotas frontend relacionadas:**

| Rota App Router | Componente principal | Observação |
| --- | --- | --- |
| `/(main)/…` | | |

---

## ⚙️ Regras de Negócio

Principais regras implementadas neste módulo. Detalhamento em:

**→** [[02_regras-de-negocio/regras-por-modulo/[modulo]]]

| ID | Regra | Onde está no código |
| --- | --- | --- |
| RN-… | | controller / validator / job |

-
-

---

## 🔗 Dependências

<!-- Evite dependências circulares -->

### Módulos internos consumidos

- [[04_modulos/[outro-modulo]]]

### Serviços / integrações externas

- [[05_integracoes/[servico]]] _(ex.: stripe, resend, supabase-auth)_

### Utils / middlewares compartilhados

| Dependência | Uso |
| --- | --- |
| `middlewares/auth` | |
| `middlewares/requireRole` | |
| `services/supabase` (`db`) | |
| `utils/auditLogger` _(se usar)_ | |

---

## 📡 Eventos Emitidos

<!-- Se não aplicável, escreva N/A -->

_No Flock: preferir documentar webhooks recebidos/enviados, jobs `node-cron` disparados e side-effects (e-mail, audit log). Não há Event Bus interno._

| Evento / Job / Webhook | Trigger | Payload / efeito | Consumidores |
| --- | --- | --- | --- |
| | | | |
| N/A | — | Este módulo não emite eventos/jobs | — |

---

## 🔧 Configurações

Variáveis de ambiente necessárias para este módulo:

| Variável | Tipo | Obrigatória | Valor padrão | Descrição |
| --- | --- | --- | --- | --- |
| | string / number / bool | Sim / Não | | |

_Compartilhadas frequentes:_ `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, chaves Stripe/Resend quando o domínio as usa.

---

## 🧪 Testes

_Ferramentas do projeto: Jest + Supertest (backend, quando houver specs); coleção Insomnia em `backend/tests/`; frontend ainda sem runner e2e/unit padronizado — QA manual._

| Item | Valor |
| --- | --- |
| Arquivos de teste | `backend/**/*.test.ts` / `*.spec.ts` _(ou N/A)_ |
| Insomnia / manuais | `backend/tests/insomnia_collection.json` |
| Cobertura atual (%) | |
| Casos críticos cobertos | |

**Casos críticos:**

- [ ]
- [ ]

**Como rodar:**

```bash
cd backend && npm test
# + validação manual UI / Insomnia conforme relatório de QA
```

---

## 📝 Histórico de Mudanças

| Data | Versão | Descrição | Issue ID | Autor |
| --- | --- | --- | --- | --- |
| | | | | |

---

## Referências rápidas

- Refinamentos / arquitetura de issues relacionadas: `docs/00_meta/templates/`
- Schema DB: `backend/bd-structure.sql`
- Montagem de rotas: `backend/src/app.ts`
