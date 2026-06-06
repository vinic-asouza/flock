# Dev Report 07 — Observabilidade Stripe (Ciclos 1–3)

**Projeto:** Flock  
**Data:** 2026-06-05  
**Baseado em:** [`07-audit-observability.md`](./07-audit-observability.md)  
**Escopo:** P0 (logging, alertas, integridade, health, PII) + P1 (audit trail, job_runs, padronização)

---

## Resumo das correções

| # | Ação P0 | Achados | Status |
|---|---------|---------|--------|
| 1 | Logging JSON no webhook + `X-Request-Id` | OB01, OB02 | ✅ |
| 2 | Alertas ops (e-mail + Slack opcional) | OB06, OB13 | ✅ |
| 3 | Cron `validate_subscription_integrity()` | OB08 | ✅ |
| 4 | Health check com ping Stripe + doc alinhada | OB07 | ✅ |
| 5 | Redação PII em logs de e-mail/jobs | OB05 | ✅ |

---

## P0-1 — Logging estruturado JSON

**Novos arquivos:**
- `backend/src/utils/structuredLogger.ts` — `billingLog`, `billingWarn`, `billingError` (JSON, sempre ativo em prod)
- `backend/src/middlewares/requestId.ts` — propaga/gera `X-Request-Id`

**Webhook** (`stripeWebhookService.ts` → `processStripeWebhook`):
- Log JSON em todos os outcomes: `success`, `duplicate`, `ignored`, `infra_error`, `failed`
- Campos: `stripe_event_id`, `stripe_event_type`, `church_id`, `customer_id`, `session_id`, `duration_ms`, `outcome`, `request_id`

Exemplo de linha em produção:
```json
{"ts":"2026-06-05T12:00:00.000Z","level":"info","domain":"billing","event":"stripe_webhook","outcome":"success","stripe_event_id":"evt_xxx","stripe_event_type":"invoice.payment_succeeded","duration_ms":142,"request_id":"uuid"}
```

---

## P0-2 — Alertas operacionais

**Novo arquivo:** `backend/src/services/opsAlertService.ts`

- `sendOpsAlert(title, details)` — fire-and-forget
- Canais: e-mail admin (`ADMIN_EMAIL` via `sendAdminEmail`) + Slack opcional (`SLACK_OPS_WEBHOOK_URL`)
- Desabilitável: `OPS_ALERTS_ENABLED=false` (default: habilitado)

**Gatilhos implementados:**

| Evento | Onde |
|--------|------|
| Webhook 503 (`infra_error`) | `processStripeWebhook` |
| Webhook 500 (handler falhou) | `processStripeWebhook` |
| Downgrade compensatório > 0 | `downgradeExpiredSubscriptions` |
| Drift `validate_subscription_integrity` > 0 | `validateSubscriptionIntegrity` job |
| Falha na RPC de integridade | `validateSubscriptionIntegrity` job |

---

## P0-3 — Job de integridade

**Novo arquivo:** `backend/src/jobs/validateSubscriptionIntegrity.ts`

- Chama `supabaseAdmin.rpc('validate_subscription_integrity')`
- Log estruturado `subscription_integrity_check` com `issue_count`
- Alerta ops se `count > 0` (até 20 issues no payload)

**Cron:** diariamente às **5h** (`America/Sao_Paulo`) em `app.ts`

**Extra:** wrapper `runCronJob` com try/catch em todos os crons Stripe.

---

## P0-4 — Health check aprimorado

**Arquivo:** `stripeController.ts` → `checkStripeHealth`

Resposta atual:
```json
{
  "status": "ok",
  "stripe_configured": true,
  "stripe_reachable": true,
  "last_webhook_processed_at": "2026-06-05T...",
  "timestamp": "2026-06-05T..."
}
```

- `stripe.balance.retrieve()` para ping real
- Query em `processed_webhook_events` para último processamento
- HTTP 503 se env incompleto ou Stripe inacessível (`status: degraded`)

