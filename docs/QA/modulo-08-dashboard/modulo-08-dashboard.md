# QA — Módulo 08: Relatórios e Dashboard Analytics

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria inicial (fluxo ponta a ponta FE/BE)  
> **Escopo:** `/` (home/painel), filtros de visualização, `GET /api/members/reports`, drill-down de membros, `GET /api/export/dashboard/pdf`, seção de grupos  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 8), `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O dashboard entrega visão analítica ampla (cards, demografia, timeline, estrutura, geografia, ocupações, integração) com proteção de autenticação na home e rate limit no endpoint pesado de relatórios. O caminho feliz funciona, mas a auditoria encontrou **bugs silenciosos de consistência de dados** e **falhas de UX em erro/concorrência** que podem induzir decisões erradas sem quebrar a tela.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 4 | 01, 02, 03, 04 |
| Média | 5 | 05, 06, 07, 08, 09 |
| Baixa | 2 | 10, 11 |

### Riscos centrais

- falha em bloco de integração derruba o relatório inteiro (não só a seção de integração);
- troca rápida de visualização pode exibir métricas/grupos de filtro anterior;
- igrejas grandes (>5000 membros) podem gerar estatísticas incorretas por paginação sem ordenação estável;
- exportação PDF pode gerar relatório geral enquanto UI está em modo “Congregação” sem seleção, e erro de export substitui o painel inteiro.

---

## 2. Mapa ponta a ponta validado

1. Usuário autenticado acessa `/` (`frontend/src/app/page.tsx`)  
2. `ProtectedRoute` valida sessão e redireciona para `/login` se necessário  
3. `ViewSelector` define visualização: Geral / Sede / Congregação específica  
4. FE chama `GET /api/members/reports` via `apiService.getMemberReports` com `congregation_id` opcional (`sede` ou UUID)  
5. Backend agrega membros + integração e retorna payload `MemberReports`  
6. Componentes renderizam: `SummaryCards`, `TimelineCharts`, `DemographicsCharts`, `GroupsCharts`, `ChurchStructureCharts`, `GeographySection`, `OccupationsTable`  
7. Drill-down abre `MembersModal` / `MemberModalWithSelect` → `GET /api/members` paginado  
8. Exportação: `GET /api/export/dashboard/pdf` (`responseType: blob`) → download no browser  

Arquivos auditados:

- Frontend:  
  `frontend/src/app/page.tsx`  
  `frontend/src/components/reports/ViewSelector.tsx`  
  `frontend/src/components/reports/SummaryCards.tsx`  
  `frontend/src/components/reports/DemographicsCharts.tsx`  
  `frontend/src/components/reports/GroupsCharts.tsx`  
  `frontend/src/components/reports/TimelineCharts.tsx`  
  `frontend/src/components/reports/ChurchStructureCharts.tsx`  
  `frontend/src/components/reports/GeographySection.tsx`  
  `frontend/src/components/reports/OccupationsTable.tsx`  
  `frontend/src/components/reports/MembersModal.tsx`  
  `frontend/src/components/ProtectedRoute.tsx`  
  `frontend/src/services/api.ts`  
  `frontend/src/hooks/useReports.ts` (não usado pela página principal)  
  `frontend/src/types/reports.ts`

- Backend:  
  `backend/src/routes/members.ts`  
  `backend/src/controllers/memberController.ts` (`getMemberReports`)  
  `backend/src/validators/reportValidator.ts`  
  `backend/src/controllers/exportController.ts` (`exportDashboardPDF`)  
  `backend/src/routes/export.ts`

---

## 3. Achados

### ACHADO 01 — Falha ao buscar integração derruba o dashboard inteiro (`500` no `/members/reports`)
- **Gravidade:** alta  
- **Tipo:** bug silencioso / disponibilidade  
- **Impacto no usuário:** qualquer erro em `integration_members` impede carregar o painel completo (cards, gráficos, timeline), mesmo que dados de membros estejam OK. Usuário vê erro global e perde visão operacional.
- **Arquivos relacionados:** `backend/src/controllers/memberController.ts`
- **Evidência:**
```typescript
if (integrationError) {
  return res.status(500).json({
    error: 'Erro ao buscar dados de integração',
    details: integrationError.message
  });
}
```
O retorno ocorre **depois** de processar membros; não há fallback parcial (ex.: `integration: null` + aviso).
- **Como reproduzir:** simular indisponibilidade/erro Supabase na query de `integration_members` com usuário autenticado em `/`.
- **Causa provável:** tratamento “tudo ou nada” no endpoint agregador de relatórios.
- **Ajuste recomendado:** degradar graciosamente: retornar relatório de membros com `integration` opcional e flag de erro; no FE exibir aviso na seção de integração sem bloquear o restante.

---

### ACHADO 02 — Corrida assíncrona em `loadReports` sem controle de requisição ativa
- **Gravidade:** alta  
- **Tipo:** estado inconsistente / concorrência  
- **Impacto no usuário:** alternar rápido entre “Geral”, “Sede” e congregações pode mostrar números/gráficos do filtro anterior no filtro novo.
- **Arquivos relacionados:** `frontend/src/app/page.tsx`
- **Evidência:**
```typescript
const data = await apiService.getMemberReports(filters);
setReportsData(data);
```
Sem `requestIdRef` monotônico, cancelamento ou ignore de respostas antigas (padrão já corrigido em outros módulos, ex.: calendário).
- **Como reproduzir:** rede lenta + trocar visualização/filtro rapidamente; observar cards/timeline desalinhados com filtro selecionado.
- **Causa provável:** ausência de proteção contra respostas fora de ordem.
- **Ajuste recomendado:** adicionar `loadReportsRequestIdRef` e só aplicar `setReportsData`/`setError`/`setLoading` na requisição mais recente.

---

### ACHADO 03 — `GroupsCharts` mantém grupos antigos durante refresh/troca de filtro
- **Gravidade:** alta  
- **Tipo:** bug silencioso / inconsistência visual  
- **Impacto no usuário:** ao mudar congregação, seção “Grupos/Ministérios” pode continuar exibindo grupos do contexto anterior enquanto cards superiores já mudaram (ou estão em loading).
- **Arquivos relacionados:** `frontend/src/components/reports/GroupsCharts.tsx`, `frontend/src/app/page.tsx`
- **Evidência:**
```typescript
if (!loading) {
  loadGroups();
}
```
Quando `loading` vira `true`, o efeito não recarrega e **não limpa** `groups`; estado anterior permanece visível até nova resposta.
- **Como reproduzir:** carregar “Geral” com grupos visíveis → trocar para outra congregação com latência → observar bloco de grupos desatualizado.
- **Causa provável:** fetch secundário independente do relatório principal, sem reset nem controle de concorrência.
- **Ajuste recomendado:** limpar `groups` ao mudar `viewMode`/`selectedCongregationId`; usar `requestIdRef` no fetch de grupos; opcionalmente exibir skeleton enquanto recarrega.

---

### ACHADO 04 — Paginação em chunks (>5000 membros) sem `order`, risco de estatísticas incompletas/erradas
- **Gravidade:** alta  
- **Tipo:** bug silencioso de dados  
- **Impacto no usuário:** igrejas grandes podem ter totais, percentuais, demografia e timeline incorretos sem erro visível.
- **Arquivos relacionados:** `backend/src/controllers/memberController.ts`
- **Evidência:**
```typescript
let chunkQuery = supabase
  .from('members')
  .select(`...`)
  .eq('church_id', churchId)
  .range(offset, offset + CHUNK_SIZE - 1);
