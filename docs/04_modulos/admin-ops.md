---
type: modulo
nome: Admin OPS
status: Em Desenvolvimento
versao: "0.6"
owner: plataforma
ultima_atualizacao: 2026-08-26
tags: [admin-ops, plataforma, interno]
dependencias: [auth]
---

# Módulo — Admin OPS

> Superfície interna de operação do SaaS. **Não** é o Painel da Igreja.  
> Glossário: [[01_produto/glossario]] · Arquitetura: [[03_arquitetura/visao-geral]] · Auth da igreja: [[04_modulos/auth]] · Regras: [[02_regras-de-negocio/regras-por-modulo/admin-ops]] · ADR: [[07_decisoes-tecnicas/ADR-001-leitura-cross-tenant-admin-ops]].

---

## 📌 Overview

**Responsabilidade única:** centro operacional interno — UI `admin-ops/` (local **:3002**) + boundary `/api/ops` (auth de operador + leitura de Igrejas + saúde agregada).

Estado atual: **auth de operador** + **login/shell** + **console read-only de Igrejas** (overview, lista, ficha) + **saúde agregada** (`/health`, `GET /api/ops/health`) no app (`:3002`). Waitlist fica para DEV-72.

**Fora:** Mintlify (usuário da igreja não usa isto). Sentry (DEV-70). Deploy Railway (pedido explícito). Tabela `platform_admins`. npm workspaces. Stripe live. Mutação de tenant.

---

## 🗂️ Código

