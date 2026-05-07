# QA — Módulo 06: Gestão de Grupos

> **Analista:** QA Sênior (IA)  
> **Data:** Maio 2026  
> **Tipo:** Auditoria inicial (usabilidade + integração FE/BE + bugs silenciosos)  
> **Escopo:** listagem `/groups`, filtros, criação/edição/exclusão, modal de detalhes, composição de membros e exportações  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 6), `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O módulo tem uma base funcional boa no caminho feliz (CRUD completo, filtros, vínculo com membros, exportações e proteção por papel no backend).  

A auditoria, porém, encontrou **9 achados**, com foco em bugs silenciosos e inconsistências ponta a ponta:

- regra de negócio aplicada no `POST /groups` não é mantida no `PUT /groups/:id` (abertura para inconsistência e potencial vazamento cross-tenant de responsável);
- estados de erro engolidos em carregamentos críticos no modal;
- fluxos de exportação e carregamento que podem falhar sem feedback útil;
- divergência entre expectativa funcional da listagem e filtro padrão aplicado no frontend;
- riscos de corrida e inconsistência em ações concorrentes.

### Principais riscos

- **Gravidade geral:** **Alta**
- **Risco de integridade/segurança funcional:** atualização permite combinações inválidas de `responsible_id`/`congregation_id`
- **Risco de UX silenciosa:** erro convertido em vazio em áreas de membros
- **Risco de confiança do usuário:** exportar sem retorno claro em falha

### Placar de achados

| Gravidade | Qtd | IDs |
|---|---:|---|
| Crítica | 1 | 01 |
| Alta | 3 | 02, 03, 04 |
| Média | 4 | 05, 06, 07, 08 |
| Baixa | 1 | 09 |

---

## 2. Mapa do fluxo analisado

**Entrada**
- Usuário autenticado acessa `/groups` (`frontend/src/app/(main)/groups/page.tsx`)

**Passos principais**
1. FE carrega lista via `GET /api/groups` com filtros (`congregation_id`, `type`, `status`, `search`)
2. `GroupSummaryBar` exibe total de grupos/membros
3. Editor cria/edita via `GroupForm` (modal)
4. Modal de detalhes (`GroupModal`) permite:
   - ver dados do grupo e responsável
   - adicionar/remover membros (`POST/DELETE /api/groups/:id/members`)
   - exportar membros (`POST /api/export/group/members/list`)
5. Listagem global exporta grupos (`POST /api/export/groups/list`)

**Integrações**
- Frontend:
  - `frontend/src/app/(main)/groups/page.tsx`
  - `frontend/src/components/groups/*`
  - `frontend/src/hooks/useMemberOptions.ts`
  - `frontend/src/hooks/useFiltersData.ts`
  - `frontend/src/services/api.ts`
- Backend:
  - `backend/src/routes/groups.ts`
  - `backend/src/controllers/groupController.ts`
  - `backend/src/validators/groupValidator.ts`
  - `backend/src/utils/groupValidations.ts`
  - `backend/src/controllers/exportController.ts`

**Saída esperada**
- CRUD consistente por igreja (`church_id`)
- regras de vínculo responsável/congregação aplicadas em create e update
- tratamento explícito de erros em modal e exportações
- estados de loading/erro/empty previsíveis e sem ambiguidades

---

## 3. Achados

### ACHADO 01 — `PUT /groups/:id` não reaplica validações de congregação/responsável (quebra de regra de negócio e risco cross-tenant)
- **Gravidade:** crítica  
- **Tipo:** bug / validação / autenticação funcional  
- **Impacto no usuário:** um grupo pode ser atualizado com `responsible_id` ou `congregation_id` incompatíveis com a igreja/estrutura do grupo; isso pode expor nome de membro de outra igreja no frontend (join por FK do responsável) e gerar estado inconsistente difícil de detectar.
- **Onde ocorre:** backend update de grupos
- **Arquivos relacionados:** `backend/src/controllers/groupController.ts`, `backend/src/utils/groupValidations.ts`
- **Evidência:**
```ts
// createGroup valida explicitamente:
const congregationValidation = await validateGroupCongregation(...);
const responsibleValidation = await validateResponsibleAndCongregation(...);

// updateGroup NÃO chama essas validações antes do update.
const updateData: Partial<Group> = { ...req.body, updated_at: new Date() };
await supabase.from('groups').update(updateData)...
```
- **Como reproduzir:** enviar `PUT /api/groups/:id` com `responsible_id` de membro inválido para o contexto da congregação (ou de outra igreja, se ID conhecido) e observar persistência/efeito no join de listagem/detalhe.
- **Causa provável:** validação completa foi implementada no create, mas omitida no update.
- **Sugestão objetiva de correção:** no `updateGroup`, aplicar `validateGroupCongregation` e `validateResponsibleAndCongregation` com os valores finais (merge entre existente + payload), antes de persistir.

---

### ACHADO 02 — Erros de carregamento de membros no modal são engolidos e viram listas vazias
- **Gravidade:** alta  
- **Tipo:** bug silencioso / UX  
- **Impacto no usuário:** quando falham `loadAvailableMembers` ou `loadFullMembersData`, a UI aparenta "sem membros disponíveis/vinculados", mascarando erro real de integração.
- **Onde ocorre:** modal de grupo
- **Arquivos relacionados:** `frontend/src/components/groups/GroupModal.tsx`
- **Evidência:**
```tsx
// loadAvailableMembers
} catch {
  setAvailableMembers([]);
}

// loadFullMembersData
} catch {
  setFullMembersData([]);
}
```
- **Como reproduzir:** simular falha em `GET /members` ou `GET /groups/:id/members`; modal mostra vazio sem estado de erro.
- **Causa provável:** fallback para não bloquear UI sem distinção entre "erro" e "zero dados".
- **Sugestão objetiva de correção:** introduzir estados de erro dedicados (ex.: `errorAvailableMembers`, `errorMembersList`) com retry explícito.

---

### ACHADO 03 — Falha na exportação de membros do grupo pode ficar sem feedback
- **Gravidade:** alta  
- **Tipo:** bug / UX / integração  
- **Impacto no usuário:** ao falhar exportação no modal de membros, usuário pode não receber mensagem contextual clara (fluxo depende de exceção subir por múltiplas camadas e há `catch` silencioso no modal de export).
- **Onde ocorre:** exportação no modal de grupo
- **Arquivos relacionados:** `frontend/src/components/groups/GroupModal.tsx`, `frontend/src/components/groups/ExportGroupMembersModal.tsx`
- **Evidência:**
```tsx
// ExportGroupMembersModal
try {
  await onExport(selectedFields);
} catch {
  // Erro tratado no pai
}
```
`onExport` no pai não encapsula erro com contexto do modal (depende de comportamento externo).
- **Como reproduzir:** forçar erro 500 em `POST /api/export/group/members/list`.
- **Causa provável:** tratamento distribuído e incompleto entre componente pai e filho.
- **Sugestão objetiva de correção:** centralizar o tratamento no `ExportGroupMembersModal` com `toast`/mensagem local consistente, incluindo retry.

---

### ACHADO 04 — Filtro inicial restringe para `sede` e não para “todos”, ocultando grupos sem indicação explícita
- **Gravidade:** alta  
- **Tipo:** UX / estado inconsistente  
- **Impacto no usuário:** ao entrar em `/groups`, usuário vê somente grupos da sede por padrão e pode interpretar que grupos de congregações não existem.
- **Onde ocorre:** estado inicial dos filtros
- **Arquivos relacionados:** `frontend/src/app/(main)/groups/page.tsx`
- **Evidência:**
```ts
const initialFilters: GroupFilters = {
  search: '',
  congregationId: 'sede',
  type: '',
  status: 'all'
};
```
- **Como reproduzir:** ter grupos em congregações e acessar `/groups` pela primeira vez.
- **Causa provável:** escolha de default sem sinalização forte de escopo filtrado.
- **Sugestão objetiva de correção:** default em “todas as congregações” (`congregationId: ''`) ou exibir banner/chip de filtro ativo com destaque mais forte no primeiro carregamento.

---

### ACHADO 05 — `useMemberOptions` usa `AbortController`, mas não cancela request Axios (risco de resposta fora de ordem)
- **Gravidade:** média  
- **Tipo:** risco / estado assíncrono  
- **Impacto no usuário:** busca de responsável pode mostrar opções defasadas em digitação rápida/troca de congregação.
- **Onde ocorre:** hook de busca de membros
- **Arquivos relacionados:** `frontend/src/hooks/useMemberOptions.ts`, `frontend/src/services/api.ts`
- **Evidência:**
```ts
const controller = new AbortController();
abortRef.current = controller;
// ...
const response = await apiService.listMembers(...); // sem signal no request
```
- **Como reproduzir:** alternar congregação e termo de busca rapidamente com latência alta.
- **Causa provável:** intenção de cancelamento implementada sem integração efetiva com a camada de request.
- **Sugestão objetiva de correção:** usar `signal` com axios/cancel token ou estratégia de `requestId` monotônico no hook.

---

### ACHADO 06 — Contagem de membros por grupo em `listGroups` é N+1 e degrada com escala
- **Gravidade:** média  
- **Tipo:** dívida técnica com potencial de bug/performance  
- **Impacto no usuário:** lentidão perceptível ao listar muitos grupos, podendo causar timeouts e estados intermitentes no frontend.
- **Onde ocorre:** listagem backend
- **Arquivos relacionados:** `backend/src/controllers/groupController.ts`
- **Evidência:**
```ts
const groupsWithMemberCount = await Promise.all(
  (groups || []).map(async (group) => {
    const { count } = await supabase.from('member_groups')...
  })
);
```
- **Como reproduzir:** igreja com alto número de grupos.
- **Causa provável:** contagem por loop em vez de agregação única.
- **Sugestão objetiva de correção:** agregar contagem em lote (query única por `group_id`) e mapear em memória.

---

### ACHADO 07 — Falha de contagem em `listGroups` retorna `memberCount: 0` silenciosamente
- **Gravidade:** média  
- **Tipo:** bug silencioso / contrato API  
- **Impacto no usuário:** resumo e cards podem exibir zero membros incorretamente sem indicar erro.
- **Onde ocorre:** listagem de grupos backend
- **Arquivos relacionados:** `backend/src/controllers/groupController.ts`, `frontend/src/components/groups/GroupSummaryBar.tsx`, `frontend/src/components/groups/GroupCard.tsx`
- **Evidência:**
```ts
if (countError) {
  return { ...group, memberCount: 0 };
}
```
- **Como reproduzir:** falha de consulta em `member_groups` durante listagem.
- **Causa provável:** fallback “tolerante” sem sinalização de parcialidade.
- **Sugestão objetiva de correção:** retornar erro explícito ou metadado de degradação; evitar substituir por dado potencialmente falso.

---

### ACHADO 08 — Remoção de membro no modal não tem estado de loading por item (ação concorrente)
- **Gravidade:** média  
- **Tipo:** risco / UX  
- **Impacto no usuário:** cliques repetidos em remover podem disparar múltiplas chamadas e mensagens contraditórias.
- **Onde ocorre:** modal de grupo
- **Arquivos relacionados:** `frontend/src/components/groups/GroupModal.tsx`
- **Evidência:** `handleRemoveMember` não controla flag de submissão por membro e botão continua clicável.
- **Como reproduzir:** clicar repetidamente em remover com rede lenta.
- **Causa provável:** ausência de controle de estado para operação de remoção.
- **Sugestão objetiva de correção:** adicionar `removingMemberId` e desabilitar botão correspondente durante request.

---

### ACHADO 09 — Estado vazio da listagem não diferencia “sem dados” de “resultado filtrado”
- **Gravidade:** baixa  
- **Tipo:** UX  
- **Impacto no usuário:** com filtros ativos, mensagem “Comece criando um novo grupo” pode induzir ação incorreta.
- **Onde ocorre:** lista de grupos
- **Arquivos relacionados:** `frontend/src/components/groups/GroupList.tsx`
- **Evidência:**
```tsx
<p className="text-sm text-gray-500">Comece criando um novo grupo.</p>
```
- **Como reproduzir:** aplicar filtros restritivos até zero resultados.
- **Causa provável:** empty state único para contextos distintos.
- **Sugestão objetiva de correção:** mensagem condicional para “nenhum resultado para os filtros” + CTA para limpar filtros.

---

## 4. Cenários extras a testar

- Sessão expirada durante:
  - criação/edição/exclusão de grupo
  - adicionar/remover membro no modal
  - exportações (`groups/list` e `group/members/list`)
- Usuário `reader` tentando operações de escrita via DevTools (POST/PUT/DELETE em `/api/groups/*`).
- Duplo clique em:
  - criar grupo
  - atualizar grupo
  - remover membro no modal
- Troca rápida de congregação + busca de responsável (verificar opções consistentes).
- Grupo com responsável da sede sendo migrado para congregação específica e vice-versa.
- Edição de grupo para congregação com responsável incompatível.
- Falha de rede no carregamento de membros disponíveis e membros vinculados no modal.
- Exportação com campos mínimos, campos máximos e erro de backend.
- Listagem com muitos grupos para avaliar impacto de N+1 na experiência.

---

## 5. Lacunas de cobertura

### Testes automatizados ausentes
- `PUT /groups/:id` garantindo as mesmas validações de create (congregação/responsável).
- Distinção de estados `error` vs `empty` no `GroupModal`.
- Busca de responsável com concorrência (stale response).
- Remoção de membro com proteção contra múltiplos cliques.
- Cenários de filtro inicial (sede vs todas) com assert de UX.

### Validações ausentes / frágeis
- Revalidação de regras de domínio no update (responsável/congregação).
- Fallback silencioso de contagem de membros com valor possivelmente incorreto.

### Observabilidade/logs ausentes
- Sem telemetria explícita no frontend para falhas de carregamento de membros no modal.
- Erros de exportação de membros não têm canal uniforme de feedback.

### Contratos não garantidos
- Comportamento de listagem inicial diverge da expectativa de “mapa geral” do módulo (filtro `sede` aplicado por padrão).
- Fluxo de erro no modal de grupo não diferencia indisponibilidade da API de ausência real de dados.

---

## 6. O que o desenvolvimento deve ajustar (priorizado)

### Prioridade crítica
1. **Aplicar no `updateGroup` as mesmas validações de negócio do create** (`validateGroupCongregation` + `validateResponsibleAndCongregation`) usando estado final do grupo.

### Prioridade alta
2. **Separar erro de empty state** no `GroupModal` para membros disponíveis e vinculados.  
3. **Revisar tratamento de erro de exportação de membros** com feedback consistente no modal.  
4. **Rever filtro padrão inicial de congregação** (trocar para “todas” ou explicitar fortemente escopo filtrado).

### Prioridade média
5. Implementar controle de concorrência efetivo na busca de responsáveis (`useMemberOptions`).  
6. Remover N+1 da contagem de membros em `listGroups`.  
7. Evitar fallback silencioso para `memberCount: 0` em erro de contagem.  
8. Adicionar estado de loading por item na remoção de membro no modal.

### Prioridade baixa
9. Diferenciar empty state sem dados vs sem resultados por filtro em `GroupList`.

### Mudança mínima segura sugerida
- Garantir paridade de regras create/update no backend.
- Substituir catches silenciosos por estados explícitos de erro com retry.
- Unificar padrão de feedback de erro em modal (evitar `alert`/silêncio).
- Reduzir ambiguidade de filtros default no primeiro carregamento.

---

**Parecer final:** módulo funcional no cenário principal, mas **não pronto para fechamento de QA** sem correção do achado crítico (01) e dos achados de alta (02, 03, 04), pois afetam integridade de regra de negócio, confiabilidade de dados e percepção real do usuário.  
