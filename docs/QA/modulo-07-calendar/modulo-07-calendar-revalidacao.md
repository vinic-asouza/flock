# QA Revalidação — Módulo 07: Calendário e Eventos

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base de comparação:** `docs/QA/modulo-07-calendar/modulo-07-calendar.md` e `docs/QA/modulo-07-calendar/modulo-07-calendar-dev-report.md`  
> **Escopo da revalidação:** conferência dos 8 achados originais no código atualizado (frontend + backend), com análise de regressões e UX pós-correção.

---

## 1. Resumo executivo

Revalidação concluída com **melhora substancial do módulo**: 7 dos 8 achados originais foram efetivamente resolvidos no fluxo atual, com correções técnicas consistentes em roteamento, estabilidade assíncrona, regra temporal de eventos multi-dia e visibilidade de erro para usuário.

Ponto pendente relevante:
- **ACHADO 02** ficou **parcialmente resolvido**: houve correção de “falso sucesso” (agora retorna `501` explícito), mas a funcionalidade de exportação PDF do calendário continua indisponível, portanto o contrato final de “exportar PDF” ainda não está entregue.

Também foi identificado um **novo risco de concorrência** no carregamento de detalhes do modal (não fazia parte do pacote original): cliques rápidos em itens diferentes podem permitir resposta antiga sobrescrever detalhes mais recentes.

### Placar da revalidação

- **Resolvido:** 7 (ACHADOS 01, 03, 04, 05, 06, 07, 08)  
- **Parcialmente resolvido:** 1 (ACHADO 02)  
- **Não resolvido:** 0  
- **Não se sustenta mais:** 0

---

## 2. Status de cada achado original

### ACHADO 01 — Conflito de rota `/:id` x `/export/pdf`
**Status:** ✅ **Resolvido**

**Validação:**
- Em `backend/src/routes/calendar.ts`, a rota `/export/pdf` está declarada antes de `/:id`.
- Isso elimina a captura indevida de `export` como parâmetro dinâmico.

**Evidência:** `backend/src/routes/calendar.ts`

---

### ACHADO 02 — Divergência de contrato de exportação (FE Blob x BE JSON)
**Status:** ⚠️ **Parcialmente resolvido**

**Validação:**
- O backend deixou de responder “sucesso JSON” e agora retorna erro explícito `501` em `exportCalendarPDF`, removendo o falso positivo de exportação.
- O frontend mantém `responseType: 'blob'` para o endpoint e o interceptor em `frontend/src/services/api.ts` já converte erro JSON em blob para mensagem legível.

**Por que é parcial:**
- A inconsistência funcional foi mitigada (erro explícito), mas a entrega de exportação PDF real ainda não existe.
- O contrato final de produto (“exportar calendário em PDF”) permanece aberto.

**Evidências:** `backend/src/controllers/calendarController.ts`, `frontend/src/services/api.ts`

---

### ACHADO 03 — Eventos multi-dia somem fora da lógica de interseção
**Status:** ✅ **Resolvido**

**Validação:**
- Em `listCalendarItems`, itens não recorrentes agora entram quando há interseção do intervalo (`itemStart <= expansionEndDate && itemEnd >= expansionStartDate`).
- Corrige o cenário clássico de item iniciado no mês anterior e vigente no mês filtrado.

**Evidência:** `backend/src/controllers/calendarController.ts`

---

### ACHADO 04 — Race condition no `loadItems`
**Status:** ✅ **Resolvido**

**Validação:**
- `frontend/src/app/(main)/calendar/page.tsx` passou a usar `loadItemsRequestIdRef` monotônico.
- Atualização de `items`, `error` e `loading` só ocorre para a requisição mais recente.

**Evidência:** `frontend/src/app/(main)/calendar/page.tsx`

---

### ACHADO 05 — Erro silencioso ao carregar grupos no filtro
**Status:** ✅ **Resolvido**

**Validação:**
- `CalendarFiltersHorizontal` agora usa `groupsError`, `formatApiError`, toast e bloco visual com retry.
- Falha deixou de parecer “lista vazia legítima”.

