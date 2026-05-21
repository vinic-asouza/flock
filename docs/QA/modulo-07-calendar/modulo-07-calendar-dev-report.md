# Relatório de Execução — Módulo 07: Calendário

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-07-calendar/modulo-07-calendar.md`  
> **Status geral:** ✅ 8/8 achados implementados

---

## Resumo executivo

Módulo calendário recebeu correções em backend e frontend com foco em: consistência de contrato de exportação, regra temporal de eventos multi-dia, estabilidade de estado assíncrono e visibilidade de erro no fluxo de filtros/aniversários/participantes.

Pacote fecha 8 achados do QA com mudança mínima segura, sem refatoração estrutural ampla.

---

## Achados e implementações

### ACHADO 01 — `GET /api/calendar/export/pdf` inacessível por conflito de rota ✅ RESOLVIDO

**Arquivo:** `backend/src/routes/calendar.ts`

**Solução aplicada:**
- rota `GET /export/pdf` movida para cima de `GET /:id`.

**Resultado:** `export/pdf` deixa de ser capturado por parâmetro dinâmico.

---

### ACHADO 02 — Exportação com contrato FE/BE divergente (`Blob` vs JSON) ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/calendarController.ts`

**Solução aplicada:**
- endpoint de exportação passou a responder `501` explícito enquanto PDF não existe;
- removido retorno `200` com JSON de “sucesso parcial”.

**Resultado:** frontend não recebe mais falso sucesso em fluxo de export; contrato fica explícito como indisponível até implementação real.

---

### ACHADO 03 — Itens multi-dia fora do intervalo pelo `start_date` ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/calendarController.ts`

**Solução aplicada:**
- filtro de item não recorrente ajustado para interseção de intervalo:
  - `itemStart <= expansionEndDate && itemEnd >= expansionStartDate`.

**Resultado:** eventos que começam antes da janela e terminam dentro dela não somem da listagem.

---

### ACHADO 04 — Race condition em `loadItems` ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/(main)/calendar/page.tsx`

**Solução aplicada:**
- adicionado `loadItemsRequestIdRef` monotônico;
- atualização de `items/error/loading` condicionada à requisição mais recente.

**Resultado:** resposta antiga não sobrescreve estado novo em trocas rápidas de mês/filtros/aba.

---

### ACHADO 05 — Erro de grupos no filtro era silencioso ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/calendar/CalendarFiltersHorizontal.tsx`

**Solução aplicada:**
- novo estado `groupsError`;
- `catch` agora usa `formatApiError(err)`, mostra `toast` e bloco de retry.

**Resultado:** falha de carregamento de grupos fica visível e recuperável.

---

### ACHADO 06 — Falha de aniversariantes virava `0` silencioso ✅ RESOLVIDO

**Arquivos:** `frontend/src/app/(main)/calendar/page.tsx`, `frontend/src/components/calendar/CalendarMonth.tsx`

**Solução aplicada:**
- criado estado `birthdayCountError`;
- card de aniversariantes mostra estado de erro (`-` + ação “Tentar”) quando falha;
- retry usa `loadBirthdaysCount`.

**Resultado:** separação clara entre `loading`, `erro` e `zero real`.

---

### ACHADO 07 — Erros de participantes sem `details` consistente ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/calendar/CalendarParticipantsManager.tsx`

**Solução aplicada:**
- `catch` de carregar/adicionar/remover participantes migrado para `formatApiError(...)`.

**Resultado:** mensagens do backend (incluindo `details`) passam no feedback ao usuário.

---

### ACHADO 08 — Loading pouco perceptível no modal de detalhe ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/(main)/calendar/page.tsx`

**Solução aplicada:**
- modal de visualização abre imediatamente no clique;
- spinner de detalhe exibido enquanto carrega item completo;
- em erro de detalhe, modal fecha e erro aparece via toast formatado.

**Resultado:** interação fica responsiva e previsível em rede lenta.

---

## Mapa de arquivos alterados

| Arquivo | Achados |
|---|---|
| `backend/src/routes/calendar.ts` | 01 |
| `backend/src/controllers/calendarController.ts` | 02, 03 |
| `frontend/src/app/(main)/calendar/page.tsx` | 04, 06, 08 |
| `frontend/src/components/calendar/CalendarMonth.tsx` | 06 |
| `frontend/src/components/calendar/CalendarFiltersHorizontal.tsx` | 05 |
| `frontend/src/components/calendar/CalendarParticipantsManager.tsx` | 07 |

---

## Validação

- Revisão estática ponta a ponta nos 8 achados.
- `ReadLints` nos arquivos alterados: **0 erros**.

---

## Cenários manuais recomendados (smoke)

1. `GET /api/calendar/export/pdf` resolve rota correta (sem cair em `/:id`).  
2. Export calendário responde erro explícito de “não implementado” (sem falso sucesso).  
3. Evento multi-dia (ex.: 30/04–02/05) aparece corretamente em maio.  
4. Troca rápida mês/filtros/aba mantém resultado final correto (sem sobrescrita velha).  
5. Falha em `calendar/groups` mostra erro + retry no bloco de filtros.  
6. Falha em `birthdays/count` mostra estado de erro no card + retry funcional.  
7. Erros de participantes exibem mensagem completa do backend (`details`).  
8. Clique em item com latência abre modal já em loading, sem sensação de travamento.

---

## Achados adicionais

- Sem novos blockers fora dos 8 itens base durante esta rodada.
- Export PDF do calendário foi concluído no ciclo final de revalidação (seção abaixo).

---

## Pós-revalidação — ciclo final

Referência: `docs/QA/modulo-07-calendar/modulo-07-calendar-revalidacao.md`

### Fechamento do ACHADO 02 (exportação PDF)

**Arquivos:** `backend/src/controllers/calendarController.ts`

**Ajuste aplicado:**
- implementação da geração real de PDF no endpoint `GET /api/calendar/export/pdf` com `Content-Type: application/pdf`;
- export passa a considerar filtros existentes (`month`, `year`, `congregation_id`, `group_id`);
- itens recorrentes são expandidos na janela do mês usando o mesmo mecanismo do calendário;
- itens não recorrentes usam regra de interseção de intervalo para não perder eventos multi-dia.

**Resultado:** contrato FE/BE ficou coerente com `responseType: 'blob'` do frontend e entrega um arquivo PDF válido em vez de `501`.

### Correção do RC-01 (race no detalhe do modal)

**Arquivo:** `frontend/src/app/(main)/calendar/page.tsx`

**Ajuste aplicado:**
- adicionado `viewItemRequestIdRef` monotônico em `handleViewItem`;
- somente a requisição mais recente pode atualizar `selectedItem` e encerrar `loadingItemDetails`.

**Resultado:** cliques rápidos em itens diferentes não sobrescrevem o detalhe do último clique com resposta antiga.

### Validação executada

- `ReadLints` nos arquivos alterados sem novos erros.
- Smoke técnico validado:
  - clique rápido em itens distintos preserva o último selecionado no modal;
  - endpoint de exportação retorna PDF válido para download.
