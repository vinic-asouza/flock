# QA — Módulo 04: Integração de Novos Membros

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Auditoria inicial (usabilidade + integração FE/BE + bugs silenciosos)  
> **Escopo:** Listagem `/integration`, CRUD, conversão para membro, exportação, links públicos `/public/integration/[token]`, gestão de links em `IntegrationLinksModal`  
> **Referência de fluxo:** `docs/levantamento-fluxos.md` (linhas 373–452)  
> **Metodologia:** `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O módulo cobre bem o funil pré-membresia: listagem paginada, formulários com Zod/Joi alinhados na maior parte dos campos, conversão com **verificação de limite do plano** (`checkMemberLimit`) e rollback parcial em falhas na conversão. O levantamento citava dúvidas sobre limite na conversão e destino do integrante — **o limite é verificado antes de criar o membro**; após sucesso o integrante permanece na tabela com `status: 'integrado'` (não é removido).

Foram identificados **11 achados**, sendo **1 crítico** no fluxo público (carregamento de congregações sem autenticação), **2 altos** (payload incorreto ao descartar na visão detalhada; perda de dados no modal de conversão após erro) e demais médios/baixos ligados a mensagens de erro, validação fraca no formulário público, concorrência no contador do link e pequenas inconsistências de UX/código.

### Placar de achados

| Gravidade | Qtd | IDs |
|-----------|-----|-----|
| Crítica | 1 | 01 |
| Alta | 2 | 02, 03 |
| Média | 5 | 04, 05, 06, 07, 08 |
| Baixa | 3 | 09, 10, 11 |

---

## 2. Mapa do fluxo analisado

```
/integration (autenticado)
├── IntegrationProvider → loadIntegrationMembers → GET /api/integration
├── CreateIntegrationModal → IntegrationForm → POST /api/integration
├── EditIntegrationModal → IntegrationForm → PUT /api/integration/:id
├── DeleteIntegrationModal → DELETE /api/integration/:id
├── ViewIntegrationModal → GET /api/integration/:id
│       ├── Descartar → PUT /api/integration/:id (status descartado)  [ver ACHADO 02]
│       ├── Exportar PDF → GET /api/export/integration/:id/pdf
│       └── Remover da lista (integrado) → DELETE /api/integration/:id
├── ConvertIntegrationModal → MemberForm → POST /api/integration/:id/convert
├── ExportIntegrationModal → POST /api/export/integration/list (PDF lista)
└── IntegrationLinksModal → CRUD /api/integration-links

/public/integration/[token] (público)
├── GET /api/public/integration/:token (middleware + validateIntegrationLink)
└── PublicIntegrationForm → POST /api/public/integration/:token
        └── Backend: validateIntegrationMember; zera admission/mentor/notes no insert;
            incrementa current_uses (falha silenciosa possível — ACHADO 04)
```

**Integrações principais:** `frontend/src/services/api.ts` (métodos `listIntegrationMembers`, `getIntegrationMember`, `create/update/deleteIntegrationMember`, `convertIntegrationMember`, export, público, links).  
**Backend:** `integrationController.ts`, `publicIntegrationController.ts`, `publicIntegrationAuth.ts`, `integrationMemberValidator.ts`, `exportController.ts` (export lista/PDF).

---

## 3. Achados

---

### ACHADO 01 — Formulário público usa API autenticada para congregações

- **Gravidade:** Crítica  
- **Tipo:** Bug — Autenticação / Contrato API / Fluxo real  
- **Impacto no usuário:** Visitante em `/public/integration/[token]` **não consegue listar congregações** da igreja: a chamada vai para `GET /api/congregations` sem cookie de sessão (401). O hook apenas define erro genérico interno; o formulário **não exibe** esse erro. Na prática o seletor fica só com **“Sede”**; quem deveria escolher congregação filial **não tem como**, a menos que use outro fluxo (interno).

**Onde ocorre:** Montagem de `PublicIntegrationForm` com `useFiltersData()`.

**Arquivos relacionados:**

- `frontend/src/components/public/PublicIntegrationForm.tsx` (usa `useFiltersData`)
- `frontend/src/hooks/useFiltersData.ts` (`apiService.listCongregations()`)
- `frontend/src/app/public/integration/[token]/page.tsx` (não oferece `churchId`/token ao form para busca pública)

**Evidência:**

```10:21:frontend/src/hooks/useFiltersData.ts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar apenas congregações
        const congregationsData = await apiService.listCongregations();
