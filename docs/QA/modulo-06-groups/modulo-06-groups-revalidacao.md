# Revalidação QA — Módulo 06: Gestão de Grupos

> **Data:** Maio/2026  
> **Referências:** `docs/QA/modulo-06-groups/modulo-06-groups.md`, `docs/QA/modulo-06-groups/modulo-06-groups-dev-report.md`  
> **Escopo da revalidação:** conferência item a item dos 9 achados originais + análise de regressões/efeitos colaterais no código atualizado (FE/BE)

---

## 1. Resumo executivo

O pacote do DEV evoluiu bem e corrige de forma consistente a maior parte dos pontos críticos do módulo.

Resultado da revalidação:
- **7/9 achados** estão **resolvidos**;
- **2/9 achados** estão **parcialmente resolvidos**;
- **0/9** ficaram como **não resolvido**;
- **0/9** como **não se sustenta mais**.

Risco residual principal: ainda existe um caminho de erro silencioso no backend de detalhes do grupo (`getGroup`) que pode manter o sintoma de “lista vazia” no modal mesmo após as correções de tratamento de erro no frontend.

**Parecer final:** módulo com melhora significativa e apto para avanço, porém **não para encerramento total** do ciclo de QA. É necessário reabrir os itens parcialmente resolvidos e abrir 1 novo ticket derivado.

---

## 2. Status de cada achado original

### ACHADO 01 — `PUT /groups/:id` sem validações de domínio
- **Status:** **resolvido**
- **Evidência:** `backend/src/controllers/groupController.ts`
  - `updateGroup` agora calcula estado final (`finalCongregationId`, `finalResponsibleId`) e reaplica:
    - `validateGroupCongregation(...)`
    - `validateResponsibleAndCongregation(...)`
  - há normalização de `'' -> null` para `congregation_id` e `responsible_id`.
- **Conclusão QA:** paridade create/update atendida.

### ACHADO 02 — Erros no modal convertidos em vazio
- **Status:** **parcialmente resolvido**
- **Evidência de correção:** `frontend/src/components/groups/GroupModal.tsx`
  - adicionados `errorAvailableMembers` e `errorMembersList` com retry e feedback explícito.
- **Gap remanescente (ponta a ponta):** `backend/src/controllers/groupController.ts`
  - no `getGroup`, falha ao buscar `member_groups` é apenas logada e o endpoint segue com `membersList: []`.
  - isso ainda permite “vazio falso” em cenários de falha nesse endpoint.
- **Conclusão QA:** frontend melhorou, mas backend ainda mascara parte do erro.

### ACHADO 03 — Exportação de membros com feedback inconsistente
- **Status:** **resolvido**
- **Evidência:** `frontend/src/components/groups/ExportGroupMembersModal.tsx`
  - novo estado `exportError`;
  - `catch` com `formatApiError(err)` + `toast.error(...)`;
  - mensagem inline no modal.
- **Conclusão QA:** erro de exportação agora fica visível e acionável no contexto correto.

### ACHADO 04 — Filtro inicial em `sede`
- **Status:** **resolvido**
- **Evidência:** `frontend/src/app/(main)/groups/page.tsx`
  - `initialFilters.congregationId` alterado para `''` (todas as congregações).
- **Conclusão QA:** visão inicial ficou coerente com panorama do módulo.

### ACHADO 05 — Concorrência inefetiva em `useMemberOptions`
- **Status:** **resolvido**
- **Evidência:** `frontend/src/hooks/useMemberOptions.ts`
  - remoção da estratégia anterior com abort não integrado;
  - adoção de `requestIdRef` monotônico para aceitar apenas a resposta mais recente.
- **Conclusão QA:** mitigação de stale response implementada corretamente.

### ACHADO 06 — N+1 em contagem de membros na listagem
- **Status:** **resolvido**
- **Evidência:** `backend/src/controllers/groupController.ts`
  - remoção do loop de contagem por grupo;
  - query única em `member_groups` com `.in('group_id', groupIds)` + agregação em memória.
- **Conclusão QA:** ganho de escalabilidade aplicado.

### ACHADO 07 — Fallback silencioso `memberCount: 0`
- **Status:** **resolvido**
- **Evidência:** `backend/src/controllers/groupController.ts`
  - em erro da contagem, endpoint retorna `500` explícito (`Erro ao calcular resumo dos grupos`);
  - não há mais fallback silencioso para zero.
- **Conclusão QA:** contrato ficou mais confiável.

### ACHADO 08 — Remoção sem loading por item
- **Status:** **resolvido**
- **Evidência:** `frontend/src/components/groups/GroupModal.tsx`
  - inclusão de `removingMemberId`;
  - botão de remover desabilita por item e mostra spinner durante request.
- **Conclusão QA:** evita duplicidade acidental no item em remoção.

### ACHADO 09 — Empty state sem contexto de filtros
- **Status:** **resolvido**
- **Evidência:** `frontend/src/components/groups/GroupList.tsx`, `frontend/src/app/(main)/groups/page.tsx`
  - `GroupList` recebeu `hasActiveFilters` e `onClearFilters`;
  - empty state diferencia “sem dados” vs “sem resultados para filtros”.
- **Conclusão QA:** mensagem ficou contextual e mais clara.

---

## 3. Regressões / efeitos colaterais

### EC-01 (novo ticket) — `getGroup` ainda pode mascarar falha de membros como lista vazia
- **Tipo:** regressão funcional silenciosa residual (não introduzida pelo ajuste, mas ainda presente após correção do ACHADO 02)
- **Impacto:** modal pode continuar mostrando estado equivalente a “sem membros” quando a falha acontece no `GET /api/groups/:id` durante a consulta de `member_groups`.
- **Evidência:** `backend/src/controllers/groupController.ts`
  - no `getGroup`, `memberGroupsError` é logado e a resposta segue com `membersList` vazio.
- **Ajuste recomendado (mínima mudança segura):**
  - retornar erro explícito quando falhar a carga de `member_groups`; **ou**
  - incluir flag de degradação no payload para frontend diferenciar erro de vazio real.

---

## 4. Avaliação de UX após correção

Evolução positiva clara:
- feedback de erro no modal melhorou (membros disponíveis, membros vinculados, exportação);
- listagem inicial deixou de esconder grupos por default;
- empty state ficou contextual;
- remoção de membro ficou mais previsível com loading por item.

Ponto ainda frágil:
- experiência ainda pode parecer inconsistente quando a falha ocorre no backend de `getGroup` e retorna vazio “válido” para o frontend.

---

## 5. Itens encerrados

- ACHADO 01
- ACHADO 03
- ACHADO 04
- ACHADO 05
- ACHADO 06
- ACHADO 07
- ACHADO 08
- ACHADO 09

---

## 6. Itens reabertos

- **ACHADO 02 — parcialmente resolvido**  
  Motivo: há correção no frontend, mas o backend ainda possui caminho de erro silencioso no `getGroup`.

- **Novo ticket: EC-01**  
  Motivo: mascaramento de erro de `member_groups` no `GET /api/groups/:id` pode manter sintoma de vazio falso no modal.

---

## Parecer final (encerrar x reabrir x novo ticket)

- **Pode ser encerrado:** 7 achados (01, 03, 04, 05, 06, 07, 08, 09).  
- **Deve ser reaberto:** ACHADO 02 (parcial).  
- **Virou novo ticket:** EC-01 (tratamento de erro no `getGroup`).

Sem corrigir o ponto de backend acima, a revalidação fica como **aprovada com ressalva** para o módulo 06.  
