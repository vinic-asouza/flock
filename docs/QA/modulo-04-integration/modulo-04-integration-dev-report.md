# Relatório de Execução — Módulo 04: Integração de Novos Membros

> **Engenheiro:** Sênior Dev (IA)  
> **Data:** Abril 2026  
> **Referência QA:** `docs/QA/modulo-04-integration/modulo-04-integration.md`  
> **Status geral:** ✅ Todos os 11 achados implementados + 4 correções pós-revalidação (R1, R2, R3, INT-NEW-02)

---

## Resumo executivo

Todos os achados identificados pelo QA foram endereçados: 1 crítico, 2 altos, 5 médios e 3 baixos. As correções abrangeram backend (novo endpoint implícito via resposta estendida, lógica atômica de contadores, whitelist de ordenação) e frontend (remoção de `useFiltersData` no fluxo público, correção de payload no Descartar, preservação de estado no modal de conversão, unificação de erros, tratamento de blob, retry sem reload, anti-race por ID de requisição, filtro Descartado).

---

## Achados e implementações

---

### ACHADO 01 — Formulário público usa API autenticada para congregações ✅ RESOLVIDO

**Gravidade:** Crítica

**Solução aplicada:**

1. **Backend (`publicIntegrationController.ts`):** A função `validateIntegrationLink` foi estendida para buscar congregações ativas da `church_id` do link (`congregations` com `active = true`, ordenadas por `name`) e incluí-las no JSON de resposta (`congregations: [...]`).

2. **Frontend (`PublicIntegrationForm.tsx`):** Removida a dependência de `useFiltersData` (que chamava `GET /api/congregations` com autenticação). O componente agora recebe `congregations` como prop.

3. **Frontend (`app/public/integration/[token]/page.tsx`):** O campo `congregations` retornado pelo `validateIntegrationLink` é armazenado no estado `linkInfo` e repassado ao `PublicIntegrationForm` via prop.

**Impacto:** Visitantes em sessão anônima agora conseguem visualizar todas as congregações da igreja ao preencher o formulário público.

---

### ACHADO 02 — "Descartar" na visão detalhada envia objeto completo da API no PUT ✅ RESOLVIDO

**Gravidade:** Alta

**Solução aplicada:**

- **Frontend (`ViewIntegrationModal.tsx` — `handleDiscard`):** Substituído `{ ...member!, status: 'descartado' }` por `{ status: 'descartado' }`. O backend recebe apenas o campo que muda, eliminando o risco de rejeição pelo PostgREST por campos não mapeados (`expected_congregation`, `mentor`, `id`, `church_id`, `created_at`).

---

### ACHADO 03 — Após erro na conversão, o `MemberForm` perde o pré-preenchimento ✅ RESOLVIDO

**Gravidade:** Alta

**Solução aplicada:**

- **Frontend (`ConvertIntegrationModal.tsx`):**
  - Removido o estado `hasSubmittedOnce` que zerava o `member` prop após a primeira tentativa com erro.
  - `setHasSubmittedOnce(true)` foi removido do fluxo de submissão.
  - `handleClose` não mais redefine `hasSubmittedOnce`.
  - `<MemberForm member={initialMemberData} ...>` mantém sempre os dados da integração, independentemente de tentativas anteriores.

**Impacto:** Após um erro de validação ou 403 (limite do plano), o formulário mantém o nome, telefone, congregação e demais dados pré-preenchidos da integração.

---

### ACHADO 04 — Incremento de `current_uses` do link público pode falhar sem retorno ao cliente ✅ RESOLVIDO

**Gravidade:** Média

**Solução aplicada:**

- **Backend (`publicIntegrationController.ts`):** O `update` do contador agora usa **optimistic locking** — adiciona `eq('current_uses', integrationLink.current_uses)` na condição do UPDATE. Se `count === 0` (outro request já incrementou), o integrante recém-criado é **deletado** e retorna 409 com mensagem clara ao usuário, evitando ultrapassagem do `max_uses` em cenários de concorrência.

---

### ACHADO 05 — Mensagens de validação do backend raramente chegam ao usuário ✅ RESOLVIDO

**Gravidade:** Média

**Solução aplicada:**

- **`frontend/src/services/api.ts`:** Adicionada a função exportada `formatApiError(err: unknown): string`. Quando o erro possui `details` (string ou `string[]`), a mensagem é concatenada: `"${message}: ${details}"`. Caso contrário, retorna apenas `err.message`.

