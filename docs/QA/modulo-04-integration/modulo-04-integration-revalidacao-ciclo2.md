# QA — Segunda revalidação (Ciclo 2) — Módulo 04: Integração

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Base:** `modulo-04-integration-revalidacao.md` (1ª revalidação) + trecho 205–256 de `modulo-04-integration-dev-report.md` (correções pós–ciclo 1)  
> **Método:** leitura do código atual nos arquivos citados pelo DEV; sem execução E2E neste ambiente.

---

## 1. Resumo executivo

As quatro intervenções documentadas no **ciclo 2** do dev-report (**R1, R2, R3, INT-NEW-02**) estão **presentes no código** e, em linhas gerais, endereçam os pontos levantados na primeira revalidação.

Porém, a combinação **payload mínimo no descarte (R1)** com a **lógica atual de `updateIntegrationMember` no backend** introduz um **efeito colateral grave e silencioso**: ao enviar apenas `name` e `status`, o controller continua a montar `expected_congregation_id`, `mentor_id` e `notes` como **`null`** quando ausentes no corpo, o que tende a **zerar congregação prevista, mentor e observações** no registro ao descartar pelo modal de detalhes. Isso não estava explícito no dev-report do ciclo 2 e **não é aceitável** para integridade de dados se esses campos forem relevantes após o descarte (histórico, auditoria, relatórios).

Sobre **R2**, o uso de `{ count: 'exact' }` é a correção adequada para o `count` do PostgREST. A condição extra **`updatedCount === null`** na mesma ramificação que o rollback **permanece arriscada**: se em algum cenário o cliente ainda retornasse `count: null` apesar do sucesso do PATCH, o sistema **apagaria o integrante criado** e responderia **409** indevidamente. Com `count: 'exact'`, o esperado é `count >= 1` em sucesso; o ideal seria restringir o rollback a **`updateError` ou `updatedCount === 0`**, após smoke em ambiente real.

**Parecer:** o ciclo 2 **não** fecha o módulo de forma limpa até tratar o merge de payload no **PUT** (backend) ou enviar campos escalares preservados no descarte (frontend). O restante (R3, INT-NEW-02, e a mecânica principal de R1/R2) está alinhado ao relatório DEV.

---

## 2. Verificação das correções do ciclo 2 (205–256 do dev-report)

| Item dev-report | Status na 2ª revalidação | Evidência no código |
|-----------------|-------------------------|---------------------|
| **R1** — `name` + `status` no descarte | **Implementado** | `ViewIntegrationModal.tsx` L140–143: `updateIntegrationMember(..., { name: member!.name, status: 'descartado' })`. Joi recebe `name` obrigatório — **400 por nome ausente deve estar resolvido**. |
| **R2** — `update(..., { count: 'exact' })` + condição ampliada | **Implementado** | `publicIntegrationController.ts` L143–147: segundo argumento `{ count: 'exact' }`; L149: `if (updateError \|\| updatedCount === null \|\| updatedCount === 0)`. |
| **R3** — Export lista / JSON em blob | **Implementado** | `integration/page.tsx` L143–153: parse em `try/catch` interno; `throw new Error(errorMsg)` **fora** do `catch` de parse; mensagem usa `error` + `details` quando existem. |
| **INT-NEW-02** — `formatApiError` no contexto | **Implementado** | `IntegrationContext.tsx` L4 (import), L87: `formatApiError(err)` no `catch` de `loadIntegrationMembers`. |

---

## 3. Efeito colateral / regressão de dados (novo na 2ª revalidação)

### EC-01 — Descarte com payload parcial pode apagar mentor, congregação prevista e notas

- **Gravidade:** Alta (integridade de dados / silencioso).  
- **Tipo:** Efeito colateral da correção R1 + contrato atual do PUT.  
- **Onde:** `backend/src/controllers/integrationController.ts` L452–460 monta:

```452:460:backend/src/controllers/integrationController.ts
    const normalizedData = normalizeMemberDates(value as unknown as Record<string, unknown>);

    const updatePayload: Partial<IntegrationMember> = {
      ...normalizedData,
      expected_congregation_id: value.expected_congregation_id || null,
      mentor_id: value.mentor_id || null,
      notes: value.notes ?? null
    };
```

Com `req.body = { name, status: 'descartado' }`, os campos opcionais vêm **ausentes** em `value`; então `value.expected_congregation_id`, `value.mentor_id` e `value.notes` são `undefined`, e as expressões acima viram **`null`** explícitos no objeto enviado ao Supabase — **sobrescrevendo** colunas que antes tinham valor.