```text
admin-ops/                                    → Next.js 15, porta 3002, sem @sentry/nextjs
admin-ops/src/app/                            → `/`, `/login`, `/churches`, `/churches/[id]`, `/health`, `robots.ts`
admin-ops/src/components/                     → OverviewView, ChurchesListView, ChurchDetailView, HealthView, AuthGate
admin-ops/src/services/api.ts                 → Axios `withCredentials` → `/api/ops/*`
admin-ops/src/context/OpsAuthContext.tsx      → bootstrap `GET /ops/me`
backend/src/services/platformAdmin.ts         → parser allowlist + regra de acesso
backend/src/middlewares/requirePlatformAdmin.ts
backend/src/controllers/opsAuthController.ts
backend/src/controllers/opsChurchesController.ts
backend/src/controllers/opsHealthController.ts
backend/src/services/opsChurches.ts           → queries supabaseAdmin
backend/src/services/opsChurchMappers.ts      → DTOs whitelist
backend/src/services/opsHealth.ts              → composição GET /ops/health
backend/src/services/stripeHealth.ts          → snapshot Stripe compartilhado
backend/src/utils/opsHealth.ts                → agregação ok/degraded/error
backend/src/services/auditActors.ts           → ator dos audit logs (máx. 20)
backend/src/routes/ops.ts                     → montado em `/api/ops` (antes do catch-all `/api`)
```

---

## 🔐 Auth

Allowlist `PLATFORM_ADMIN_EMAILS` + conta **sem** membership de igreja. Guard na API: `authUserOnly` + `requirePlatformAdmin` (**sem** `attachChurchContext`). Guard na UI: `AuthGate` (client) — deslogado → `/login`; autenticado em `/login` → `/`. Não reusar `POST /api/auth/login`.

Fail closed se a allowlist estiver vazia. Cookies de sessão `flock_access_token` / `flock_refresh_token` / `flock_session`; **não** seta `flock_active_church_id` (limpa no login).

Rate limit do login: 10 tentativas / 15 min por IP, skip de sucesso (mesmo patamar do Painel).  
Rate limit dos GETs de leitura: 60 / 15 min por IP.

---

## 📡 Interface pública

### UI (`admin-ops/`)

| Rota | Auth | Nota |
| --- | --- | --- |
| `/login` | público | RHF+Zod; 401/403 em toast + alerta; consome `POST /ops/login` |
| `/` | operador (`GET /ops/me`) | Overview comercial (totais + breakdowns). Nav **Overview · Igrejas · Saúde** |
| `/churches` | operador | Lista/busca; filtros e paginação na querystring |
| `/churches/[id]` | operador | Ficha read-only; 404 se UUID inexistente; Voltar reconstrói a query da lista |
| `/health` | operador | Saúde: banner geral + cards API/Stripe/jobs + tabela dos 5 crons; **Atualizar** (sem polling) |

Header autenticado: marca, nav, e-mail, logout. Desktop-first. Sem waitlist ou Sentry nesta superfície.

Recortes do overview (plano/status/comercialmente ativo) deep-linkam `/churches?…`. Buckets `none` (**Sem plano** / **Sem assinatura**) **não** viram query (`plan_type=none` é 400 na API). Labels: “Comercialmente ativa/inativa” — nunca badge genérico “Ativo”. Clique na linha da lista abre a ficha; a query da lista viaja na URL da ficha para o Voltar. Nav **Igrejas** vai para `/churches` sem query (reset).

### API (`/api/ops`)

| Método | Rota | Auth | Nota |
| --- | --- | --- | --- |
| POST | `/api/ops/login` | público + allowlist | 401 credenciais / e-mail não confirmado; 403 fora da lista ou com igreja |
| POST | `/api/ops/logout` | `authUserOnly` | Sem exigir igreja |
| GET | `/api/ops/me` | `requirePlatformAdmin` | `{ id, email }` |
| GET | `/api/ops/overview` | `requirePlatformAdmin` + RL 60/15min | Totais comerciais das Igrejas |
| GET | `/api/ops/churches` | idem | Lista paginada + busca |
| GET | `/api/ops/churches/:id` | idem | Ficha read-only; 404 se UUID inexistente |
| GET | `/api/ops/health` | idem | Saúde agregada (API, Stripe, jobs). HTTP **200** autenticado mesmo se o JSON for `degraded`/`error` |

Erros: `{ error, details }` em PT. Validação Joi da query/params → 400. Anônimo → 401. Não-operador → 403.

#### `GET /api/ops/overview`

```json
{
  "total": 0,
  "commercially_active": 0,
  "commercially_inactive": 0,
  "by_plan_type": { "500": 1, "none": 2 },
  "by_subscription_status": { "active": 1, "none": 2 }
}
```

`none` = `plan_type` ou `subscription_status` null. `commercially_active` conta só `active`/`trialing` (BR-OPS-004).

#### `GET /api/ops/churches`

Query: `page` (≥1, default 1), `limit` (1–100, default 20), `q` (nome e/ou CNPJ, máx. 80), `plan_type` (`100\|200\|500\|800\|custom`), `subscription_status` (allowlist Stripe), `commercially_active` (`true\|false`), `sort_by` (`created_at\|name\|cnpj`, default `created_at`), `sort_order` (`asc\|desc`, default `desc`).

Envelope `{ data, pagination, filters, sorting }` no padrão members. Item: `id`, `name`, `cnpj`, `plan_type`, `subscription_status`, `commercially_active`, `members_active_count`, `created_at`. Sem endereço na lista.

#### `GET /api/ops/churches/:id`

Cadastro + contato da Igreja (`email_church`, `phone_church`) + plano/Stripe persistido (`cus_`/`sub_`) + contagens de `members` (ativo/inativo) e `church_users` (por status + total) + até 20 `subscription_events` (sem `payload`) + até 20 `audit_logs` (ator `{ id, email, displayName }`; sem `changes_*` / `ip` / `user_agent`). Sem rol de Membros. Sem `user_id` do owner. Sem `last_stripe_event_created`.

#### `GET /api/ops/health`

Composição **em processo** (sem loopback HTTP, sem `INTERNAL_BILLING_TOKEN` / `HEALTH_CHECK_TOKEN` / `METRICS_TOKEN`). Reusa liveness da API, snapshot de `GET /api/health/stripe` (timeout ~5s no `balance.retrieve`) e último `job_runs` dos 5 crons conhecidos — **não** o dump de `GET /api/internal/billing/stats`. Os healthchecks públicos/internos de máquina **permanecem**.

HTTP **200** autenticado; o status vai no JSON. 401 anônimo; 403 não-operador; 500 só se a composição quebrar por completo.

`status` de componente e geral ∈ `{ok, degraded, error}`. `last_status` ∈ `{success, failed, running, null}` (`null` = nunca executou). Sempre os 5 jobs, nesta ordem: `cleanup_pending_subscriptions`, `downgrade_expired_subscriptions`, `cleanup_webhook_events`, `validate_subscription_integrity`, `check_subscription_expiration`. `error_message` truncado (200 chars).

Agregação (BR-OPS-007):

- **api:** handler respondeu → `ok` (não é ping HTTP a `GET /health`).
- **stripe:** não configurado → `error`; configurado e inacessível/timeout → `degraded`; configurado e reachable → `ok`. `last_webhook_processed_at` é informativo.
- **billing_jobs:** algum `failed` → `error`; senão `running` ou never-ran → `degraded`; senão `ok`. Copy UI never-ran: “Ainda não executou” (não é Erro).
- **geral:** `error` > `degraded` > `ok`.

UI: se **Atualizar** falhar a rede, a tela preserva o último payload e mostra o alerta acima.

---

## ⚠️ Pontos de atenção

- Admin OPS ≠ papel `admin` da igreja.
- Montar `/api/ops` **antes** de `app.use('/api', calendarParticipantsRoutes)` — esse router aplica `authMiddleware` em qualquer path `/api/*` restante.
- Cookies `flock_*` são os mesmos do Painel: no mesmo browser/domínio, login ops substitui a sessão da igreja (e vice-versa).
- O shell do Admin OPS **não** reutiliza o layout `(main)` do Painel.
- Guard de rotas é client-side nesta fundação; autorização efetiva continua na API.
- Evitar `npm run build` com `next dev` no mesmo pacote (corrupção de `.next`).
- Exceção localizada a BR-GEN-010 / API-028: só os GETs de Igrejas (overview/lista/ficha); Painel continua filtrando `church_id`. `GET /api/ops/health` **não** é leitura cross-tenant de Igreja.
- `GET /api/ops/health` responde **200** autenticado com `status` no JSON — não copiar o 503 de `GET /api/health/stripe`.
- `church_users` na ficha conta a tabela; owner só em `churches.user_id` não entra no total.