```

`PublicIntegrationForm` não consome `error` retornado pelo hook.

**Como reproduzir:** Abrir link público válido em sessão anônima; inspecionar rede — `GET .../congregations` com 401; UI mostra apenas “Sede”.

**Causa provável:** Reuso do hook de área logada no fluxo público sem endpoint público (ex.: `GET /api/public/integration/:token/congregations` ou inclusão das congregações na resposta de validação do link).

**Correção sugerida (mínima segura):**

1. Criar endpoint público (autorizado pelo mesmo token/middleware) que retorne congregações da `church_id` do link **ou** estender `validateIntegrationLink` / `GET /public/integration/:token` com lista mínima de congregações.  
2. No `PublicIntegrationForm`, deixar de usar `useFiltersData` e buscar dados com o token; exibir erro amigável se falhar.  
3. Opcional: enquanto não existir API, ocultar o select e documentar “somente sede” — pior UX, mas evita falsa expectativa.

---

### ACHADO 02 — “Descartar” na visão detalhada envia objeto completo da API no PUT

- **Gravidade:** Alta  
- **Tipo:** Bug — Contrato API / Payload  
- **Impacto no usuário:** Ao descartar pelo `ViewIntegrationModal`, o front envia `{ ...member, status: 'descartado' }`, incluindo **`expected_congregation`**, **`mentor`**, `id`, `church_id`, `created_at`, etc. O backend monta `updatePayload` com spread de `normalizeMemberDates(value)`, **sem filtrar colunas da tabela**. O PostgREST/Supabase tende a **rejeitar** campos que não existem em `integration_members` → erro 400 genérico; o usuário vê “Erro ao descartar” e o status **não muda**, enquanto o callback `onDiscard` no pai pode ter sido evitado (só em sucesso).

**Onde ocorre:** `ViewIntegrationModal.handleDiscard` → `apiService.updateIntegrationMember`.

**Arquivos relacionados:**

- `frontend/src/components/integration/ViewIntegrationModal.tsx` (linhas ~128–143)
- `backend/src/controllers/integrationController.ts` (`updateIntegrationMember`, construção de `updatePayload`)

**Evidência (frontend):**

```128:143:frontend/src/components/integration/ViewIntegrationModal.tsx
      await apiService.updateIntegrationMember(integrationMemberId, {
        ...member!,
        status: 'descartado'
      });
```

**Como reproduzir:** Abrir integrante em progresso → modal de detalhes → “Descartar” → confirmar; observar 400 no PUT com corpo contendo objetos aninhados.

**Correção sugerida:**

- **Frontend (preferível):** enviar apenas `IntegrationMemberPayload` (ou `{ status: 'descartado' }` + campos escalares já validados), espelhando o `IntegrationForm`.  
- **Backend (defesa em profundidade):** whitelist explícita de colunas permitidas no `update` antes do Supabase.

---

### ACHADO 03 — Após erro na conversão, o `MemberForm` perde o pré-preenchimento do integrante

- **Gravidade:** Alta  
- **Tipo:** Bug — Estado inconsistente / UX  
- **Impacto no usuário:** Primeira submissão com falha de validação ou 403 (limite de plano) define `hasSubmittedOnce = true`. Na renderização seguinte, `member={hasSubmittedOnce ? undefined : initialMemberData}` **zera** o `member` passado ao `MemberForm`. O usuário perde nome, telefone, congregação etc. vindos da integração e precisa redigitar tudo — fricção alta e sensação de “bug”.

**Onde ocorre:** `ConvertIntegrationModal`.

**Arquivos relacionados:**

- `frontend/src/components/integration/ConvertIntegrationModal.tsx` (estado `hasSubmittedOnce`, props do `MemberForm`)

**Evidência:**

```105:165:frontend/src/components/integration/ConvertIntegrationModal.tsx
      setHasSubmittedOnce(true);

      const result = await apiService.convertIntegrationMember(integrationMember.id, formData);
// ...
          <MemberForm
            key={integrationMember?.id || 'new'}
            mode="create"
            member={hasSubmittedOnce ? undefined : initialMemberData}
