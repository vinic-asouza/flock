---
type: diagrama-sistema
ultima_atualizacao: 2026-07-14
versao: "1.0"
tags: [arquitetura, diagramas, C4, mermaid]
---

# Diagrama de Sistema — Flock

> Documento **visual**. Complementa [[03_arquitetura/visao-geral]] e [[03_arquitetura/banco-de-dados]].  
> Stack real: monorepo Express + Next.js ×2 · Supabase · Stripe · Resend · Railway · **sem** Redis/Bull/NestJS.

---

## 1. 🗺️ C4 Nível 2 — Containers

```mermaid
flowchart TD
  user["Usuário final"]
  visitor["Visitante / Lead"]

  subgraph railway ["Produção — Railway"]
    landing["Landing\nNext.js\nPORT dinâmico"]
    web["App Web\nNext.js\nPORT dinâmico"]
    api["API Server\nExpress + TypeScript\nPORT dinâmico\n(+ webhooks + crons)"]
  end

  subgraph supabase ["Supabase sa-east-1"]
    auth["Auth JWT"]
    db[("PostgreSQL 17\npublic + auth")]
  end

  subgraph externos ["Externos"]
    stripe["Stripe\nCheckout / Portal / Webhooks"]
    resend["Resend\nE-mail"]
    sentry["Sentry"]
  end

  visitor -->|"HTTPS"| landing
  user -->|"HTTPS"| web
  landing -->|"POST waitlist / checkout"| api
  web -->|"REST /api/*\ncookies + Bearer"| api
  stripe -->|"Webhook HTTPS"| api

  api -->|"auth.getUser / refresh"| auth
  api -->|"PostgREST service_role"| db
  web -.->|"só via API"| api
  api --> stripe
  api --> resend
  api --> sentry
  web --> sentry
```

**Ausentes de propósito:** Redis, worker separado, object storage próprio, CDN dedicada.

---

## 2. 📦 C4 Nível 3 — Componentes da API

Controllers falam com Supabase direto (sem camada Repository formal).

```mermaid
flowchart TB
  client["App / Landing / Stripe"]

  subgraph api ["API Server — Express"]
    mw["Middleware\nhelmet · CORS · rateLimit\nrequestId · cookies\nauth · requireRole\nupload CSV · Stripe raw"]

    routes["Router Layer\n/api/*"]

    subgraph mods ["Módulos por domínio (controllers)"]
      auth_m["Auth / Password / Refresh"]
      church_m["Church / ChurchUsers / Account"]
      members_m["Members / Import / Reports"]
      cong_m["Congregations"]
      groups_m["Groups"]
      integ_m["Integration + Links públicos"]
      cal_m["Calendar + Participants"]
      bill_m["Stripe / Plans / Waitlist"]
      export_m["Export PDF/CSV"]
    end

    utils["Utils / Services\nchurchContext · planLimits\nemailService · stripe*\nauditLogger · jobRuns"]
    cron["node-cron\n(mesmo processo)"]
    val["Validators Joi"]
  end

  sb[("Supabase\nAuth + PostgreSQL")]
  stripe["Stripe API"]
  resend["Resend"]

  client --> mw --> routes --> mods
  mods --> val
  mods --> utils
  utils --> sb
  utils --> stripe
  utils --> resend
  cron --> utils
```

---

## 3. 🔑 Sequência — Autenticação (email/senha)

Não há OAuth redirect no código; fluxo é formulário → API → Supabase Auth → cookies HttpOnly.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant FE as App Next.js
  participant API as API Express
  participant SA as Supabase Auth
  participant DB as PostgreSQL

  U->>FE: Preenche e-mail/senha
  FE->>API: POST /api/auth/login
  activate API
  API->>SA: signInWithPassword
  SA-->>API: access_token + refresh_token + user
  API->>DB: Resolve church via church_users / owner
  DB-->>API: church_id + role
  API-->>FE: Set-Cookie flock_access_token,<br/>flock_refresh_token, flock_session,<br/>flock_active_church_id + JSON user/church
  deactivate API
  FE-->>U: Dashboard

  Note over FE,API: Requests seguintes: cookie (preferido) ou Authorization Bearer
  FE->>API: GET /api/members (cookies)
  activate API
  API->>SA: auth.getUser(token)
  alt Token expirado
    API->>SA: refreshSession(refresh cookie)
    SA-->>API: novos tokens + cookies atualizados
  end
  API->>API: attachChurchContext + requireRole
  API->>DB: Query filtrada por church_id
  DB-->>API: dados
  API-->>FE: 200 JSON
  deactivate API
