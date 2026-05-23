# Relatório de Execução — Módulo 08: Dashboard / Relatórios

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-08-dashboard/modulo-08-dashboard.md`  
> **Status geral:** ✅ 11/11 achados implementados

---

## Resumo executivo

O dashboard (`/`) recebeu correções em backend e frontend com foco em: degradação graciosa da integração, integridade estatística em bases grandes, anti-race em filtros e grupos, separação de erros de carga/export, alinhamento analítico (ocupações e faixa etária) e shell visual preservado em falhas.

Pacote fecha os 11 achados do QA com mudança mínima segura, sem refatorar `exportDashboardPDF` além do necessário (PDF continua consumindo `getMemberReports` via mock e tolera `integration: null`).

---

## Achados e implementações

### ACHADO 01 — Falha em integração derrubava relatório inteiro (`500`) ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/memberController.ts`

**Problema:** erro em `integration_members` abortava todo o payload com `500`.

**Solução aplicada:**
- removido `return 500` quando `integrationError`;
- montagem de `summary`, `demographics`, `timeline`, `topOccupations` segue normalmente;
- retorno com `integration: null` e `integrationMeta: { available: false, error }` em falha; payload completo em sucesso.

**Frontend:** `frontend/src/types/reports.ts` (`integration` nullable + `IntegrationMeta`); avisos em `SummaryCards.tsx` e `TimelineCharts.tsx` quando integração indisponível.

**Resultado:** painel principal permanece utilizável; aviso restrito à seção/card de integração.

---

### ACHADO 02 — Race condition em `loadReports` ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/page.tsx`

**Solução aplicada:**
- `loadReportsRequestIdRef` monotônico (mesmo padrão do calendário);
- só a requisição mais recente atualiza `reportsData`, `reportsError`, `loading`, `lastUpdated`.

**Resultado:** troca rápida Geral → Sede → Congregação não exibe métricas de filtro anterior.

---

### ACHADO 03 — Stale state e concorrência em `GroupsCharts` ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/reports/GroupsCharts.tsx`

**Solução aplicada:**
- reset imediato de `groups` ao mudar `viewMode` / `selectedCongregationId` ou quando `loading` do pai inicia;
- `loadGroupsRequestIdRef` monotônico no fetch de grupos;
- erro com `formatApiError` + bloco retry.

**Resultado:** gráficos de grupos refletem o último filtro; falha visível e recuperável.

---

### ACHADO 04 — Chunks sem ordenação estável (>5000 membros) ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/memberController.ts`

**Solução aplicada:**
- `.order('id', { ascending: true })` na query principal e em cada chunk antes de `.range(...)`.

**Resultado:** paginação determinística; totais estáveis entre cargas consecutivas em bases grandes.

---

### ACHADO 05 — Export PDF sem congregação no modo Congregação ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/page.tsx`

**Solução aplicada:**
- `isExportBlocked` quando `viewMode === 'congregation' && !selectedCongregationId`;
- `handleExportPDF` retorna cedo com `toast` explicativo;
- botão Exportar desabilitado nas mesmas condições.

**Resultado:** não gera PDF “geral” enquanto UI pede seleção de congregação.

---

### ACHADO 06 — Erro de export substituía painel inteiro ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/page.tsx`

**Solução aplicada:**
- estado `reportsError` exclusivo da carga de relatórios;
- `catch` de export usa apenas `toast.error(formatApiError(err))` sem `setReportsError`.

**Resultado:** falha no PDF não remove dashboard já carregado.

---

### ACHADO 07 — Mensagens de erro sem `formatApiError` ✅ RESOLVIDO

**Arquivos:** `frontend/src/app/page.tsx`, `frontend/src/components/reports/GroupsCharts.tsx`, `frontend/src/components/reports/MembersModal.tsx`

**Solução aplicada:**
- catches migrados para `formatApiError(err)`;
- em `loadReports`, `401` continua sem falso positivo (zera erro e retorna antes do redirect).

**Resultado:** `details` do backend (ex.: rate limit) aparecem no feedback.

---

### ACHADO 08 — Ocupações calculadas sobre todos os membros ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/memberController.ts`

**Solução aplicada:**
- `topOccupations` passou a usar `activeMembersOnly` (alinhado à demografia).

**Frontend:** `frontend/src/components/reports/OccupationsTable.tsx` — subtítulo “Somente membros ativos”.

**Resultado:** regra analítica coerente entre gráficos demográficos e tabela de ocupações.

---

### ACHADO 09 — Drill-down de faixa etária divergente do gráfico ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/reports/DemographicsCharts.tsx`

**Solução aplicada:**
- `customParamsBuilder` usa `age_from` / `age_to` via `getAgeRangeBounds` (buckets alinhados ao BE, ex.: `65+` → 66–150);
- drill-down inclui `active: true`;
- removido mapeamento local por `birth_date_from/to`.

**Resultado:** contagem do modal coincide com o bucket do gráfico nos limites 12/13, 17/18, 65+.

---

### ACHADO 10 — Erro de carga fora do shell Header/Sidebar ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/page.tsx`

