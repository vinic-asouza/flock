---
type: modulo
nome: Admin OPS
status: Em Desenvolvimento
versao: "0.3"
owner: plataforma
ultima_atualizacao: 2026-08-26
tags: [admin-ops, plataforma, interno]
dependencias: [auth]
---

# Módulo — Admin OPS

> Superfície interna de operação do SaaS. **Não** é o Painel da Igreja.  
> Glossário: [[01_produto/glossario]] · Arquitetura: [[03_arquitetura/visao-geral]] · Auth da igreja: [[04_modulos/auth]] · Regras: [[02_regras-de-negocio/regras-por-modulo/admin-ops]].

---

## 📌 Overview

**Responsabilidade única:** centro operacional interno — UI `admin-ops/` (local **:3002**) + boundary de auth na API (`/api/ops`).

Estado atual: **auth de operador na API** (`/api/ops`) + **login e shell autenticado** no app (`:3002`). Console read-only, waitlist e saúde ficam para Issues seguintes.

**Fora:** Mintlify (usuário da igreja não usa isto). Sentry (DEV-70). Deploy Railway (pedido explícito). Tabela `platform_admins`. npm workspaces.

---

## 🗂️ Código

```text
admin-ops/                                    → Next.js 15, porta 3002, sem @sentry/nextjs
admin-ops/src/app/                            → `/` (shell), `/login`, `robots.ts`
admin-ops/src/services/api.ts                 → Axios `withCredentials` → `/api/ops/*`
admin-ops/src/context/OpsAuthContext.tsx      → bootstrap `GET /ops/me`
backend/src/services/platformAdmin.ts         → parser allowlist + regra de acesso
backend/src/middlewares/requirePlatformAdmin.ts
backend/src/controllers/opsAuthController.ts
backend/src/routes/ops.ts                     → montado em `/api/ops` (antes do catch-all `/api`)
```

---

## 🔐 Auth

Allowlist `PLATFORM_ADMIN_EMAILS` + conta **sem** membership de igreja. Guard na API: `authUserOnly` + `requirePlatformAdmin` (**sem** `attachChurchContext`). Guard na UI: `AuthGate` (client) — deslogado → `/login`; autenticado em `/login` → `/`. Não reusar `POST /api/auth/login`.

Fail closed se a allowlist estiver vazia. Cookies de sessão `flock_access_token` / `flock_refresh_token` / `flock_session`; **não** seta `flock_active_church_id` (limpa no login).

Rate limit do login: 10 tentativas / 15 min por IP, skip de sucesso (mesmo patamar do Painel).

---

## 📡 Interface pública

### UI (`admin-ops/`)

| Rota | Auth | Nota |
| --- | --- | --- |
| `/` | operador (`GET /ops/me`) | Shell: e-mail, logout, placeholder do console |
| `/login` | público | RHF+Zod; 401/403 em toast + alerta; consome `POST /ops/login` |

### API (`/api/ops`)

| Método | Rota | Auth | Nota |
| --- | --- | --- | --- |
| POST | `/api/ops/login` | público + allowlist | 401 credenciais / e-mail não confirmado; 403 fora da lista ou com igreja |
| POST | `/api/ops/logout` | `authUserOnly` | Sem exigir igreja |
| GET | `/api/ops/me` | `requirePlatformAdmin` | `{ id, email }` |

---

## ⚠️ Pontos de atenção

- Admin OPS ≠ papel `admin` da igreja.
- Montar `/api/ops` **antes** de `app.use('/api', calendarParticipantsRoutes)` — esse router aplica `authMiddleware` em qualquer path `/api/*` restante.
- Cookies `flock_*` são os mesmos do Painel: no mesmo browser/domínio, login ops substitui a sessão da igreja (e vice-versa).
- O shell do Admin OPS **não** reutiliza o layout `(main)` do Painel.
- Guard de rotas é client-side nesta fundação; autorização efetiva continua na API.
- Evitar `npm run build` com `next dev` no mesmo pacote (corrupção de `.next`).