```

Seleção de igreja (multi-membership futuro / header): `GET /api/church/memberships` + `POST /api/church/active` com `authUserOnly`.

---

## 4. 🚀 Sequência — Criação de Membro

Operação CRUD central do domínio pastoral.

```mermaid
sequenceDiagram
  autonumber
  actor U as Editor+
  participant FE as App Next.js
  participant API as memberController
  participant VAL as Joi validateMember
  participant LIM as checkMemberLimit
  participant DB as Supabase DB
  participant AUD as audit_logs

  U->>FE: Formulário de membro (+ grupos opcionais)
  FE->>API: POST /api/members + body
  activate API
  API->>API: authMiddleware + requireRole(editor)
  API->>VAL: validateMember(body)
  alt Inválido
    VAL-->>API: erros
    API-->>FE: 400 { error, details }
  end
  API->>LIM: quota active + plan / past_due
  alt Limite ou past_due
    LIM-->>API: bloqueio
    API-->>FE: 403/400
  end
  API->>DB: INSERT members (church_id)
  DB-->>API: member
  opt Grupos informados
    API->>DB: INSERT member_groups
  end
  API->>AUD: logAudit create
  API-->>FE: 201 + member (+ groups)
  deactivate API
  FE-->>U: Confirmação / lista
```

Variantes: `POST /batch`, import CSV, `POST /api/public/registration/:token` (auth por token de link, mesma quota).

---

## 5. 🔄 Estados — Assinatura da Igreja (`churches`)

Entidade com mais transições de lifecycle no SaaS (espelha Stripe + regras locais).  
`plan_type`: `100` | `200` | `500` | `800` | `custom`.

```mermaid
stateDiagram-v2
  [*] --> SemAssinatura: Registro free / onboarding

  SemAssinatura --> incomplete: Checkout iniciado
  SemAssinatura --> trialing: Trial Stripe (se houver)
  SemAssinatura --> active: activate-free / webhook pago

  incomplete --> active: Pagamento OK
  incomplete --> incomplete_expired: Expirou sem pagar
  incomplete_expired --> [*]

  trialing --> active: Converte
  trialing --> canceled: Cancela trial

  active --> past_due: Falha de cobrança
  active --> paused: Pausa Stripe
  active --> canceled: Cancelamento
  past_due --> active: Pagamento recuperado
  past_due --> unpaid: Inadimplência
  past_due --> canceled: Cancela
  paused --> active: Retoma
  unpaid --> active: Recupera
  unpaid --> canceled: Encerra

  canceled --> active: Reativa / novo checkout
  canceled --> SemAssinatura: Downgrade cron → plan 100

  note right of past_due
    past_due bloqueia novas inclusões
    de membros (regra de negócio)
  end note
```

### Complemento — Integrante (`integration_members.status`)

```mermaid
stateDiagram-v2
  [*] --> em_progresso: Criado (app ou link público)
  em_progresso --> integrado: POST .../convert → member
  em_progresso --> descartado: Descarte
  integrado --> [*]
  descartado --> [*]
```

### Complemento — Membro (`members.active`)

```mermaid
stateDiagram-v2
  [*] --> ativo: create active=true
  ativo --> inativo: PATCH .../status active=false
  inativo --> ativo: PATCH .../status active=true
  ativo --> [*]: DELETE hard
  inativo --> [*]: DELETE hard
```

---

## 6. 🔃 Processamento periódico (sem fila)

Não há Redis/Bull. Work assíncrono = **cron no processo da API** + e-mail fire-and-forget + webhook Stripe síncrono no request.

```mermaid
flowchart TB
  subgraph api_proc ["Mesmo processo Node — API"]
    http["HTTP handlers\nREST + webhook Stripe"]
    cron["node-cron\nAmerica/Sao_Paulo"]
    jobs["Jobs\ncleanup_pending\ndowngrade_expired\nvalidate_integrity\ncheck_expiration\ncleanup_webhooks"]
    email_ff["E-mail fire-and-forget\n(Resend)"]
  end

  db[("PostgreSQL\njob_runs + domínio")]
  stripe["Stripe"]
  resend["Resend"]
  slack["Slack ops\nopcional"]

  http -->|"sync"| db
  http -->|"assinatura webhook"| stripe
  http -.-> email_ff
  cron --> jobs
  jobs -->|"runTrackedJob"| db
  jobs --> resend
  jobs -.-> slack
  email_ff --> resend
```

Schedules (resumo): 02h pending · 03h downgrade · 05h integridade · 09h e-mails expiração · domingo 04h cleanup webhooks.

---

## Referências cruzadas

| Diagrama | Documentos |
| --- | --- |
| Containers | [[03_arquitetura/visao-geral]] · [[03_arquitetura/infraestrutura]] |
| Componentes API | [[03_arquitetura/api-design]] |
| Auth / RBAC | [[03_arquitetura/seguranca]] · [[01_produto/personas-e-usuarios]] |
| Schema / FKs | [[03_arquitetura/banco-de-dados]] |
| Billing / membros | [[02_regras-de-negocio/regras-por-modulo/billing]] · [[02_regras-de-negocio/regras-por-modulo/membros]] |
| Performance dos jobs | [[03_arquitetura/performance-e-escalabilidade]] |
