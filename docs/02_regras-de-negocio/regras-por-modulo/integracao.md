---
type: regras-modulo
modulo: integracao
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 15
tags: [regras, modulo:integracao]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/integracao/overview]]"
  - ""[[02_regras-de-negocio/regras-por-modulo/membros]]""
---

# Regras de Negócio — Integração de Novos Membros

## Responsabilidade do Módulo
Qualificar pré-membros até conversão ao rol ou descarte.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-INT-001 | Status inicial em_progresso | Fato | Ativo |
| BR-INT-002 | Nome único | Restrição | Ativo |
| BR-INT-003 | Campos validados | Restrição | Ativo |
| BR-INT-004 | Público sem mentor | Fato | Ativo |
| BR-INT-005 | Mentor deve ser membro | Restrição | Ativo |
| BR-INT-006 | Mentor alinhado à congregação | Restrição | Ativo |
| BR-INT-007 | Congregação prevista válida | Restrição | Ativo |
| BR-INT-008 | Escrita editor+ | Restrição | Ativo |
| BR-INT-009 | Convert só elegível | Restrição | Ativo |
| BR-INT-010 | Convert respeita limite | Restrição | Ativo |
| BR-INT-011 | Convert atômico | Gatilho | Ativo |
| BR-INT-012 | Convert valida Member | Restrição | Ativo |
| BR-INT-013 | DELETE permanente | Gatilho | Ativo |
| BR-INT-014 | Link público válido | Restrição | Ativo |
| BR-INT-015 | Race max_uses | Gatilho | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-INT-001: Status inicial em_progresso
- **Declaração:** Integrante criado autenticado defaulta status em_progresso.
- **Tipo:** Fato
- **Gatilho:** POST integration
- **Comportamento esperado:** Registro criado
- **Comportamento em violação:** —
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-002: Nome único
- **Declaração:** Nome completo único na igreja (case-insensitive).
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Nome já cadastrado
- **Implementado em:** `integrationValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-003: Campos validados
- **Declaração:** Nome obrigatório; nascimento não futuro; enums válidos; fones se informados.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `integrationMemberValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-004: Público sem mentor
- **Declaração:** Cadastro público cria em_progresso sem mentor/admission/notes.
- **Tipo:** Fato
- **Gatilho:** POST public integration
- **Comportamento esperado:** Integrante mínimo
- **Comportamento em violação:** —
- **Implementado em:** `publicIntegrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📝 Regras de Atualização / Edição

### BR-INT-005: Mentor deve ser membro
- **Declaração:** Mentor, se informado, deve ser membro da mesma igreja.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Mentor inválido
- **Implementado em:** `integrationValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-006: Mentor alinhado à congregação
- **Declaração:** Com congregação prevista, mentor dessa cong. ou Sede.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `integrationValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-007: Congregação prevista válida
- **Declaração:** expected_congregation_id pertence à mesma igreja.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `integrationValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-008: Escrita editor+
- **Declaração:** Mutações exigem editor+; leitura reader+.
- **Tipo:** Restrição
- **Gatilho:** Rotas
- **Comportamento esperado:** —
- **Comportamento em violação:** 403
- **Implementado em:** `routes/integration.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔄 Regras de Estado / Status

#### Tabela de transições (integrante)

| Estado Atual | Evento | Próximo | Condição | Quem |
| --- | --- | --- | --- | --- |
| em_progresso | convert | integrado | limite OK + validateMember | editor+ |
| em_progresso | PUT status | descartado/outro | validação | editor+ |
| integrado/descartado | convert | — | bloqueado | — |


### BR-INT-009: Convert só elegível
- **Declaração:** Só converter quando status ≠ integrado e ≠ descartado.
- **Tipo:** Restrição
- **Gatilho:** POST convert
- **Comportamento esperado:** Membro criado
- **Comportamento em violação:** 400
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-010: Convert respeita limite
- **Declaração:** Conversão exige vaga no limite de membros.
- **Tipo:** Restrição
- **Gatilho:** POST convert
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-001]]

### BR-INT-011: Convert atômico
- **Declaração:** Cria Member active=true e marca integrado; falha no status faz rollback.
- **Tipo:** Gatilho
- **Gatilho:** POST convert
- **Comportamento esperado:** 201
- **Comportamento em violação:** Rollback
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-012: Convert valida Member
- **Declaração:** Payload deve passar validateMember.
- **Tipo:** Restrição
- **Gatilho:** POST convert
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🗑️ Regras de Exclusão / Desativação

### BR-INT-013: DELETE permanente
- **Declaração:** DELETE remove integrante permanentemente.
- **Tipo:** Gatilho
- **Gatilho:** DELETE
- **Comportamento esperado:** Removido
- **Comportamento em violação:** 404
- **Implementado em:** `integrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔗 Regras de Relacionamento

### BR-INT-014: Link público válido
- **Declaração:** Token ativo, não expirado, usos restantes.
- **Tipo:** Restrição
- **Gatilho:** Public POST
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403/404
- **Implementado em:** `publicIntegrationAuth.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-INT-015: Race max_uses
- **Declaração:** Claim falho → apagar integrante (409).
- **Tipo:** Gatilho
- **Gatilho:** Concorrência
- **Comportamento esperado:** 409
- **Comportamento em violação:** Rollback
- **Implementado em:** `publicIntegrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 PUT pode setar status sem convert — confirmar com produto.

---

*Gerado em 2026-07-13.*