**Evidência:** `frontend/src/components/calendar/CalendarFiltersHorizontal.tsx`

---

### ACHADO 06 — Falha em aniversariantes virando `0` silencioso
**Status:** ✅ **Resolvido**

**Validação:**
- Página passou a manter `birthdayCountError`.
- `CalendarMonth` mostra estado de erro no card (`-`, aviso e ação “Tentar”), separando erro de ausência real de aniversariantes.

**Evidências:** `frontend/src/app/(main)/calendar/page.tsx`, `frontend/src/components/calendar/CalendarMonth.tsx`

---

### ACHADO 07 — Mensagens genéricas em participantes sem `details`
**Status:** ✅ **Resolvido**

**Validação:**
- `CalendarParticipantsManager` migrou os catches críticos para `formatApiError`.
- Mensagens de backend (incluindo detalhes) passam a ser propagadas ao usuário.

**Evidência:** `frontend/src/components/calendar/CalendarParticipantsManager.tsx`

---

### ACHADO 08 — Loading de detalhe pouco perceptível no modal
**Status:** ✅ **Resolvido**

**Validação:**
- Modal de visualização abre imediatamente no clique.
- Estado `loadingItemDetails` exibe spinner enquanto `getCalendarItem` conclui.
- Em erro, modal fecha com feedback via toast.

**Evidência:** `frontend/src/app/(main)/calendar/page.tsx`

---

## 3. Regressões / efeitos colaterais identificados

### NOVO TICKET — RC-01 (médio)
**Título:** Possível corrida em `handleViewItem` ao abrir detalhes de eventos em sequência rápida  
**Gravidade:** média  
**Tipo:** estado assíncrono / consistência de UI

**Descrição:**
- Após a melhoria de UX do ACHADO 08, o modal abre imediatamente e busca detalhes em seguida.
- Não há controle de concorrência por `requestId`/cancelamento no fluxo de detalhes (`handleViewItem`).
- Em cliques rápidos em itens diferentes, resposta antiga pode sobrescrever `selectedItem` mais recente.

**Impacto no usuário:**
- Modal pode exibir detalhe de item diferente do último clique, gerando confusão e risco operacional.

**Evidência:** `frontend/src/app/(main)/calendar/page.tsx`

**Recomendação:**
- Aplicar proteção similar ao `loadItems` (request id monotônico) ou cancelamento da requisição anterior no carregamento de detalhes.

---

## 4. Avaliação de UX após correção

Evolução de UX é positiva e perceptível:
- filtros e aniversariantes deixaram de falhar de forma silenciosa;
- abertura do modal de detalhes ficou mais responsiva;
- mensagens de erro ganharam contexto útil para ação do usuário;
- navegação rápida de calendário/lista ficou mais estável por controle anti-race.

Ponto ainda frágil na experiência:
- exportação PDF do calendário não está funcional (apenas indisponibilidade explícita), o que pode frustrar expectativa quando essa ação for exposta no frontend.

---

## 5. Itens encerrados

Podem ser encerrados:
- ACHADO 01
- ACHADO 03
- ACHADO 04
- ACHADO 05
- ACHADO 06
- ACHADO 07
- ACHADO 08

---

## 6. Itens reabertos

### Reabrir achado original
- **ACHADO 02** como **parcialmente resolvido**, com pendência de implementação efetiva de exportação PDF (ou redefinição oficial do requisito/contrato no produto).

### Novo ticket
- **RC-01 (novo, médio):** corrida assíncrona no carregamento de detalhes do modal em cliques sequenciais rápidos.

---

## Parecer final

O módulo pode avançar para fechamento **condicional**: a maior parte dos riscos originais foi resolvida com boa qualidade técnica, porém ainda há pendência funcional na exportação de PDF (ACHADO 02 parcial) e um novo risco de consistência de detalhe (RC-01) que deve entrar no próximo ciclo de ajuste/revalidação rápida.