// sem .order('id') ou ordenação estável
```
`activeMembers` é calculado sobre `allMembers` agregado; `totalMembers` vem de `count` separado. Se chunks duplicarem/omitirem linhas, `inactiveMembers = totalMembers - activeMembers` fica distorcido.
- **Como reproduzir:** base com >5000 membros (ou mock), comparar `summary.totalMembers` com soma manual; validar estabilidade entre duas chamadas consecutivas.
- **Causa provável:** `range` sem ordenação determinística no PostgREST/Supabase.
- **Ajuste recomendado:** adicionar ordenação estável (ex.: `.order('id', { ascending: true })`) em query principal e chunks; considerar teste de regressão para volume alto.

---

### ACHADO 05 — Exportação PDF em modo “Congregação” sem seleção gera relatório geral
- **Gravidade:** média  
- **Tipo:** UX / contrato funcional  
- **Impacto no usuário:** com visualização “Congregação” ativa mas sem congregação escolhida, botão “Exportar PDF” continua habilitado (fora de `loading`) e exporta relatório geral, divergindo do contexto visual.
- **Arquivos relacionados:** `frontend/src/app/page.tsx`
- **Evidência:**
```typescript
} else if (viewMode === 'congregation' && selectedCongregationId) {
  congregationParam = selectedCongregationId;
}
// se congregation sem ID, congregationParam fica undefined → relatório geral
```
UI mostra estado “Selecione uma Congregação”, mas export não é bloqueado.
- **Como reproduzir:** selecionar aba “Congregação” sem escolher item no select → clicar “Exportar PDF”.
- **Causa provável:** ausência de guarda de contexto no handler de exportação.
- **Ajuste recomendado:** desabilitar export quando `viewMode === 'congregation' && !selectedCongregationId`; toast explicativo.

---

### ACHADO 06 — Erro de exportação PDF promove `setError` e substitui o painel inteiro
- **Gravidade:** média  
- **Tipo:** UX / tratamento de erro  
- **Impacto no usuário:** falha pontual no download apaga dashboard já carregado e mostra tela cheia de erro, como se relatório principal tivesse falhado.
- **Arquivos relacionados:** `frontend/src/app/page.tsx`
- **Evidência:**
```typescript
} catch (err: unknown) {
  toast.error(errorMessage);
  setError(errorMessage); // mesmo estado usado para falha de loadReports
}
```
Render condicional:
```typescript
{error && isAuthenticated && !loading && (
  // tela de erro full-screen, sem sidebar/header do painel
)}
```
- **Como reproduzir:** forçar erro no export (ex.: 500 no endpoint) com dashboard já exibido.
- **Causa provável:** estado global de erro compartilhado entre operações distintas.
- **Ajuste recomendado:** separar `reportsError` e `exportError`; manter dashboard visível em falha de export; usar `formatApiError`.

---

### ACHADO 07 — Mensagens de API perdem `details` no dashboard e modais
- **Gravidade:** média  
- **Tipo:** clareza de mensagem / contrato  
- **Impacto no usuário:** validações e falhas do backend (rate limit, filtros inválidos) aparecem genéricas; usuário não sabe ação corretiva.
- **Arquivos relacionados:** `frontend/src/app/page.tsx`, `frontend/src/components/reports/MembersModal.tsx`, `frontend/src/services/api.ts` (`formatApiError`)
- **Evidência:**
```typescript
const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar relatórios';
```
`formatApiError` existe no projeto, mas não é usado na página principal nem no `MembersModal`.
- **Como reproduzir:** exceder rate limit de relatórios (`10 req/min` em `backend/src/routes/members.ts`) e observar mensagem sem `details`.
- **Causa provável:** tratamento manual de `Error.message` apenas.
- **Ajuste recomendado:** padronizar `formatApiError(err)` em `loadReports`, export e `MembersModal`.

---

### ACHADO 08 — Inconsistência de base de cálculo: demografia só ativos, ocupações incluem inativos
- **Gravidade:** média  
- **Tipo:** inconsistência de regra / UX analítica  
- **Impacto no usuário:** gráficos de gênero/estado civil/faixa etária (ativos) não batem com ranking de ocupações (todos os membros), gerando desconfiança nos números.
- **Arquivos relacionados:** `backend/src/controllers/memberController.ts`
- **Evidência:**
```typescript
const activeMembersOnly = allMembers.filter(m => m.active);
// gender/marital/age usa activeMembersOnly

