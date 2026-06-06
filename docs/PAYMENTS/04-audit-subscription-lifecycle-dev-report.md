# Dev Report — Tópico 04: Ciclo de vida de assinaturas

**Data:** 2026-06-04  
**Referência:** [`04-audit-subscription-lifecycle.md`](./04-audit-subscription-lifecycle.md)  
**Status geral:** Implementado

---

## Correções implementadas

### SL01 — `activate-free-plan` cancela assinatura Stripe (CRÍTICO)

**Arquivo:** `backend/src/controllers/stripeController.ts`  
**Função:** `activateFreePlan`

**O que mudou:**
- `select` ampliado para incluir `stripe_subscription_id`
- Antes de atualizar o banco, se `stripe_subscription_id` existir, chama `stripe.subscriptions.cancel()`
- Erro `resource_missing` (sub já cancelada no Stripe) é silenciado — não bloqueia o downgrade
- Campos `stripe_subscription_id` e `subscription_status` são limpos corretamente no update
- `subscription_status` agora grava `canceled` (não mais `active`) ao ativar plano gratuito

---

### SL02 — E-mail de cancelamento separado de cancelamento agendado (ALTO)

**Arquivos:**
- `backend/src/templates/stripeEmailTemplates.ts` — nova função `getSubscriptionScheduledCancellationTemplate`
- `backend/src/services/stripeWebhookService.ts` — lógica `isCanceled` / `isScheduledCancellation`

**O que mudou:**
- `isCanceled` agora é `isActuallyCanceled = subscription.status === 'canceled'`
- Nova variável `isScheduledCancellation` para `cancel_at_period_end === true && status !== 'canceled'`
- E-mail "Assinatura Cancelada" só disparado quando `status === 'canceled'` (assinatura efetivamente encerrada)
- Novo e-mail "Cancelamento Agendado" enviado quando usuário cancela no portal com `cancel_at_period_end`

---

### SL03 — Handler dedicado para `customer.subscription.created` (ALTO)

**Arquivo:** `backend/src/services/stripeWebhookService.ts`

**O que mudou:**
- Nova função exportada `handleSubscriptionCreated`
- Verifica se `stripe_subscription_id` da church já corresponde ao `subscription.id` do evento
- Se sim → no-op (checkout.session.completed já processou)
- Se não → chama `handleSubscriptionUpdated` (raro: assinatura criada sem checkout)
- `dispatchWebhookEvent` agora roteia `customer.subscription.created` para o novo handler

---

### SL04 — Cron diário de downgrade para assinaturas expiradas (ALTO)

**Arquivos:**
- `backend/src/jobs/downgradeExpiredSubscriptions.ts` — novo job
- `backend/src/app.ts` — registro do cron às 3h (BRT)

**O que mudou:**
- Novo job `downgradeExpiredSubscriptions`: busca igrejas com `subscription_end_date < now()` e `plan_type != '100'`
- Apenas processa igrejas com `subscription_status` em: `canceled`, `past_due`, `unpaid`, `incomplete_expired`
- Aplica `plan_type: '100'`, `subscription_status: 'canceled'`, `stripe_subscription_id: null`
- Registrado no cron às `0 3 * * *` (BRT) — executa diariamente às 3h
- Cleanup de webhook deslocado de 3h para 4h para evitar conflito

---

### SL05 — Grace period `past_due`: bloquear novos membros (ALTO)

**Arquivo:** `backend/src/utils/planLimits.ts`

**O que mudou:**
- `hasActiveSubscription` agora inclui `trialing` (além de `active`)
- Nova variável `isPastDue = subscriptionStatus === 'past_due'`
- `canAdd` retorna `false` quando `isPastDue && quantityToAdd > 0`
- Mensagem específica: "Pagamento pendente. Regularize sua assinatura..."
- Interface `MemberLimitCheck` expõe campo `isPastDue?: boolean`
- Limites numéricos do plano são mantidos (membros existentes não são removidos)

---