- **Impacto no usuário:** Após “Descartar” na visão detalhada, o integrante pode aparecer como descartado mas **sem** congregação/mentor/notas no banco; exportações, PDF e histórico perdem contexto.

- **Correção recomendada (uma das):**  
  - **Backend:** mesclar `existing` com `value` antes do `update` (só aplicar mudanças nos campos presentes em `value`), **ou** usar `PATCH` semântico / DTO específico para “status only”; **ou**  
  - **Frontend:** no descarte, enviar os escalares já conhecidos de `member` (`expected_congregation_id`, `mentor_id`, `notes`, `birth`, etc.) **sem** objetos aninhados — alinhado ao que `IntegrationForm` faria.

---

## 4. Risco residual (R2)

- **Tópico:** `updatedCount === null` tratado como falha junto com `=== 0`.  
- **Risco:** Falso 409 e delete do integrante se `count` vier `null` em resposta de sucesso (improvável com `count: 'exact'`, mas defesa frágil).  
- **Sugestão:** Após smoke, considerar `if (updateError || updatedCount === 0)` e logar/monitorar se `count` for `null` em sucesso.

---

## 5. Comparativo com a 1ª revalidação

| Ponto (1ª revalidação) | Após ciclo 2 |
|------------------------|--------------|
| Descarte quebrado (só `status`) | **Corrigido** com `name` + `status` (R1). |
| Contador inerte (`count` null) | **Corrigido** com `{ count: 'exact' }` (R2). |
| Export engolia mensagem JSON | **Corrigido** (R3). |
| Lista sem `formatApiError` | **Corrigido** (INT-NEW-02). |
| — | **Novo:** possível **limpeza** de `mentor_id` / `expected_congregation_id` / `notes` no descarte (EC-01). |

---

## 6. UX após o ciclo 2

- **Descarte:** deixa de falhar por validação de nome — melhora perceptível. Se EC-01 ocorrer no banco, a **UX de tela** pode parecer correta enquanto os **dados somem** — pior tipo de inconsistência.  
- **Cadastro público / concorrência:** mensagem 409 mais coerente se o rollback disparar corretamente.  
- **Export:** mensagens de erro da API mais úteis no modal.  
- **Erro na listagem:** detalhes de validação/autorização mais visíveis com `formatApiError`.

---

## 7. Itens encerrados x reabertos (2ª rodada)

### Podem ser considerados **encerrados** (com ressalvas)

- **R3** — Estrutura do tratamento de blob/JSON na exportação de lista.  
- **INT-NEW-02** — Uso de `formatApiError` no `IntegrationContext`.  
- **R2** — Uso de `{ count: 'exact' }` (pendente apenas **ajustar** a ramificação `=== null` após smoke, se desejado).  
- **R1** — Validação Joi satisfeita no descarte **somente** no critério “não retorna 400 por falta de nome”.

### Devem ser **reabertos** ou virar **novo ticket obrigatório**

- **EC-01** — Merge de campos no `PUT /integration/:id` ou payload completo escalonado no descarte — **antes** de declarar o módulo “aprovado” para produção.

### Smoke manual recomendado (pós-correção de EC-01)

1. Integrante com mentor + congregação + notas → descartar pelo modal de detalhes → conferir no banco ou na edição se os campos **permanecem** (exceto `status`).  
2. Dois POSTs simultâneos no último `max_uses` → um 201 e outro 409, sem órfãos indevidos.  
3. Export com filtro vazio → mensagem com texto do backend, não PDF inválido.

---

## 8. Parecer final (ciclo 2)

| Pergunta | Resposta |
|----------|----------|
| O dev-report (205–256) reflete o código? | **Sim**, para R1, R2, R3 e INT-NEW-02. |
| A 1ª revalidação fica totalmente sanada? | **Não** — sanada a **sintoma** do descarte (Joi), mas surge **EC-01** (dados). |
| Pode encerrar QA do módulo 04? | **Somente após** correção de **EC-01** (ou comprovação explícita de que anular esses campos no descarte é regra de negócio desejada — improvável). |
| Frase do dev-report “Módulo 04 concluído e aprovado para QA final” | **Prematura** até resolver EC-01 e executar o smoke da seção 7. |

---

*Documento: segunda revalidação, pós-ajustes do ciclo 2. Arquivo: `docs/QA/modulo-04-integration/modulo-04-integration-revalidacao-ciclo2.md`.*
