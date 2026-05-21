# QA Revalidação — Módulo 07: Calendário e Eventos (Ciclo 2)

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-07-calendar/modulo-07-calendar.md`, `docs/QA/modulo-07-calendar/modulo-07-calendar-revalidacao.md`, `docs/QA/modulo-07-calendar/modulo-07-calendar-dev-report.md`  
> **Escopo deste ciclo:** validação final dos itens pendentes da revalidação anterior (`ACHADO 02` e `RC-01`) no código atualizado.

---

## 1. Resumo executivo

Ciclo final concluído com fechamento dos pendentes:
- `ACHADO 02` foi concluído com geração real de PDF no backend (`Content-Type: application/pdf`), alinhando contrato FE/BE de exportação;
- `RC-01` foi corrigido com controle monotônico de requisição no carregamento de detalhes do modal (`viewItemRequestIdRef`).

Com isso, o módulo passa a ter **todos os achados originais resolvidos** e o ticket de regressão também encerrado.

**Placar final:**
- Resolvido: 8/8 achados originais
- Parcialmente resolvido: 0
- Não resolvido: 0
- Não se sustenta mais: 0
- Regressões abertas: 0

---

## 2. Status de cada achado original

### ACHADO 01 — Conflito de rota `/:id` x `/export/pdf`
**Status:** ✅ resolvido  
**Evidência:** `backend/src/routes/calendar.ts` mantém `/export/pdf` antes de `/:id`.

### ACHADO 02 — Divergência FE/BE na exportação PDF
**Status:** ✅ resolvido  
**Evidências:**
- `backend/src/controllers/calendarController.ts` exporta PDF real via `pdfkit`;
- resposta com `Content-Type: application/pdf` e `Content-Disposition` de download;
- regra de expansão de recorrentes e interseção para não recorrentes aplicada no export;
- `frontend/src/services/api.ts` já consumia como `blob`, mantendo contrato coerente.

### ACHADO 03 — Itens multi-dia fora da janela
**Status:** ✅ resolvido  
**Evidência:** lógica de interseção (`itemStart <= endDate && itemEnd >= startDate`) permanece aplicada.

### ACHADO 04 — Race condition no `loadItems`
**Status:** ✅ resolvido  
**Evidência:** `loadItemsRequestIdRef` ativo em `frontend/src/app/(main)/calendar/page.tsx`.

### ACHADO 05 — Erro silencioso no filtro de grupos
**Status:** ✅ resolvido  
**Evidência:** estado de erro + retry no `CalendarFiltersHorizontal`.

### ACHADO 06 — Contagem de aniversariantes com fallback silencioso para `0`
**Status:** ✅ resolvido  
**Evidência:** `birthdayCountError` e ação de retry permanecem implementados.

### ACHADO 07 — Erros de participantes sem detalhamento
**Status:** ✅ resolvido  
**Evidência:** uso de `formatApiError` no manager de participantes.

### ACHADO 08 — Loading de detalhe pouco perceptível
**Status:** ✅ resolvido  
**Evidência:** modal abre imediatamente e exibe spinner interno durante carregamento.

---

## 3. Regressões / efeitos colaterais

### RC-01 — Corrida assíncrona no detalhe do modal
**Status:** ✅ resolvido

**Evidência técnica:**
- `frontend/src/app/(main)/calendar/page.tsx` agora usa `viewItemRequestIdRef` em `handleViewItem`;
- apenas a requisição mais recente atualiza `selectedItem` e finaliza `loadingItemDetails`.

**Conclusão:** não há regressões abertas neste ciclo.

---

## 4. Avaliação de UX após correção

UX pós-correção permanece consistente e melhor que o baseline:
- feedback de erro mais claro (filtros, aniversariantes, participantes);
- experiência de abertura de detalhes responsiva e agora protegida contra resposta fora de ordem;
- exportação PDF deixa de ser indisponível e passa a ter resultado efetivo de download.

Sem novos impactos negativos visíveis nos fluxos dependentes validados nesta rodada.

---

## 5. Itens encerrados

Encerrados neste ciclo:
- `ACHADO 02` (fechado de parcial para resolvido)
- `RC-01` (novo ticket da revalidação anterior, agora resolvido)

Mantidos encerrados:
- `ACHADO 01`, `ACHADO 03`, `ACHADO 04`, `ACHADO 05`, `ACHADO 06`, `ACHADO 07`, `ACHADO 08`

---

## 6. Itens reabertos

Nenhum item reaberto neste ciclo.

---

## Parecer final

Módulo 07 aprovado para fechamento de QA.  
Todos os achados originais e o ticket de regressão da rodada anterior foram resolvidos no código atualizado.