```

**Como reproduzir:** Converter integrante com campos obrigatórios do membro vazios → enviar → receber erro → observar formulário “limpo”.

**Correção sugerida:** Remover o padrão `member={hasSubmittedOnce ? undefined : ...}`; manter `initialMemberData` sempre (ou mesclar último estado enviado). Se o objetivo era resetar só após **sucesso**, resetar no `onSuccess`/`onClose` após sucesso, não após primeira tentativa.

---

### ACHADO 04 — Incremento de `current_uses` do link público pode falhar sem retorno ao cliente

- **Gravidade:** Média  
- **Tipo:** Risco — Consistência de dados / Concorrência  
- **Impacto no usuário:** Cadastro público é criado com sucesso (201), mas se o `update` do contador falhar, o erro é só logado. Contador fica defasado; em cenários de concorrência, **dois envios** podem passar pelo check de `max_uses` antes de ambos incrementarem — ultrapassagem do limite (mesmo padrão de risco já discutido no Módulo 03 para links de registro).

**Arquivos relacionados:**

- `backend/src/controllers/publicIntegrationController.ts` (bloco após insert, `updateError`)
- `backend/src/middlewares/publicIntegrationAuth.ts` (checagem de limite na entrada)

**Evidência:**

```132:143:backend/src/controllers/publicIntegrationController.ts
    if (updateError) {
      logError('Erro ao atualizar contador de usos:', updateError);
      // Não falhar a requisição se apenas o contador falhar
    }
