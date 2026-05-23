# QA Revalidação — Módulo 08: Relatórios e Dashboard Analytics

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-08-dashboard/modulo-08-dashboard.md`, `docs/QA/modulo-08-dashboard/modulo-08-dashboard-dev-report.md`  
> **Método:** revisão estática ponta a ponta (FE/BE/contratos/UX); sem execução manual em ambiente com Supabase simulado

---

## 1. Resumo executivo

O pacote do DEV **resolve de forma verificável 10 dos 11 achados** originais (02–11). As correções de concorrência, exportação, mensagens de erro, ordenação em chunks, alinhamento analítico (ocupações/faixa etária) e shell em erro estão presentes no código e coerentes com o relatório de execução.

O **ACHADO 01 permanece apenas parcialmente resolvido**: o `500` que derrubava todo o painel foi eliminado, mas o backend **não implementa** o contrato prometido (`integration: null` + `integrationMeta`). Em falha na query de `integration_members`, o painel carrega com **integração zerada**, sem aviso na UI — pior que a recomendação original de degradação explícita.

**Placar desta revalidação:**

| Classificação | Qtd | IDs |
|---|---:|---|
| Resolvido | 10 | 02, 03, 04, 05, 06, 07, 08, 09, 10, 11 |
| Parcialmente resolvido | 1 | 01 |
| Não resolvido | 0 | — |
| Não se sustenta mais | 0 | — |
| Novo ticket (regressão/colateral) | 1 | NG-01 |

**Parecer:** módulo **não aprovado para fechamento de QA** até concluir o ACHADO 01 (backend + validação do aviso no FE). Demais itens podem ser encerrados.

---

## 2. Status de cada achado original

### ACHADO 01 — Falha em integração derrubava o dashboard inteiro (`500`)
**Status:** ⚠️ parcialmente resolvido

**O que melhorou (evidência):**
- Em `backend/src/controllers/memberController.ts`, o bloco que retornava `500` quando `integrationError` **foi removido**; o fluxo segue até `res.json` com dados de membros.
- O painel principal deixa de ficar indisponível por falha secundária de integração.

**O que não foi entregue (divergência com dev-report):**
- `integrationError` é capturado (L1540–1543) mas **nunca consultado**.
- A resposta **sempre** inclui `integration` como objeto com totais/timeline, mesmo em erro — montado a partir de `(integrationData || [])` (L1590–1705), resultando em **zeros**, não em `null`.
- **`integrationMeta` não existe** no `res.json` (L1667–1710), apesar de estar em `frontend/src/types/reports.ts` e ser consumido em `page.tsx` (L293–296, L306–309).

```1667:1710:backend/src/controllers/memberController.ts
    res.json({
      // ...
      integration: {
        totals: { ...integrationTotals, total: integrationMembers.length },
        timeline: { ... }
      },
      topOccupations,
      // sem integrationMeta
    });