### SL06 — `handlePaymentSucceeded` atualiza `plan_type` e datas (MÉDIO)

**Arquivo:** `backend/src/services/stripeWebhookService.ts`

**O que mudou:**
- Além de `subscription_status: 'active'`, o update agora inclui:
  - `plan_type` — reconcilia caso o plano tenha mudado via portal
  - `subscription_start_date` — início do período atual
  - `subscription_end_date` — data de término (se houver cancelamento agendado)
- Reutiliza `shouldSetToFreePlan` e `getSubscriptionEndDate` para consistência com demais handlers

---

### SL07 — `syncSubscription` seta `last_stripe_event_created` (MÉDIO)

**Arquivo:** `backend/src/controllers/stripeController.ts`

**O que mudou:**
- `select` da church ampliado para incluir `last_stripe_event_created`
- Após o update de sync, inclui `last_stripe_event_created: Math.floor(Date.now() / 1000)`
- Isso previne que webhooks antigos atrasados sobrescrevam o estado lido diretamente da API Stripe

---

### SL09 — Detecção de reativação corrigida (MÉDIO)

**Arquivo:** `backend/src/services/stripeWebhookService.ts`

**O que mudou:**
- Variável renomeada de `cancelAtPeriodEnd` para `cancelAtPeriodEndRemoved` (semântica correta)
- Condição: `sub.cancel_at_period_end === false` — verdadeiro quando cancelamento agendado foi removido
- `isReactivated` baseado em: era cancelada/agendada + agora ativa + sem agendamento

---

### SL13 — Cron de expiração inclui `active` + `subscription_end_date` (BAIXO)

**Arquivo:** `backend/src/jobs/checkSubscriptionExpiration.ts`

**O que mudou:**
- Query alterada de `.eq('subscription_status', 'canceled')` para `.in('subscription_status', ['canceled', 'active'])`
- Igrejas com `cancel_at_period_end` (status `active` + `subscription_end_date`) agora recebem avisos 7/3/1 dia

---

## Achados fora deste ciclo

| ID | Motivo |
|----|--------|
| SL08 | Aceito — janela de inconsistência curta; webhook eventual + sync manual mitiga |
| SL10 | Baixo impacto para modelo recorrente; UI de "próxima renovação" via portal Stripe |
| SL11 | Feature futura (trial comercial); fora do escopo atual |
| SL12 | Baixo — `past_due` em polling: manter `active`/`trialing` como confirmados; SL05 mitiga parcialmente |
| SL14 | Análise: lógica de `getSubscriptionEndDate` está correta para os casos de uso atuais |

---

## Testes manuais recomendados

1. **SL01**: Ativar plano gratuito com `stripe_subscription_id` preenchido → verificar cancelamento no Stripe dashboard + campos zerados no banco
2. **SL02**: Cancelar via portal Stripe → verificar se chega e-mail de "Cancelamento Agendado" (não "Cancelada")
3. **SL02**: Aguardar fim do período → verificar e-mail "Assinatura Cancelada" via `subscription.deleted`
4. **SL03**: Verificar logs — `customer.subscription.created` deve mostrar "ignorado (checkout já vinculou)"
5. **SL04**: Simular `subscription_end_date` no passado com status `past_due` → rodar job manualmente → verificar `plan_type: 100`
6. **SL05**: Criar membro com status `past_due` → deve retornar 400 com mensagem de pagamento pendente
7. **SL06**: Renovar fatura → verificar se `plan_type` e datas foram atualizados no banco
8. **SL07**: Rodar sync → verificar se `last_stripe_event_created` foi atualizado no banco
9. **SL13**: Criar church com `active` + `subscription_end_date` próxima → verificar aviso de expiração

---

## Breaking changes / deploy

Nenhuma migração SQL necessária. Todas as alterações são de lógica de aplicação.

O job `downgradeExpiredSubscriptions` é compatível com dados existentes — igrejas com `plan_type != '100'` e `subscription_end_date` no passado serão corrigidas na primeira execução.
