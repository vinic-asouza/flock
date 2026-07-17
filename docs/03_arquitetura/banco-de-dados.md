---
type: banco-de-dados
ultima_atualizacao: 2026-07-16
versao: "1.1"
banco: PostgreSQL 17.4 (Supabase flock-app-01, sa-east-1)
orm: nenhum (@supabase/supabase-js ^2.38 — PostgREST)
tags: [arquitetura, banco-de-dados, schema, ERD]
---

# Banco de Dados — Flock

> Fonte da verdade: schema **live** do projeto Supabase `flock-app-01` (`lzsybtvywrhwsxtsywbw`), inspecionado via MCP em 2026-07-13.  
> Dump local de referência (pode estar atrasado): `backend/bd-structure.sql`.  
> Visão de sistema: [[03_arquitetura/visao-geral]].

---

## 1. 📋 Visão Geral do Banco

| Item | Valor |
| --- | --- |
| Banco | **PostgreSQL 17.4** (`17.4.1.068`, engine 17, canal GA) |
| Hospedagem | Supabase project `flock-app-01`, região `sa-east-1` |
| Host | `db.lzsybtvywrhwsxtsywbw.supabase.co` |
| ORM | **Nenhum** — acesso via `@supabase/supabase-js` (^2.38.0) |
| Cliente backend | `supabaseAdmin` / `db` com **service_role** (bypassa RLS) |
| Cliente auth | `supabase` anon key — apenas `supabase.auth.*` |
| Schema de domínio | `public` (17 tabelas) + `auth.users` (Supabase Auth) |
| Estratégia de IDs | **UUID**; default `gen_random_uuid()` ou `extensions.uuid_generate_v4()` |
| Nomenclatura | Tabelas/colunas em **snake_case** (inglês); enums misturam PT/EN |
| Soft delete | **Não há `deleted_at`**. Flags: `members.active`, links `is_active`, grupos `status` (bool), calendário `status` text. Muitos recursos usam **DELETE físico**. |
| Timezone | `timestamptz` (UTC); vários defaults `now()` ou `timezone('utc', now())` |
| Multi-tenant | Coluna `church_id` nas tabelas de domínio; isolamento **aplicacional** (service_role) |
| RLS | Habilitado em todas as tabelas `public`; policies restritivas `deny_anon` — escrita/leitura via backend service_role |

