---
type: regras-modulo
modulo: aquisicao
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 5
tags: [regras, modulo:aquisicao]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/aquisicao/overview]]"
  - "[[02_regras-de-negocio/regras-por-modulo/billing]]"
---

# Regras de Negócio — Aquisição e Waitlist

## Responsabilidade do Módulo
Captar interesse comercial via landing e lista de espera.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-ACQ-001 | Campos waitlist | Restrição | Ativo |
| BR-ACQ-002 | Planos waitlist | Restrição | Ativo |
| BR-ACQ-003 | E-mail único waitlist | Restrição | Ativo |
| BR-ACQ-004 | Message opcional | Restrição | Ativo |
| BR-ACQ-005 | E-mails pós-cadastro | Gatilho | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-ACQ-001: Campos waitlist
- **Declaração:** Exige name, email, phone 10–11, churchName, city, state UF2, plan.
- **Tipo:** Restrição
- **Gatilho:** POST waitlist
- **Comportamento esperado:** 201
- **Comportamento em violação:** 400
- **Implementado em:** `waitlistValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ACQ-002: Planos waitlist
- **Declaração:** plan ∈ 200|500|800|personalizado.
- **Tipo:** Restrição
- **Gatilho:** POST waitlist
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `waitlistValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ACQ-003: E-mail único waitlist
- **Declaração:** E-mail normalizado único na tabela waitlist.
- **Tipo:** Restrição
- **Gatilho:** POST
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Email já cadastrado
- **Implementado em:** `waitlistController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ACQ-004: Message opcional
- **Declaração:** message ≤1000 chars se houver.
- **Tipo:** Restrição
- **Gatilho:** POST
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `waitlistValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔔 Regras de Notificação e Eventos

### BR-ACQ-005: E-mails pós-cadastro
- **Declaração:** Confirmação ao lead + notificação admin (best-effort).
- **Tipo:** Gatilho
- **Gatilho:** POST waitlist
- **Comportamento esperado:** E-mails
- **Comportamento em violação:** Lead já salvo
- **Implementado em:** `waitlistController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Landing pré-seleciona plano via query/hash (UX).

---

*Gerado em 2026-07-13.*
