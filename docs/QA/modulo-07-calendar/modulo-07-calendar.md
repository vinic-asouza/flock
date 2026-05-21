# QA — Módulo 07: Calendário e Eventos

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria inicial (fluxo ponta a ponta FE/BE)  
> **Escopo:** `/calendar`, criação/edição/exclusão de item, recorrência, filtros, participantes, aniversariantes, exportação  
> **Referências:** `docs/levantamento-fluxos.md`, `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

Módulo cobre fluxo principal (lista mensal/anual, CRUD, participantes, aniversariantes), mas auditoria encontrou **inconsistências críticas de contrato e roteamento**, além de bugs silenciosos em carga de dados e concorrência.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Crítica | 1 | 01 |
| Alta | 3 | 02, 03, 04 |
| Média | 3 | 05, 06, 07 |
| Baixa | 1 | 08 |

### Riscos centrais

- endpoint de exportação PDF do calendário está quebrado por conflito de rota;
- contrato FE/BE de exportação diverge (FE espera `Blob`, BE retorna JSON);
- eventos multi-dia podem sumir da visualização mensal em cenários reais;
- respostas assíncronas sem controle de concorrência podem gerar estado inconsistente na tela;
- erros importantes são engolidos em partes do fluxo (filtros/aniversariantes).

---

## 2. Mapa ponta a ponta validado

1. Usuário autenticado acessa `/calendar`  
2. FE carrega itens com `GET /api/calendar` (mês atual na aba calendário; ano inteiro na aba lista)  
3. FE aplica filtros de tipo/congregação/grupo (`CalendarFiltersHorizontal`)  
4. Criação/edição via `CalendarItemForm` → `POST/PUT /api/calendar`  
5. Detalhe do item via `GET /api/calendar/:id`  
6. Participantes via `/api/calendar-items/:calendarItemId/participants`  
7. Aniversariantes via `/api/members/birthdays/count` e `/api/members/birthdays/list`  
8. Export de calendário via `GET /api/calendar/export/pdf`

Arquivos auditados:

- Frontend:  
  `frontend/src/app/(main)/calendar/page.tsx`  
  `frontend/src/components/calendar/CalendarItemForm.tsx`  
  `frontend/src/components/calendar/CalendarMonth.tsx`  
  `frontend/src/components/calendar/CalendarListView.tsx`  
  `frontend/src/components/calendar/CalendarFiltersHorizontal.tsx`  
  `frontend/src/components/calendar/CalendarParticipantsManager.tsx`  
  `frontend/src/services/api.ts`  
  `frontend/src/types/calendar.ts`

- Backend:  
  `backend/src/routes/calendar.ts`  
  `backend/src/controllers/calendarController.ts`  
  `backend/src/routes/calendarParticipants.ts`  
  `backend/src/controllers/calendarParticipantController.ts`  
  `backend/src/validators/calendarValidator.ts`  
  `backend/src/validators/calendarParticipantValidator.ts`  
  `backend/src/utils/calendarValidations.ts`

---

## 3. Achados

### ACHADO 01 — `GET /api/calendar/export/pdf` inacessível por conflito de rota com `/:id`
- **Gravidade:** crítica  
- **Tipo:** contrato API / roteamento  
- **Impacto no usuário:** exportação de calendário falha; chamada pode cair em `getCalendarItem` com `id='export'` e retornar erro de item não encontrado.
- **Arquivos relacionados:** `backend/src/routes/calendar.ts`
- **Evidência:**
```ts
router.get('/:id', getCalendarItem);
// ...
router.get('/export/pdf', exportCalendarPDF);
```
`/:id` declarado antes de `/export/pdf`.
- **Como reproduzir:** chamar `GET /api/calendar/export/pdf`.
- **Causa provável:** ordem incorreta de declaração das rotas.
- **Ajuste recomendado:** mover `router.get('/export/pdf', exportCalendarPDF)` para antes de `router.get('/:id', getCalendarItem)`.

---

### ACHADO 02 — Divergência de contrato na exportação: FE espera `Blob`, BE retorna JSON “não implementado”
- **Gravidade:** alta  
- **Tipo:** divergência FE/BE  
- **Impacto no usuário:** ao implementar uso do export no frontend, comportamento quebra (download inválido/arquivo corrompido/mensagem inconsistente).
- **Arquivos relacionados:** `frontend/src/services/api.ts`, `backend/src/controllers/calendarController.ts`
- **Evidência FE:**
```ts
const response = await this.api.get(url, { responseType: 'blob' });
```
- **Evidência BE:**
```ts
res.json({
  message: 'Exportação PDF ainda não implementada',
  data: { ... }
});
```
- **Como reproduzir:** consumir `apiService.exportCalendarPDF(...)`.
- **Causa provável:** endpoint declarado como exportação PDF sem implementação final de arquivo.
- **Ajuste recomendado:**  
  1) implementar PDF real com `Content-Type: application/pdf`; ou  
  2) ajustar contrato FE para JSON até implementação final (e não expor método como Blob).

---

### ACHADO 03 — Itens multi-dia podem sumir quando começam antes do intervalo filtrado
- **Gravidade:** alta  
- **Tipo:** bug silencioso de regra temporal  
- **Impacto no usuário:** eventos em andamento no mês atual não aparecem no calendário/lista se início ocorreu no mês anterior.
- **Arquivos relacionados:** `backend/src/controllers/calendarController.ts`, `frontend/src/components/calendar/CalendarMonth.tsx`
- **Evidência BE:**
```ts
// não recorrentes
const itemStart = new Date(calendarItem.start_date);
if (itemStart >= expansionStartDate && itemStart <= expansionEndDate) {
  nonRecurringItems.push(calendarItem);
}
```
Filtro considera só `start_date`, ignora interseção com `end_date`.
- **Como reproduzir:** criar item não recorrente de 30/04 a 02/05; abrir visão de maio.
- **Causa provável:** critério de inclusão temporal incompleto para intervalos.
- **Ajuste recomendado:** incluir item quando houver interseção de intervalos:  
`itemStart <= expansionEndDate && itemEnd >= expansionStartDate`.

---

### ACHADO 04 — Corrida assíncrona em carregamento principal de itens (`loadItems`) sem controle de requisição ativa
- **Gravidade:** alta  
- **Tipo:** estado inconsistente / concorrência  
- **Impacto no usuário:** mudanças rápidas de mês/ano/filtro/aba podem exibir resultado antigo sobrescrevendo resultado novo.
- **Arquivos relacionados:** `frontend/src/app/(main)/calendar/page.tsx`
- **Evidência:**
```ts
const response = await apiService.listCalendarItems(...);
setItems(response.data);
```
Sem `requestId`/cancelamento/abort no fluxo principal.
- **Como reproduzir:** alternar rapidamente mês, aba e filtros com rede lenta.
- **Causa provável:** ausência de proteção contra respostas fora de ordem.
- **Ajuste recomendado:** adotar `requestIdRef` monotônico ou cancelamento via `AbortController`/axios cancel token.

---

### ACHADO 05 — Falha ao carregar grupos no filtro é engolida silenciosamente
- **Gravidade:** média  
- **Tipo:** erro engolido / UX  
- **Impacto no usuário:** filtro de grupo fica vazio sem explicação, induz leitura errada (“não existem grupos”).
- **Arquivos relacionados:** `frontend/src/components/calendar/CalendarFiltersHorizontal.tsx`
- **Evidência:**
```ts
} catch {
  // Erro silencioso - grupos são opcionais para filtros
  setGroups([]);
}
```
- **Como reproduzir:** falha em `GET /api/calendar/groups`.
- **Causa provável:** tratamento de fallback sem feedback de erro.
- **Ajuste recomendado:** exibir estado de erro leve no filtro (badge/toast + retry) em vez de vazio silencioso.

---

### ACHADO 06 — Falha em contagem de aniversariantes vira `0` silencioso
- **Gravidade:** média  
- **Tipo:** bug silencioso de UX/dados  
- **Impacto no usuário:** card “Aniversariantes” mostra zero falso em indisponibilidade da API.
- **Arquivos relacionados:** `frontend/src/app/(main)/calendar/page.tsx`
- **Evidência:**
```ts
} catch {
  setBirthdayCount(0);
}
```
- **Como reproduzir:** falhar `GET /api/members/birthdays/count`.
- **Causa provável:** fallback sem distinguir erro real de ausência de dados.
- **Ajuste recomendado:** separar estados `loading/error/empty`; exibir erro no card com ação de retry.

---

### ACHADO 07 — Feedback de erro de participantes perde detalhe do backend em pontos críticos
- **Gravidade:** média  
- **Tipo:** clareza de mensagem / UX  
- **Impacto no usuário:** mensagens genéricas dificultam ação corretiva (ex.: validação de convidado/membro/congregação).
- **Arquivos relacionados:** `frontend/src/components/calendar/CalendarParticipantsManager.tsx`, `backend/src/controllers/calendarParticipantController.ts`
- **Evidência FE:**
```ts
catch {
  toast.error('Erro ao carregar participantes');
}
// ...
catch {
  toast.error('Erro ao remover participante');
}
```
Backend já retorna `details` úteis, mas frontend nem sempre exibe.
- **Como reproduzir:** forçar erro de validação/remoção/listagem.
- **Causa provável:** mensagens hardcoded no catch.
- **Ajuste recomendado:** padronizar `formatApiError(err)` em todos os catches do manager.

---

### ACHADO 08 — Estado de loading de detalhes no modal pouco perceptível no clique de item
- **Gravidade:** baixa  
- **Tipo:** UX/feedback  
- **Impacto no usuário:** em rede lenta, clique no item pode parecer sem resposta até retorno do `GET /calendar/:id`.
- **Arquivos relacionados:** `frontend/src/app/(main)/calendar/page.tsx`
- **Evidência:** modal abre só após retorno de `getCalendarItem`; spinner interno quase nunca visível no intervalo de espera.
- **Como reproduzir:** simular latência alta e clicar em item.
- **Causa provável:** carregamento acontece antes de abrir modal.
- **Ajuste recomendado:** abrir modal imediatamente em estado de loading ou usar skeleton/transição na lista ao clicar.

---

## 4. Sessão, credenciais inválidas, expiração e redirecionamentos (validação transversal)

- **Frontend protegido:** `frontend/src/app/(main)/layout.tsx` redireciona para `/login` quando `!isAuthenticated`.  
- **Expiração/401:** interceptor em `frontend/src/services/api.ts` redireciona para `/login` em `401` (exceto rotas públicas/check auth).  
- **Backend:** rotas de calendário e participantes protegidas por `authMiddleware` + `requireRole`.

**Conclusão:** proteção básica de sessão e papel está consistente no módulo.

---

## 5. Cenários de borda recomendados

- export PDF com rota corrigida e resposta real de arquivo;
- item multi-dia atravessando fronteira de mês/ano;
- troca rápida de filtros + mês + aba para verificar consistência final;
- falha de `calendar/groups`, `birthdays/count`, `calendar/:id` e participantes (mensagens + retry);
- recorrência mensal em dia inexistente (31) e semana `-1` (última);
- usuário `reader` tentando operações editor via DevTools.

---

## 6. O que desenvolvimento deve ajustar (priorizado)

### Prioridade crítica
1. Corrigir ordem de rotas em `backend/src/routes/calendar.ts` (`/export/pdf` antes de `/:id`).

### Prioridade alta
2. Resolver contrato de exportação PDF (Blob real no backend ou ajuste explícito de contrato FE).  
3. Corrigir lógica temporal de itens multi-dia no `listCalendarItems`.  
4. Adicionar controle anti-race no `loadItems` da página de calendário.

### Prioridade média
5. Remover erro silencioso no carregamento de grupos do filtro.  
6. Remover fallback silencioso de aniversariantes `0` em erro de API.  
7. Padronizar mensagens detalhadas de erro no manager de participantes.

### Prioridade baixa
8. Melhorar percepção de loading no clique de item para abrir detalhes.

---

## 7. Parecer final

Módulo 7 está funcional no caminho principal, mas **não pronto para fechamento de QA** neste estado por causa de:
- falha crítica de roteamento em export;
- divergência de contrato FE/BE;
- bug silencioso de exibição em eventos multi-dia.

Após correções prioritárias, recomenda-se revalidação focada em exportação, integridade temporal da listagem e consistência assíncrona da UI.
