# QA — Terceira revalidação (Ciclo 3) — Módulo 04: Integração

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Referência DEV:** `modulo-04-integration-dev-report.md` (seção “Pós-revalidação — Correções do ciclo 3”, linhas ~258–290)  
> **Referência QA anterior:** `modulo-04-integration-revalidacao-ciclo2.md` (EC-01 e risco residual R2)  
> **Método:** inspeção estática do código nos arquivos citados pelo relatório DEV; smoke manual continua recomendado.

---

## 1. Objetivo desta revalidação

Confirmar se as correções do **ciclo 3** descritas no dev-report foram **de fato implementadas** no monorepo e se eliminam os pontos abertos da **2ª revalidação** (EC-01 e condição `updatedCount === null` no rollback público).

---

## 2. Verificação ponto a ponto (dev-report × código)

### 2.1 EC-01 — PUT parcial não deve apagar mentor, congregação prevista e notas

**O que o dev-report afirma:** `updateIntegrationMember` deixou de incluir sempre `expected_congregation_id`, `mentor_id` e `notes` com `null` quando ausentes no body; usa `Object.keys(req.body)` e só inclui esses campos no `updatePayload` quando a chave está **explicitamente** na requisição.

**Verificação no código:** `backend/src/controllers/integrationController.ts` (trecho do `updateIntegrationMember`):

```455:467:backend/src/controllers/integrationController.ts
    // Campos anuláveis só são incluídos no payload quando explicitamente presentes no body,
    // evitando que um PUT parcial (ex.: só status) apague mentor, congregação ou notas.
    const bodyKeys = Object.keys(req.body);
    const updatePayload: Partial<IntegrationMember> = { ...normalizedData };
    if (bodyKeys.includes('expected_congregation_id')) {
      updatePayload.expected_congregation_id = value.expected_congregation_id || null;
    }
    if (bodyKeys.includes('mentor_id')) {
      updatePayload.mentor_id = value.mentor_id || null;
    }
    if (bodyKeys.includes('notes')) {
      updatePayload.notes = value.notes ?? null;
    }
```

**Conclusão:** **Implementado conforme descrito.** O fluxo de descarte pelo modal de detalhes (`{ name, status: 'descartado' }`) não força mais esses três campos a `null` no PATCH.

**Ressalva (baixa):** O comportamento assume que `req.body` reflete fielmente as chaves enviadas pelo cliente (JSON usual). Qualquer middleware que altere o shape do body deve ser coberto por teste de contrato.

---

### 2.2 Risco residual R2 — `updatedCount === null` no rollback do link público

**O que o dev-report afirma:** Rollback + 409 restritos a `updateError || updatedCount === 0`; se `updatedCount === null`, apenas log (sem apagar integrante criado).

**Verificação no código:** `backend/src/controllers/publicIntegrationController.ts`:

```149:160:backend/src/controllers/publicIntegrationController.ts
    if (updateError || updatedCount === 0) {
      // Outro request já incrementou o contador — desfazer o cadastro
      await supabase.from('integration_members').delete().eq('id', integrationMember.id);
      return res.status(409).json({
        error: 'Limite de usos atingido',
        details: 'Este link atingiu o número máximo de usos. Seu cadastro não foi registrado.'
      });
    }
    if (updatedCount === null) {
      // Com { count: 'exact' }, count null indica resposta inesperada do PostgREST — logar para monitoramento
      logError('Contador de usos retornou null após update com count:exact', { linkId: integrationLink.id });
    }
```

**Conclusão:** **Implementado conforme descrito.** O cenário de falso 409 por `count === null` em sucesso deixa de ser tratado como falha de negócio; permance observabilidade via log.

**Nota:** O relatório fala em “warning”; o código usa `logError` — apenas diferença de nível/nome no logger, sem impacto funcional.

---

## 3. Mapa de arquivos (ciclo 3)

| Arquivo | Alteração verificada |
|---------|----------------------|
| `backend/src/controllers/integrationController.ts` | EC-01 (`bodyKeys` + inclusão condicional dos três campos) |
| `backend/src/controllers/publicIntegrationController.ts` | Ajuste R2 (rollback só com erro ou `count === 0`; log se `count === null`) |

Alinhado ao quadro do dev-report (ciclo 3).

---

## 4. Relação com a revalidação ciclo 2

| Item (ciclo 2) | Situação após ciclo 3 (esta análise) |
|----------------|----------------------------------------|
| EC-01 — apagamento silencioso de mentor/congregação/notas no PUT parcial | **Tratado no código** conforme seção 2.1. |
| Risco `updatedCount === null` disparando rollback indevido | **Tratado no código** conforme seção 2.2. |

---

## 5. Smoke manual recomendado (citado no dev-report)

1. Integrante **com** mentor, congregação prevista e notas → **Descartar** pelo modal de detalhes → confirmar no banco ou na edição que **mentor_id**, **expected_congregation_id** e **notes** **permanecem** (apenas `status` deve refletir descarte).  
2. Dois **POST** públicos simultâneos no último **`max_uses`** → um sucesso e outro **409**, sem cadastro órfão indevido.  
3. **Exportação** da lista com filtro que **zera** resultado → mensagem clara (sem PDF inválido).

Esta revalidação **não substitui** esses testes manuais; confirma aderência do código ao relatório DEV.

---

## 6. Parecer final (ciclo 3)

| Pergunta | Resposta |
|----------|----------|
| O trecho 258–290 do `modulo-04-integration-dev-report.md` corresponde ao código? | **Sim**, para EC-01 e para o ajuste do risco R2. |
| Os achados da 2ª revalidação (EC-01 + R2) estão sanados em implementação? | **Sim**, na forma documentada pelo DEV. |
| O módulo pode ser dado como “fechado” só com esta análise? | **Recomenda-se** concluir o **smoke** da seção 5 antes de assinatura final de QA/produção. |

---

*Arquivo gerado para rastreabilidade: `docs/QA/modulo-04-integration/modulo-04-integration-revalidacao-ciclo3.md`.*
