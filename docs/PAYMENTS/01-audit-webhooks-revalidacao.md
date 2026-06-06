# QA Revalidação — Tópico 01: Webhooks Stripe

> **Analista:** Revisão estática pós-correção (Ciclo 1)  
> **Data:** 2026-05-28  
> **Base:** [01-audit-webhooks.md](./01-audit-webhooks.md), [01-audit-webhooks-dev-report.md](./01-audit-webhooks-dev-report.md)  
> **Método:** revisão de código + `npm run build` no backend; testes Stripe CLI **pendentes no ambiente do operador**

---

## 1. Resumo executivo

As correções do Ciclo 1 estão **implementadas no código** e o backend **compila** (`tsc` OK). A revalidação estática indica resolução dos achados CRÍTICOS e ALTOS, com W12 aceito como melhoria futura.

| Classificação | Ciclo 1 |
|---------------|---------|
| Resolvido (estático) | 15/16 |
| Aceito / fora do escopo | 1 (W12) |
| Novo ticket | 0 |

**Parecer:** aprovado para **fechamento do tópico Webhooks** após executar migração SQL e checklist manual Stripe CLI abaixo.

---

## 2. Status por achado

### ACHADO-W01 — Handlers engolem erros
**Status:** ✅ resolvido

**Evidência:** Handlers em `stripeWebhookService.ts` sem `try/catch` externo; falhas chegam a `processStripeWebhook`, que chama `releaseWebhookClaim` e responde 500.

---

### ACHADO-W02 — `handleCheckoutCompleted` ignora erros
**Status:** ✅ resolvido

**Evidência:** `assertDbOk` em updates/inserts; `throw` se customer/subscription/email ausentes.

```288:291:backend/src/services/stripeWebhookService.ts
  if (!customerId || !subscriptionId) {
    throw new Error('checkout.session.completed: customer ou subscription ausente');
  }
```

---

### ACHADO-W03 — Corrida idempotência check-then-act
**Status:** ✅ resolvido

**Evidência:** `claimWebhookEvent` faz INSERT antes de `dispatchWebhookEvent`; duplicata → `23505` → `skipped`.

---

### ACHADO-W04 — Falha na leitura força reprocessamento
**Status:** ✅ resolvido

**Evidência:** Erro no INSERT (exceto duplicata) → `infra_error` → HTTP **503**.

---

### ACHADO-W05 — Eventos fora de ordem
**Status:** ✅ resolvido (requer migração SQL)

**Evidência:** `last_stripe_event_created` + `isStaleEvent` em `updateSubscriptionByStripeCustomer`.

**Pré-deploy:** executar `backend/scripts/add_last_stripe_event_created.sql`.

---

### ACHADO-W06 — Lista de IPs desatualizada
**Status:** ✅ resolvido

**Evidência:** Removida validação de IP em `processStripeWebhook`; documentação atualizada em `STRIPE-MAINTENANCE.md`.

---

### ACHADO-W07 — Subscription handlers não atualizam pending
**Status:** ✅ resolvido

**Evidência:** `updateSubscriptionByStripeCustomer` tenta `churches`, depois `pending_subscriptions`.

---

### ACHADO-W08 — Shadowing do logger
**Status:** ✅ resolvido

**Evidência:** Catch usa `logError` com parâmetro `err` em `processStripeWebhook`.

---

### ACHADO-W09 — Eventos não tratados marcados como processados
**Status:** ✅ resolvido

**Evidência:** `HANDLED_EVENT_TYPES`; tipos fora da lista retornam `{ ignored: true }` sem claim.

---

### ACHADO-W10 — `markEventAsProcessed` falha silenciosa
**Status:** ✅ resolvido

**Evidência:** Claim no início; falha no handler libera claim; não há segundo insert silencioso.

---

### ACHADO-W11 — Polling só `active`
**Status:** ✅ resolvido

**Evidência:** `checkCheckoutStatus` aceita `active` e `trialing` e valida `stripe_subscription_id` da session.

---

### ACHADO-W12 — E-mails duplicados entre eventos
**Status:** ⏸ aceito (fora do escopo Ciclo 1)

**Nota:** Melhoria futura — máquina de estados de notificação.

---

### ACHADO-W13 — Processamento síncrono / timeout
**Status:** ✅ resolvido (mínimo)

**Evidência:** `fireAndForgetEmail` — e-mails não bloqueiam resposta do webhook.

---

### ACHADO-W14 — Rate limit no webhook
**Status:** ✅ resolvido

**Evidência:** `app.ts` — `skip` inclui `/api/stripe/webhook`.

---

### ACHADO-W15 — Cleanup webhooks não agendado
**Status:** ✅ resolvido (requer RPC no banco)

**Evidência:** `cleanupWebhookEvents.ts` + cron domingo 3h. Depende de `cleanup_old_webhook_events()` no Supabase.

---

### ACHADO-W16 — IP atrás de proxy
**Status:** ✅ resolvido

**Evidência:** Remoção do check de IP na aplicação (W06).

---

## 3. Testes manuais pendentes (operador)

| # | Teste | Resultado esperado |
|---|--------|-------------------|
| 1 | `stripe listen --forward-to localhost:4000/api/stripe/webhook` | 200 nos eventos |
| 2 | `stripe trigger checkout.session.completed` | Linha em `processed_webhook_events` + church/pending atualizado |
| 3 | Reenviar mesmo evento | `{ skipped: true }` |
| 4 | Simular erro (ex.: DB down) | 500 + sem linha permanente após release |
| 5 | Evento não listado em `HANDLED_EVENT_TYPES` | `{ ignored: true }`, sem claim |
| 6 | Landing: checkout → registro | Pending vinculado; invoice atualiza pending se antes do registro |

---

## 4. Parecer final

**Tópico Webhooks — Ciclo 1:** ✅ **fechado em código**; confirmar em produção após SQL + testes CLI.

**Próximo tópico da série:** Auditoria 02 — Multi-tenant.
