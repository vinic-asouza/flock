---
type: regras-modulo
modulo: relatorios
ultima_atualizacao: 2026-08-31
versao: "1.7"
total_regras: 13
tags: [regras, modulo:relatorios]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/relatorios/overview]]"
  - "[[02_regras-de-negocio/regras-por-modulo/membros]]"
  - "[[02_regras-de-negocio/regras-por-modulo/grupos]]"
---

# Regras de Negócio — Relatórios e Painel

## Responsabilidade do Módulo
Oferecer indicadores demográficos/operacionais e exportações.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-REL-001 | Acesso reader+ | Restrição | Ativo |
| BR-REL-002 | Rate limit reports | Restrição | Ativo |
| BR-REL-003 | Summary demografia ativos | Derivação | Ativo |
| BR-REL-004 | Aniversariantes | Derivação | Ativo |
| BR-REL-005 | Filtros Joi | Restrição | Ativo |
| BR-REL-006 | Export scoped | Restrição | Ativo |
| BR-REL-007 | Export fields obrigatórios | Restrição | Ativo |
| BR-REL-008 | Export lista vazia | Restrição | Ativo |
| BR-REL-009 | Vision UI painel | Fato | Ativo |
| BR-REL-010 | Export grupos exige types | Restrição | Ativo |
| BR-REL-011 | Flock Print (padrão PDF) | Fato | Ativo |
| BR-REL-012 | Export membros da congregação | Restrição | Ativo |
| BR-REL-013 | Ficha de pré-cadastro em branco | Fato | Ativo |

---

## Regras por Categoria

### 🔐 Regras de Acesso Específicas do Módulo

### BR-REL-001: Acesso reader+
- **Declaração:** Relatórios, birthdays e exports exigem reader+.
- **Tipo:** Restrição
- **Gatilho:** GET reports/export
- **Comportamento esperado:** Dados
- **Comportamento em violação:** 403
- **Implementado em:** `routes/members.ts, export.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-REL-002: Rate limit reports
- **Declaração:** GET /members/reports ≤10 req/IP/min.
- **Tipo:** Restrição
- **Gatilho:** Reports
- **Comportamento esperado:** OK
- **Comportamento em violação:** 429
- **Implementado em:** `routes/members.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-042]]

### 🧮 Regras de Cálculo / Derivação

### BR-REL-003: Summary demografia ativos
- **Declaração:** Cards/demografia usam membros active=true (exceto totais inativos quando aplicável).
- **Tipo:** Derivação
- **Gatilho:** getMemberReports
- **Comportamento esperado:** Agregados
- **Comportamento em violação:** —
- **Implementado em:** `memberController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-REL-004: Aniversariantes
- **Declaração:** Birthdays: active=true, birth não nulo; mês 1–12; filtro opcional por `congregation_id` (UUID). Sentinel `sede` rejeitado.
- **Tipo:** Derivação
- **Gatilho:** birthdays endpoints
- **Comportamento esperado:** Lista/count
- **Comportamento em violação:** 400 mês / filtro inválido
- **Implementado em:** `memberController.ts` + `resolveCongregationFilter`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-REL-005: Filtros Joi
- **Declaração:** Filtros de relatório devem passar reportFiltersSchema.
- **Tipo:** Restrição
- **Gatilho:** Reports
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400 Filtros inválidos
- **Implementado em:** `reportValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔗 Regras de Relacionamento

### BR-REL-006: Export scoped
- **Declaração:** Exports sempre no church_id do contexto.
- **Tipo:** Restrição
- **Gatilho:** Export
- **Comportamento esperado:** Arquivo
- **Comportamento em violação:** 404
- **Implementado em:** `exportController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-010]]

### BR-REL-007: Export fields obrigatórios
- **Declaração:** PDF/CSV de lista exige `fields[]` não vazio. Em PDF de lista de membros/integração/grupo/congregação **e no CSV de lista de membros**, campos deprecated (`baptism_date`, `document`) são **ignorados**; se nenhum campo válido restar → **400**.
- **Tipo:** Restrição
- **Gatilho:** Export list
- **Comportamento esperado:** Arquivo com colunas válidas
- **Comportamento em violação:** 400
- **Implementado em:** `exportController.ts` + `utils/pdf/listFields.ts` (`resolveExportColumns`)
- **Testado em:** `utils/pdf/__tests__/listFields.test.ts`
- **Depende de:** —

### BR-REL-008: Export lista vazia
- **Declaração:** Sem membros no filtro → 404 Nenhum membro encontrado. Análogo em export de grupos: sem grupos após filtros → 404. Export de membros de um grupo sem integrantes → 404 com mensagem de grupo sem membros. Export de membros de uma congregação sem ativos → 404 com mensagem distinta da de congregação inexistente.
- **Tipo:** Restrição
- **Gatilho:** Export
- **Comportamento esperado:** —
- **Comportamento em violação:** 404
- **Implementado em:** `exportController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-REL-009: Vision UI painel
- **Declaração:** Home filtra `all` | `congregation` (por UUID) antes de exportar dashboard. Não há view mode `sede`. Se o usuário tiver apenas **uma** congregação selecionável (`listCongregations` com length ≤ 1), a UI **não** exibe o seletor de visualização — mostra texto `Visualizando dados de {nome}` e carrega o painel filtrado por essa congregação. Com congregação selecionada, a seção **Estrutura da Igreja** não é renderizada.
- **Tipo:** Fato
- **Gatilho:** Frontend /
- **Comportamento esperado:** PDF/UI coerente com a visão ativa
- **Comportamento em violação:** Bloqueio se view inválida / export sem congregação quando em modo `congregation`
- **Implementado em:** `frontend/src/app/page.tsx`, `ViewSelector.tsx`, `ChurchStructureCharts` (condicional)
- **Testado em:** N/A — smoke DEV-21
- **Depende de:** Escopo de congregação (DEV-15)

