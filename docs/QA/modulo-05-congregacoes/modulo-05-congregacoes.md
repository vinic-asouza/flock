# QA — Módulo 05: Gestão de Congregações

> **Analista:** QA Sênior (IA)  
> **Data:** Maio 2026  
> **Tipo:** Auditoria inicial (usabilidade + integração FE/BE + bugs silenciosos)  
> **Escopo:** listagem `/congregations`, criação, edição, exclusão, visualização detalhada, exportação PDF e integração com membros  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 5), `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O fluxo de Congregações está funcional no caminho feliz e tem boa base de UX (modais claros, prevenção de duplo submit em ações principais, feedback visual de carregamento e bloqueio de ações por papel).  

Entretanto, a auditoria encontrou **10 achados**, com foco em **falhas silenciosas e inconsistências difíceis de perceber**:

- erros de integração engolidos e convertidos em estados de "vazio";
- possibilidade de feedback falso de erro após sucesso real;
- divergências entre validação frontend/backend;
- riscos de estado inconsistente em busca assíncrona e no vínculo cidade/estado;
- inconsistências no fluxo de exclusão quando acionado pelo modal de detalhes.

### Principais riscos

- **Gravidade geral:** **Alta**
- **Risco funcional silencioso:** dados e estados incorretos sem quebra visual
- **Risco de UX:** usuário recebe feedback contraditório (erro quando já salvou / vazio quando houve falha)
- **Risco de contrato:** backend aceita formatos que o frontend não aceitaria (ou vice-versa)

### Placar de achados

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 5 | 01, 02, 03, 07, 08 |
| Média | 4 | 04, 05, 06, 10 |
| Baixa | 1 | 09 |

---

## 2. Mapa do fluxo analisado

**Entrada**
- Usuário autenticado acessa `/congregations` (`frontend/src/app/(main)/congregations/page.tsx`)

**Passos principais**
1. FE carrega lista via `apiService.listCongregations()`  
2. Backend responde `GET /api/congregations` com congregações + `activeMembersCount`  
3. Usuário pode:
   - criar (`POST /api/congregations`)
   - editar (`PUT /api/congregations/:id`)
   - excluir (`DELETE /api/congregations/:id`)
   - visualizar detalhes (modal + membros filtrados via `GET /api/members`)
   - exportar PDF (`POST /api/export/congregations/list`)

**Integrações**
- Frontend:
  - `frontend/src/components/congregations/*`
  - `frontend/src/services/api.ts`
  - `frontend/src/hooks/useIbgeData.ts`
- Backend:
  - `backend/src/routes/congregations.ts`
  - `backend/src/controllers/congregationController.ts`
  - `backend/src/validators/congregationValidator.ts`
  - `backend/src/routes/export.ts`
  - `backend/src/controllers/exportController.ts`

**Saída esperada**
- CRUD consistente por tenant (`church_id`)
- validações FE/BE alinhadas
- feedback claro em sucesso/erro/loading
- bloqueio correto para reader e sessão inválida/expirada

---

## 3. Achados

### ACHADO 01 — Erro ao carregar membros no modal é engolido e exibido como "nenhum membro"
- **Gravidade:** alta  
- **Tipo:** bug / UX / contrato API  
- **Impacto no usuário:** quando a chamada de membros falha (timeout, 403, 500), o modal mostra estado de vazio, induzindo o usuário a concluir que não há membros vinculados.  
- **Onde ocorre:** `frontend/src/components/congregations/CongregationModal.tsx`
- **Arquivos relacionados:** `CongregationModal.tsx`, `api.ts`
- **Evidência:**
```tsx
// catch silencioso converte falha em lista vazia
} catch {
  setMembersResponse({ data: [] });
}
```
- **Como reproduzir:** abrir modal de congregação e simular falha em `GET /api/members` (rede lenta/offline ou erro no backend); UI mostra "Nenhum membro vinculado".
- **Causa provável:** ausência de estado de erro dedicado para carregamento de membros.
- **Sugestão objetiva de correção:** tratar erro com mensagem/retry específico (`errorMembers`) e não cair no mesmo estado de empty.

---

### ACHADO 02 — Edição pode salvar com sucesso, mas UI exibe erro (falso negativo)
- **Gravidade:** alta  
- **Tipo:** bug / estado inconsistente  
- **Impacto no usuário:** `PUT` conclui com sucesso, mas um erro na chamada seguinte (`GET` de recarga) gera mensagem de falha; usuário acredita que não salvou e pode repetir ação, criando inconsistência operacional.
- **Onde ocorre:** `frontend/src/components/congregations/EditCongregationModal.tsx`
- **Arquivos relacionados:** `EditCongregationModal.tsx`, `api.ts`
- **Evidência:**
```tsx
await apiService.updateCongregation(congregationId, data);
const updatedCongregation = await apiService.getCongregation(congregationId);
onSuccess(updatedCongregation);
```
- **Como reproduzir:** permitir sucesso no `PUT` e falha no `GET` subsequente (intermitência de rede); modal mostra erro apesar de persistência já aplicada.
- **Causa provável:** acoplamento do sucesso da atualização a uma segunda requisição não crítica.
- **Sugestão objetiva de correção:** considerar `PUT` como sucesso definitivo e usar retorno do próprio `PUT`; se recarregar falhar, tratar como warning não bloqueante.

---

### ACHADO 03 — Backend zera contagem de membros silenciosamente em falha parcial
- **Gravidade:** alta  
- **Tipo:** bug silencioso / integração backend  
- **Impacto no usuário:** lista de congregações pode mostrar `activeMembersCount = 0` para todas as congregações quando a query de membros falha; isso afeta resumo, badges e decisão de exclusão.
- **Onde ocorre:** `backend/src/controllers/congregationController.ts` (`getCongregations`)
- **Arquivos relacionados:** `congregationController.ts`, `CongregationSummaryBar.tsx`, `CongregationCard.tsx`
- **Evidência:**
```ts
if (membersError) {
  return res.json(congregations.map(c => ({ ...c, activeMembersCount: 0 })));
}
```
- **Como reproduzir:** falhar query de `members` com `GET /api/congregations`; API continua 200 com contagens zeradas.
- **Causa provável:** estratégia de fallback que prioriza disponibilidade, mas mascara integridade dos dados.
- **Sugestão objetiva de correção:** retornar erro explícito (5xx) ou sinalizar metadado de dados parciais; não devolver contagem falsa como dado válido.

---

### ACHADO 04 — Exclusão a partir do modal de detalhes ignora contagem ativa local
- **Gravidade:** média  
- **Tipo:** UX / fluxo  
- **Impacto no usuário:** ao excluir pela lista, modal bloqueia corretamente se há membros ativos; ao excluir pelo modal de detalhes, a contagem não é repassada e o usuário só descobre o bloqueio após tentativa no backend.
- **Onde ocorre:** `frontend/src/app/(main)/congregations/page.tsx` + `frontend/src/components/congregations/CongregationModal.tsx`
- **Arquivos relacionados:** `congregations/page.tsx`, `CongregationModal.tsx`, `DeleteCongregationModal.tsx`
- **Evidência:**
```tsx
// vindo do modal de detalhes: sem activeMembersCount
onDelete={(id, name) => {
  setDetailModalOpen(false);
  handleDeleteCongregation(id, name); // terceiro parâmetro vira 0
}}
```
- **Como reproduzir:** abrir congregação com membros ativos no modal de detalhes e clicar excluir.
- **Causa provável:** assinatura de callback do modal de detalhes sem `activeMembersCount`.
- **Sugestão objetiva de correção:** propagar `activeMembersCount` ao abrir o modal de exclusão também no fluxo de detalhes.

---

### ACHADO 05 — Busca de congregações sem cancelamento pode sobrescrever resultado mais recente
- **Gravidade:** média  
- **Tipo:** risco / estado assíncrono  
- **Impacto no usuário:** digitação rápida pode exibir resultado antigo após resposta fora de ordem (race condition), aparentando que o filtro "não funciona direito".
- **Onde ocorre:** `frontend/src/components/congregations/CongregationList.tsx` + `MemberSearchInput.tsx`
- **Arquivos relacionados:** `CongregationList.tsx`, `MemberSearchInput.tsx`, `api.ts`
- **Evidência:** múltiplas chamadas sem `AbortController`/request-id e sem descarte de resposta atrasada.
- **Como reproduzir:** digitar rapidamente vários termos com rede instável.
- **Causa provável:** ausência de controle de concorrência entre requests.
- **Sugestão objetiva de correção:** usar token de requisição/cancelamento e aplicar somente a última resposta válida.

---

### ACHADO 06 — Busca de membros no modal também tem risco de resposta fora de ordem
- **Gravidade:** média  
- **Tipo:** risco / UX  
- **Impacto no usuário:** paginação/busca dentro do modal pode mostrar conjunto de membros defasado.
- **Onde ocorre:** `frontend/src/components/congregations/CongregationModal.tsx`
- **Arquivos relacionados:** `CongregationModal.tsx`, `api.ts`
- **Evidência:** `loadMembers` dispara por `membersPage` e `membersSearchDebounced`, sem cancelamento/validação da "última requisição vencedora".
- **Como reproduzir:** alternar paginação e busca rapidamente em conexão lenta.
- **Causa provável:** mesmo padrão assíncrono sem proteção de corrida.
- **Sugestão objetiva de correção:** aplicar estratégia de cancelamento ou monotonic request id para `loadMembers`.

---

### ACHADO 07 — Estado/Cidade pode ficar inconsistente na troca de UF
- **Gravidade:** alta  
- **Tipo:** validação / UX  
- **Impacto no usuário:** troca de estado pode preservar cidade anterior e gerar submissão inconsistente, especialmente quando IBGE falha/intermite.
- **Onde ocorre:** `frontend/src/components/congregations/CongregationForm.tsx` + `frontend/src/hooks/useIbgeData.ts`
- **Arquivos relacionados:** `CongregationForm.tsx`, `useIbgeData.ts`
- **Evidência:**
```tsx
onChange={(value) => setValue('state', value)} // não limpa city no mesmo momento
```
```ts
// fetchCities em erro não força limpeza consistente do estado de cidade selecionada
const response = await fetch(`.../municipios...`);
```
- **Como reproduzir:** selecionar cidade em um estado, trocar estado e submeter sob falha de carregamento de cidades.
- **Causa provável:** falta de reset explícito de `city` ao mudar `state` + dependência de API externa sem fallback.
- **Sugestão objetiva de correção:** limpar `city` imediatamente em troca de `state` e bloquear submit enquanto lista de cidades estiver inválida/indisponível.

---

### ACHADO 08 — Divergência de contrato de validação de telefone entre FE e BE
- **Gravidade:** alta  
- **Tipo:** contrato API / validação  
- **Impacto no usuário:** payloads que passam no backend podem ser recusados no frontend (ou vice-versa), gerando comportamento inconsistente entre canais (UI vs API).
- **Onde ocorre:** `CongregationForm.tsx` (Zod) vs `congregationValidator.ts` (Joi)
- **Arquivos relacionados:** `frontend/src/components/congregations/CongregationForm.tsx`, `backend/src/validators/congregationValidator.ts`
- **Evidência:**
```ts
// FE exige 10-11 dígitos reais
return numbersOnly.length >= 10 && numbersOnly.length <= 11
```
```ts
// BE aceita padrão por caracteres (10-15), sem garantir 10-11 dígitos
.pattern(phoneRegex) // /^[\d\s\(\)\-]{10,15}$/
```
- **Como reproduzir:** enviar telefone com combinações permitidas por regex, mas sem validação equivalente de dígitos.
- **Causa provável:** regras de validação evoluíram separadamente.
- **Sugestão objetiva de correção:** centralizar regra de telefone (mesma semântica em FE e BE) e validar quantidade de dígitos no backend.

---

### ACHADO 09 — Endpoint de criação em lote permite duplicatas no mesmo payload
- **Gravidade:** baixa  
- **Tipo:** risco / validação  
- **Impacto no usuário:** importação em lote pode criar duas congregações com mesmo nome na mesma operação, caso duplicata exista apenas dentro do array enviado.
- **Onde ocorre:** `backend/src/controllers/congregationController.ts` (`createCongregationsBatch`)
- **Arquivos relacionados:** `congregationController.ts`
- **Evidência:** a verificação de duplicidade compara payload com banco, mas não valida duplicidade interna no próprio `req.body`.
- **Como reproduzir:** enviar array com dois itens de `name` idêntico.
- **Causa provável:** ausência de deduplicação intra-lote antes do insert.
- **Sugestão objetiva de correção:** validar nomes únicos no payload (case-insensitive) antes de inserir.

---

### ACHADO 10 — Erros de IBGE não são expostos ao usuário no formulário
- **Gravidade:** média  
- **Tipo:** UX / observabilidade  
- **Impacto no usuário:** quando falha carregamento de estados/cidades, o formulário apenas degrada comportamento (ou bloqueia seleção) sem mensagem clara de causa/ação.
- **Onde ocorre:** `frontend/src/hooks/useIbgeData.ts` + `frontend/src/components/congregations/CongregationForm.tsx`
- **Arquivos relacionados:** `useIbgeData.ts`, `CongregationForm.tsx`
- **Evidência:**
```ts
const [errorStates, setErrorStates] = useState<string | null>(null);
const [errorCities, setErrorCities] = useState<string | null>(null);
```
Esses erros são mantidos no hook, mas não renderizados no formulário.
- **Como reproduzir:** bloquear acesso a `servicodados.ibge.gov.br` e abrir criação/edição.
- **Causa provável:** ausência de binding de `errorStates/errorCities` na UI.
- **Sugestão objetiva de correção:** exibir erro contextual + ação de retry para estados/cidades.

---

## 4. Cenários extras a testar

- Sessão expirada no meio do fluxo de criação/edição/exclusão (confirmar redirect para `/login` e ausência de estado quebrado no modal).
- Usuário `reader` tentando acionar endpoints via DevTools (backend deve responder 403 com mensagem clara).
- Duplo clique em "Criar Congregação"/"Salvar Alterações"/"Excluir" com latência alta.
- Digitação rápida na busca da listagem e no modal de membros (verificar se último termo sempre prevalece).
- Falha temporária de rede no segundo request do modal de edição (após `PUT`).
- Erro de integração no carregamento de membros no modal (não deve cair em empty state).
- Troca de estado com cidade já preenchida + falha IBGE.
- Exclusão concorrente: outro usuário vincula membro à congregação enquanto exclusão está aberta.
- Exportação PDF com resultado vazio, sessão inválida e erro blob/json.
- Criação em lote com nomes repetidos no mesmo payload.

---

## 5. Lacunas de cobertura

### Testes automatizados ausentes
- Fluxo de erro no `loadMembers` do modal (deve renderizar erro e retry, não empty).
- Cenário `PUT` bem-sucedido + `GET` de recarga com falha no modal de edição.
- Busca concorrente (resposta fora de ordem) em listagem e modal.
- Troca de UF com cidade preexistente e submissão bloqueada até cidade válida.
- Contrato de telefone unificado FE/BE.
- Batch com duplicatas internas.

### Validações ausentes / divergentes
- Regra de telefone no backend sem validação de quantidade real de dígitos.
- Duplicidade intra-lote em `POST /congregations/batch`.
- Falta de validação forte de consistência cidade/estado no backend.

### Observabilidade/logs ausentes
- Falha parcial em `getCongregations` (membersError) retorna dado degradado sem sinalização para cliente.
- Falhas de IBGE sem telemetria visível no frontend.

### Contratos não garantidos
- Fluxo de exclusão depende de `activeMembersCount` no frontend, mas esse dado não é propagado de forma consistente em todos os gatilhos.
- Sem contrato explícito para distinguir "vazio real" vs "erro de carregamento" no modal de membros.

---

## 6. O que o desenvolvimento deve ajustar (priorizado)

### Prioridade alta (corrigir primeiro)
1. **Separar erro de empty state** no `CongregationModal` (membros).  
2. **Desacoplar sucesso do `PUT` da recarga pós-update** no `EditCongregationModal`.  
3. **Parar de retornar contagem falsa `0`** quando a query de membros falhar em `getCongregations`.  
4. **Sincronizar regra de telefone FE/BE** com o mesmo contrato.  
5. **Resetar `city` ao trocar `state` e bloquear submit em estado inválido da lista de cidades**.

### Prioridade média
6. Propagar `activeMembersCount` também no fluxo de exclusão vindo do modal de detalhes.  
7. Implementar controle de concorrência (cancelamento/request-id) nas buscas da listagem e do modal.  
8. Expor erros de IBGE na UI com retry.

### Prioridade baixa
9. Validar duplicidade interna no payload do `POST /congregations/batch`.

### Mudança mínima segura sugerida
- Introduzir estados explícitos `loading/error/empty` onde hoje há fallback silencioso.
- Evitar "segunda requisição obrigatória" para confirmar sucesso de operação já persistida.
- Tornar validações compartilhadas por contrato (mesmo critério semântico em FE e BE).

---

**Parecer final:** módulo com base boa de UX no caminho feliz, mas **não está pronto para fechamento de QA** sem correção dos achados de alta, especialmente os silenciosos de estado/integração (01, 02, 03, 07, 08).  