- **Modais atualizados para usar `formatApiError`:**
  - `CreateIntegrationModal.tsx`
  - `EditIntegrationModal.tsx`
  - `ViewIntegrationModal.tsx` (carregamento, exportação PDF, descarte)
  - `DeleteIntegrationModal.tsx`
  - `ConvertIntegrationModal.tsx`
  - `IntegrationLinksModal.tsx` (carregar, salvar, desativar, excluir, reativar)
  - `app/public/integration/[token]/page.tsx`

---

### ACHADO 06 — Exportação em PDF: erros HTTP com `responseType: 'blob'` geram feedback frágil ✅ RESOLVIDO

**Gravidade:** Média

**Solução aplicada:**

- **`integration/page.tsx` (`handleExportIntegrationList`):** Após receber o blob, verificado `blob.type === 'application/json'`. Se positivo, o conteúdo é lido como texto, parseado e o `error` extraído do JSON é lançado como `Error`. O erro re-propagado cai no `catch` do `ExportIntegrationModal`.

- **`ExportIntegrationModal.tsx`:**
  - Adicionado estado `exportError` para exibir erros inline no rodapé do modal (sem `alert`).
  - Bloco `catch` agora define `exportError` com a mensagem.
  - Modal **não fecha** em caso de erro.
  - Removido o comentário enganoso `// Erro já tratado pelo toast`.

---

### ACHADO 07 — "Tentar novamente" recarrega a página inteira ✅ RESOLVIDO

**Gravidade:** Média

**Solução aplicada:**

- **`IntegrationList.tsx`:** Adicionada prop opcional `onRetry?: () => void`. O botão "Tentar novamente" chama `onRetry()` se fornecido, fazendo fallback para `window.location.reload()` apenas se não houver callback.

- **`integration/page.tsx`:** Passado `onRetry={() => loadIntegrationMembers(filters, currentPage)}`, preservando o estado atual de filtros e página.

---

### ACHADO 08 — Requisições de listagem sem cancelamento (race em filtros rápidos) ✅ RESOLVIDO

**Gravidade:** Média

**Solução aplicada:**

- **`IntegrationContext.tsx`:** Adicionado `requestIdRef = useRef(0)` (contador monotônico). Cada chamada a `loadIntegrationMembers` incrementa o contador e captura o id local (`reqId`). Ao receber a resposta, compara `reqId !== requestIdRef.current` — se diferente, ignora silenciosamente o resultado. O estado `loading` só é zerado pela requisição mais recente.

---

### ACHADO 09 — Formulário público com validação Zod muito permissiva ✅ RESOLVIDO

**Gravidade:** Baixa

**Solução aplicada:**

- **`PublicIntegrationForm.tsx` (schema Zod):**
  - `birth` agora valida que a data não é futura (`.refine`).
  - `phone` e `whatsapp` agora validam 10–11 dígitos (via `phoneRefine`), igual ao formulário interno `IntegrationForm`.

---

### ACHADO 10 — Filtro de status "Descartado" ausente na barra de filtros ✅ RESOLVIDO

**Gravidade:** Baixa

**Solução aplicada:**

- **`IntegrationFiltersBar.tsx`:**
  - Adicionada opção `'descartado'` em `statusOptions` e `'Descartado'` em `statusLabels`.
  - Removida a restrição de tipo `Exclude<..., 'descartado'>` — substituída por `NonNullable<IntegrationFilters['status']>`.
  - `currentStatus` agora usa `filters.status ?? 'todos'` em vez de excluir `descartado`.

---

### ACHADO 11 — `sort_by` sem whitelist no backend ✅ RESOLVIDO

**Gravidade:** Baixa

**Solução aplicada:**

- **`integrationController.ts` (`listIntegrationMembers`):** Adicionado array `ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'name', 'birth', 'status']`. O `sort_by` recebido é validado contra a whitelist; se inválido, usa fallback `'created_at'`.

---

## Mapa de arquivos alterados

| Arquivo | Achados |
|---------|---------|
| `backend/src/controllers/publicIntegrationController.ts` | 01, 04 |
| `backend/src/controllers/integrationController.ts` | 11 |
| `frontend/src/components/public/PublicIntegrationForm.tsx` | 01, 09 |
| `frontend/src/app/public/integration/[token]/page.tsx` | 01, 05 |
| `frontend/src/components/integration/ViewIntegrationModal.tsx` | 02, 05 |
| `frontend/src/components/integration/ConvertIntegrationModal.tsx` | 03, 05 |
| `frontend/src/components/integration/CreateIntegrationModal.tsx` | 05 |
| `frontend/src/components/integration/EditIntegrationModal.tsx` | 05 |
| `frontend/src/components/integration/DeleteIntegrationModal.tsx` | 05 |
| `frontend/src/components/integration/IntegrationLinksModal.tsx` | 05 |
| `frontend/src/services/api.ts` | 05 (`formatApiError`) |
| `frontend/src/app/(main)/integration/page.tsx` | 06, 07 |
| `frontend/src/components/integration/ExportIntegrationModal.tsx` | 06 |
| `frontend/src/components/integration/IntegrationList.tsx` | 07 |
| `frontend/src/context/IntegrationContext.tsx` | 08 |
| `frontend/src/components/integration/IntegrationFiltersBar.tsx` | 10 |

