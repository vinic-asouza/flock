---
type: regras-modulo
modulo: grupos
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 10
tags: [regras, modulo:grupos]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/grupos/overview]]"
---

# Regras de Negócio — Grupos

## Responsabilidade do Módulo
Organizar membros em ministérios, células e demais tipos.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-GRP-001 | Tipo de grupo válido | Restrição | Ativo |
| BR-GRP-002 | Nome e descrição | Restrição | Ativo |
| BR-GRP-003 | Unicidade ativa | Restrição | Ativo |
| BR-GRP-004 | Status default true | Fato | Ativo |
| BR-GRP-005 | Responsável válido | Restrição | Ativo |
| BR-GRP-006 | Congregação do grupo | Restrição | Ativo |
| BR-GRP-007 | Escrita editor+ | Restrição | Ativo |
| BR-GRP-008 | Add membro alinhado | Restrição | Ativo |
| BR-GRP-009 | Sem duplicar no grupo | Restrição | Ativo |
| BR-GRP-010 | Delete com cascade N:N | Gatilho | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-GRP-001: Tipo de grupo válido
- **Declaração:** type ∈ GroupType permitido.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-002: Nome e descrição
- **Declaração:** Nome 2–100; descrição ≤5000.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-003: Unicidade ativa
- **Declaração:** Sem outro ativo com mesmo name+type+congregation.
- **Tipo:** Restrição
- **Gatilho:** Create
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Grupo já existe
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-004: Status default true
- **Declaração:** Create defaulta status=true.
- **Tipo:** Fato
- **Gatilho:** Create
- **Comportamento esperado:** Ativo
- **Comportamento em violação:** —
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📝 Regras de Atualização / Edição

### BR-GRP-005: Responsável válido
- **Declaração:** responsible_id é membro da igreja alinhado à cong./Sede.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-006: Congregação do grupo
- **Declaração:** congregation_id null=Sede; deve ser da igreja.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-007: Escrita editor+
- **Declaração:** Mutações editor+.
- **Tipo:** Restrição
- **Gatilho:** Rotas
- **Comportamento esperado:** —
- **Comportamento em violação:** 403
- **Implementado em:** `routes/groups.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔗 Regras de Relacionamento

### BR-GRP-008: Add membro alinhado
- **Declaração:** Mesma igreja; mesma cong. ou Sede.
- **Tipo:** Restrição
- **Gatilho:** POST members
- **Comportamento esperado:** Vínculo
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-009: Sem duplicar no grupo
- **Declaração:** Membro único por grupo.
- **Tipo:** Restrição
- **Gatilho:** Add
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🗑️ Regras de Exclusão / Desativação

### BR-GRP-010: Delete com cascade N:N
- **Declaração:** DELETE remove grupo e member_groups.
- **Tipo:** Gatilho
- **Gatilho:** DELETE
- **Comportamento esperado:** 204
- **Comportamento em violação:** 404
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Delete não bloqueia por membros — cascata.

---

*Gerado em 2026-07-13.*
