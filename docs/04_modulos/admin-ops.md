---
type: modulo
nome: Admin OPS
status: Em Desenvolvimento
versao: "0.2"
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

Estado atual: **scaffold UI** (DEV-73) + **auth de operador na API** (DEV-74). Console read-only, waitlist e saúde ficam para Issues seguintes. UI de login/shell = DEV-75.

**Fora:** Mintlify (usuário da igreja não usa isto). Sentry (DEV-70). Deploy Railway (pedido explícito). Tabela `platform_admins`. npm workspaces.

---

## 🗂️ Código

```text
admin-ops/                                    → Next.js 15, porta 3002, sem @sentry/nextjs
admin-ops/src/app/                            → `/`, `/login` (placeholders), `robots.ts`
backend/src/services/platformAdmin.ts         → parser allowlist + regra de acesso
backend/src/middlewares/requirePlatformAdmin.ts
backend/src/controllers/opsAuthController.ts
backend/src/routes/ops.ts                     → montado em `/api/ops` (antes do catch-all `/api`)
```

---

## 🔐 Auth

Allowlist `PLATFORM_ADMIN_EMAILS` + conta **sem** membership de igreja. Guard: `authUserOnly` + `requirePlatformAdmin` (**sem** `attachChurchContext`). Não reusar `POST /api/auth/login`.

Fail closed se a allowlist estiver vazia. Cookies de sessão `flock_access_token` / `flock_refresh_token` / `flock_session`; **não** seta `flock_active_church_id` (limpa no login).

Rate limit do login: 10 tentativas / 15 min por IP, skip de sucesso (mesmo patamar do Painel).

---

## 📡 Interface pública

### UI (`admin-ops/`)

| Rota | Auth | Nota |
| --- | --- | --- |
| `/` | pública (scaffold) | Placeholder — ainda não consome a API |
| `/login` | pública (scaffold) | Formulário desabilitado até DEV-75 |

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
- Cookies `flock_*` são os mesmos do Painel: no mesmo browser/domínio, login ops substitui a sessão da igreja (DEV-75).
- Não copiar o shell `(main)` do Painel para o login (DEV-75).
- Evitar `npm run build` com `next dev` no mesmo pacote (corrupção de `.next`).
