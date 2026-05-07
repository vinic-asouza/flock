# Relatório de Execução — Módulo 06: Gestão de Grupos

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-06-groups/modulo-06-groups.md`  
> **Status geral:** ✅ 9/9 achados implementados

---

## Resumo executivo

O pacote de correções do módulo 06 foi executado com foco em três frentes: paridade de regra de negócio no backend (`create` vs `update`), robustez de estados assíncronos no modal de grupo e redução de ambiguidades de UX na listagem/filtros.

Foram resolvidos:
- 1 achado crítico (validação de domínio no `PUT /groups/:id`);
- 3 achados altos (erro vs vazio no modal, export com feedback consistente, filtro inicial da listagem);
- 4 achados médios (concorrência de busca, N+1 + fallback silencioso de contagem, loading por item na remoção);
- 1 achado baixo (empty state contextual por filtros).

---

## Achados e implementações

### ACHADO 01 — `PUT /groups/:id` sem validações de congregação/responsável ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/groupController.ts`

**Solução aplicada:**
- em `updateGroup`, adicionado merge de estado final (`existingGroup` + payload) para `finalCongregationId` e `finalResponsibleId`;
- reaplicadas as validações de domínio antes do update:
  - `validateGroupCongregation(...)`
  - `validateResponsibleAndCongregation(...)`;
- sanitização adicional de payload para converter `''` em `null` para `congregation_id` e `responsible_id`.

**Resultado:** `PUT` passa a respeitar as mesmas regras de negócio do `POST`, eliminando inconsistência funcional e risco de associação inválida.

---

### ACHADO 02 — Erros de membros no modal convertidos em vazio ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/groups/GroupModal.tsx`

**Solução aplicada:**
- criados estados explícitos:
  - `errorAvailableMembers` (membros disponíveis para adicionar)
  - `errorMembersList` (membros vinculados);
- `catch` dos carregamentos agora usa `formatApiError(err)`;
- incluídos blocos de erro com botão **"Tentar novamente"** nos dois fluxos.

**Resultado:** falha de integração não aparece mais como “sem membros”.

---

### ACHADO 03 — Exportação de membros sem feedback consistente ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/groups/ExportGroupMembersModal.tsx`, `frontend/src/components/groups/GroupModal.tsx`

**Solução aplicada:**
- centralizado tratamento no `ExportGroupMembersModal`:
  - estado local `exportError`;
  - `toast.error(...)` com `formatApiError(err)` no `catch`;
  - mensagem inline no modal quando falha;
- validação de seleção vazia também passou a exibir feedback consistente.

**Resultado:** falhas no export de membros ficam explícitas no próprio modal, com possibilidade imediata de nova tentativa.

---

### ACHADO 04 — Filtro inicial em `sede` ocultando grupos por padrão ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/(main)/groups/page.tsx`

**Solução aplicada:**
- alterado `initialFilters.congregationId` de `'sede'` para `''` (todas as congregações).

**Resultado:** primeira carga da tela mostra o panorama completo do módulo.

---

### ACHADO 05 — Controle de concorrência inefetivo em `useMemberOptions` ✅ RESOLVIDO

**Arquivo:** `frontend/src/hooks/useMemberOptions.ts`

**Solução aplicada:**
- removida estratégia de `AbortController` não integrada ao request atual;
- implementado `requestIdRef` monotônico;
- atualizações de `options/loading/error` agora só ocorrem para a requisição mais recente.

**Resultado:** busca de responsáveis não sofre sobrescrita por resposta atrasada.

---

### ACHADO 06 — N+1 para contagem de membros em `listGroups` ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/groupController.ts`

**Solução aplicada:**
- removido loop com query por grupo;
- implementada query única em `member_groups` por `group_id IN (...)`;
- contagem agregada em memória via `reduce`.

**Resultado:** elimina padrão N+1 e melhora escalabilidade da listagem.

---

### ACHADO 07 — Fallback silencioso `memberCount: 0` em erro de contagem ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/groupController.ts`

**Solução aplicada:**
- em falha da query de contagem, endpoint agora retorna `500` com mensagem explícita;
- removido fallback silencioso para dado possivelmente falso.

