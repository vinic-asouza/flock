# QA — Revalidação Módulo 04: Integração de Novos Membros

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Revalidação pós-DEV  
> **Referências:** `modulo-04-integration.md` (auditoria original), `modulo-04-integration-dev-report.md` (relatório DEV), código atual do monorepo  
> **Método:** leitura cruzada dos achados originais, do relatório DEV e dos arquivos citados; inferência de comportamento HTTP/Supabase onde o ambiente de execução não foi exercitado aqui.

---

## 1. Resumo executivo

O DEV endereçou **a maior parte** das melhorias descritas no relatório de execução: fluxo público com congregações embutidas na validação do link, `formatApiError`, anti-race na listagem, retry sem `reload`, filtro “Descartado”, whitelist de `sort_by`, preservação do pré-preenchimento na conversão e UX melhor na exportação (erro inline no modal).

Contudo, **não é verdade que os 11 achados estejam resolvidos de ponta a ponta**. A revalidação no código identificou **bloqueio funcional grave no fluxo “Descartar”** (ACHADO 02): o payload mínimo `{ status: 'descartado' }` **não passa** na validação Joi atual (`name` obrigatório), logo o descarte pelo modal de detalhes tende a falhar com 400. Isso é **regressão em relação à intenção do fix** e pior que o problema original em alguns cenários (antes, o spread completo podia falhar no PostgREST; agora falha antes, com mensagem de validação).

Sobre o **ACHADO 04** (contador atômico), a lógica de rollback condicionada a `updatedCount === 0` foi implementada, mas o `update` do Supabase **não solicita** `count` nas opções (`update(payload, { count: 'exact' })`). Na biblioteca `@supabase/postgrest-js`, o campo `count` da resposta só é preenchido quando o header `Prefer` inclui `count=…`. Sem isso, `count` tende a permanecer `null`, `null === 0` é falso e o ramo de **rollback + 409 pode nunca executar**, mantendo risco de inconsistência sob concorrência (integrante criado sem incremento confiável do link, ou cenários limite).

Há ainda um **defeito no tratamento de erro JSON** da exportação em `integration/page.tsx`: um `try/catch` interno captura o `throw` intencional após `JSON.parse` bem-sucedido e substitui a mensagem por genérica.

**Conclusão:** o módulo **não** deve ser dado como encerrado para QA sem **reabrir** correções para ACHADO 02 (e validação técnica de ACHADO 04 + pequeno ajuste em ACHADO 06). Os demais itens estão em bom estado no código analisado.

---

## 2. Status de cada achado original

Legenda: **R** = Resolvido · **P** = Parcialmente resolvido · **N** = Não resolvido · **NS** = Não se sustenta mais (não aplicável ao código atual)

