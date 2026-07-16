---
type: regras-modulo
modulo: congregacoes
ultima_atualizacao: 2026-07-16
versao: "1.2"
total_regras: 14
tags: [regras, modulo:congregacoes]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/congregacoes]]"
---

# Regras de Negócio — Congregações

## Responsabilidade do Módulo
Organizar unidades locais da igreja. Toda igreja possui exatamente uma congregação principal (`is_primary`).

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-CON-001 | Campos obrigatórios e opcionais | Restrição | Ativo |
| BR-CON-002 | Nome único na igreja | Restrição | Ativo |
| BR-CON-003 | Batch unicidade | Restrição | Ativo |
| BR-CON-004 | Normalização UF/telefone/abreviação | Derivação | Ativo |
| BR-CON-005 | Update não esvazia obrigatórios | Restrição | Ativo |
| BR-CON-006 | Escrita editor+ | Restrição | Ativo |
| BR-CON-007 | Delete com membros ativos | Restrição | Ativo |
| BR-CON-008 | Isolamento tenant | Restrição | Ativo |
| BR-CON-009 | Contagem de ativos | Derivação | Ativo |
| BR-CON-010 | Congregação principal no onboarding | Gatilho | Ativo |
| BR-CON-011 | Proteção da congregação principal | Restrição | Ativo |
| BR-CON-012 | Única principal por igreja | Restrição | Ativo |
| BR-CON-013 | Abreviação opcional e única | Restrição | Ativo |
| BR-CON-014 | Exibição preferencial da abreviação | Derivação | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-CON-001: Campos obrigatórios e opcionais
- **Declaração:** Nome completo (2–100), endereço e cidade obrigatórios; UF 2 chars; telefone 10–11 se houver; abreviação opcional (máx. 20) quando preenchida.
- **Tipo:** Restrição
- **Gatilho:** POST
- **Comportamento esperado:** Criada
- **Comportamento em violação:** 400
- **Implementado em:** `congregationValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-CON-013]]

### BR-CON-002: Nome único na igreja
- **Declaração:** Nome completo único por igreja (case-insensitive).
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Congregação já existe
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CON-003: Batch unicidade
- **Declaração:** Batch exige array; rejeita nomes duplicados no lote e existentes; rejeita abreviações duplicadas no lote e existentes quando preenchidas; creates manuais com `is_primary: false`.
- **Tipo:** Restrição
- **Gatilho:** POST batch
- **Comportamento esperado:** Lote
- **Comportamento em violação:** 400
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-CON-002]], [[BR-CON-013]]

### BR-CON-004: Normalização UF/telefone/abreviação
- **Declaração:** Estado uppercase; telefone só dígitos; abreviação com trim e string vazia persistida como `NULL`.
- **Tipo:** Derivação
- **Gatilho:** Create/update
- **Comportamento esperado:** Normalizado
- **Comportamento em violação:** —
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📝 Regras de Atualização / Edição

### BR-CON-005: Update não esvazia obrigatórios
- **Declaração:** Não esvaziar name/address/city/state. Abreviação pode ser limpa (`''`/`null`) por ser opcional.
- **Tipo:** Restrição
- **Gatilho:** PUT
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CON-006: Escrita editor+
- **Declaração:** Mutações editor+; leitura reader+.
- **Tipo:** Restrição
- **Gatilho:** Rotas
- **Comportamento esperado:** —
- **Comportamento em violação:** 403
- **Implementado em:** `routes/congregations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🗑️ Regras de Exclusão / Desativação

### BR-CON-007: Delete com membros ativos
- **Declaração:** Não excluir se houver membros active=true.
- **Tipo:** Restrição
- **Gatilho:** DELETE
- **Comportamento esperado:** Removida
- **Comportamento em violação:** 400
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔗 Regras de Relacionamento

### BR-CON-008: Isolamento tenant
- **Declaração:** CRUD só na church_id do contexto.
- **Tipo:** Restrição
- **Gatilho:** Todas
- **Comportamento esperado:** OK
- **Comportamento em violação:** 404
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-010]]

### BR-CON-009: Contagem de ativos
- **Declaração:** activeMembersCount considera active=true.
- **Tipo:** Derivação
- **Gatilho:** GET list
- **Comportamento esperado:** Contagem
- **Comportamento em violação:** —
- **Implementado em:** `congregationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CON-010: Congregação principal no onboarding
- **Declaração:** Ao registrar a igreja, o sistema cria automaticamente uma congregação com `is_primary=true`, nome e endereço iguais aos da igreja, **sem abreviação** (NULL). O usuário pode preenchê-la depois no módulo Congregações.
- **Tipo:** Gatilho
- **Gatilho:** POST register (sucesso na criação da church)
- **Comportamento esperado:** Uma primary por tenant novo
- **Comportamento em violação:** Rollback da church/user se a primary falhar
- **Implementado em:** `authController.ts` + `primaryCongregation.ts`
- **Depende de:** [[BR-CON-013]]

### BR-CON-011: Proteção da congregação principal
- **Declaração:** Não excluir congregação com `is_primary=true` nem a última congregação da igreja.
- **Tipo:** Restrição
- **Gatilho:** DELETE
- **Comportamento esperado:** 400 com mensagem clara
- **Comportamento em violação:** —
- **Implementado em:** `congregationController.ts` (+ UI)
- **Depende de:** [[BR-CON-007]]

### BR-CON-012: Única principal por igreja
- **Declaração:** No máximo uma congregação com `is_primary=true` por `church_id` (unique parcial no banco).
- **Tipo:** Restrição
- **Gatilho:** Insert/update de primary
- **Comportamento esperado:** Constraint impede segunda primary
- **Implementado em:** migration `congregations_is_primary_and_backfill`
- **Depende de:** —

### BR-CON-013: Abreviação opcional e única
- **Declaração:** Campo `abbreviation` é opcional. Quando preenchido: máx. 20 caracteres; único por igreja (case-insensitive); enforced no app e por índice unique parcial `(church_id, lower(abbreviation)) WHERE abbreviation IS NOT NULL`.
- **Tipo:** Restrição
- **Gatilho:** Create/update/batch
- **Comportamento esperado:** Persistido (ou NULL se vazio)
- **Comportamento em violação:** 400 Abreviação já existe / Dados inválidos
- **Implementado em:** `congregationValidator.ts`, `congregationController.ts`, migration `congregations_add_abbreviation`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CON-014: Exibição preferencial da abreviação
- **Declaração:** Em contextos compactos da UI (selects, chips, filtros, flags em cards, listagens de outros módulos), exibir a abreviação quando existir; senão o nome completo. No módulo Congregações (card/modal), exibir abreviação em destaque e nome completo como detalhe. Formulário de edição mostra ambos os campos. Documentos PDF/export usam o nome completo oficial.
- **Tipo:** Derivação
- **Gatilho:** Renderização de UI / export
- **Comportamento esperado:** Display consistente via `getCongregationDisplayName` no frontend
- **Comportamento em violação:** —
- **Implementado em:** `frontend/src/utils/congregation.ts` + consumers; `exportController` (PDF com `name`)
- **Depende de:** [[BR-CON-013]]

---

*Atualizado em 2026-07-16 (DEV-20).*