const occupationStats = allMembers.reduce((acc, member) => {
  const occupation = member.occupation || 'Não informado';
```
- **Como reproduzir:** igreja com inativos e ocupações preenchidas; comparar card “Membros Ativos” com soma de ocupações.
- **Causa provável:** regras diferentes por seção sem documentar na UI.
- **Ajuste recomendado:** alinhar regra (preferencialmente ativos em todas as seções demográficas) ou rotular explicitamente no frontend (“inclui inativos”).

---

### ACHADO 09 — Drill-down de faixa etária usa filtro por `birth_date` que não replica exatamente os buckets do relatório
- **Gravidade:** média  
- **Tipo:** divergência de regra / contrato  
- **Impacto no usuário:** ao clicar “Visualizar” em faixa etária, lista de membros pode divergir do número do gráfico (especialmente em limites de idade).
- **Arquivos relacionados:** `frontend/src/components/reports/DemographicsCharts.tsx`, `backend/src/controllers/memberController.ts`
- **Evidência:** relatório calcula faixa por `calculateAge(member.birth)` com buckets discretos; modal usa `parseAgeRange` convertendo para `birth_date_from`/`birth_date_to` aproximados por ano civil.
- **Como reproduzir:** membros com aniversário hoje/limite de faixa; comparar contagem do gráfico vs lista no modal da mesma faixa.
- **Causa provável:** duas implementações de classificação etária.
- **Ajuste recomendado:** reutilizar mesma função de bucket no BE e expor filtro `age_from`/`age_to` alinhado ao gráfico, ou calcular lista via endpoint dedicado.

---

### ACHADO 10 — Tela de erro do dashboard sem shell (header/sidebar), divergente do estado normal
- **Gravidade:** baixa  
- **Tipo:** UX/layout  
- **Impacto no usuário:** em erro de carga, usuário perde navegação lateral e contexto visual do app; sensação de “saiu do sistema”.
- **Arquivos relacionados:** `frontend/src/app/page.tsx`
- **Evidência:** branch de erro renderiza apenas bloco central (`min-h-screen`), enquanto sucesso usa `Header` + `Sidebar`.
- **Como reproduzir:** forçar falha em `GET /members/reports`.
- **Causa provável:** tratamento de erro isolado fora do layout principal da home.
- **Ajuste recomendado:** manter shell e mostrar erro inline no `main`, com botão “Tentar novamente”.

---

### ACHADO 11 — Hook `useReports` órfão (drift de implementação)
- **Gravidade:** baixa  
- **Tipo:** dívida técnica  
- **Impacto no usuário:** baixo direto; risco de manutenção e reintrodução de bugs se alguém migrar para o hook sem as correções da página.
- **Arquivos relacionados:** `frontend/src/hooks/useReports.ts`, `frontend/src/app/page.tsx`
- **Evidência:** página implementa fetch próprio; hook não é importado na home. Hook também não trata 401 nem concorrência.
- **Ajuste recomendado:** consolidar em um único hook compartilhado com proteções de concorrência e uso em `/`.

---

## 4. Sessão, credenciais inválidas, expiração e redirecionamentos (validação transversal)

- **Home (`/`):** `ProtectedRoute` redireciona para `/login` quando `!isAuthenticated` após `isLoading` (`frontend/src/components/ProtectedRoute.tsx`).  
- **Rotas internas:** `(main)/layout.tsx` também redireciona não autenticado para `/login` (proteção adicional além da home).  
- **401:** interceptor em `frontend/src/services/api.ts` redireciona para `/login` (exceto rotas públicas/check auth).  
- **`loadReports`:** em `401`, página zera erro e retorna cedo para não exibir falso positivo antes do redirect — comportamento adequado.  
- **Backend:** `GET /members/reports` e `GET /export/dashboard/pdf` exigem `authMiddleware` + `requireRole('reader')`.

**Conclusão:** proteção de sessão consistente; pontos fracos estão em erro local e concorrência, não em auth básica.

---

## 5. Cenários de borda recomendados

- igreja com >5000 membros: estabilidade estatística entre duas cargas consecutivas;
- indisponibilidade parcial de `integration_members`: dashboard principal continua útil;
- troca rápida Geral → Sede → Congregação A → Congregação B;
- export PDF em cada modo de visualização (incluindo congregação sem seleção);
- falha de export com dashboard já carregado (não deve derrubar painel);
- rate limit de relatórios (11ª requisição em 1 minuto): mensagem clara com `details`;
- drill-down de faixa etária nos limites 12/13, 17/18, 65+;
- usuário `reader` tentando exportar e abrir modais de membros;
- sessão expirada durante refresh ou export;
- congregação removida após abrir dashboard (filtro órfão).

---

## 6. O que desenvolvimento deve ajustar (priorizado)

### Prioridade alta
1. Degradar falha de integração sem bloquear relatório completo (`memberController.getMemberReports`).  
2. Adicionar controle anti-race em `loadReports` (`page.tsx`).  
3. Corrigir stale state e concorrência em `GroupsCharts`.  
4. Ordenação estável na paginação em chunks de membros.

### Prioridade média
5. Bloquear export PDF sem congregação selecionada no modo congregação.  
6. Separar erro de export do erro de carga do dashboard.  
7. Padronizar `formatApiError` nos fluxos de erro.  
8. Alinhar base ativos vs todos em ocupações (ou documentar na UI).  
9. Unificar regra de faixa etária entre gráfico e modal.

### Prioridade baixa
10. Manter shell visual em estado de erro da home.  
11. Unificar fetch em `useReports` ou remover hook morto.

---

## 7. Parecer final

Módulo 8 está **funcional no caminho principal**, porém **não recomendado para fechamento de QA** neste estado por riscos altos de:
- dados incorretos em bases grandes;
- inconsistência entre filtros durante navegação rápida;
- indisponibilidade total do painel por falha secundária de integração.

Após correções de prioridade alta e validação dos cenários de borda acima, recomenda-se ciclo de revalidação focado em concorrência de filtros, integridade estatística e contrato de exportação.