**Doc:** `docs/STRIPE-MAINTENANCE.md` alinhado à implementação.

---

## P0-5 — Redação de PII

**Novo arquivo:** `backend/src/utils/redact.ts` — `redactEmail`, `redactRecipients`

**Alterados:**
- `emailService.ts` — logs de envio/falha usam e-mails redatados + `billingLog`
- `checkSubscriptionExpiration.ts` — logs de aviso com `redactEmail(userEmail)`

---

## Correção colateral (RLS)

Jobs migrados para `supabaseAdmin` (necessário após RLS Ciclo 2 DB18):
- `downgradeExpiredSubscriptions.ts`
- `cleanupWebhookEvents.ts`
- `cleanupPendingSubscriptions.ts`
- `checkSubscriptionExpiration.ts`

---

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `ADMIN_EMAIL` | Recomendada | Destino dos alertas ops |
| `SLACK_OPS_WEBHOOK_URL` | Opcional | Webhook Slack para alertas |
| `OPS_ALERTS_ENABLED` | Opcional | `false` desabilita alertas (default: on) |
| `HEALTH_CHECK_TOKEN` | Opcional | Protege `/api/health/stripe` |

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `utils/structuredLogger.ts` | Novo |
| `utils/redact.ts` | Novo |
| `middlewares/requestId.ts` | Novo |
| `services/opsAlertService.ts` | Novo |
| `jobs/validateSubscriptionIntegrity.ts` | Novo |
| `services/stripeWebhookService.ts` | Logs JSON + alertas |
| `services/emailService.ts` | PII redact + billingLog |
| `controllers/stripeController.ts` | Health check aprimorado |
| `jobs/downgradeExpiredSubscriptions.ts` | supabaseAdmin + alerta |
| `jobs/checkSubscriptionExpiration.ts` | supabaseAdmin + PII redact |
| `jobs/cleanupWebhookEvents.ts` | supabaseAdmin + billingLog |
| `jobs/cleanupPendingSubscriptions.ts` | supabaseAdmin |
| `app.ts` | requestId middleware + cron integridade |
| `docs/STRIPE-MAINTENANCE.md` | Health check atualizado |

---

## Testes manuais sugeridos

1. Disparar webhook de teste (Stripe CLI) → verificar linha JSON `outcome: success` nos logs.
2. Simular falha no handler (temporário) → verificar alerta e-mail/Slack + log `outcome: failed`.
3. `GET /api/health/stripe` → resposta com `stripe_reachable` e `last_webhook_processed_at`.
4. `SELECT * FROM validate_subscription_integrity()` com drift artificial → job das 5h ou execução manual → alerta.
5. Enviar e-mail em dev → log com `to: v***z@domain.com` (redatado).

---

## Ciclo 2 (P1) — 2026-06-05

| # | Ação P1 | Achados | Status |
|---|---------|---------|--------|
| 6 | `await` + retry em `insertSubscriptionEvent` | OB04 | ✅ |
| 7 | Audit events: sync/downgrade/pending/link | OB11, OB13 | ✅ |
| 8 | Tabela `job_runs` + `runTrackedJob` | OB09 | ✅ |
| 9 | `warn` em early returns invoice handlers | OB10 | ✅ |
| 10 | Padronizar `logger` em `stripeController` | OB16 | ✅ |

### P1-6 — Audit trail com retry

- `insertSubscriptionEvent` retorna `boolean`, até 3 tentativas (150ms backoff)
- Contador in-memory `getSubscriptionEventInsertFailureCount()`
- Alerta ops em falha persistente (`church_subscription_events_insert_failed`)
- Migration `ob04_nullable_church_id_sub_events`: `church_id` nullable em `church_subscription_events`

### P1-7 — Novos event_types

| event_type | Origem |
|------------|--------|
| `pending_checkout` | webhook checkout landing (sem igreja) |
| `link_pending` | POST /register (RPC ok) |
| `downgrade_job` | job downgrade 3h |
| `sync_subscription` | POST /sync-subscription |