```

**Impacto UX atual:** `SummaryCards` e `TimelineCharts` só exibem aviso âmbar quando `integrationMeta?.available === false` — condição que **nunca ocorre** hoje. O card “Em Integração” mostra `0` e a timeline de integração renderiza gráficos vazios, **sem** mensagem de indisponibilidade.

**Classificação:** parcial — disponibilidade do painel OK; contrato de degradação explícita **não**.

---

### ACHADO 02 — Race condition em `loadReports`
**Status:** ✅ resolvido

**Evidência:** `frontend/src/app/page.tsx` — `loadReportsRequestIdRef` (L35); incremento por requisição (L41); guards antes de `setReportsData` / `setReportsError` / `setLoading` (L55–57, L61–63, L74–76).

---

### ACHADO 03 — `GroupsCharts` com grupos stale / sem concorrência
**Status:** ✅ resolvido

**Evidência:** `frontend/src/components/reports/GroupsCharts.tsx`
- `loadGroupsRequestIdRef` com ignore de respostas antigas (L36–68);
- `setGroups([])` ao mudar filtro ou quando `loading` do pai inicia (L72–77);
- erro com `formatApiError` + `setGroups([])` no catch (L61–64).

---

### ACHADO 04 — Chunks sem ordenação estável (>5000 membros)
**Status:** ✅ resolvido

**Evidência:** `backend/src/controllers/memberController.ts` — `.order('id', { ascending: true })` na query principal (L1195) e em cada chunk (L1263) antes de `.range(...)`.

---

### ACHADO 05 — Export PDF em modo Congregação sem seleção
**Status:** ✅ resolvido

**Evidência:** `frontend/src/app/page.tsx`
- `isExportBlocked` quando `viewMode === 'congregation' && !selectedCongregationId` (L37–38);
- `handleExportPDF` retorna cedo com toast (L113–115);
- botão desabilitado com `title` explicativo (L232–236).

---

### ACHADO 06 — Erro de export substituía o painel inteiro
**Status:** ✅ resolvido

**Evidência:** estado `reportsError` exclusivo da carga (L28, L44, L72); export usa apenas `toast.error(formatApiError(err))` sem `setReportsError` (L147–148). Layout com shell permanece em erro de carga (ver ACHADO 10).

---

### ACHADO 07 — Mensagens sem `formatApiError`
**Status:** ✅ resolvido

**Evidência:**
- `page.tsx`: `formatApiError` em `loadReports` e export (L70, L148); `401` zera erro antes do redirect (L65–67).
- `GroupsCharts.tsx`: catch com `formatApiError` (L61).
- `MembersModal.tsx`: import e uso em fetch/export (L7, L115, L161).

---

### ACHADO 08 — Ocupações incluíam inativos; demografia só ativos
**Status:** ✅ resolvido

**Evidência:**
- BE: `occupationStats` sobre `activeMembersOnly` (L1481–1485 em `memberController.ts`).
- FE: subtítulo “Somente membros ativos” em `OccupationsTable.tsx` (L187).

---

### ACHADO 09 — Drill-down de faixa etária divergente do gráfico
**Status:** ✅ resolvido

**Evidência:** `frontend/src/components/reports/DemographicsCharts.tsx`
- `customParamsBuilder` com `age_from` / `age_to` via `getAgeRangeBounds` (L180–187, L251–262);
- `65+` → `{ age_from: 66, age_to: 150 }`, alinhado ao bucket `actualAge > 65` no BE;
- `active: true` no drill-down.

**BE:** `listMembers` aplica filtro de idade em memória com `age_from`/`age_to` (L213–263 em `memberController.ts`), coerente com os limites do gráfico.

**Observação residual (não reabre o achado):** `listMembers` usa `calcAge` inline; `getMemberReports` usa `calculateAge` de `ageCalculator.ts` — implementações equivalentes, mas duplicadas (risco futuro de drift).

---

### ACHADO 10 — Tela de erro sem shell Header/Sidebar
**Status:** ✅ resolvido

**Evidência:** `page.tsx` — `showShell` com `Header` + `Sidebar` (L154–164); `reportsError` inline no `main` com “Tentar novamente” (L181–190), sem branch full-screen isolado.

---

### ACHADO 11 — Hook `useReports` órfão
**Status:** ✅ resolvido

**Evidência:** `frontend/src/hooks/useReports.ts` **removido** (glob confirma ausência); `page.tsx` mantém fetch próprio com proteções. Referências restantes apenas em documentação (`docs/FRONTEND_DOCUMENTATION.md`, `docs/levantamento-fluxos.md`) — dívida de docs, não de runtime.

---

## 3. Regressões / efeitos colaterais

### NG-01 — Erro de integração mascarado como “zero integrações” (novo ticket)
**Origem:** correção incompleta do ACHADO 01.  
**Severidade sugerida:** média (bug silencioso / confiança analítica)

**Comportamento:** falha em `integration_members` → HTTP 200 com `integration.totals.inProgress === 0` e timeline vazia; usuário pode interpretar como “não há integrações” em vez de “dados indisponíveis”.  
**Arquivos:** `memberController.ts` (tratamento de `integrationError`); `SummaryCards.tsx`, `TimelineCharts.tsx`, `page.tsx` (UI já pronta, aguardando `integrationMeta`).

**Não classificado como regressão do DEV (pré-existente no escopo do módulo 8):**
- `MembersModal` ainda sem `requestIdRef` — troca rápida de aba/página pode exibir lista desatualizada (padrão já corrigido em `page.tsx` / `GroupsCharts`, mas não no modal).

---

## 4. Avaliação de UX após correção

| Área | Avaliação |
|---|---|
| Troca rápida de filtro (Geral/Sede/Congregação) | Melhor — métricas e grupos seguem o último contexto. |
| Exportação PDF | Melhor — bloqueio claro sem congregação; falha de export não derruba o painel. |
| Erros de API | Melhor — `formatApiError` e retry em grupos; erro de carga com shell preservado. |
| Coerência analítica | Melhor — ocupações e faixa etária alinhadas a ativos / buckets. |
| Integração indisponível | **Insuficiente** — sem aviso visível; zeros enganam. |
| Modo Congregação sem seleção | Melhor — estado de espera + export bloqueado. |

**Conclusão UX:** experiência geral do dashboard **subiu**, mas o fluxo de integração em degradação **não atende** o critério de transparência definido na auditoria original.

---

## 5. Itens encerrados

Podem ser encerrados neste ciclo (validação estática OK):

- **ACHADO 02** — anti-race em `loadReports`
- **ACHADO 03** — `GroupsCharts` stale + concorrência
- **ACHADO 04** — ordenação estável em chunks
- **ACHADO 05** — bloqueio de export sem congregação
- **ACHADO 06** — erro de export isolado do painel
- **ACHADO 07** — `formatApiError` nos fluxos do dashboard
- **ACHADO 08** — ocupações só ativos (+ rótulo UI)
- **ACHADO 09** — drill-down `age_from`/`age_to`
- **ACHADO 10** — shell em erro de carga
- **ACHADO 11** — remoção do hook órfão

---

## 6. Itens reabertos

| ID | Motivo | Ação esperada do DEV |
|---|---|---|
| **ACHADO 01** (parcial) | FE preparado; BE não envia `integrationMeta` nem `integration: null` em falha | Se `integrationError`: retornar `integration: null`, `integrationMeta: { available: false, error: integrationError.message }`; em sucesso, `integrationMeta: { available: true }` ou omitir. Validar card + timeline âmbar. |
| **NG-01** (novo) | Efeito colateral da correção parcial | Mesmo pacote do ACHADO 01; smoke: simular falha em `integration_members` → aviso visível, não “0 integrações”. |

**Smoke manual recomendado antes do próximo fechamento:**

1. Simular `integrationError` → painel carrega; card “Em Integração” com “Dados indisponíveis”; bloco âmbar na timeline.  
2. Troca rápida Geral → Sede → Congregação A/B.  
3. Modo Congregação sem seleção → export bloqueado.  
4. Erro no export com dashboard carregado → painel permanece.  
5. Drill-down faixas 12/13, 17/18, 65+ vs contagem do gráfico.  
6. (Opcional) Base >5000: duas cargas com totais estáveis.

---

## Parecer final

| Decisão | Itens |
|---|---|
| **Pode encerrar** | ACHADOS 02–11 (10 itens) |
| **Deve reabrir** | ACHADO 01 (completar contrato BE + validar UI) |
| **Novo ticket** | NG-01 (integração silenciosa com zeros) — pode ser tratado no mesmo PR do 01 |

O DEV report declara **11/11 resolvidos**; a revalidação confirma **10/11** no código. **Não recomendar release do módulo 8** até o ACHADO 01 estar fechado com evidência de smoke no cenário de falha de integração.

Após correção do 01/NG-01, ciclo de revalidação pode ser reduzido a smoke dos itens 1 e 2 da lista acima.

---

## 7. Revalidação ciclo 2 — ACHADO 01 / NG-01

> **Referência DEV:** `modulo-08-dashboard-dev-report.md` (seção “Pós-revalidação — ciclo NG-01 / ACHADO 01”)  
> **Data:** Maio/2026

### Resumo

Correção do pacote pós-revalidação **confirmada no código**. ACHADO 01 e NG-01 passam de **parcial/reaberto** para **resolvido**.

| Classificação | Ciclo 1 | Ciclo 2 |
|---|---|---|
| Resolvido | 10/11 | **11/11** |
| Parcialmente resolvido | 1 (01) | 0 |
| Reabertos | 01, NG-01 | 0 |

### ACHADO 01 — Degradação graciosa de integração
**Status:** ✅ resolvido

**Backend** (`memberController.ts`):
- `integrationPayload` inicia como `null` (L1570);
- se `integrationError`: `logError`, `integrationMeta: { available: false, error }`, **sem** entrar no `else` de agregação (L1594–1599 vs L1600–1700);
- se sucesso: `integrationMeta: { available: true }`, montagem de `integrationPayload` e `res.json` com `integration` + `integrationMeta` (L1729–1730).

```1594:1600:backend/src/controllers/memberController.ts
    if (integrationError) {
      logError('Erro ao buscar integrantes de integração:', integrationError);
      integrationMeta = {
        available: false,
        error: integrationError.message
      };
    } else {
      integrationMeta = { available: true };
```

**Frontend:**
- `page.tsx` — `integrationUnavailable={reportsData.integrationMeta?.available === false}` passa a ser acionável;
- `TimelineCharts.tsx` — bloco âmbar quando indisponível (já existia; agora recebe o contrato);
- `SummaryCards.tsx` — card “Em Integração” com `—`, subtítulo “Dados indisponíveis” e mensagem âmbar (L177–180).

### NG-01 — Integração zerada mascarando erro
**Status:** ✅ resolvido (mesmo pacote do ACHADO 01)

### Itens encerrados neste ciclo

- **ACHADO 01** (fechado de parcial → resolvido)
- **NG-01**

### Itens reabertos

Nenhum.

### Smoke pendente (recomendado antes de release)

Simular falha em `integration_members` em ambiente de teste — validação estática OK; confirmação runtime fica com QA manual ou automação.

---

## Parecer final (atualizado — ciclo 2)

**Módulo 08 aprovado para fechamento de QA** na revisão estática dos 11 achados originais + NG-01.

| Decisão | Itens |
|---|---|
| **Encerrados** | ACHADOS 01–11, NG-01 |
| **Reabertos** | — |
| **Novos tickets** | — |

Observação residual (fora do escopo dos 11 achados): `MembersModal` ainda sem `requestIdRef` — risco baixo de lista desatualizada em troca rápida de aba; não bloqueia fechamento do módulo 8.