| ID | Classificação | Comentário breve |
|----|---------------|------------------|
| **01** | **R** | `validateIntegrationLink` retorna `congregations`; página repassa a `PublicIntegrationForm`; formulário não usa mais `useFiltersData` para congregações. Evidência: `publicIntegrationController.ts` L41–58; `page.tsx` L247; `PublicIntegrationForm.tsx` L46–52, L79–84. |
| **02** | **N** | Payload reduzido para `{ status: 'descartado' }` em `ViewIntegrationModal.tsx` L140–142, mas `updateIntegrationMember` valida o body com `validateIntegrationMember`, onde **`name` é obrigatório** (`integrationMemberValidator.ts` L6–11). Resultado esperado: **400** “Nome é obrigatório” — fluxo de descarte quebrado. **Regressão funcional** em relação ao objetivo do achado. |
| **03** | **R** | `ConvertIntegrationModal` mantém `member={initialMemberData}` sempre; removido `hasSubmittedOnce`. Evidência: `ConvertIntegrationModal.tsx` L61–62, L155–158. |
| **04** | **P** | Implementado UPDATE condicional + delete do integrante + 409 (`publicIntegrationController.ts` L141–155). Porém `update` **sem** `{ count: 'exact' }` → `updatedCount` provavelmente **sempre `null`** (ver `PostgrestQueryBuilder.js` L211–219: `count` só entra no `Prefer` se passado nas opções). Condição `updatedCount === 0` pode ser **inerte**; PATCH com 0 linhas afetadas ainda pode retornar sucesso HTTP sem `error`. Risco de **falso positivo** (cadastro mantido sem incremento) persiste. |
| **05** | **R** | `formatApiError` exportado e usado nos modais de integração e na página pública (`api.ts` L1038–1048; imports nos componentes). **P:** `IntegrationContext.tsx` L87 ainda usa só `err.message` na listagem — detalhes de validação em falha de **GET lista** continuam menos ricos; escopo menor que o original. |
| **06** | **P** | Blob `application/json` detectado; modal com `exportError` e sem fechar em erro (`ExportIntegrationModal.tsx` L47, L65–81, L158–161). **Regressão:** em `page.tsx` L145–150, o `catch` interno engole o `throw new Error(json.error…)` após parse bem-sucedido e lança mensagem genérica. |
| **07** | **R** | `IntegrationList` usa `onRetry` com fallback a `reload` (`IntegrationList.tsx` L18, L66); `page.tsx` passa `onRetry={() => loadIntegrationMembers(filters, currentPage)}` (grep `onRetry`). |
| **08** | **R** | `requestIdRef` + ignorar respostas obsoletas; `loading` só desliga na requisição atual (`IntegrationContext.tsx` L49–50, L65–92). |
| **09** | **R** | Schema público com refinamento em `birth` e `phone`/`whatsapp` (`PublicIntegrationForm.tsx` L16–41). Menos rigor que `IntegrationForm` (ex.: formato DD/MM/YYYY), mas atende o espírito do achado “permissivo demais”. |
| **10** | **R** | `descartado` em `statusOptions` e `statusLabels` (`IntegrationFiltersBar.tsx` L16–27). |
| **11** | **R** | `ALLOWED_SORT_FIELDS` + fallback (`integrationController.ts` L114–118). |

---

## 3. Regressões e efeitos colaterais

### R1 — Descarte pelo modal de detalhes (ACHADO 02 + validação Joi)

- **Severidade:** Alta.  
- **Descrição:** PUT com corpo `{ status: 'descartado' }` não satisfaz `validateIntegrationMember`.  
- **Evidência:** `ViewIntegrationModal.tsx` L140–142; `integrationMemberValidator.ts` L6–11; `integrationController.ts` L406–412.  
- **Impacto:** Usuário não consegue descartar pelo fluxo “ver detalhes → Descartar”; mensagem provável “Dados inválidos” / nome obrigatório (agora com `formatApiError` pode mostrar detalhes, mas o fluxo continua **impedido**).

### R2 — Condição do contador público (ACHADO 04)

- **Severidade:** Média a alta (concorrência / dados).  
- **Descrição:** Dependência de `count` sem configurar opção de contagem no `update`.  
- **Evidência:** `publicIntegrationController.ts` L142–146; `@supabase/postgrest-js` `PostgrestQueryBuilder.js` L211–219 e `PostgrestBuilder.js` L94–97.  
- **Impacto:** Rollback e 409 podem não disparar; limite `max_uses` e consistência “cadastro ↔ uso do link” podem falhar em condições reais de corrida.

### R3 — Mensagem de erro da exportação lista (ACHADO 06)

- **Severidade:** Baixa a média (UX).  
- **Descrição:** `try/catch` aninhado em `handleExportIntegrationList` trata o `throw` após `JSON.parse` como falha de parse.  
- **Evidência:** `integration/page.tsx` L143–150.  
- **Impacto:** Usuário vê “Erro ao gerar PDF. Tente novamente.” em vez do `error`/`details` retornados pelo backend.

### Efeitos colaterais positivos

- `formatApiError` em vários modais melhora mensagens em **outros** erros 400 (ex.: validação de criação/edição), com baixo risco de quebra.

---

## 4. Avaliação de UX após correção

