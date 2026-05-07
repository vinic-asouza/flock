# Relatório de Execução — Módulo 05: Gestão de Congregações

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-05-congregacoes/modulo-05-congregacoes.md`  
> **Status geral:** ✅ 10/10 achados implementados

---

## Resumo executivo

Os 10 achados do QA foram tratados com foco em falhas silenciosas, consistência de contrato FE/BE e proteção de estado assíncrono.  

As correções priorizaram:
- separação explícita entre erro e estado vazio em carregamento de membros;
- eliminação de falso negativo no fluxo de edição;
- remoção de fallback silencioso de contagem zerada no backend;
- alinhamento de validação de telefone entre frontend e backend;
- robustez no vínculo Estado/Cidade com mensagens de erro e retry para IBGE.

---

## Achados e implementações

### ACHADO 01 — Erro de membros engolido como empty state ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/CongregationModal.tsx`

**Solução aplicada:**
- Criado estado dedicado `errorMembers`.
- `catch` de `loadMembers` agora usa `formatApiError(err)` e não converte mais erro para lista vazia.
- UI do modal passou a renderizar bloco de erro com botão **"Tentar novamente"**.

**Resultado:** falha de integração em `GET /members` não aparece mais como "Nenhum membro vinculado".

---

### ACHADO 02 — PUT bem-sucedido + GET de recarga com falha gera falso erro ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/EditCongregationModal.tsx`

**Solução aplicada:**
- Removido acoplamento entre sucesso do `PUT` e `GET` subsequente.
- Fluxo de sucesso usa diretamente o retorno de `apiService.updateCongregation(...)`.
- Tratamento de erro padronizado com `formatApiError`.

**Resultado:** sucesso do update não depende de segunda requisição não crítica.

---

### ACHADO 03 — Backend retornava `activeMembersCount = 0` em falha parcial ✅ RESOLVIDO

**Arquivos:** `backend/src/controllers/congregationController.ts`

**Solução aplicada:**
- Em `getCongregations`, erro na query de membros não retorna mais dado degradado.
- Agora responde `500` com mensagem explícita de falha no cálculo do resumo.

**Resultado:** API não mascara integridade de dados com contagem falsa.

---

### ACHADO 04 — Exclusão via modal de detalhes sem `activeMembersCount` ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/CongregationModal.tsx`, `frontend/src/app/(main)/congregations/page.tsx`

**Solução aplicada:**
- Callback `onDelete` do modal de detalhes passou a propagar `activeMembersCount`.
- `page.tsx` passou a receber e encaminhar o valor para o `DeleteCongregationModal`.

**Resultado:** bloqueio preventivo de exclusão funciona de forma consistente nos dois gatilhos (card e modal de detalhes).

---

### ACHADO 05 — Race condition na busca da listagem ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/CongregationList.tsx`

**Solução aplicada:**
- Introduzido `requestIdRef` monotônico em `loadCongregations`.
- Respostas fora de ordem são descartadas antes de atualizar estado.
- `loading`/`error` só são alterados pela requisição mais recente.

**Resultado:** última busca digitada prevalece, evitando overwrite por resposta atrasada.

---

### ACHADO 06 — Race condition na busca/paginação do modal de membros ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/CongregationModal.tsx`

**Solução aplicada:**
- Aplicado mesmo padrão de `requestId` monotônico no `loadMembers`.
- Respostas antigas são ignoradas.

**Resultado:** paginação e busca no modal ficam consistentes mesmo com latência alta.

---

### ACHADO 07 — Inconsistência Estado/Cidade na troca de UF ✅ RESOLVIDO

**Arquivos:** `frontend/src/components/congregations/CongregationForm.tsx`, `frontend/src/hooks/useIbgeData.ts`

**Solução aplicada:**
- Alteração de estado agora limpa `city` imediatamente.
- Submit é bloqueado quando lista de cidades está indisponível (carregando/erro/vazia com UF selecionada).
- `fetchCities` passou a limpar estado anterior e controlar concorrência via `requestId`.

**Resultado:** não é mais possível submeter cidade antiga após troca de UF em cenário de falha/intermitência.

---

### ACHADO 08 — Divergência de contrato de telefone FE/BE ✅ RESOLVIDO

**Arquivos:** `backend/src/validators/congregationValidator.ts`

**Solução aplicada:**
- Backend passou a validar também quantidade real de dígitos (10 ou 11), além do pattern de caracteres.
- Regra aplicada em `createCongregationSchema` e `updateCongregationSchema`.

**Resultado:** contrato semântico de telefone alinhado ao frontend.

---

### ACHADO 09 — Batch permitia duplicatas internas no payload ✅ RESOLVIDO

**Arquivos:** `backend/src/controllers/congregationController.ts`

**Solução aplicada:**
- Antes de consultar banco, o backend valida duplicatas internas no próprio lote (`case-insensitive`).
- Em caso de repetição, retorna `400` com lista dos nomes duplicados no payload.

