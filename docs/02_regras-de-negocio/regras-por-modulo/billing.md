---
type: regras-modulo
modulo: billing
ultima_atualizacao: 2026-10-20
versao: "1.2"
total_regras: 20
tags: [regras, modulo:billing]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/billing/overview]]"
  - ""[[02_regras-de-negocio/politicas-e-restricoes]]""
---

# Regras de Negócio — Assinatura e Billing

## Responsabilidade do Módulo
Monetizar por plano, sincronizar Stripe e aplicar limites/downgrades.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-BILL-001 | Catálogo de planos | Fato | Ativo |
| BR-BILL-002 | Checkout só pagos | Restrição | Ativo |
| BR-BILL-003 | Sem checkout se já ativo | Restrição | Ativo |
| BR-BILL-004 | Billing admin+ | Restrição | Ativo |
| BR-BILL-005 | Portal exige customer | Restrição | Ativo |
| BR-BILL-006 | Downgrade cabe no teto | Restrição | Ativo |
| BR-BILL-007 | Activate free cancela Stripe | Gatilho | Ativo |
| BR-BILL-008 | past_due bloqueia adds | Restrição | Ativo |
| BR-BILL-009 | trialing com direito | Fato | Ativo |
| BR-BILL-010 | Webhook idempotente | Restrição | Ativo |
| BR-BILL-011 | Evento stale ignorado | Restrição | Ativo |
| BR-BILL-012 | Canceled vencido → free | Derivação | Ativo |
| BR-BILL-013 | Job downgrade compensatório | Gatilho | Ativo |
| BR-BILL-014 | Avisos expiração 7/3/1 | Gatilho | Ativo |
| BR-BILL-015 | Cleanup pending 7d | Gatilho | Ativo |
| BR-BILL-016 | Cleanup webhooks 90d | Gatilho | Ativo |
| BR-BILL-017 | Sync sem customer = noop; UI free sem Sync | Fato | Ativo |
| BR-BILL-018 | Checkout na moeda do preço | Restrição | Ativo |
| BR-BILL-019 | Fatura aberta confirma no Stripe | Gatilho | Ativo |
| BR-BILL-020 | Cancelamento agendado no histórico | Gatilho | Ativo |

---

## Regras por Categoria

### 💎 Planos e Quotas

### BR-BILL-001: Catálogo de planos
- **Declaração:** Planos 100/200/500/800 com preços e tetos hardcoded em PLAN_CONFIG.
- **Tipo:** Fato
- **Gatilho:** GET plans / billing
- **Comportamento esperado:** Catálogo
- **Comportamento em violação:** —
- **Implementado em:** `config/plans.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-001]]

### BR-BILL-002: Checkout só pagos
- **Declaração:** Checkout session autenticado/público só 200|500|800.
- **Tipo:** Restrição
- **Gatilho:** create-checkout
- **Comportamento esperado:** Sessão
- **Comportamento em violação:** 400
- **Implementado em:** `stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-003: Sem checkout se já ativo
- **Declaração:** Checkout autenticado bloqueado se status active|trialing|past_due.
- **Tipo:** Restrição
- **Gatilho:** Checkout
- **Comportamento esperado:** —
- **Comportamento em violação:** 409
- **Implementado em:** `stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔐 Regras de Acesso Específicas do Módulo

### BR-BILL-004: Billing admin+
- **Declaração:** Portal, change-plan, activate-free, sync, events: admin+.
- **Tipo:** Restrição
- **Gatilho:** Rotas stripe
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403
- **Implementado em:** `routes/stripe.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-006]]

### BR-BILL-005: Portal exige customer
- **Declaração:** create-portal-session exige stripe_customer_id.
- **Tipo:** Restrição
- **Gatilho:** Portal
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-017: Sync sem customer = noop; UI free sem Sync
- **Declaração:** `POST /sync-subscription` sem `stripe_customer_id` responde 200 com `synced: false` (nada a alinhar). Não cria customer Stripe. Conta free que nunca fez checkout não trata ausência de customer como erro. Na aba Plano, conta no plano Grátis (`plan_type` 100) **não** oferece Sync (auto nem botão), mesmo com `stripe_customer_id` residual de checkout abandonado — o estado vazio é o do plano gratuito. Distinto de [[BR-BILL-005]] (portal continua exigindo customer).
- **Tipo:** Fato
- **Gatilho:** sync-subscription (API ou auto-sync UI); render do estado vazio da aba Plano
- **Comportamento esperado:** 200 `{ synced: false }` sem customer; UI não dispara sync sem customer **nem** em `plan_type` 100; free vê copy de plano gratuito + único CTA de upgrade
- **Comportamento em violação:** free com customer residual tratado como “pago sem assinatura” (mensagem + Sync)
- **Implementado em:** `stripeController.ts` (`syncSubscription`); `PaymentManagement.tsx` (guards + empty state); `AccountManagement.tsx` (guard sem customer)
- **Testado em:** Smoke QA DEV-136; smoke DEV-158 (free local)
- **Depende de:** —

### 🔄 Regras de Upgrade / Downgrade

### BR-BILL-006: Downgrade cabe no teto
- **Declaração:** Downgrade só se ativos ≤ limite destino.
- **Tipo:** Restrição
- **Gatilho:** change-plan / activate-free
- **Comportamento esperado:** Plano alterado
- **Comportamento em violação:** 400 remova N
- **Implementado em:** `stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-009]]

### BR-BILL-007: Activate free cancela Stripe
- **Declaração:** Ativar 100 cancela subscription paga imediatamente.
- **Tipo:** Gatilho
- **Gatilho:** activate-free-plan
- **Comportamento esperado:** plan_type=100
- **Comportamento em violação:** 500 se Stripe falhar
- **Implementado em:** `stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-010]]

