---
type: regras-modulo
modulo: eventos
ultima_atualizacao: 2026-11-02
versao: "1.0"
total_regras: 14
tags: [regras, modulo:eventos]
ver_tambem:
  - "[[04_modulos/eventos]]"
  - "[[02_regras-de-negocio/regras-por-modulo/ensino]]"
  - "[[02_regras-de-negocio/regras-por-modulo/calendario]]"
  - "[[02_regras-de-negocio/politicas-e-restricoes]]"
---

# Regras de Negócio — Eventos

## Responsabilidade do Módulo

Gerenciar **encontros especiais** da igreja (congressos, conferências, acampamentos, etc.): CRUD de evento, equipe (responsável + organizadores), ministério responsável opcional, **capacidade (vagas) sem lista de espera**, inscritos (membro / convidado / possível membro), match N/W/D idêntico ao Ensino e link público — **sem** reativar Calendário nem controlar programação semanal.

## Índice de Regras

| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-EVT-001 | Nome e descrição do evento | Restrição | Ativo |
| BR-EVT-002 | Datas início / fim | Restrição | Ativo |
| BR-EVT-003 | Escopo de congregação | Restrição | Ativo |
| BR-EVT-004 | Status do evento | Restrição | Ativo |
| BR-EVT-005 | Capacidade (vagas) sem waitlist | Política | Ativo |
| BR-EVT-006 | Responsável e organizadores | Restrição | Ativo |
| BR-EVT-007 | Ministério responsável opcional | Restrição | Ativo |
| BR-EVT-008 | Kinds de inscrição | Restrição | Ativo |
| BR-EVT-009 | Unicidade de membro no evento | Restrição | Ativo |
| BR-EVT-010 | Match N/W/D idêntico ao Ensino | Política | Ativo |
| BR-EVT-011 | Inscrição pública só aberto / em andamento | Restrição | Ativo |
| BR-EVT-012 | Privacidade do outcome público | Política | Ativo |
| BR-EVT-013 | Fila possível membro (resolve) | Gatilho | Ativo |
| BR-EVT-014 | Permissões reader / editor+ | Restrição | Ativo |

---

## Regras por Categoria

### 📥 Criação / Cadastro

### BR-EVT-001: Nome e descrição do evento
- **Declaração:** Nome 2–100 (trim). Descrição livre opcional. **Não** há campo Tipo/enum de evento na v1.
- **Tipo:** Restrição
- **Gatilho:** Create/update de evento
- **Comportamento esperado:** Persistência OK
- **Comportamento em violação:** 400
- **Implementado em:** `eventValidator.ts` + CHECK `events_name_len`
- **Testado em:** `eventValidator.test.ts`
- **Depende de:** —

### BR-EVT-002: Datas início / fim
- **Declaração:** `starts_at` obrigatório; `ends_at` opcional e, se presente, ≥ `starts_at`.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** Intervalo válido
- **Comportamento em violação:** 400
- **Implementado em:** `eventValidator.ts` + CHECK `events_ends_at_check`
- **Testado em:** `eventValidator.test.ts`
- **Depende de:** —

### BR-EVT-003: Escopo de congregação
- **Declaração:** `congregation_id` null = todas as congregações; UUID = escopo daquela unidade (deve pertencer à igreja). Listagens respeitam seletor de visão (padrão Ensino).
- **Tipo:** Restrição
- **Gatilho:** Create/update; listagens
- **Comportamento esperado:** Escopo válido + filtro de visão
- **Comportamento em violação:** 400 / 403 conforme acesso
- **Implementado em:** `eventController.ts` + `congregationScope`
- **Testado em:** N/A — smoke / QA
- **Depende de:** Congregações

### BR-EVT-004: Status do evento
- **Declaração:** `status` ∈ `draft` | `open` | `in_progress` | `closed` | `archived` (UI: rascunho / aberto / em andamento / encerrado / arquivado). Default create: `draft`.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** Status válido
- **Comportamento em violação:** 400
- **Implementado em:** `eventValidator.ts` + CHECK `events_status_check`
- **Testado em:** `eventValidator.test.ts`
- **Depende de:** —

### BR-EVT-005: Capacidade (vagas) sem waitlist
- **Declaração:** `capacity` null = ilimitado (sujeito a rate limit público). Se definido (>0), contar todas as linhas de `event_registrations`; ao atingir o limite, POST Painel e público recusam com mensagem clara (“Não há vagas disponíveis.”). Hard DELETE de inscrição libera vaga. **Sem** lista de espera / overbooking intencional. Write path race-aware (`insertEventRegistrationWithCapacity`: check pré-insert + rollback se excedeu).
- **Tipo:** Política
- **Gatilho:** Create/update inscrição (Painel e público); redução de `capacity` no evento
- **Comportamento esperado:** Bloqueio quando cheio; UI sem CTA de espera
- **Comportamento em violação:** 409 (cheio) / 400 (capacidade < inscritos ao reduzir)
- **Implementado em:** `eventCapacity.ts`, `eventRegistrationController.ts`, `publicEventController.ts`, `eventController.ts`
- **Testado em:** helpers em `eventValidator.test.ts`; smoke QA
- **Depende de:** —

### BR-EVT-006: Responsável e organizadores
- **Declaração:** Responsável = 1 membro obrigatório da igreja. Organizadores = 0..N membros distintos do responsável; sem duplicar o mesmo membro. Ao trocar responsável, remove-o de `event_organizers` se estiver lá.
- **Tipo:** Restrição
- **Gatilho:** Create/update evento; `PUT …/organizers`
- **Comportamento esperado:** Equipe válida
- **Comportamento em violação:** 400
- **Implementado em:** `eventController.ts`
- **Testado em:** N/A — smoke / QA
- **Depende de:** Membros