| Área | Avaliação |
|------|-----------|
| **Cadastro público** | Melhora clara: congregações reais sem login; erros de link/submissão mais legíveis com `formatApiError`. |
| **Conversão** | Mantém dados após erro — alinhado ao esperado; reduz frustração. |
| **Listagem** | Retry sem perder filtros/página; spinner e estados coerentes com anti-race. |
| **Exportação** | Erro inline no modal é melhor que `alert`; ainda há perda de mensagem específica no caso JSON (R3). |
| **Descarte** | **Piorou** até correção: ação principal de descarte na visão detalhada provavelmente **inviável** — UX crítica negativa. |
| **Filtros** | Inclusão de “Descartado” melhora encontrabilidade de registros descartados. |

---

## 5. Itens encerrados (podem ser considerados fechados para o escopo original)

Contingente à validação manual de smoke habitual, os seguintes achados podem ser **encerrados** do ponto de vista de QA estático:

- **01** — Congregações no fluxo público.  
- **03** — Pré-preenchimento após erro na conversão.  
- **05** — Exibição de `details` nos pontos migrados para `formatApiError` (com ressalva da listagem no contexto).  
- **07** — Retry sem `reload` completo.  
- **08** — Anti-race na listagem.  
- **09** — Validação Zod reforçada no público (aceitável como “fechado” com ressalva de paridade total com `IntegrationForm`).  
- **10** — Filtro Descartado.  
- **11** — Whitelist `sort_by`.

**ACHADO 06** pode ser encerrado **funcionalmente** para “há feedback inline e detecção de blob JSON”, mantendo **ticket menor** só para corrigir R3 (mensagem).

---

## 6. Itens reabertos / novos tickets

### Reabrir (bloqueador ou risco não sanado)

| Ticket sugerido | Motivo |
|-----------------|--------|
| **INT-REOPEN-01** | Corrigir descarte: enviar **payload válido para Joi** (campos escalares do integrante + `status`) **ou** endpoint `PATCH`/`PUT` com schema parcial só para status **ou** tornar `name` opcional no update quando já existe registro (cuidado com semântica). |
| **INT-REOPEN-02** | Ajustar incremento atômico: usar `supabase.from(...).update(..., { count: 'exact' })` (ou `.select('id')` e inspecionar `data`) para decidir rollback/409 de forma confiável; adicionar teste de concorrência ou documentação de comportamento. |

### Novo ticket (melhoria / bug menor)

| ID | Descrição |
|----|-----------|
| **INT-NEW-01** | Refatorar `handleExportIntegrationList`: separar parse JSON de erros do `throw` (evitar `catch` que engole `throw` intencional). Incluir `details` na mensagem quando existir. |
| **INT-NEW-02** (opcional) | Usar `formatApiError` em `IntegrationContext` ao carregar lista para paridade total com ACHADO 05. |

---

## 7. Parecer final

| Pergunta | Resposta |
|----------|----------|
| O relatório DEV “todos os 11 achados implementados” está integralmente correto? | **Não.** Pelo menos o **ACHADO 02** não está resolvido; **04** e **06** exigem ajustes adicionais para cumprir a intenção sem lacunas. |
| O que pode ser encerrado? | Achados **01, 03, 05** (no escopo dos modais/página pública), **07, 08, 09, 10, 11**; **06** com ressalva do bug de mensagem (R3). |
| O que deve ser reaberto? | **ACHADO 02** (obrigatório). **ACHADO 04** até comprovar em ambiente que `count`/`409`/rollback disparam como desenhado (código atual é insuficiente). |
| Novo trabalho? | Correção do **try/catch** da exportação (R3); opcionalmente `formatApiError` na listagem. |

**Recomendação:** não marcar o módulo 04 como “merge-ready” só com o dev-report sem novo ciclo de QA após **INT-REOPEN-01** (e validação de **INT-REOPEN-02**).

---

*Revalidação baseada em inspeção estática do repositório; testes manuais ou E2E continuam recomendados para confirmar status HTTP do descarte, resposta 409 do link público e download de PDF em caso de 404.*
