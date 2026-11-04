---
type: modulo
nome: eventos
status: Ativo
complexidade: Alta
ultima_atualizacao: 2026-11-02
versao: "1.0"
owner: (não identificado no código)
tags: [módulo, eventos, events]
depende_de: [auth, igreja-config, congregacoes, membros, grupos]
integracoes: [Supabase PostgreSQL]
---

# Módulo — Eventos

> Encontros especiais (congresso, conferência, acampamento…): CRUD, equipe, vagas, inscritos com match N/W/D e link público.  
> Regras: [[02_regras-de-negocio/regras-por-modulo/eventos]] · Índice: [[04_modulos/index]] · Schema: [[03_arquitetura/banco-de-dados]].

---

## 1. 📌 Visão Geral

Organiza **encontros especiais** da igreja — não a programação semanal. Espelha padrões do [[04_modulos/ensino]] (hub, detalhe, match, fila, link público), com **capacidade opcional** e vínculo opcional a **ministério responsável**.

**Não** reativa o [[04_modulos/calendario]] (código preservado; nav oculta). Convidados **não** criam `members` e **não** consomem cota.

Produto: [[01_produto/visao-do-produto]] · Glossário: Evento / Inscrito / Vagas · Release track `major-v1` (DEV-108).

---

## 2. ⚖️ Bounded Context

### ✅ Este módulo É responsável por:

- CRUD de `events` (nome, descrição livre **sem** Tipo, datas, local, status, capacidade, congregação ou todas)
- Equipe: responsável (1) + organizadores (0..N) via `event_organizers`
- Ministério responsável opcional (`group_id`)
- Inscrições `event_registrations` (`member` | `guest` | `possible_member`)
- Capacidade / vagas sem waitlist (`eventCapacity`)
- Match servidor N/W/D (`teachingMatchService`) e resolve de fila
- Link público (`event_public_links`) + GET/POST `/api/public/events/:token` (rate limit)
- Nav **Eventos** (`/events`) no lugar de Calendário
- Permissões: GET ≥ reader; mutações ≥ editor

### ❌ Este módulo NÃO é responsável por:

- Programação semanal / recorrência / vista mensal
- Reativar UI ou tutoriais de `/calendar`
- Lista de espera, bilheteria, check-in, PDF de inscritos
- Promover convidado → Integração/Membro
- Sync com Calendário legado ou migração `calendar_items` → events

---

## 3. 📁 Estrutura de Arquivos

```
backend/src/
├── routes/events.ts
├── controllers/
│   ├── eventController.ts
│   ├── eventRegistrationController.ts
│   ├── eventPublicLinkController.ts
│   └── publicEventController.ts
├── middlewares/publicEventAuth.ts
├── services/eventCapacity.ts
└── validators/eventValidator.ts

frontend/src/
├── app/(main)/events/
│   ├── page.tsx
│   └── [eventId]/page.tsx
├── app/public/events/[token]/page.tsx
└── components/events/

supabase/migrations/
├── 20261102210000_dev_102_events_module.sql
└── 20261102213000_dev_102_audit_logs_events.sql
```

Testes: `eventValidator.test.ts` (+ helpers de capacidade).

---

## 4. 🗄️ Modelo de Dados (resumo)

| Tabela | Papel |
| --- | --- |
| `events` | Unidade principal; `capacity` null = ilimitado; `congregation_id` null = todas |
| `event_organizers` | PK `(event_id, member_id)`; ≠ responsável |
| `event_registrations` | Inscrição; hard DELETE libera vaga; UNIQUE parcial membro/evento |
| `event_public_links` | 1 link por evento (token, is_active, expires, max_uses) |

RLS ligado sem policy permissiva; app usa `service_role` (padrão Ensino/DEV-130).  
`audit_logs.entity` inclui `event`, `event_organizers`, `event_registration`, `event_public_link`.

---

## 5. 🔌 API (resumo)

### Autenticado — `/api/events`

| Método | Path | Role |
| --- | --- | --- |
| GET | `/` , `/:id` | reader+ |
| POST / PATCH / DELETE | `/` , `/:id` | editor+ |
| PUT | `/:id/organizers` | editor+ |
| GET / POST | `/:id/registrations` | reader+ / editor+ |
| PATCH | `/registrations/:id/resolve` | editor+ |
| DELETE | `/registrations/:id` | editor+ |
| GET / POST / PATCH | `/:id/public-link` | reader+ / editor+ |

### Público — `/api/public/events/:token`

| Método | Notas |
| --- | --- |
| GET | Meta + `enrollment_allowed` + `full` |
| POST | `publicPostLimiter`; status `open`\|`in_progress`; capacidade |

Detalhe de contratos: [[03_arquitetura/api-design]].

---

## 6. 🖥️ Frontend

| Rota | Função |
| --- | --- |
| `/events` | Hub + seletor congregação + modal create |
| `/events/[eventId]` | Detalhe: meta, equipe, vagas, link, inscritos/fila |
| `/public/events/[token]` | Form público; outcomes opacos; estado lotado |

Nav: item **Eventos** (`CalendarDays`) após Congregações, antes de Ensino — sem item Calendário.

---

## 7. 🔗 Dependências

- [[04_modulos/ensino]] — match / fila / link
- [[04_modulos/grupos]] — ministério responsável
- [[04_modulos/membros]] — responsável, organizadores, inscritos
- [[04_modulos/calendario]] — superfície sucedida (não evoluir nesta Issue)

---

## Histórico

2026-11-02 — Implementação inicial (DEV-102), merge track `major-v1`.