**Resultado:** contrato da API deixa de mascarar erro como valor válido.

---

### ACHADO 08 — Remoção de membro sem loading por item ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/groups/GroupModal.tsx`

**Solução aplicada:**
- adicionado estado `removingMemberId`;
- botão de remover passa a:
  - desabilitar apenas o item em remoção;
  - exibir spinner no ícone durante request;
- erros de remoção migrados para `toast.error(...)` com mensagem consistente.

**Resultado:** evita disparos múltiplos no mesmo item e melhora previsibilidade da ação.

---

### ACHADO 09 — Empty state sem distinguir “sem dados” vs “sem resultados de filtro” ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/groups/GroupList.tsx`, `frontend/src/app/(main)/groups/page.tsx`

**Solução aplicada:**
- `GroupList` passou a receber `hasActiveFilters` e `onClearFilters`;
- empty state agora diferencia:
  - sem filtros: “Comece criando um novo grupo”;
  - com filtros ativos: “Nenhum resultado para os filtros aplicados” + CTA “Limpar filtros”.

**Resultado:** mensagem passa a refletir o contexto real do usuário.

---

## Mapa de arquivos alterados

| Arquivo | Achados |
|---|---|
| `backend/src/controllers/groupController.ts` | 01, 06, 07 |
| `frontend/src/app/(main)/groups/page.tsx` | 04, 09 |
| `frontend/src/components/groups/GroupList.tsx` | 09 |
| `frontend/src/hooks/useMemberOptions.ts` | 05 |
| `frontend/src/components/groups/ExportGroupMembersModal.tsx` | 03 |
| `frontend/src/components/groups/GroupModal.tsx` | 02, 03, 08 |

---

## Validação

- Revisão estática do fluxo ponta a ponta FE/BE para os 9 achados.
- Lint dos arquivos alterados via `ReadLints`: **0 erros**.

---

## Cenários manuais recomendados (smoke)

1. `PUT /groups/:id` alterando congregação/responsável com combinações válidas e inválidas (incluindo responsável incompatível).  
2. Simular falha em carga de membros disponíveis e membros vinculados no `GroupModal` e validar erro + retry (sem empty falso).  
3. Simular erro no `POST /api/export/group/members/list` e validar feedback no `ExportGroupMembersModal`.  
4. Abrir `/groups` sem filtros e confirmar visão geral (todas as congregações por padrão).  
5. Buscar responsável com troca rápida de termo/congregação para validar prevalência da última resposta.  
6. Listar muitos grupos e confirmar estabilidade/performance da contagem de membros.  
7. Forçar erro em contagem de `member_groups` e confirmar resposta de erro explícita (sem `memberCount` falso).  
8. Clicar repetidamente em remover membro no modal e validar bloqueio por item durante o request.  
9. Aplicar filtros até zero resultados e validar empty state contextual + ação de limpar filtros.

---

## Achados adicionais

- Não foram identificados novos blockers fora dos 9 itens do relatório base durante esta execução.
- Como evolução futura, vale padronizar o uso de `formatApiError` também em `groups/page.tsx` e demais ações de CRUD para uniformizar mensagens do módulo.

---

## Pós-revalidação — Correção de reabertura

> **Referência:** `docs/QA/modulo-06-groups/modulo-06-groups-revalidacao.md`

### ACHADO 02 / EC-01 — `getGroup` mascarava falha de `member_groups` como lista vazia ✅ CORRIGIDO

**Arquivo:** `backend/src/controllers/groupController.ts`

**Causa confirmada:**
- no endpoint `getGroup`, quando `memberGroupsError` ocorria, o erro era apenas logado e a resposta seguia com `membersList: []`, mantendo caminho de “vazio falso”.

**Solução aplicada:**
- ao detectar `memberGroupsError`, o endpoint agora retorna `500` com erro explícito:
  - `error: 'Erro ao carregar membros do grupo'`
  - `details: 'Não foi possível carregar os membros vinculados a este grupo no momento'`

**Resultado esperado:**
- frontend passa a diferenciar falha real de integração de ausência legítima de membros, fechando a lacuna residual do ACHADO 02 e o ticket derivado EC-01.