### BR-REL-010: Export grupos exige types
- **Declaração:** `POST /api/export/groups/list` exige `filters.types` como array com pelo menos um valor ∈ GroupType (whitelist). Tipos inválidos ou array vazio → 400. A UI abre modal de multi-seleção antes do download; a seleção afeta só o PDF (não a listagem). Demais filtros opcionais: `congregation_id`, `status`, `search`.
- **Tipo:** Restrição
- **Gatilho:** Export lista de grupos
- **Comportamento esperado:** PDF apenas com grupos dos tipos selecionados
- **Comportamento em violação:** 400 Filtros inválidos
- **Implementado em:** `groupValidator.ts` (`exportGroupsListFiltersSchema`) + `exportController.ts` + `ExportGroupsTypesModal.tsx`
- **Testado em:** N/A — validação schema manual (DEV-14); sem suite dedicada
- **Depende de:** [[BR-GRP-001]], [[BR-REL-006]], [[BR-REL-008]]

### BR-REL-011: Flock Print (padrão PDF)
- **Declaração:** Todos os PDFs do tenant gerados via kit `backend/src/utils/pdf/` compartilham cabeçalho (igreja + título + meta), rodapé com data/hora e numeração de páginas, tipografia/tokens comuns. Listas tabulares densas usam A4 **landscape**; fichas e dashboard usam **portrait**.
- **Tipo:** Fato
- **Gatilho:** Qualquer export PDF de `/api/export/*` (e PDF de calendário no módulo calendário)
- **Comportamento esperado:** Documentos visualmente consistentes entre tipos
- **Comportamento em violação:** Renderer fora do kit / layout ad hoc
- **Implementado em:** `backend/src/utils/pdf/*`
- **Testado em:** smoke DEV-25; unitários de colunas
- **Depende de:** [[BR-REL-006]]

### BR-REL-012: Export membros da congregação
- **Declaração:** `POST /api/export/congregation/members/list` gera o PDF do rol **ativo** de uma congregação (reader+, tenant + escopo DEV-15). Body `{ congregationId, fields[] }`. Só `active=true`; a busca/paginação do modal **não** entram no arquivo. O PDF usa o **nome completo** da unidade (BR-CON-014), kit Flock Print landscape. UI: botão no modal de visualização (não no card nem no hub). Hub `/congregations` continua exportando a **lista de congregações**. Sem ativos: botão desabilitado; API com lista vazia → 404 (BR-REL-008). Não reutilizar `POST /export/members/list` (título/filename/404 de recurso distintos).
- **Tipo:** Restrição
- **Gatilho:** Export no modal da congregação / POST dedicado
- **Comportamento esperado:** PDF contextual da unidade; 400 fields/UUID; 403 escopo; 404 congregação vs 404 sem ativos
- **Comportamento em violação:** 400 / 403 / 404; UI não dispara se `activeMembersCount === 0`
- **Implementado em:** `exportController.exportCongregationMembersList` + `congregationValidator.exportCongregationMembersListSchema` + `CongregationModal` / `ExportCongregationMembersModal`
- **Testado em:** `validators/__tests__/congregationValidator.test.ts`; smoke DEV-47
- **Depende de:** [[BR-REL-001]], [[BR-REL-006]], [[BR-REL-007]], [[BR-REL-008]], [[BR-REL-011]], [[BR-CON-008]], [[BR-CON-009]], [[BR-CON-014]]

### BR-REL-013: Ficha de pré-cadastro em branco
- **Declaração:** `GET /api/export/integration/registration-form/pdf` gera PDF A4 portrait (kit Flock Print) da igreja autenticada. Título visível fixo: **Ficha de pré-cadastro**. É template em branco (sem dados de integrante): pessoais + eclesiásticas (tipo de recebimento previsto, congregação prevista, questionário completo no papel). **Não** inclui Acompanhamento (mentor, status, observações) nem campos de membro (família, endereço, e-mail). UI no hub `/integration`, reader+, não gated por `canEdit`. Distinto de `GET /members/registration-form/pdf` e de `GET /integration/:id/pdf`. Path estático **antes** de `GET /integration/:id/pdf`.
- **Tipo:** Fato
- **Gatilho:** Botão **Ficha de pré-cadastro** no hub / GET dedicado
- **Comportamento esperado:** Download A4; filename `ficha-pre-cadastro-{slug}-{YYYY-MM-DD}.pdf`
- **Comportamento em violação:** 401 / 403 / 404 igreja; 500 se headers ainda não enviados
- **Implementado em:** `exportController.exportIntegrationRegistrationFormPDF` + `utils/pdf/renderBlankPreRegistration.ts` + `integration/page.tsx`
- **Testado em:** `utils/pdf/__tests__/renderBlankPreRegistration.test.ts`; QA DEV-92
- **Depende de:** [[BR-REL-001]], [[BR-REL-006]], [[BR-REL-011]], [[BR-INT-003]], [[BR-INT-008]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 API aceita muitos filtros Joi mas getMemberReports aplica principalmente `congregation_id` (UUID) na query.

---

*Atualizado em 2026-08-31 (DEV-92).*