### BR-EVT-007: Ministério responsável opcional
- **Declaração:** `group_id` opcional. Se informado: mesma igreja; se o evento tem `congregation_id`, o ministério deve ser da mesma congregação (quando o grupo tem congregação).
- **Tipo:** Restrição
- **Gatilho:** Create/update evento
- **Comportamento esperado:** Alinhamento aceito
- **Comportamento em violação:** 400
- **Implementado em:** `eventController.ts` (`validateEventGroup`)
- **Testado em:** N/A — smoke / QA
- **Depende de:** Ministérios (grupos)

### 👥 Inscrições e match

### BR-EVT-008: Kinds de inscrição
- **Declaração:** `kind` ∈ `member` | `guest` | `possible_member`. Membro exige `member_id`; guest/possible_member exigem `full_name`, `whatsapp`, `birth_date`.
- **Tipo:** Restrição
- **Gatilho:** Create inscrição
- **Comportamento esperado:** Payload coerente
- **Comportamento em violação:** 400
- **Implementado em:** `eventValidator.ts` + CHECKs em `event_registrations`
- **Testado em:** `eventValidator.test.ts`
- **Depende de:** —

### BR-EVT-009: Unicidade de membro no evento
- **Declaração:** No máximo uma inscrição com o mesmo `member_id` por evento (índice único parcial).
- **Tipo:** Restrição
- **Gatilho:** Create inscrição (Painel/público)
- **Comportamento esperado:** Duplicata rejeitada ou idempotente no público (outcome confirmed)
- **Comportamento em violação:** 409 / 200 idempotente no público
- **Implementado em:** UNIQUE `event_registrations_event_member_uidx` + controllers
- **Testado em:** N/A — smoke / QA
- **Depende de:** —

### BR-EVT-010: Match N/W/D idêntico ao Ensino
- **Declaração:** Inscrição pública usa a mesma matriz N/W/D e políticas de fila do Ensino (`teachingMatchService` / `teachingEnrollmentPolicy`). Convidado **não** cria `members` e **não** consome cota (BR-POL-001/003).
- **Tipo:** Política
- **Gatilho:** POST público; resolução de fila
- **Comportamento esperado:** Mesmos outcomes do Ensino (member / possible_member / guest)
- **Comportamento em violação:** N/A — divergência é bug de produto
- **Implementado em:** `publicEventController.ts`, `eventRegistrationController.ts`
- **Testado em:** paridade com testes de Ensino; smoke
- **Depende de:** BR-ENS-010…015

### BR-EVT-011: Inscrição pública só aberto / em andamento
- **Declaração:** GET/POST `/api/public/events/:token` só aceitam inscrição se o evento estiver `open` ou `in_progress`, link ativo e dentro de limites (expires/max_uses). Caso contrário, mensagem genérica de indisponibilidade.
- **Tipo:** Restrição
- **Gatilho:** Validate/enroll público
- **Comportamento esperado:** Bloqueio em draft/closed/archived
- **Comportamento em violação:** 403 genérico
- **Implementado em:** `publicEventAuth.ts`, `publicEventController.ts`
- **Testado em:** smoke QA
- **Depende de:** BR-EVT-004

### BR-EVT-012: Privacidade do outcome público
- **Declaração:** UI pública mostra “Inscrição confirmada” (member) ou “Inscrição enviada” (guest/possible) **sem** revelar detalhes do match. Vagas esgotadas: mensagem dedicada sem form.
- **Tipo:** Política
- **Gatilho:** Resposta POST público + página `/public/events/[token]`
- **Comportamento esperado:** Outcomes opacos
- **Comportamento em violação:** N/A — vazamento de match é bug
- **Implementado em:** `publicEventController.ts`, `frontend/.../public/events/[token]/page.tsx`
- **Testado em:** smoke QA
- **Depende de:** BR-EVT-010

### BR-EVT-013: Fila possível membro (resolve)
- **Declaração:** Editor+ resolve `possible_member` com Vincular (`link_member` + `member_id`) ou Manter convidado (`keep_guest`). Skip/dismiss se candidato já inscrito como membro (política Ensino).
- **Tipo:** Gatilho
- **Gatilho:** `PATCH /api/events/registrations/:id/resolve`
- **Comportamento esperado:** Kind atualizado; vaga permanece ocupada
- **Comportamento em violação:** 400
- **Implementado em:** `eventRegistrationController.ts`
- **Testado em:** N/A — paridade Ensino
- **Depende de:** BR-EVT-010, BR-ENS-013/014

### 🔐 Permissões

### BR-EVT-014: Permissões reader / editor+
- **Declaração:** GET list/detail/registrations/public-link ≥ reader. Mutações (CRUD evento, organizadores, inscritos, resolve, link) ≥ editor. Módulo disponível em todos os planos.
- **Tipo:** Restrição
- **Gatilho:** Rotas `/api/events*`
- **Comportamento esperado:** 403 para reader em mutações; UI `canEdit` read-only
- **Comportamento em violação:** 403
- **Implementado em:** `routes/events.ts` + `requireRole`
- **Testado em:** N/A — code review / smoke parcial
- **Depende de:** BR-POL-005

---

## Relação com Calendário

Superfície de produto v1: **Eventos**. Código `calendar_*` permanece no repositório; UI/nav Calendário **não** é reativada por este módulo (DEV-128 / DEV-102).

## Histórico

2026-11-02 — BR-EVT-001…014 (DEV-102 implementação inicial).