**Resultado:** importação em lote não cria congregações duplicadas dentro da mesma operação.

---

### ACHADO 10 — Erros de IBGE não eram exibidos na UI ✅ RESOLVIDO

**Arquivos:** `frontend/src/hooks/useIbgeData.ts`, `frontend/src/components/congregations/CongregationForm.tsx`

**Solução aplicada:**
- Formulário passou a exibir `errorStates` e `errorCities` com contexto e botão de retry.
- Hook expôs `fetchStates()` para retry explícito de estados.

**Resultado:** usuário recebe feedback claro de falha externa e ação de recuperação sem sair do fluxo.

---

## Mapa de arquivos alterados

| Arquivo | Achados |
|---|---|
| `frontend/src/components/congregations/CongregationModal.tsx` | 01, 04, 06 |
| `frontend/src/components/congregations/EditCongregationModal.tsx` | 02 |
| `frontend/src/components/congregations/CongregationList.tsx` | 05 |
| `frontend/src/app/(main)/congregations/page.tsx` | 04 |
| `frontend/src/components/congregations/CongregationForm.tsx` | 07, 10 |
| `frontend/src/hooks/useIbgeData.ts` | 07, 10 |
| `backend/src/controllers/congregationController.ts` | 03, 09 |
| `backend/src/validators/congregationValidator.ts` | 08 |

---

## Validação executada

- Leitura e validação estática do fluxo ponta a ponta FE/BE para todos os achados do relatório.
- Verificação de lint dos arquivos alterados via `ReadLints`: **0 erros**.

---

## Cenários manuais recomendados (smoke)

1. Forçar erro em `GET /members` no modal de congregação e validar estado de erro + retry (não empty).  
2. Simular `PUT /congregations/:id` com sucesso e falha de rede logo após (confirmar ausência de falso erro no modal de edição).  
3. Simular falha na consulta de membros dentro de `GET /congregations` e validar resposta 500 no backend + erro visível na listagem FE.  
4. Tentar excluir congregação com membros ativos a partir do card e do modal de detalhes (bloqueio consistente).  
5. Digitar rapidamente na busca de congregações e na busca de membros do modal para confirmar prevalência da última busca.  
6. Trocar UF com cidade já selecionada e validar limpeza imediata de cidade + bloqueio de submit até cidades válidas.  
7. Testar telefones com 9, 10, 11 e 12 dígitos para confirmar regra unificada FE/BE.  
8. Enviar batch com nomes duplicados no mesmo payload e validar rejeição 400 com detalhe dos nomes.  
9. Bloquear `servicodados.ibge.gov.br` e validar mensagens de erro + retry para estados/cidades.

---

## Pós-revalidação — Correção de efeito colateral

> **Referência:** `docs/QA/modulo-05-congregacoes/modulo-05-congregacoes-revalidacao.md`

### EC-01 — Edição bloqueada por falha de IBGE sem alteração de localização ✅ CORRIGIDO

**Arquivo:** `frontend/src/components/congregations/CongregationForm.tsx`

**Causa confirmada:**
- a regra de `isSubmitBlocked` bloqueava o submit global sempre que havia indisponibilidade de estados/cidades;
- em modo `edit`, isso impedia salvar alterações como `leader`/`phone` mesmo sem mudança de `state/city`.

**Solução aplicada:**
- adicionada leitura de `dirtyFields` do `react-hook-form`;
- nova regra: bloqueio por localização só ocorre quando:
  - `mode === 'create'`, ou
  - em `mode === 'edit'`, se `state` ou `city` tiverem sido alterados pelo usuário.

**Resultado esperado:**
- edição de campos não relacionados a localização permanece disponível durante indisponibilidade do IBGE;
- criação e edição com mudança de UF/cidade continuam protegidas por validação e bloqueio de envio.

---

## Achados adicionais

- Não foram identificados novos blockers fora do escopo dos 10 itens originais durante esta rodada.
- Como melhoria futura, pode-se centralizar a regra de telefone em utilitário compartilhado entre FE/BE para reduzir risco de divergência em evoluções futuras.

---

## Pós-revalidação — Ciclo 2

> **Referência:** `docs/QA/modulo-05-congregacoes/modulo-05-congregacoes-revalidacao-ciclo2.md`

### Observação UX — mensagem de bloqueio exibida sem bloqueio real ✅ AJUSTADO

**Arquivo:** `frontend/src/components/congregations/CongregationForm.tsx`

**Contexto:**
- após correção do EC-01, o botão de submit podia ficar habilitado em `edit` sem alteração de localização;
- porém a mensagem "Aguarde o carregamento das cidades..." ainda aparecia apenas por `isCitiesUnavailable`, gerando ambiguidade visual.

**Ajuste aplicado:**
- a mensagem agora é exibida somente quando `shouldBlockByLocation && isCitiesUnavailable`, alinhando feedback visual com o estado real de bloqueio.

