# QA — Revalidação — Módulo 05: Gestão de Congregações

> **Analista:** QA Sênior (IA)  
> **Data:** Maio 2026  
> **Tipo:** Revalidação pós-correção  
> **Base:** `modulo-05-congregacoes.md` + `modulo-05-congregacoes-dev-report.md`  
> **Método:** validação estática ponta a ponta (frontend + backend + contratos + estados visuais)

---

## 1. Resumo executivo

O pacote de correções do DEV cobre os 10 achados originais com mudanças concretas e coerentes com o relatório de QA.  

Na revisão do código atualizado, os **10 achados originais foram resolvidos**. Não encontrei item "não resolvido" ou "não se sustenta mais".

Entretanto, surgiu **1 efeito colateral novo**: no formulário de edição, falha de integração com IBGE pode bloquear salvamento até para alterações que não dependem de cidade/estado (ex.: trocar apenas líder/telefone).  

### Placar desta revalidação

| Classificação | Quantidade |
|---|---:|
| Resolvido | 10 |
| Parcialmente resolvido | 0 |
| Não resolvido | 0 |
| Não se sustenta mais | 0 |
| Regressões/efeitos colaterais novos | 1 |

---

## 2. Status de cada achado original

### ACHADO 01 — Erro ao carregar membros no modal engolido como empty
- **Status:** ✅ Resolvido
- **Evidência:** `frontend/src/components/congregations/CongregationModal.tsx`
  - introduzido `errorMembers`
  - `catch` agora usa `formatApiError(err)` e não converte para lista vazia
  - UI renderiza bloco de erro com botão "Tentar novamente"
- **Validação:** o estado de erro foi separado de `empty state`, eliminando falso "nenhum membro".

---

### ACHADO 02 — PUT bem-sucedido + GET subsequente com falha gerando falso erro
- **Status:** ✅ Resolvido
- **Evidência:** `frontend/src/components/congregations/EditCongregationModal.tsx`
  - removida chamada obrigatória de `getCongregation` após `updateCongregation`
  - `onSuccess` usa retorno direto do `PUT`
- **Validação:** sucesso da atualização não depende mais de segunda requisição.

---

### ACHADO 03 — Backend retornando contagem 0 em falha parcial
- **Status:** ✅ Resolvido
- **Evidência:** `backend/src/controllers/congregationController.ts` (`getCongregations`)
  - em `membersError`, agora retorna `500` com mensagem explícita
  - removido fallback silencioso de `activeMembersCount: 0`
- **Validação:** API não mascara mais erro de integridade como dado válido.

---

### ACHADO 04 — Exclusão via modal de detalhes sem `activeMembersCount`
- **Status:** ✅ Resolvido
- **Evidência:**
  - `frontend/src/components/congregations/CongregationModal.tsx`: callback `onDelete` agora envia `(id, name, activeMembersCount)`
  - `frontend/src/app/(main)/congregations/page.tsx`: callback recebe e encaminha o terceiro parâmetro
- **Validação:** bloqueio preventivo de exclusão fica consistente entre card e modal de detalhes.

---

### ACHADO 05 — Race condition na busca da listagem
- **Status:** ✅ Resolvido
- **Evidência:** `frontend/src/components/congregations/CongregationList.tsx`
  - adicionado `requestIdRef` monotônico
  - respostas antigas são descartadas antes de atualizar estado
- **Validação:** última busca digitada prevalece.

---

### ACHADO 06 — Race condition na busca/paginação de membros no modal
- **Status:** ✅ Resolvido
- **Evidência:** `frontend/src/components/congregations/CongregationModal.tsx`
  - adicionado `membersRequestIdRef`
  - atualização de estado condicionada ao request id atual
- **Validação:** resposta atrasada não sobrescreve resultado mais recente.

---