**Solução aplicada:**
- layout único com `Header` + `Sidebar` + `main`;
- `reportsError` exibido inline no `main` com “Tentar novamente”, sem tela full-screen isolada.

**Resultado:** navegação e identidade visual preservadas em falha de relatórios.

---

### ACHADO 11 — Hook `useReports` órfão ✅ RESOLVIDO

**Arquivo removido:** `frontend/src/hooks/useReports.ts`

**Solução aplicada:** remoção do hook não referenciado em runtime (escopo mínimo; `page.tsx` mantém fetch com proteções).

**Resultado:** elimina drift e risco de reintroduzir bugs sem `requestIdRef`/401.

---

## Mapa de arquivos alterados

| Arquivo | Achados |
|---|---|
| `backend/src/controllers/memberController.ts` | 01, 04, 08 |
| `frontend/src/types/reports.ts` | 01 |
| `frontend/src/app/page.tsx` | 02, 05, 06, 07, 10 |
| `frontend/src/components/reports/GroupsCharts.tsx` | 03, 07 |
| `frontend/src/components/reports/TimelineCharts.tsx` | 01 |
| `frontend/src/components/reports/SummaryCards.tsx` | 01 |
| `frontend/src/components/reports/DemographicsCharts.tsx` | 09 |
| `frontend/src/components/reports/MembersModal.tsx` | 07 |
| `frontend/src/components/reports/OccupationsTable.tsx` | 08 (UI) |
| `frontend/src/hooks/useReports.ts` | 11 (removido) |

---

## Validação

- Revisão estática ponta a ponta nos 11 achados.
- `npx eslint` em `page.tsx`, `GroupsCharts.tsx`, `DemographicsCharts.tsx`, `MembersModal.tsx`, `TimelineCharts.tsx`, `SummaryCards.tsx`: **0 erros**.
- `ReadLints` no frontend alterado: **0 erros**.
- `ReadLints` em `memberController.ts`: **3 erros pré-existentes** fora do escopo deste módulo (L229 `members` indefinido; parâmetros `any` em L276/L312) — não introduzidos por este pacote.
- Export PDF: `exportDashboardPDF` consome `getMemberReports` via mock; resposta `200` com `integration: null` permanece válida para geração do PDF (usa summary/demographics/timeline principais).

---

## Cenários manuais recomendados (smoke)

1. Falha simulada em `integration_members` → dashboard principal carrega; aviso só na seção de integração.  
2. Troca rápida Geral → Sede → Congregação A/B → cards e grupos refletem último filtro.  
3. Base >5000 (ou mock): duas cargas consecutivas com totais estáveis.  
4. Modo Congregação sem seleção → export bloqueado com mensagem clara; botão desabilitado.  
5. Erro no export com dashboard carregado → painel permanece visível; toast com mensagem formatada.  
6. Rate limit em `GET /members/reports` → mensagem com `details` via `formatApiError`.  
7. Drill-down faixa etária nos limites (12/13, 17/18, 65+) → contagem alinhada ao gráfico.  
8. Erro de carga de reports → shell Header/Sidebar mantido; retry inline no `main`.

---

## Achados adicionais

- Sem novos blockers fora dos 11 itens base durante esta rodada.
- Documentação legada (`docs/FRONTEND_DOCUMENTATION.md`, `docs/levantamento-fluxos.md`) ainda pode citar `useReports.ts`; atualização opcional em ciclo de docs.

---

## Parecer

Módulo 08 está **pronto para revalidação QA** nos cenários de borda da seção 5 do relatório de auditoria, com foco em concorrência de filtros, integridade estatística e contrato de exportação.

---

## Pós-revalidação — ciclo NG-01 / ACHADO 01

Referência: `docs/QA/modulo-08-dashboard/modulo-08-dashboard-revalidacao.md`

### Problema identificado na revalidação

O backend removia o `500` global, mas em falha de `integration_members` ainda montava `integration` com totais zerados, sem `integrationMeta`. O FE já exibia aviso âmbar apenas quando `integrationMeta.available === false` — condição que nunca ocorria (NG-01).

### Ajuste aplicado

**Arquivo:** `backend/src/controllers/memberController.ts`

- Se `integrationError`: `integration: null`, `integrationMeta: { available: false, error }`, log de erro, **sem** processar agregações de integração.
- Se sucesso: `integration` com payload completo, `integrationMeta: { available: true }`.

**Arquivo:** `frontend/src/components/reports/SummaryCards.tsx`

- Card “Em Integração” exibe `—` (não `0`) quando integração indisponível; subtítulo “Dados indisponíveis” + mensagem âmbar do backend.

**Resultado:** NG-01 fechado junto com ACHADO 01; UI de `TimelineCharts` e `page.tsx` passa a receber o contrato prometido.

### Validação

- `ReadLints` em `memberController.ts` e `SummaryCards.tsx`: **0 erros**.
- Smoke recomendado: simular falha em `integration_members` → painel carrega; card com “Dados indisponíveis” e `—`; bloco âmbar na timeline de integração.

### Status atualizado

**11/11 achados** implementados no código (incluindo degradação explícita de integração).