**Conexão (backend):** sem pool dedicado (`pg` Pool). O client PostgREST do Supabase gerencia HTTP; não há `database.config.ts` nem settings de pool no `.env` da API — apenas `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (`backend/src/services/supabase.ts`).

---

## 2. 📊 Diagrama ERD (Entity Relationship)

```mermaid
erDiagram
  auth_users {
    uuid id PK
  }

  churches {
    uuid id PK
    uuid user_id FK
    text name
    text denomination
    text address
    text city
    text state
    varchar cnpj UK
    varchar email_church
    varchar phone_church
    varchar stripe_customer_id
    varchar stripe_subscription_id
    varchar subscription_status
    varchar plan_type
    timestamptz subscription_start_date
    timestamptz subscription_end_date
    timestamptz subscription_updated_at
    bigint last_stripe_event_created
    timestamptz created_at
  }

  church_users {
    uuid id PK
    uuid church_id FK
    uuid user_id FK_UK
    church_user_role role
    church_user_status status
    timestamptz created_at
    timestamptz updated_at
  }

  congregations {
    uuid id PK
    uuid church_id FK
    text name
    text abbreviation
    text address
    text city
    text state
    text leader
    text phone
    boolean is_primary
    timestamptz created_at
    timestamptz updated_at
  }

  members {
    uuid id PK
    uuid church_id FK
    uuid congregation_id FK
    text name
    date birth
    text gender
    text marital_status
    boolean active
    timestamptz created_at
  }

  integration_members {
    uuid id PK
    uuid church_id FK
    uuid expected_congregation_id FK
    uuid mentor_id FK
    text name
    integration_status_enum status
    timestamptz created_at
    timestamptz updated_at
  }

  groups {
    uuid id PK
    uuid church_id FK
    uuid congregation_id FK
    uuid responsible_id FK
    varchar type
    varchar name
    boolean status
    timestamptz created_at
    timestamptz updated_at
  }

  member_groups {
    uuid id PK
    uuid member_id FK
    uuid group_id FK
    timestamptz created_at
  }

  calendar_items {
    uuid id PK
    uuid church_id FK
    uuid congregation_id FK
    uuid group_id FK
    uuid responsible_member_id FK
    uuid created_by FK
    text title
    text type
    text status
    timestamptz start_date
    boolean is_recurring
  }

  calendar_participants {
    uuid id PK
    uuid calendar_item_id FK
    uuid member_id FK
    varchar guest_name
    timestamptz created_at
  }

  public_registration_links {
    uuid id PK
    uuid church_id FK
    uuid created_by FK
    uuid default_congregation_id FK
    text token UK
    boolean is_active
    timestamptz expires_at
  }

  public_integration_links {
    uuid id PK
    uuid church_id FK
    uuid created_by FK
    text token UK
    boolean is_active
    timestamptz expires_at
  }

  audit_logs {
    uuid id PK
    uuid user_id
    uuid church_id
    text entity
    uuid entity_id
    text action
    jsonb changes_before
    jsonb changes_after
    timestamptz created_at
  }

  pending_subscriptions {
    uuid id PK
    varchar email
    varchar stripe_customer_id
    varchar stripe_subscription_id
    varchar plan_type
    varchar subscription_status
    uuid link_token
    timestamptz expires_at
  }

  processed_webhook_events {
    uuid id PK
    varchar stripe_event_id UK
    varchar event_type
    uuid church_id FK
    text outcome
    timestamptz processed_at
  }

  church_subscription_events {
    uuid id PK
    uuid church_id FK
    text event_type
    text source
    jsonb payload
    timestamptz created_at
  }

  waitlist {
    uuid id PK
    varchar email UK
    varchar name
    varchar phone
    varchar church_name
    varchar plan
    timestamptz created_at
  }

  job_runs {
    uuid id PK
    text job_name
    text status
    timestamptz started_at
    timestamptz finished_at
    int rows_affected
  }

  auth_users ||--o| churches : "owns (user_id)"
  auth_users ||--o| church_users : "membership"
  churches ||--o{ church_users : "has users"
  churches ||--o{ congregations : "has"
  churches ||--o{ members : "has"
  churches ||--o{ integration_members : "has"
  churches ||--o{ groups : "has"
  churches ||--o{ calendar_items : "has"
  churches ||--o{ public_registration_links : "has"
  churches ||--o{ public_integration_links : "has"
  churches ||--o{ processed_webhook_events : "optional"
  churches ||--o{ church_subscription_events : "history"
  congregations ||--o{ members : "optional"
  congregations ||--o{ groups : "optional"
  congregations ||--o{ calendar_items : "optional"
  congregations ||--o{ integration_members : "expected"
  congregations ||--o{ public_registration_links : "default"
  members ||--o{ member_groups : "belongs"
  groups ||--o{ member_groups : "has members"
  members ||--o{ groups : "responsible"
  members ||--o{ integration_members : "mentor"
  members ||--o{ calendar_items : "responsible"
  members ||--o{ calendar_participants : "participant"
  groups ||--o{ calendar_items : "linked"
  calendar_items ||--o{ calendar_participants : "has"
  auth_users ||--o{ public_registration_links : "created_by"
  auth_users ||--o{ public_integration_links : "created_by"
  auth_users ||--o{ calendar_items : "created_by"
```

---

## 3. 📚 Dicionário de Dados

#### churches
> Tenant raiz: dados da igreja + estado da assinatura Stripe.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK, NOT NULL | `gen_random_uuid()` | Identificador |
| user_id | uuid | NOT NULL, FK → `auth.users` ON DELETE CASCADE | — | Owner histórico / criador |
| name | text | NOT NULL | — | Nome da igreja |
| denomination | text | NOT NULL | — | Denominação |
| address | text | NOT NULL | — | Endereço |
| city | text | NOT NULL | — | Cidade |
| state | text | NOT NULL | — | UF |
| cnpj | varchar | NOT NULL, UNIQUE | — | CNPJ |
| email_church | varchar | NULL | — | E-mail de contato |
| phone_church | varchar | NULL | — | Telefone de contato |
| stripe_customer_id | varchar | NULL, UNIQUE parcial | — | `cus_*` |
| stripe_subscription_id | varchar | NULL, UNIQUE parcial; CHECK: se set → customer obrigatório | — | `sub_*` |
| subscription_status | varchar | NULL, CHECK enum Stripe | — | Status assinatura |
| plan_type | varchar | NULL, CHECK `100\|200\|500\|800\|custom` | — | Quota/plano |
| subscription_start_date | timestamptz | NULL | — | Início |
| subscription_end_date | timestamptz | NULL | — | Fim / cancelamento |
| subscription_updated_at | timestamptz | NULL | `now()` | Última sync assinatura |
| last_stripe_event_created | bigint | NULL | — | Unix `event.created` aplicado |
| created_at | timestamptz | NULL | `now()` | Criação |

**Índices (não-PK):** `cnpj` UNIQUE; `stripe_customer_id` / `stripe_subscription_id` (btree + unique parcial WHERE NOT NULL); `subscription_status`, `plan_type`, `subscription_end_date` (parcial), `user_id+subscription_status` (parcial), `email_church`, `phone_church`.

**Relacionamentos:** `user_id` → `auth.users.id` (many-to-one, CASCADE). Pai de congregações, membros, grupos, calendário, links, billing events.

---

#### congregations
> Unidades/filiais sob uma igreja.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `uuid_generate_v4()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| name | text | NOT NULL | — | Nome completo |
| abbreviation | text | NULL | — | Nome popular curto (opcional) |
| address | text | NOT NULL | — | Endereço |
| city | text | NOT NULL | — | Cidade |
| state | text | NOT NULL | — | UF |
| leader | text | NULL | — | Líder |
| phone | text | NULL | — | Telefone |
| is_primary | boolean | NOT NULL | `false` | Congregação principal do tenant |
| created_at | timestamptz | NOT NULL | `timezone('utc', now())` | Criação |
| updated_at | timestamptz | NOT NULL | `timezone('utc', now())` | Atualização |

**Índices:** `church_id`; `(church_id, name)` (duplicado histórico); `state`; unique parcial `(church_id)` WHERE `is_primary` (no máximo uma principal por igreja); unique parcial `(church_id, lower(abbreviation))` WHERE `abbreviation IS NOT NULL` (`idx_congregations_church_abbreviation_lower`).

**Relacionamentos:** `church_id` → `churches.id` (many-to-one, CASCADE). Referenciado por members (RESTRICT), groups/calendar/integration/links (SET NULL onde aplicável). Toda igreja nova recebe uma primary no register (`createPrimaryCongregationForChurch`) **sem** abreviação.

---

#### members
> Cadastro pastoral/administrativo do membro (PII denso). Campos eclesiásticos ampliados na migration `add_member_form_fields_v2`.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| congregation_id | uuid | NOT NULL, FK **RESTRICT** | — | Congregação (obrigatória) |
| name | text | NOT NULL | — | Nome completo |
| birth | date | NOT NULL | — | Nascimento |
| gender | text | NULL, CHECK Masculino/Feminino | — | Gênero (label PT) |
| marital_status | text | NULL, CHECK Solteiro/Casado/…/União Estável | — | Estado civil |
| nationality | text | NULL | — | Nacionalidade |
| document | text | NULL | — | Documento (CPF etc.) |
| spouse | text | NULL | — | Cônjuge (nome) |
| address | text | NULL | — | Logradouro |
| address_number | text | NULL | — | Número |
| complement | text | NULL | — | Complemento |
| cep | text | NULL | — | CEP |
| neighborhood | text | NULL | — | Bairro |
| city | text | NULL | — | Cidade |
| state | text | NULL | — | UF |
| phone | text | NULL | — | Telefone |
| whatsapp | text | NULL | — | WhatsApp |
| email | text | NULL | — | E-mail |
| baptism_date | date | NULL | — | Data batismo |
| occupation | text | NULL | — | Profissão |
| admission | text | NULL | — | Tipo admissão (texto livre histórico) |
| admission_date | date | NULL | — | Data admissão |
| active | boolean | NULL | `true` | Membro “ativo” (quota) |
| created_at | timestamptz | NULL | `now()` | Criação |
| father_name | text | NULL | — | Nome do pai |
| mother_name | text | NULL | — | Nome da mãe |
| children | jsonb | NULL | `'[]'` | `[{name, birth}]` |
| hometown | text | NULL | — | Naturalidade |
| wedding_date | date | NULL | — | Casamento |
| spouse_is_member | boolean | NULL | — | Cônjuge é membro |
| father_is_member | text | NULL, CHECK sim/nao/falecido | — | Pai membro |
| mother_is_member | text | NULL, CHECK sim/nao/falecido | — | Mãe membro |
| years_evangelical | text | NULL | — | Anos como evangélico |
| evangelical_family | boolean | NULL | — | Família evangélica |
| is_baptized | boolean | NULL | — | Batizado |
| baptism_type | text | NULL, CHECK catolica/adulto_*/crianca_*/… | — | Tipo batismo |
| baptism_other_church_name | text | NULL | — | Igreja do batismo externo |
| previous_religion | text | NULL | — | Religião anterior |
| previous_church_active | boolean | NULL | — | Ativo em igreja anterior |
| reason_joining | text | NULL | — | Motivo ingresso |
| time_attending | text | NULL | — | Tempo frequentando |
| sunday_attendance | text | NULL, CHECK todos_os_domingos/regularmente/as_vezes/nao | — | Frequência domingo |
| weekly_activities | boolean | NULL | — | Atividades semanais |
| weekly_activities_which | text | NULL | — | Quais atividades |

**Índices:** PK; `congregation_id`; parcial `(church_id, congregation_id, active)` WHERE active; GIN `children`.

**Relacionamentos:** `church_id` → churches CASCADE; `congregation_id` → congregations **RESTRICT** (não permite deletar cong. com membros). Referenciado por member_groups (CASCADE), calendar/group responsible / mentor (SET NULL).

> **Nota:** não há `updated_at` em `members`. Soft “inativação” via `active=false`; delete de membro na API é **hard delete**.

---

#### integration_members
> Pipeline de integração antes de virar `members`. Usa enums Postgres (valores em minúsculo), diferente dos CHECKs text de `members`.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| name | text | NOT NULL | — | Nome |
| birth | date | NULL | — | Nascimento |
| gender | gender_enum | NULL | — | masculino/feminino |
| marital_status | marital_status_enum | NULL | — | solteiro…outro |
| phone / whatsapp | text | NULL | — | Contatos |
| expected_admission_type | admission_type_enum | NULL | — | batismo/transferencia/… |
| expected_congregation_id | uuid | NULL, FK SET NULL | — | Congregação pretendida |
| mentor_id | uuid | NULL, FK → members SET NULL | — | Mentor |
| notes | text | NULL | — | Notas |
| status | integration_status_enum | NOT NULL | `em_progresso` | em_progresso/integrado/descartado |
| created_at / updated_at | timestamptz | NOT NULL | utc now | Auditoria |

**Índices:** `church_id` (duplicados históricos), `status`, `expected_congregation_id`, `mentor_id`, `created_at`, `lower(name)`.

---

#### groups
> Ministérios / células / equipes da igreja.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| congregation_id | uuid | NULL, FK SET NULL | — | Escopo congregação (API de grupos exige UUID) |
| type | varchar | NOT NULL, CHECK lista PT (Ministério, Célula, …) | — | Tipo |
| name | varchar | NOT NULL | — | Nome |
| description | text | NULL | — | Descrição |
| responsible_id | uuid | NULL, FK → members SET NULL | — | Responsável |
| status | boolean | NOT NULL | `true` | Ativo/inativo |
| created_at / updated_at | timestamptz | NOT NULL | `now()` | Auditoria |

**Índices:** `church_id`, `congregation_id`, `(church_id, congregation_id)`, `type`, `status`, `(church_id, type, name)`, duplicate-check `(church_id, name, type, status, congregation_id)`, responsible parcial.

---

#### member_groups
> N:N membro ↔ grupo.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| member_id | uuid | NOT NULL, FK CASCADE | — | Membro |
| group_id | uuid | NOT NULL, FK CASCADE | — | Grupo |
| created_at | timestamptz | NOT NULL | `now()` | Vínculo |

**Índices:** UNIQUE `(member_id, group_id)` (constraint + índice espelhado); índices em cada FK; `(group_id, created_at DESC)`.

---

#### calendar_items
> Programações, eventos, encontros e reuniões (com recorrência).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| title | text | NOT NULL | — | Título |
| type | text | NOT NULL, CHECK Programação/Evento/Encontro/Reunião | — | Tipo |
| description | text | NULL | — | Descrição |
| start_date | timestamptz | NOT NULL | — | Início |
| end_date | timestamptz | NULL | — | Fim |
| is_recurring | boolean | NULL | `false` | Recorrente |
| recurrence_pattern | text | NULL, CHECK weekly/monthly/custom | — | Padrão |
| recurrence_end_date | timestamptz | NULL | — | Fim recorrência |
| recurrence_time | time | NULL | — | Horário recorrente |
| recurrence_duration_minutes | int4 | NULL | — | Duração |
| recurrence_day_of_week | int4 | NULL, 0–6 | — | Dia semana |
| recurrence_day_of_month | int4 | NULL, 1–31 | — | Dia mês |
| recurrence_week_of_month | int4 | NULL, -1–4 | — | Semana do mês |
| location | text | NULL | — | Local |
| congregation_id | uuid | NULL, FK SET NULL | — | Congregação opcional (filtro `sede` removido) |
| group_id | uuid | NULL, FK SET NULL | — | Grupo |
| responsible_member_id | uuid | NULL, FK SET NULL | — | Responsável |
| created_by | uuid | NULL, FK → auth.users | — | Autor |
| status | text | NOT NULL, CHECK active/cancelled/postponed | `'active'` | Status |
| created_at / updated_at | timestamptz | NOT NULL | `now()` | Auditoria |

**Índices:** `church_id`, `start_date`, `type`, `status`, `is_recurring`, `congregation_id`, `group_id`.

---

#### calendar_participants
> Participante membro **ou** convidado (CHECK XOR).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `uuid_generate_v4()` | Identificador |
| calendar_item_id | uuid | NOT NULL, FK CASCADE | — | Item |
| member_id | uuid | NULL, FK SET NULL; UNIQUE com item | — | Membro |
| guest_name | varchar | NULL | — | Nome convidado |
| guest_email / phone / whatsapp | varchar | NULL | — | Contatos convidado |
| created_at / updated_at | timestamptz | NULL | `now()` | Auditoria |

**CHECK:** `(member_id NOT NULL AND guest_name NULL) OR (member_id NULL AND guest_name NOT NULL)`.

**Índices:** `calendar_item_id`, `member_id`, UNIQUE `(calendar_item_id, member_id)`.

---

#### public_registration_links / public_integration_links
> Links temporários de auto-cadastro (membros vs integração). Espelham estrutura; registration tem `default_congregation_id`.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `uuid_generate_v4()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Tenant |
| token | text | NOT NULL, UNIQUE | — | Token público |
| expires_at | timestamptz | NOT NULL; CHECK > created_at | — | Expiração |
| max_uses | int4 | NULL; CHECK > 0 | — | Limite usos |
| current_uses | int4 | NOT NULL; CHECK ≥ 0 | `0` | Usos atuais |
| is_active | boolean | NOT NULL | `true` | Soft disable |
| created_by | uuid | NULL, FK → auth.users | — | Criador |
| default_congregation_id | uuid | NULL, FK SET NULL | — | Só registration |
| notes | text | NULL | — | Notas |
| created_at / updated_at | timestamptz | NOT NULL | `now()` | Auditoria |

**Índices:** `token` (unique + btree), `church_id`, `expires_at`, `is_active`.

---

#### church_users
> Papel do usuário na igreja. **Um `user_id` → no máximo uma igreja** (UNIQUE global em `user_id`).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NOT NULL, FK CASCADE | — | Igreja |
| user_id | uuid | NOT NULL, UNIQUE, FK CASCADE → auth.users | — | Usuário Auth |
| role | church_user_role | NOT NULL | — | owner/admin/editor/reader |
| status | church_user_status | NOT NULL | `active` | active/invited/disabled |
| access_all_congregations | boolean | NOT NULL | `false` | `true` = acesso dinâmico a todas as congregações |
| created_at / updated_at | timestamptz | NOT NULL | `now()` | Auditoria |

**Índices:** `church_id`, `user_id`, `status`, UNIQUE `(church_id, user_id)`, UNIQUE `user_id`.

**Escopo:** `owner`/`admin` são tratados como acesso total no código. Para `reader`/`editor`: ou `access_all_congregations=true`, ou ≥1 linha em `church_user_congregations`.

---

#### church_user_congregations
> N:N entre vínculo de usuário e congregações permitidas (quando não é “todas”).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_user_id | uuid | NOT NULL, FK CASCADE → church_users | — | Vínculo do usuário |
| congregation_id | uuid | NOT NULL, FK CASCADE → congregations | — | Congregação permitida |
| created_at | timestamptz | NOT NULL | `now()` | Auditoria |

**Índices:** UNIQUE `(church_user_id, congregation_id)`; `congregation_id`; `church_user_id`.  
**RLS:** `deny_anon` restritivo (padrão do projeto).

---

#### audit_logs
> Trilha de auditoria aplicacional (sem FK formal a churches/users).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| created_at | timestamptz | NOT NULL | `now()` | Quando |
| user_id | uuid | NOT NULL | — | Ator |
| church_id | uuid | NOT NULL | — | Tenant |
| entity | text | NOT NULL, CHECK lista | — | Entidade |
| entity_id | uuid | NOT NULL | — | ID alvo |
| action | text | NOT NULL, CHECK create/update/delete/… | — | Ação |
| changes_before / after | jsonb | NULL | — | Diff |
| ip / user_agent | text | NULL | — | Contexto HTTP |

**Índices:** vários compostos por `church_id`+`created_at`/`entity`/`action`, `entity+entity_id`, `user_id+created_at` (há índices historicamente duplicados).

---

#### pending_subscriptions
> Assinatura Stripe pré-igreja (checkout landing → vínculo no onboarding).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| email | varchar | NOT NULL | — | E-mail checkout |
| stripe_customer_id | varchar | NOT NULL; UNIQUE parcial | — | Customer |
| stripe_subscription_id | varchar | NOT NULL | — | Subscription |
| plan_type | varchar | NOT NULL, CHECK 200/500/800/custom (**sem `100`**) | — | Plano |
| subscription_status | varchar | NOT NULL, CHECK Stripe | — | Status |
| subscription_start_date | timestamptz | NULL | — | Início |
| expires_at | timestamptz | NULL | `now()+7 days` | Expiração pending |
| last_stripe_event_created | bigint | NULL | — | Ordenação eventos |
| link_token | uuid | NULL, UNIQUE parcial | — | Token vínculo |
| created_at | timestamptz | NULL | `now()` | Criação |

**Índices:** `email`, `expires_at`, `stripe_customer_id` / `stripe_subscription_id`, uniques parciais customer + link_token.

---

#### processed_webhook_events
> Idempotência e telemetria de webhooks Stripe.

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| stripe_event_id | varchar | NOT NULL, UNIQUE | — | `evt_*` |
| event_type | varchar | NOT NULL | — | Tipo evento |
| processed_at / created_at | timestamptz | NULL | `now()` | Timestamps |
| church_id | uuid | NULL, FK SET NULL | — | Igreja se resolvida |
| processing_ms | int4 | NULL | — | Latência |
| outcome | text | NULL, CHECK processing/success/released/failed | `'processing'` | Resultado claim |

**Índices:** UNIQUE `stripe_event_id`; `created_at`; `church_id` parcial; `outcome`.

---

#### church_subscription_events
> Histórico imutável de transições de plano/status (`church_id` nullable após migration `ob04`).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| church_id | uuid | NULL, FK CASCADE | — | Igreja |
| event_type | text | NOT NULL | — | Tipo transição |
| old_plan / new_plan | text | NULL | — | Planos |
| old_status / new_status | text | NULL | — | Status |
| stripe_event_id | text | NULL | — | Evento origem |
| payload | jsonb | NULL | — | Snapshot |
| source | text | NOT NULL | `'webhook'` | webhook/api/manual |
| created_at | timestamptz | NOT NULL | `now()` | Quando |

**Índices:** `church_id`, `created_at DESC`.

---

#### waitlist
> Leads da landing (lista de espera).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| name / email / phone | varchar | NOT NULL; email UNIQUE | — | Contato |
| church_name / city / state | varchar | NOT NULL | — | Igreja interessada |
| plan | varchar | NOT NULL, CHECK 200/500/800/personalizado | — | Interesse |
| message | text | NULL | — | Mensagem |
| created_at / updated_at | timestamptz | NULL | `now()` | Auditoria |

**Índices:** UNIQUE email; `created_at DESC`; `plan`.

---

#### job_runs
> Telemetria de crons (`cleanup_*`, etc.).

| Campo | Tipo | Restrições | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | PK | `gen_random_uuid()` | Identificador |
| job_name | text | NOT NULL | — | Nome job |
| started_at | timestamptz | NOT NULL | `now()` | Início |
| finished_at | timestamptz | NULL | — | Fim |
| status | text | NOT NULL, CHECK running/success/failed | `'running'` | Status |
| rows_affected | int4 | NULL | `0` | Linhas |
| error_message | text | NULL | — | Erro |
| duration_ms | int4 | NULL | — | Duração |

**Índices:** `(job_name, started_at DESC)`.

---

## 4. 🔢 Enums e Tipos Customizados

### Tipos Postgres (`CREATE TYPE`)

| Enum | Valores | Usado em | Descrição |
| --- | --- | --- | --- |
| `church_user_role` | owner, admin, editor, reader | `church_users.role` | Papéis RBAC |
| `church_user_status` | active, invited, disabled | `church_users.status` | Estado vínculo |
| `gender_enum` | masculino, feminino | `integration_members.gender` | Gênero (minúsculo) |
| `marital_status_enum` | solteiro, casado, divorciado, viuvo, outro | `integration_members.marital_status` | Estado civil |
| `admission_type_enum` | batismo, transferencia, profissao de fe, outro | `integration_members.expected_admission_type` | Admissão esperada |
| `integration_status_enum` | em_progresso, integrado, descartado | `integration_members.status` | Pipeline integração |

### CHECKs text (não são enums PG) — valores frequentes

| Domínio | Valores | Tabelas |
| --- | --- | --- |
| Plan church | `100`, `200`, `500`, `800`, `custom` | `churches.plan_type` |
| Plan pending | `200`, `500`, `800`, `custom` | `pending_subscriptions.plan_type` |
| Plan waitlist | `200`, `500`, `800`, `personalizado` | `waitlist.plan` |
| Stripe status | active, canceled, past_due, unpaid, incomplete, incomplete_expired, trialing, paused | churches / pending |
| Member gender | Masculino, Feminino | `members.gender` |
| Member marital | Solteiro, Casado, Divorciado, Viúvo, Outro, União Estável | `members.marital_status` |
| Group type | Ministério, Departamento, Equipe, Time, Comissão, Célula, … | `groups.type` |
| Calendar type/status/recurrence | ver dicionário | `calendar_items` |
| Audit entity/action | member, role, … / create, update, delete, convert, import, deactivate | `audit_logs` |
| Webhook outcome | processing, success, released, failed | `processed_webhook_events` |

> **Inconsistência documentada:** labels de gênero/estado civil diferem entre `members` (Title Case PT) e enums de `integration_members` (lowercase). Planos: waitlist usa `personalizado`; billing usa `custom`; churches aceita `100`, pending não.

---

## 5. 🧭 Convenções de Migration

| Aspecto | Realidade no Flock |
| --- | --- |
| Pasta `migrations/` no repo | **Não existe** |
| Fonte de histórico | Tabela de migrations do Supabase (MCP `list_migrations`) + SQL ad-hoc no Dashboard |
| Naming | Prefixo timestamp `YYYYMMDDHHMMSS` + slug (`dbNN_*`, `obNN_*`, ou descritivo) |
| Aplicação | Manual via Supabase Dashboard / MCP `apply_migration` — **não** no boot da API |
| Rollback | Sem tooling de down automático; reverter = nova migration compensatória |
| Dump local | `backend/bd-structure.sql` — snapshot (ex.: 2026-06-05); **não** substitui o live |

### Histórico resumido (live, ordem cronológica)

| Version | Name |
| --- | --- |
| 20260604155512 | `db10_idx_churches_subscription_end_date` |
| 20260604155519 | `db02_unique_pending_stripe_customer_id` |
| 20260604155529 | `db06_check_subscription_requires_customer` |
| 20260604155553 | `db07_rpc_link_pending_to_church` |
| 20260605120605 | `db05_church_subscription_events` |
| 20260605121127 | `db18_rls_financial_tables` |
| 20260605135105 | `ob04_nullable_church_id_sub_events` |
| 20260605135119 | `ob09_job_runs_table` |
| 20260605142611 | `ob12_webhook_processing_context` |
| 20260605152202 | `db19_rls_remaining_tables` |
| 20260605194745 | `db20_audit_logs_constraints` |
| 20260622220224 | `add_member_form_fields_v2` |
| 20260708150233 | `update_sunday_attendance_check` |
| 20260708202711 | `drop_secret_organization_columns` |

**Processo recomendado para nova migration:** escrever SQL idempotente → aplicar no projeto `flock-app-01` (staging/prod controlado) → atualizar tipos TS / validators → regenerar ou anotar dump `bd-structure.sql` se usado como referência → registrar no changelog da KB.

### RPCs relevantes (`public`, app)

| Função | Uso |
| --- | --- |
| `link_pending_to_church` | Vincula pending Stripe → church no onboarding |
| `cleanup_expired_pending_subscriptions` | Cron limpeza pending |
| `cleanup_old_webhook_events` | Cron limpeza webhooks |
| `validate_subscription_integrity` | Checagem consistência billing |
| `set_updated_at` / `update_*_updated_at` | Triggers de `updated_at` |

---

## 6. 🌱 Seeds e Dados de Referência

| Item | Status |
| --- | --- |
| Seeds / fixtures no repo | **Não encontrados** (sem pasta `seeds/`, sem scripts npm de seed) |
| Dados de referência produção | Nenhum seed obrigatório; enums/CHECKs são a “referência” |
| Como popular dev | Manual via app, SQL no Dashboard, ou import CSV da feature de membros |
| Contagens live (amostra MCP) | Ex.: `members` ~35, `job_runs` ~99, `audit_logs` ~32 — ambiente não vazio |

---

## 7. ⚡ Estratégias de Performance

### Índices críticos

| Índice | Motivo |
| --- | --- |
| `idx_members_church_congregation_active` (parcial) | Quota / listagens de membros ativos por congregação |
| Uniques parciais Stripe em `churches` / `pending_subscriptions` | Lookup webhook e anti-duplicata |
| `processed_webhook_events_stripe_event_id_key` | Idempotência webhook O(1) |
| `uq_church_users_user_id` | Resolução de tenant do usuário logado |
| Tokens UNIQUE em links públicos | Resolve formulário público por token |
| GIN `idx_members_children` | Filtro/busca em JSONB filhos |
| `idx_integration_members_name_lower` | Busca case-insensitive |
| `idx_audit_logs_church_created*` | Timeline de auditoria por igreja |
| `idx_job_runs_job_name_started` | Histórico de crons |

### Paginação

Padrão dominante: **offset/page** via PostgREST `.range(offset, offset+limit-1)` (`memberController`, `integrationController`, `accountController`, `stripeController` subscription-events). Não há cursor-based pagination.

### N+1 potenciais

- Exports e listagens de grupos (`exportController` / `groupController`): contagens de membros por grupo em loop.
- Calendário: participantes carregados por item sem join único garantido.
- Preferir `.select('*, relation(...)')` do Supabase ou queries agregadas quando escalar.

### Connection pool

Não configurado na API. Throughput limitado pelo pool interno do Supabase/PostgREST e quotas do projeto. Sem Redis/cache de queries.

---

## 8. 🔐 Dados Sensíveis

### PII (não logar em claro; cuidado em exports/PDF)

| Área | Campos |
| --- | --- |
| Membros / integração | name, document, email, phone, whatsapp, address*, birth, parents, children, spouse |
| Igreja | cnpj, email_church, phone_church, address |
| Waitlist / pending | name, email, phone |
| Convidados calendário | guest_* |
| Auth | e-mail/senha em `auth.users` (gerenciado Supabase) |
| Auditoria | `changes_before`/`after` podem conter PII; `ip`, `user_agent` |

### Segredos / tokens

| Campo | Tratamento |
| --- | --- |
| `public_*_links.token` | Segredo de URL — não listar em logs; tratar como capability |
| `pending_subscriptions.link_token` | Token de vínculo checkout |
| Stripe IDs | Não são secretos de API, mas identificam tenant financeiro |
| Service role key | **Nunca** no frontend / logs / commits |

### Hash / criptografia em coluna

Não há colunas com senha/hash no schema `public` (auth via Supabase). Sem coluna `encrypted_*` identificada.

### Nunca expor em respostas de API públicas

- Service role / JWT internos  
- `stripe_customer_id` / payloads completos de webhook para roles baixas  
- Tokens de links além do fluxo que os consome  
- Diff completo de `audit_logs` para roles reader  

---

## 9. 📝 Convenções para Agentes

Regras que o Backend Engineer / agentes devem seguir com o schema **real**:

1. **Sem ORM** — usar `db` / `supabaseAdmin` (`backend/src/services/supabase.ts`); nunca assumir Prisma/Drizzle.
2. **IDs UUID** — deixar o default do banco (`gen_random_uuid` / `uuid_generate_v4`); não usar auto-increment.
3. **Sem `deleted_at`** — não inventar soft delete global. Para membros: `active=false` quando for inativação; para links: `is_active=false`. Aceitar que vários endpoints fazem **DELETE físico**.
4. **Timestamps** — preferir `timestamptz`; nem toda tabela tem `updated_at` (`members` não tem — não adicionar silenciosamente sem migration).
5. **Tenant** — toda query de domínio DEVE filtrar `church_id` resolvido do usuário; service_role não isola sozinho.
6. **RLS** — tabelas `public` têm RLS; código server-side depende de service_role. Não abrir policies amplas para `anon` sem ADR.
7. **Enums vs CHECK** — ao alterar valor permitido, atualizar constraint + validators Joi/Zod + docs; alinhar `members` (text/CHECK) vs `integration_members` (PG enum).
8. **Migrations** — aplicar no Supabase com timestamp+slug; commitar SQL de referência se o time passar a versionar; atualizar este doc e cuidado com dump `bd-structure.sql` desatualizado.
9. **Billing** — respeitar CHECKs de `plan_type`/`subscription_status`; uniques parciais Stripe; usar RPC `link_pending_to_church` em vez de duplicar lógica de vínculo.
10. **Webhooks** — claim em `processed_webhook_events` por `stripe_event_id` unique; respeitar `outcome` e `last_stripe_event_created` para ordenação.
11. **Paginação** — padrão page/limit + `.range`; documentar se introduzir cursor.
12. **PII** — não logar document/email/telefone/token; `audit_logs.changes_*` não deve incluir segredos desnecessários.
13. **`church_users`** — um usuário = uma igreja; papel `owner|admin|editor|reader`.
14. **Antes de confiar no dump local** — conferir schema live (MCP/`information_schema`); dump pode atrasar migrations como `add_member_form_fields_v2`.

---

## Apêndice — Fontes

| Fonte | Uso |
| --- | --- |
| Supabase MCP `list_tables` (verbose) | Colunas, PKs, FKs, CHECKs live |
| Supabase MCP `list_migrations` | Histórico 2026-06 → 2026-07 |
| Supabase MCP `execute_sql` | Índices, enums, Postgres version |
| `backend/src/services/supabase.ts` | Clientes anon vs admin |
| Controllers Express | Soft/hard delete e paginação |
| `backend/bd-structure.sql` | Snapshot histórico apenas |