### P1-8 — `job_runs`

- Migration `ob09_job_runs_table` (RLS `deny_anon`)
- `utils/jobRuns.ts` → `runTrackedJob(name, fn)` registra `running` → `success`/`failed`
- Crons Stripe em `app.ts` migrados de `runCronJob` para `runTrackedJob`

### P1-9/10 — Handlers e controller

- `handlePaymentSucceeded` / `handlePaymentFailed`: `warn` + `billingWarn` em skips (customer/subscription ausentes, target !== church)
- `getUserEmailFromChurch`: `warn` no catch
- `stripeController`: `console.error` → `logError`; `billingLog` em checkout criado e sync bem-sucedido

### Arquivos adicionais (Ciclo 2)

| Arquivo | Mudança |
|---------|---------|
| `utils/jobRuns.ts` | Novo |
| `services/stripeWebhookService.ts` | Retry audit + novos events + invoice warns |
| `controllers/stripeController.ts` | billingLog + logError |
| `controllers/authController.ts` | `link_pending` + alerta em falha |
| `jobs/downgradeExpiredSubscriptions.ts` | `downgrade_job` event + retorno `rows` |
| `app.ts` | `runTrackedJob` nos crons |
| `bd-structure.sql` | `job_runs` + `church_id` nullable |

---

## Ciclo 3 (P2) — 2026-06-05

| # | Ação P2 | Achados | Status |
|---|---------|---------|--------|
| 11 | Sentry backend + frontend billing | OB15 | ✅ |
| 12 | Prometheus `/metrics` | OB03 | ✅ |
| 13 | Endpoint admin billing stats | OB17 | ✅ |
| 14 | UI histórico `church_subscription_events` | OB19 | ✅ |
| 15 | Contexto em `processed_webhook_events` | OB12 | ✅ |

### P2-11 — Sentry

- Backend: `utils/sentryBilling.ts` — init condicional (`SENTRY_DSN`)
- Frontend: `@sentry/nextjs` + `billingTelemetry.ts` (`captureBillingError`)
- Telemetria em falhas de auto-sync e sync manual (`PaymentManagement`)

### P2-12 — Prometheus

- `utils/billingMetrics.ts` — contadores e histogramas:
  - `stripe_webhook_total{outcome}`
  - `stripe_webhook_duration_seconds`
  - `stripe_checkout_created_total`
  - `stripe_sync_subscription_total`
  - `church_subscription_events_insert_failed_total`
  - `register_subscription_link_failed_total`
- `GET /metrics` (protegido por `METRICS_TOKEN` em produção)

### P2-13 — Stats operacionais

- `GET /api/internal/billing/stats` (protegido por `INTERNAL_BILLING_TOKEN`)
- Retorna: `vw_webhook_stats`, validação de assinaturas, `job_runs`, eventos recentes, integridade

### P2-14 — Histórico na UI

- `GET /api/stripe/subscription-events` (admin/owner)
- Seção "Histórico de assinatura" em `PaymentManagement`

### P2-15 — OB12 webhook context

- Migration `ob12_webhook_processing_context`
- Colunas: `church_id`, `processing_ms`, `outcome`
- Claim com retry em linhas `released`; sucesso atualiza `success`; falha marca `released`

### Variáveis novas (Ciclo 3)

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `SENTRY_DSN` | Opcional | Backend Sentry |
| `SENTRY_ENABLED` | Opcional | `false` desabilita |
| `NEXT_PUBLIC_SENTRY_DSN` | Opcional | Frontend Sentry |
| `METRICS_TOKEN` | Recomendada (prod) | Protege `/metrics` |
| `INTERNAL_BILLING_TOKEN` | Recomendada (prod) | Protege stats internos |

**Observabilidade Stripe:** Ciclos 1–3 completos para operação em produção.
