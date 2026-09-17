---
type: regras-modulo
modulo: grupos
ultima_atualizacao: 2026-09-15
versao: "2.0"
total_regras: 13
tags: [regras, modulo:grupos, ministérios]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/grupos]]"
---

# Regras de Negócio — Ministérios

## Responsabilidade do Módulo
Organizar membros em **ministérios** (áreas de serviço). Código/API: `groups` / `member_groups`.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-GRP-001 | Tipo de grupo válido | Restrição | Removido |
| BR-GRP-002 | Nome e descrição | Restrição | Ativo |
| BR-GRP-003 | Unicidade ativa | Restrição | Ativo |
| BR-GRP-004 | Status default true | Fato | Ativo |
| BR-GRP-005 | Responsável válido | Restrição | Ativo |
| BR-GRP-006 | Congregação do ministério | Restrição | Ativo |
| BR-GRP-007 | Escrita editor+ | Restrição | Ativo |
| BR-GRP-008 | Add membro alinhado | Restrição | Ativo |
| BR-GRP-009 | Sem duplicar no ministério | Restrição | Ativo |
| BR-GRP-010 | Delete com cascade N:N | Gatilho | Ativo |
| BR-GRP-011 | Ordenação da listagem | Restrição | Ativo |
| BR-GRP-012 | Entidade só ministério | Fato | Ativo |
| BR-GRP-013 | Migração one-time não-Ministério | Gatilho | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-GRP-001: Tipo de grupo válido
- **Declaração:** ~~type ∈ GroupType permitido.~~ **Removido** (DEV-115): coluna `type` / `GroupType` não existem mais.
- **Tipo:** Restrição
- **Gatilho:** — (não aplicável)
- **Comportamento esperado:** —
- **Comportamento em violação:** —
- **Implementado em:** — (removido de `groupValidator.ts`)
- **Testado em:** `groupValidator.test.ts` (ausência de `type`)
- **Depende de:** —
- **Status:** Removido

### BR-GRP-002: Nome e descrição
- **Declaração:** Nome 2–100; descrição ≤5000. Mensagens Joi usam “ministério”.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidator.ts`
- **Testado em:** `groupValidator.test.ts`
- **Depende de:** —

### BR-GRP-003: Unicidade ativa
- **Declaração:** Sem outro ativo com mesmo `name` + `congregation_id` (sem `type`). Check no controller com `.limit(1)`.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Ministério já existe
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — validado em QA (DEV-115)
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
- **Declaração:** responsible_id (se informado) é membro da igreja na mesma congregação do ministério.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-006: Congregação do ministério
- **Declaração:** congregation_id é obrigatório (UUID da igreja). Não existe mais null = “Sede”.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Congregação é obrigatória / inválida
- **Implementado em:** `groupValidator.ts` / `groupValidations.ts`
- **Testado em:** `groupValidator.test.ts`
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
- **Declaração:** Membro da mesma igreja e da mesma congregação do ministério.
- **Tipo:** Restrição
- **Gatilho:** POST members
- **Comportamento esperado:** Vínculo
- **Comportamento em violação:** 400
- **Implementado em:** `groupValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-GRP-009: Sem duplicar no ministério
- **Declaração:** Membro único por ministério (`member_groups`).
- **Tipo:** Restrição
- **Gatilho:** Add
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Membro já está no ministério
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🗑️ Regras de Exclusão / Desativação

### BR-GRP-010: Delete com cascade N:N
- **Declaração:** DELETE remove o ministério (`groups`) e `member_groups`.
- **Tipo:** Gatilho
- **Gatilho:** DELETE
- **Comportamento esperado:** 204
- **Comportamento em violação:** 404 Ministério não encontrado
- **Implementado em:** `groupController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📋 Regras de Listagem

### BR-GRP-011: Ordenação da listagem
- **Declaração:** `GET /api/groups/` aceita `sort_by` apenas em whitelist (`name`, `created_at`, `updated_at`, `status`) e `sort_order` `asc`|`desc`. **Sem** `type`. Valor inválido faz fallback para default (`name` asc); desempate por `id` asc.
- **Tipo:** Restrição
- **Gatilho:** Listagem
- **Comportamento esperado:** Lista ordenada no banco; resposta permanece array
- **Comportamento em violação:** Fallback silencioso (não 400)
- **Implementado em:** `groupController.ts` (`listGroups`)
- **Testado em:** N/A — validado em QA (DEV-115)
- **Depende de:** —

### 🏛️ Regras de Domínio / Migração

### BR-GRP-012: Entidade só ministério
- **Declaração:** A entidade de produto deste módulo é **Ministério** (área de serviço). Não há tipos célula/classe/equipe/etc. Copy e mensagens usam “ministério”.
- **Tipo:** Fato
- **Gatilho:** Produto / API / UI
- **Comportamento esperado:** UI `/ministries`; API `/api/groups`; sem `GroupType`
- **Comportamento em violação:** —
- **Implementado em:** validators, controller, frontend ministries hub
- **Testado em:** `groupValidator.test.ts`
- **Depende de:** —

### BR-GRP-013: Migração one-time não-Ministério
- **Declaração:** Migração DEV-115 apagou (one-time) linhas em `groups` cujo `type` não era `Ministério`, antes de remover a coluna `type`. Não é rotina recorrente.
- **Tipo:** Gatilho
- **Gatilho:** Deploy / migration DEV-115
- **Comportamento esperado:** Schema sem `type`; apenas ministérios restantes
- **Comportamento em violação:** —
- **Implementado em:** migration Supabase (DEV-115)
- **Testado em:** N/A — one-time
- **Depende de:** [[BR-GRP-012]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Delete não bloqueia por membros — cascata.
- 🔍 Export lista (`POST /api/export/groups/list`) aceita só search / congregation_id / status (BR-REL-010 removida).

---

*Atualizado em 2026-09-15 (DEV-115).*