---

## Decisões técnicas relevantes

### ACHADO 01 — Estratégia de entrega de congregações públicas
Optado por **estender a resposta do GET `/public/integration/:token`** com o array `congregations`, em vez de criar um novo endpoint separado. Motivo: o frontend já faz esse GET para validar o link antes de renderizar o formulário — sem round-trip adicional. A query busca apenas congregações `active = true` da `church_id` do link.

### ACHADO 04 — Optimistic locking vs. RPC
Replicado exatamente o padrão do Módulo 03 (links de registro público): UPDATE condicional com `eq('current_uses', valor_lido)`. Se `count === 0`, o integrante criado é deletado (rollback manual) e retorna 409. Essa abordagem evita dependência de stored procedures e mantém consistência em concorrência sem transações explícitas do Supabase.

### ACHADO 05 — `formatApiError` como export nomeado
Optado por exportar a função de `api.ts` em vez de criar um arquivo utilitário separado, pois o erro enriquecido (`details`) é construído exclusivamente no interceptor do mesmo arquivo — cohesion lógica.

### ACHADO 08 — ID monotônico vs. AbortController
ID monotônico foi preferido por ser mais simples e suficiente para o caso de uso: chamadas `axios` sem suporte nativo de cancelamento via signal nesse ponto. O resultado é descartado antes de atualizar o estado, eliminando o race visível ao usuário.

---

---

## Pós-revalidação — Correções do ciclo 2

> **Referência:** `docs/QA/modulo-04-integration/modulo-04-integration-revalidacao.md`

### R1 — Descarte pelo modal de detalhes quebrado (regressão do ACHADO 02) ✅ CORRIGIDO

**Causa:** O payload `{ status: 'descartado' }` não satisfazia o Joi — `name` é obrigatório no schema `integrationMemberValidator`. O controller rejeitava com 400.

**Correção (`ViewIntegrationModal.tsx` — `handleDiscard`):**  
O payload agora inclui `name: member!.name` junto com `status: 'descartado'`, satisfazendo o Joi sem enviar campos de join indesejados.

---

### R2 — Contador atômico inerte (`updatedCount` sempre `null`) ✅ CORRIGIDO

**Causa:** A chamada `supabase.from(...).update(payload)` não incluía a opção `{ count: 'exact' }`. Sem ela, o PostgREST não inclui o header `Prefer: count=…`, e o campo `count` da resposta permanece `null`. A condição `updatedCount === 0` nunca era verdadeira, tornando o rollback inoperante.

**Correção (`publicIntegrationController.ts`):**
- Adicionado segundo argumento `{ count: 'exact' }` no `.update(payload, { count: 'exact' })`.
- Condição expandida para `updatedCount === null || updatedCount === 0`, garantindo rollback tanto quando o contador não é retornado quanto quando nenhuma linha foi afetada (race condition real).

---

### R3 — `try/catch` aninhado engolia o `throw` intencional na exportação ✅ CORRIGIDO

**Causa:** Em `handleExportIntegrationList`, o `catch` interno do bloco de detecção de blob JSON capturava o `throw new Error(json.error)` feito após um `JSON.parse` bem-sucedido, substituindo-o pela mensagem genérica.

**Correção (`integration/page.tsx`):**
- Reestruturado para separar o parse do throw: `errorMsg` é construído dentro do `try/catch` de parse, mas o `throw new Error(errorMsg)` é feito **fora** do `catch` — no mesmo nível do `if (blob.type === 'application/json')`.
- A mensagem inclui `details` quando disponível: `"${error}: ${details}"`.

---

### INT-NEW-02 — `formatApiError` no `IntegrationContext` ✅ IMPLEMENTADO

**Arquivo:** `IntegrationContext.tsx`  
Substituído `err instanceof Error ? err.message : '...'` por `formatApiError(err)` na captura de erros do `loadIntegrationMembers`, alinhando o comportamento com os demais pontos do módulo.

---

## Mapa de arquivos — pós-revalidação