### BR-BILL-008: past_due bloqueia adds
- **Declaração:** past_due impede novas inclusões de membros.
- **Tipo:** Restrição
- **Gatilho:** checkMemberLimit
- **Comportamento esperado:** canAdd=false
- **Comportamento em violação:** Mensagem pagamento
- **Implementado em:** `planLimits.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-013]]

### BR-BILL-009: trialing com direito
- **Declaração:** active|trialing = hasActiveSubscription.
- **Tipo:** Fato
- **Gatilho:** Limites/mensagens
- **Comportamento esperado:** —
- **Comportamento em violação:** —
- **Implementado em:** `planLimits.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-014]]

### 🔔 Regras de Notificação e Eventos

### BR-BILL-010: Webhook idempotente
- **Declaração:** Evento Stripe já em processed_webhook_events não reprocessa.
- **Tipo:** Restrição
- **Gatilho:** Webhook
- **Comportamento esperado:** 200 skipped
- **Comportamento em violação:** —
- **Implementado em:** `stripeWebhookService.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-011: Evento stale ignorado
- **Declaração:** created < last_stripe_event_created → skip update.
- **Tipo:** Restrição
- **Gatilho:** Webhook
- **Comportamento esperado:** Skip
- **Comportamento em violação:** —
- **Implementado em:** `stripeWebhookService.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-012: Canceled vencido → free
- **Declaração:** canceled + período vencido ⇒ plan 100.
- **Tipo:** Derivação
- **Gatilho:** Webhook deleted
- **Comportamento esperado:** Downgrade
- **Comportamento em violação:** —
- **Implementado em:** `stripeWebhookService.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-013: Job downgrade compensatório
- **Declaração:** end_date passado + status elegível ⇒ forçar 100.
- **Tipo:** Gatilho
- **Gatilho:** Cron 03h
- **Comportamento esperado:** Downgrade
- **Comportamento em violação:** —
- **Implementado em:** `downgradeExpiredSubscriptions.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-012]]

### BR-BILL-014: Avisos expiração 7/3/1
- **Declaração:** E-mails de aviso antes do fim do período.
- **Tipo:** Gatilho
- **Gatilho:** Cron check expiration
- **Comportamento esperado:** E-mail
- **Comportamento em violação:** —
- **Implementado em:** `checkSubscriptionExpiration.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-BILL-015: Cleanup pending 7d
- **Declaração:** Purge pending_subscriptions expiradas.
- **Tipo:** Gatilho
- **Gatilho:** Cron 02h
- **Comportamento esperado:** Delete
- **Comportamento em violação:** —
- **Implementado em:** `cleanupPendingSubscriptions.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-015]]

### BR-BILL-016: Cleanup webhooks 90d
- **Declaração:** Purge processed_webhook_events >90 dias.
- **Tipo:** Gatilho
- **Gatilho:** Cron semanal
- **Comportamento esperado:** Delete
- **Comportamento em violação:** —
- **Implementado em:** `cleanupWebhookEvents.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-016]]

### BR-BILL-018: Checkout na moeda do preço
- **Declaração:** A Checkout Session nasce com Adaptive Pricing desligado e locale `pt-BR`, para apresentar a moeda do Price (BRL).
- **Tipo:** Restrição
- **Gatilho:** Criação da sessão de checkout
- **Comportamento esperado:** O checkout não oferece USD como moeda padrão da sessão.
- **Comportamento em violação:** —
- **Implementado em:** `services/stripe.ts` (`createCheckoutSession`)
- **Testado em:** N/A — parâmetro da API Stripe
- **Depende de:** [[BR-BILL-002]]

### BR-BILL-019: Fatura aberta confirma no Stripe
- **Declaração:** Se a troca de plano deixar fatura com valor em aberto, a API devolve a URL hospedada. `past_due` continua sem troca de plano; o caminho é confirmar essa fatura.
- **Tipo:** Gatilho
- **Gatilho:** `POST /change-plan` ou `GET /payment-confirmation`
- **Comportamento esperado:** Botão Confirmar pagamento só com URL. Sem 3DS dentro do app.
- **Comportamento em violação:** —
- **Implementado em:** `stripeController.ts`, `PaymentManagement.tsx`
- **Testado em:** `billingPresentation.test.ts` (`openInvoiceConfirmationUrl`)
- **Depende de:** [[BR-BILL-008]]

### BR-BILL-020: Cancelamento agendado no histórico
- **Declaração:** Assinatura ainda ativa com `cancel_at` (ou a flag de fim de período mais o fim do item) grava `cancellation_scheduled` uma vez por assinatura e instante de `cancel_at`, e um audit log da igreja com o dono como autor.
- **Tipo:** Gatilho
- **Gatilho:** Webhook `customer.subscription.updated` e `POST /sync-subscription`
- **Comportamento esperado:** Histórico do Plano e aba Logs mostram o agendamento junto com o status já exibido na aba. Um segundo sync não duplica a linha.
- **Comportamento em violação:** —
- **Implementado em:** `billingPresentation.ts` (`resolveScheduledCancellation`), `stripeWebhookService.ts` (`recordScheduledCancellation`), `stripeController.ts` (sync)
- **Testado em:** `billingPresentation.test.ts` (`resolveScheduledCancellation`)
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 plan_type null/custom = Infinity no checker (BR-POL-028).
- 🔍 Downgrade job não remove membros excedentes.

---

*Atualizado em 2026-10-20 (BR-BILL-020 — sync também grava o cancelamento agendado, DEV-166).*