### ACHADO 07 — Inconsistência Estado/Cidade na troca de UF
- **Status:** ✅ Resolvido
- **Evidência:**
  - `frontend/src/components/congregations/CongregationForm.tsx`: ao trocar `state`, limpa `city` imediatamente
  - submit bloqueado quando cidades/estados indisponíveis (`isSubmitBlocked`)
  - `frontend/src/hooks/useIbgeData.ts`: concorrência de fetch de cidades controlada por `requestId`
- **Validação:** evita submissão com cidade herdada de UF anterior.

---

### ACHADO 08 — Divergência de validação de telefone FE/BE
- **Status:** ✅ Resolvido
- **Evidência:** `backend/src/validators/congregationValidator.ts`
  - adicionada validação custom de dígitos (10 ou 11) em create/update
  - mantido pattern de caracteres + regra semântica de quantidade
- **Validação:** contrato de telefone alinhado ao frontend.

---

### ACHADO 09 — Batch permitindo duplicatas no mesmo payload
- **Status:** ✅ Resolvido
- **Evidência:** `backend/src/controllers/congregationController.ts` (`createCongregationsBatch`)
  - novo bloco de detecção de duplicatas internas no lote (case-insensitive)
  - retorno 400 com nomes duplicados
- **Validação:** evita criação duplicada intra-payload.

---

### ACHADO 10 — Erros de IBGE não exibidos na UI
- **Status:** ✅ Resolvido
- **Evidência:**
  - `frontend/src/hooks/useIbgeData.ts`: `fetchStates` exposto para retry
  - `frontend/src/components/congregations/CongregationForm.tsx`: renderiza erro de estados/cidades + botões de tentativa
- **Validação:** usuário passou a ter feedback e ação de recuperação no próprio fluxo.

---

## 3. Regressões / efeitos colaterais

### EC-01 — Bloqueio excessivo de edição quando IBGE falha
- **Gravidade:** média  
- **Tipo:** regressão de UX / disponibilidade do fluxo  
- **Onde ocorre:** `frontend/src/components/congregations/CongregationForm.tsx`
- **Evidência:**
  - `isCitiesUnavailable` depende de `selectedState` + `errorCities`
  - `isSubmitBlocked` bloqueia submit do formulário inteiro
  - em modo de edição, com estado já definido, falha no IBGE pode impedir salvar alterações não relacionadas a endereço (ex.: apenas líder/telefone)
- **Impacto no usuário:** usuário não consegue atualizar dados simples em cenário de indisponibilidade temporária do IBGE.
- **Reprodução sugerida:**
  1. abrir edição de congregação existente;
  2. simular falha no endpoint de cidades do IBGE;
  3. alterar apenas `leader` e tentar salvar;
  4. botão permanece bloqueado.
- **Ajuste recomendado:** no modo `edit`, permitir submit quando `state/city` não foram alterados pelo usuário, mesmo com erro de IBGE.

---

## 4. Avaliação de UX após correção

### Pontos que melhoraram
- feedback de erro no modal de membros ficou correto (sem falso empty);
- fluxo de edição ficou mais previsível ao desacoplar sucesso do `PUT`;
- mensagens de integração externa (IBGE) ficaram visíveis e acionáveis;
- buscas assíncronas estão mais estáveis em cenários de latência.

### Pontos que exigem ajuste
- bloqueio global de submit em edição sob falha de IBGE reduziu resiliência do fluxo para ações que não dependem de localização.

---

## 5. Itens encerrados

Podem ser encerrados na trilha original:
- **ACHADOS 01 a 10** (todos resolvidos no código atual).

---

## 6. Itens reabertos

Não há reabertura de achado original.

### Novo ticket recomendado
- **TICKET-CONG-EC01 — Edição bloqueada por indisponibilidade do IBGE mesmo sem alteração de cidade/estado**
  - prioridade: média
  - tipo: regressão de UX
  - escopo: `CongregationForm` (regra de `isSubmitBlocked` no modo edit)

---

## Parecer final

**Aprovado com ressalva.**  
Os achados originais do módulo foram corrigidos, mas existe um efeito colateral novo (EC-01) que deve ser tratado para evitar bloqueio indevido em edição durante falhas externas do IBGE.