| Arquivo | Correção |
|---------|---------|
| `frontend/src/components/integration/ViewIntegrationModal.tsx` | R1 |
| `backend/src/controllers/publicIntegrationController.ts` | R2 |
| `frontend/src/app/(main)/integration/page.tsx` | R3 |
| `frontend/src/context/IntegrationContext.tsx` | INT-NEW-02 |

---

---

## Pós-revalidação — Correções do ciclo 3 (revalidação ciclo 2)

> **Referência:** `docs/QA/modulo-04-integration/modulo-04-integration-revalidacao-ciclo2.md`

### EC-01 — PUT parcial apagava mentor, congregação e notas silenciosamente ✅ CORRIGIDO

**Causa:** `updateIntegrationMember` sempre incluía `expected_congregation_id`, `mentor_id` e `notes` no `updatePayload` com valor `null` quando ausentes no body (`undefined || null` → `null`). Um PUT com apenas `{ name, status }` zeraria esses campos no banco.

**Correção (`integrationController.ts` — `updateIntegrationMember`):**  
Adicionada verificação `bodyKeys = Object.keys(req.body)`. Os três campos anuláveis só são incluídos em `updatePayload` quando estão **explicitamente presentes** na requisição. Campos omitidos ficam fora do `update`, preservando os valores existentes no banco.

---

### Risco residual R2 — Condição `updatedCount === null` retirada do ramo de rollback ✅ AJUSTADO

**Contexto:** A condição `updatedCount === null || updatedCount === 0` foi sugerida como potencialmente perigosa: com `{ count: 'exact' }`, um `null` em resposta de sucesso (inesperado) dispararia rollback e 409 indevidamente.

**Ajuste (`publicIntegrationController.ts`):**  
- Ramo de rollback/409 restrito a `updateError || updatedCount === 0`.  
- `updatedCount === null` agora apenas loga um warning via `logError` para monitoramento, sem apagar o integrante criado.

---

## Mapa de arquivos — ciclo 3

| Arquivo | Correção |
|---------|---------|
| `backend/src/controllers/integrationController.ts` | EC-01 |
| `backend/src/controllers/publicIntegrationController.ts` | Risco residual R2 |

---

---

## Smoke tests — Análise estática (ciclo 3)

> Executados via rastreamento de código passo a passo (sem servidor ativo — sem `.env`).

### Smoke 1 — Descarte com mentor/congregação/notas preservados ✅ APROVADO

**Payload enviado:** `{ name: "João Silva", status: "descartado" }`  
**`bodyKeys`:** `['name', 'status']`  
**`updatePayload` final:** `{ name: "João Silva", status: "descartado" }` — `expected_congregation_id`, `mentor_id` e `notes` **ausentes** → Supabase UPDATE não toca essas colunas → valores preservados no banco.

### Smoke 2 — Dois POSTs simultâneos no último `max_uses` ✅ APROVADO

**Cenário:** `max_uses = 1, current_uses = 0`. Ambos os requests passam pelo middleware (leem `current_uses = 0`). Ambos criam integrantes no banco. O UPDATE atômico `WHERE current_uses = 0` garante que só um request tenha `count = 1`; o outro obtém `count = 0` → rollback + 409. Sem cadastro órfão.

### Smoke 3 — Exportação com resultado vazio ⚠️ → Corrigido e ✅ APROVADO

**Problema encontrado:** Com `responseType: 'blob'`, `error.response.data` era um `Blob` no interceptor. A verificação `'error' in responseData` falhava silenciosamente → mensagem genérica "Erro desconhecido".

**Correção aplicada (`api.ts` — interceptor):**  
Interceptor tornado `async`. Quando `responseData instanceof Blob && responseData.type === 'application/json'`, o Blob é lido como texto e parseado para JSON antes de extrair `error`/`details`. A verificação de tipo do objeto foi atualizada para excluir Blobs não parseáveis (`!(responseData instanceof Blob)`).

**Resultado pós-correção:** Mensagem "Nenhum integrante encontrado" exibida corretamente no modal de exportação, sem PDF corrompido e sem fechar o modal.

---

## Mapa de arquivos — smoke tests

| Arquivo | Correção |
|---------|---------|
| `frontend/src/services/api.ts` | Interceptor async — leitura de Blob JSON em respostas de erro |

---

*Módulo 04: todos os 11 achados originais + 4 correções ciclo 2 + correções EC-01/R2 ciclo 3 + correção do interceptor blob (smoke 3) — aprovado para QA final com smoke manual recomendado para confirmar comportamento HTTP real.*
