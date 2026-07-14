---
type: regras-modulo
modulo: calendario
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 16
tags: [regras, modulo:calendario]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/calendario/overview]]"
---

# Regras de Negócio — Calendário e Eventos

## Responsabilidade do Módulo
Agenda da igreja: eventos, recorrência e participantes.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-CAL-001 | Tipo de item | Restrição | Ativo |
| BR-CAL-002 | Título e campos | Restrição | Ativo |
| BR-CAL-003 | Create força active | Fato | Ativo |
| BR-CAL-004 | Recorrência weekly/monthly | Restrição | Ativo |
| BR-CAL-005 | Weekly exige dia da semana | Restrição | Ativo |
| BR-CAL-006 | Monthly XOR modos | Restrição | Ativo |
| BR-CAL-007 | end_date após start | Restrição | Ativo |
| BR-CAL-008 | Update ignora status do body | Fato | Ativo |
| BR-CAL-009 | Vínculos alinhados | Restrição | Ativo |
| BR-CAL-010 | Escrita editor+ | Restrição | Ativo |
| BR-CAL-011 | Participante XOR | Restrição | Ativo |
| BR-CAL-012 | Membro participante válido | Restrição | Ativo |
| BR-CAL-013 | Sem duplicar participante membro | Restrição | Ativo |
| BR-CAL-014 | Isolamento tenant | Restrição | Ativo |
| BR-CAL-015 | List expande recorrência | Derivação | Ativo |
| BR-CAL-016 | PDF mensal ativos | Derivação | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-CAL-001: Tipo de item
- **Declaração:** type ∈ Programação|Evento|Encontro|Reunião.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-002: Título e campos
- **Declaração:** Título 2–100; descrição ≤5000; local ≤255.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-003: Create força active
- **Declaração:** Todo item criado tem status=active.
- **Tipo:** Fato
- **Gatilho:** POST calendar
- **Comportamento esperado:** Ativo
- **Comportamento em violação:** —
- **Implementado em:** `calendarController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-004: Recorrência weekly/monthly
- **Declaração:** Recorrente exige pattern weekly|monthly e recurrence_time HH:mm.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-005: Weekly exige dia da semana
- **Declaração:** weekly exige recurrence_day_of_week 0–6.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-006: Monthly XOR modos
- **Declaração:** Monthly: dia do mês OU (semana+dia), não ambos.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-007: end_date após start
- **Declaração:** Se não recorrente, end_date > start_date quando informado.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📝 Regras de Atualização / Edição

### BR-CAL-008: Update ignora status do body
- **Declaração:** Alteração de status via body de update não é aplicada no fluxo atual.
- **Tipo:** Fato
- **Gatilho:** PUT
- **Comportamento esperado:** Demais campos
- **Comportamento em violação:** —
- **Implementado em:** `calendarController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-009: Vínculos alinhados
- **Declaração:** Congregação/grupo/responsável da mesma igreja e coerentes entre si.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-010: Escrita editor+
- **Declaração:** Mutações editor+; leitura reader+.
- **Tipo:** Restrição
- **Gatilho:** Rotas
- **Comportamento esperado:** —
- **Comportamento em violação:** 403
- **Implementado em:** `routes/calendar.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔗 Regras de Relacionamento

### BR-CAL-011: Participante XOR
- **Declaração:** Participante é membro XOR convidado (guest_name).
- **Tipo:** Restrição
- **Gatilho:** Add participant
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarParticipantValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-012: Membro participante válido
- **Declaração:** Membro da mesma igreja (e alinhado à cong. quando aplicável).
- **Tipo:** Restrição
- **Gatilho:** Add
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400/404
- **Implementado em:** `calendarValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-013: Sem duplicar participante membro
- **Declaração:** Mesmo membro não entra duas vezes no item.
- **Tipo:** Restrição
- **Gatilho:** Add
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `calendarParticipantController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-014: Isolamento tenant
- **Declaração:** CRUD/itens/participantes filtrados por church_id.
- **Tipo:** Restrição
- **Gatilho:** Todas
- **Comportamento esperado:** OK
- **Comportamento em violação:** 404
- **Implementado em:** `controllers calendar*`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-010]]

### 🧮 Regras de Cálculo / Derivação

### BR-CAL-015: List expande recorrência
- **Declaração:** Listagem retorna ocorrências expandidas de recorrentes; só status active; limit≤2000.
- **Tipo:** Derivação
- **Gatilho:** GET list
- **Comportamento esperado:** Série expandida
- **Comportamento em violação:** 400 params
- **Implementado em:** `calendarController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CAL-016: PDF mensal ativos
- **Declaração:** Export PDF mensal considera itens ativos e filtros cong/grupo.
- **Tipo:** Derivação
- **Gatilho:** Export PDF
- **Comportamento esperado:** PDF
- **Comportamento em violação:** 400 mês inválido
- **Implementado em:** `calendarController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 cancelled/postponed existem no schema/validator mas create força active e list filtra active.

---

*Gerado em 2026-07-13.*