```

**Correção sugerida:** Transação única ou RPC atômica (insert + incremento); ou falhar a requisição e compensar (apagar integrante) se o contador for requisito legal/negocial; ou usar `UPDATE ... WHERE current_uses < max_uses` com checagem de linhas afetadas.

---

### ACHADO 05 — Mensagens de validação do backend (array `details`) raramente chegam ao usuário

- **Gravidade:** Média  
- **Tipo:** UX — Tratamento de erro / Contrato API  
- **Impacto no usuário:** O interceptor monta `Error` com `message = responseData.error` (ex.: “Dados inválidos”) e coloca `details` em propriedade custom **não concatenada** à mensagem. Modais que fazem `err.message` mostram **só o título**, não a lista Joi (telefone, datas, etc.).

**Arquivos relacionados:**

- `frontend/src/services/api.ts` (interceptor ~91–122)
- Modais: `CreateIntegrationModal`, `EditIntegrationModal`, `ConvertIntegrationModal`, `ViewIntegrationModal`, página pública

**Correção sugerida:** Função utilitária `formatApiError(err)` que, se `details` for `string[]`, junta em texto; usar nos catchs ou no interceptor (com cuidado para não quebrar fluxos que dependem só da `message`).

---

### ACHADO 06 — Exportação em PDF: erros HTTP com `responseType: 'blob'` geram feedback frágil

- **Gravidade:** Média  
- **Tipo:** UX / Bug silencioso  
- **Impacto no usuário:** Em 404 (“Nenhum integrante encontrado”) ou 500, o corpo pode ser JSON parseado como blob; o usuário pode baixar arquivo inválido ou ver mensagem genérica. `ExportIntegrationModal` ainda contém comentário **“Erro já tratado pelo toast”**, mas a página usa **`alert`** — comentário incorreto e `catch` vazio não melhora UX.

**Arquivos relacionados:**

- `frontend/src/app/(main)/integration/page.tsx` (`handleExportIntegrationList`)
- `frontend/src/components/integration/ExportIntegrationModal.tsx` (linhas 74–76)
- `backend/src/controllers/exportController.ts` (`exportIntegrationMembersList`, 404 quando lista vazia)

**Correção sugerida:** Para axios + blob, em erro ler `error.response.data` como texto/Blob e, se JSON, extrair `error`/`details`; exibir toast ou banner; não fechar modal em erro.

---

### ACHADO 07 — Lista em erro: “Tentar novamente” só recarrega a página inteira

- **Gravidade:** Média  
- **Tipo:** UX  
- **Impacto no usuário:** Perde estado de filtros/página; mais lento que `loadIntegrationMembers` com estado atual.

**Arquivo:** `frontend/src/components/integration/IntegrationList.tsx` (botão `window.location.reload()`).

**Correção sugerida:** Chamar `loadIntegrationMembers(filters, currentPage)` passando props já disponíveis no pai (elevar handler ou passar callback `onRetry`).

---

### ACHADO 08 — Requisições de listagem sem cancelamento (race em filtros rápidos)

- **Gravidade:** Média  
- **Tipo:** Risco — Estado inconsistente  
- **Impacto no usuário:** Trocar filtro/página rapidamente pode fazer a resposta **mais antiga** chegar por último e sobrescrever a lista atual com dados incorretos (até corrigir com novo clique).

**Arquivos:** `frontend/src/context/IntegrationContext.tsx` (`loadIntegrationMembers`), `integration/page.tsx` (efeitos em `filters` / `currentPage`).

**Correção sugerida:** `AbortController`, id de requisição monotônico, ou ignorar resposta se `currentFilters`+`page` mudaram.

---

### ACHADO 09 — Formulário público com validação Zod muito permissiva

- **Gravidade:** Baixa  
- **Tipo:** Validação / UX  
- **Impacto no usuário:** `birth` opcional sem refinamento (data futura, formato); `phone`/`whatsapp` sem `refine` como no `IntegrationForm`. Erros só aparecem após round-trip ao backend.

**Arquivo:** `frontend/src/components/public/PublicIntegrationForm.tsx` (schema linhas ~18–29).

**Correção sugerida:** Reutilizar mesmas regras de `IntegrationForm` (telefone, data, futuro) em schema compartilhado ou importado.

---

### ACHADO 10 — Filtro de status “Descartado” ausente na barra de filtros

- **Gravidade:** Baixa  
- **Tipo:** Inconsistência funcional / UX  
- **Impacto no usuário:** O tipo `IntegrationFilters` e o backend aceitam `status: descartado`, mas `IntegrationFiltersBar` só oferece `todos`, `em_progresso`, `integrado`. Integrantes descartados ficam **difíceis de encontrar** só por busca.

**Arquivo:** `frontend/src/components/integration/IntegrationFiltersBar.tsx` (`statusOptions`).

**Correção sugerida:** Incluir opção “Descartado” alinhada ao backend e ao formulário de edição.

---

### ACHADO 11 — `sort_by` / `sort_order` vindos do cliente sem whitelist no backend

- **Gravidade:** Baixa (dependendo da versão do PostgREST: erro 400 ou ordenação inesperada)  
- **Tipo:** Risco — Validação / segurança leve  
- **Impacto no usuário:** Manipulação de query pode gerar erro na listagem ou ordenar por coluna não prevista.

**Arquivo:** `backend/src/controllers/integrationController.ts` (`query.order(sort_by, ...)`).

**Correção sugerida:** Lista branca de colunas permitidas; fallback `created_at`.

---

## 4. Cenários extras a testar (manuais)

1. Link público em aba anônima: conferir rede (`congregations` 401) e preenchimento só “Sede”.  
2. Descartar pelo modal de **detalhes** (não pelo editar) e validar status 200 vs 400 no PUT.  
3. Conversão com plano no limite: esperar 403 e mensagem; verificar se formulário **mantém** dados após erro.  
4. Dois cadastros públicos simultâneos no último uso do link (`max_uses = 1`): verificar se ambos passam.  
5. Exportar lista com filtros que zeram resultado: 404 e mensagem clara (sem PDF corrompido).  
6. Sessão expirada na `/integration`: interceptor → `/login`; voltar com “voltar” do navegador.  
7. Reader: botões desabilitados com tooltip; tentar API via DevTools (403).  
8. Integrante `integrado`: “Remover da lista” → DELETE; membro continua em `/members`.  
9. `handleExportIntegrationList` com falha de rede/timeout (axios 10s).  
10. Filtro congregação “sede” (`expected_congregation_id` vazio vs literal `sede` no export — já mapeado no export; validar paridade com listagem).

---

## 5. Lacunas de cobertura

- **Testes E2E/API:** fluxo público completo (link válido → POST) com mock de congregações; descarte via view; conversão com rollback.  
- **Teste de contrato:** PUT `/integration/:id` rejeita corpo com chaves de join.  
- **Observabilidade:** métrica/contador quando `update` de `current_uses` falha no fluxo público.  
- **Contrato documentado:** OpenAPI ou tabela payload esperado para integração pública vs autenticada (campos ignorados no público: `expected_admission_type`, `mentor_id`, `notes` — já forçados no controller).

---

## 6. O que o desenvolvimento deve ajustar (checklist)

| Prioridade | Item |
|------------|------|
| P0 | Implementar fonte de dados de **congregações para o formulário público** (novo endpoint ou dados no GET do token) e feedback de erro. |
| P0/P1 | Corrigir payload do **Descartar** em `ViewIntegrationModal` (apenas campos persistíveis). |
| P1 | Corrigir estado **`hasSubmittedOnce` / `MemberForm`** no `ConvertIntegrationModal` para não apagar pré-preenchimento após erro. |
| P1 | End sharding: **atomicidade / tratamento de erro** no incremento de usos do link público. |
| P2 | **Unificar exibição de erros** da API (`details` + `message`) nos fluxos de integração. |
| P2 | **Exportação blob:** tratamento explícito de erro HTTP + remover comentário enganoso no modal de export. |
| P2 | **Retry** da lista sem `location.reload`. |
| P2 | **Cancelamento / anti-race** em `loadIntegrationMembers`. |
| P3 | Fortalecer Zod no **PublicIntegrationForm**; opção de filtro **Descartado**; whitelist `sort_by`. |

---

*Documento gerado conforme formato do `qa-usability-master.mdc`. Evidências baseadas na revisão estática do repositório na data indicada.*
