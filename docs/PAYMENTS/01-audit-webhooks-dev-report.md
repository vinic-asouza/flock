# Dev Report — Correções Webhooks Stripe (Ciclo 1)

**Data:** 2026-05-28  
**Base:** [01-audit-webhooks.md](./01-audit-webhooks.md)  
**Escopo:** Ondas 1–5 do plano de correções

---

## Resumo

Lógica de webhooks extraída para [`backend/src/services/stripeWebhookService.ts`](../../backend/src/services/stripeWebhookService.ts). O controller [`stripeController.ts`](../../backend/src/controllers/stripeController.ts) delega `handleWebhook` ao serviço.

**Decisões:**
- Idempotência: **claim atômico** (`INSERT` antes de processar); em falha, **DELETE** do claim + HTTP 500 (retry Stripe).
- Segurança: **removida** allowlist de IP na app; apenas `constructEvent`.
- E-mails: **fire-and-forget** via `fireAndForgetEmail`.
- W12 (dedup entre eventos): **fora do escopo** — documentado na revalidação.

---

## Onda 1 — Críticos (W01, W02, W08)

| Achado | Alteração |
|--------|-----------|
| W01 | Removidos `try/catch` que engoliam erro nos handlers; erros propagam para `processStripeWebhook` |
| W02 | `handleCheckoutCompleted` usa `assertDbOk`; dados incompletos lançam `Error` |
| W08 | Logger no catch externo via `logError` (sem shadowing) |

**Arquivos:** `stripeWebhookService.ts` (novo), `stripeController.ts` (remoção ~770 linhas de handlers)

---

## Onda 2 — Idempotência (W03, W04, W09, W10)

| Achado | Alteração |
|--------|-----------|
| W03 | `claimWebhookEvent` — INSERT único antes do dispatch |
| W04 | Erro no claim → HTTP **503** (não processa às cegas) |
| W09 | Tipos não mapeados → `200 { ignored: true }` **sem** claim |
| W10 | Falha no handler → `releaseWebhookClaim` + 500 |

---

## Onda 3 — Ordenação (W05)

| Achado | Alteração |
|--------|-----------|
| W05 | Colunas `last_stripe_event_created` + guard em `updateSubscriptionByStripeCustomer` |

**Migração:** [`backend/scripts/add_last_stripe_event_created.sql`](../../backend/scripts/add_last_stripe_event_created.sql) — **executar no Supabase antes de deploy**.

---

## Onda 4 — Segurança e landing (W06, W07)

| Achado | Alteração |
|--------|-----------|
| W06 | Removidos `STRIPE_WEBHOOK_IPS`, `isValidStripeIP` e bloqueio 403 |
| W07 | `updateSubscriptionByStripeCustomer` atualiza `churches` ou `pending_subscriptions` |

**Docs:** `docs/STRIPE-MAINTENANCE.md` atualizado.

---

## Onda 5 — UX e ops (W11, W13, W14, W15)

| Achado | Alteração |
|--------|-----------|
| W11 | `checkCheckoutStatus` aceita `active` e `trialing` |
| W13 | `fireAndForgetEmail` em todos os envios do webhook |
| W14 | Rate limit global ignora `/api/stripe/webhook` |
| W15 | Job `cleanupWebhookEvents.ts` + cron domingo 3h |

---

## Deploy checklist

1. Executar SQL: `add_last_stripe_event_created.sql`
2. Confirmar função `cleanup_old_webhook_events()` existe (script `stripe_refinement_migrations.sql`)
3. Deploy backend
4. Testar com Stripe CLI (ver revalidação)

---

## Fora do escopo (Ciclo 1)

- **W12:** deduplicação de e-mails entre tipos de evento
- **Fila/worker** assíncrono dedicado (W13 mínimo apenas)
