# Auditoria 01 — Webhooks Stripe

**Projeto:** Flock (SaaS multi-tenant — igrejas)  
**Escopo:** Implementação de webhooks Stripe (backend)  
**Prompts:** [`payment-audit-general.mdc`](../prompts/PAYMENTS/payment-audit-general.mdc), [`payment-audit-webhook.mdc`](../prompts/PAYMENTS/payment-audit-webhook.mdc)  
**Data:** 2026-05-28  
**Modo:** Revisão estática de código + análise de cenários extremos (sem execução de webhooks reais neste relatório)

---

## Resumo executivo

A integração de webhooks está **funcional em estrutura básica**: rota com body raw, `constructEvent`, tabela `processed_webhook_events` para deduplicação, handlers para os eventos principais de assinatura e endpoint manual `sync-subscription` como compensação.

Para **produção com cobrança real**, há **riscos relevantes**: handlers que engolem falhas (evento marcado como processado sem efeito no banco), idempotência não atômica (corrida), eventos fora de ordem sem proteção de versão, lista de IPs desatualizada/incorreta, e ausência de fila/reprocessamento estruturado.

| Severidade | Quantidade |
|------------|------------|
| CRÍTICO    | 2          |
| ALTO       | 5          |
| MÉDIO      | 6          |
| BAIXO      | 3          |

**Recomendação imediata:** corrigir propagação de erros nos handlers e marcar evento como processado **somente após** persistência confirmada (idealmente com claim atômico na tabela de idempotência).

---

## Mapa do fluxo de webhooks

```
Stripe
  │ POST /api/stripe/webhook (body raw)
  ▼
app.ts — stripeRoutes ANTES de express.json()  ✅
  ▼
stripe.ts — express.raw({ type: 'application/json' })
  ▼
handleWebhook (stripeController.ts)
  ├─ Valida STRIPE_WEBHOOK_SECRET
  ├─ (Opcional) isValidStripeIP — lista estática
  ├─ stripe.webhooks.constructEvent(body, sig, secret)  ✅
  ├─ isEventProcessed(stripe_event_id) → processed_webhook_events
  ├─ switch (event.type)
  │    ├─ checkout.session.completed → handleCheckoutCompleted
  │    ├─ customer.subscription.created|updated → handleSubscriptionUpdated
  │    ├─ customer.subscription.deleted → handleSubscriptionDeleted
  │    ├─ invoice.payment_succeeded → handlePaymentSucceeded
  │    ├─ invoice.payment_failed → handlePaymentFailed
  │    └─ default → warn (sem handler)
  └─ markEventAsProcessed → INSERT processed_webhook_events
       └─ res 200 { received: true }

Compensação manual (não webhook):
  POST /api/stripe/sync-subscription (admin autenticado)
  GET  /api/stripe/checkout-status (polling pós-checkout)
```

**Persistência relacionada**

| Artefato | Função |
|----------|--------|
| `processed_webhook_events` | Idempotência por `stripe_event_id` (UNIQUE) |
| `churches` | Estado de assinatura (`stripe_customer_id`, `stripe_subscription_id`, `plan_type`, status, datas) |
| `pending_subscriptions` | Checkout sem igreja (landing) até registro vincular por email |

**Cron / jobs:** existem jobs para `pending_subscriptions` e expiração de assinatura; a função SQL `cleanup_old_webhook_events()` **existe no script de migração mas não está agendada** no `app.ts`.

---

## Pontos positivos

1. **Body raw na rota correta** — `express.raw` só em `/webhook`, registrado antes de `express.json()` em `app.ts`.
2. **Assinatura Stripe** — uso de `stripe.webhooks.constructEvent` com `STRIPE_WEBHOOK_SECRET`.
3. **Tabela de idempotência** — `processed_webhook_events` com índice e constraint UNIQUE em `stripe_event_id`.
4. **Resposta 500 em falha no handler principal** — permite retry do Stripe quando o `catch` externo de `handleWebhook` é acionado.
5. **Documentação operacional** — `docs/STRIPE-MAINTENANCE.md` descreve eventos e Stripe CLI.
6. **Recuperação manual** — `sync-subscription` e polling em `/subscription/success` reduzem impacto de atraso de webhook.

---

## Achados

### ACHADO-W01 — Handlers engolem erros; evento marcado como processado sem efeito

**Severidade:** CRÍTICO  
**Categoria:** Webhook · Backend · Financeiro  
**Prioridade:** Imediata

**Explicação**  
`handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handlePaymentSucceeded` e `handlePaymentFailed` envolvem a lógica em `try/catch` interno que apenas faz `console.error` e **não relança** o erro. O `handleWebhook` externo interpreta sucesso, chama `markEventAsProcessed` e responde 200. O Stripe **não reenvia** o evento.

**Impacto real**  
Assinatura paga no Stripe com igreja ainda em plano gratuito ou status desatualizado; usuário bloqueado ou com acesso incorreto até sync manual.

**Cenário de falha**  
Falha transitória do Supabase durante `handleSubscriptionUpdated` → log no console → 200 para Stripe → registro em `processed_webhook_events` → estado permanece errado.

**Evidência técnica**

```810:812:backend/src/controllers/stripeController.ts
  } catch (error) {
    console.error('❌ Erro ao processar atualização de assinatura:', error);
  }
```

Padrão repetido em `handleSubscriptionDeleted` (~876), `handlePaymentSucceeded` (~941), `handlePaymentFailed` (~1005). Fluxo de sucesso em:

```414:422:backend/src/controllers/stripeController.ts
    await markEventAsProcessed(event.id, event.type);
    // ...
    res.json({ received: true });
```

**Solução recomendada**  
Remover `try/catch` interno dos handlers ou relançar após log estruturado. Opcional: separar side effects (email) em try/catch isolado **após** persistência crítica confirmada.

---

### ACHADO-W02 — `handleCheckoutCompleted` ignora erros de banco e retornos antecipados contam como sucesso

**Severidade:** CRÍTICO  
**Categoria:** Webhook · Banco · Financeiro  
**Prioridade:** Imediata

**Explicação**  
Updates/inserts no Supabase **não verificam** `error`. Se `churchId` inválido, update afeta 0 linhas (`church` null) sem exceção. Retornos antecipados (`!customerId`, dados incompletos) também não lançam erro — o evento ainda é marcado processado.

**Impacto real**  
Pagamento confirmado no Stripe; banco sem assinatura; polling de sucesso expira; dependência de sync manual.

**Cenário de falha**  
`metadata.church_id` incorreto ou igreja removida → update 0 rows → webhook 200 + idempotência gravada.

**Evidência técnica**

```488:491:backend/src/controllers/stripeController.ts
  if (!customerId || !subscriptionId) {
    console.error('Dados incompletos no checkout:', session);
    return;
  }
```

```513:529:backend/src/controllers/stripeController.ts
    const { data: church } = await supabase
      .from('churches')
      .update({ ... })
      .eq('id', churchId)
      .select('name')
      .single();
    // sem verificação de churchError
```

**Solução recomendada**  
Validar `error` e `data`; lançar exceção se persistência falhar ou 0 linhas afetadas quando esperado 1. Tratar dados incompletos como erro (500) para retry Stripe.

---

### ACHADO-W03 — Idempotência check-then-act (corrida entre requisições duplicadas)

**Severidade:** ALTO  
**Categoria:** Webhook · Arquitetura  
**Prioridade:** Alta

**Explicação**  
Fluxo: `SELECT` → processar → `INSERT`. Duas entregas simultâneas do mesmo `event.id` podem passar ambas no `isEventProcessed` antes de qualquer `INSERT`.

**Impacto real**  
Emails duplicados; updates concorrentes; em cenários não idempotentes, estado inconsistente.

**Cenário de falha**  
Retry Stripe + entrega paralela → dois workers processam o mesmo `evt_xxx`.

**Evidência técnica**

```364:371:backend/src/controllers/stripeController.ts
  if (await isEventProcessed(event.id)) {
    return res.json({ received: true, skipped: true });
  }
  // ... processar ...
  await markEventAsProcessed(event.id, event.type);
```

**Solução recomendada**  
`INSERT ... ON CONFLICT DO NOTHING RETURNING id` como **claim** antes de processar; só processar se o insert retornou linha. Alternativa: advisory lock / fila com consumer único por `event.id`.

---

### ACHADO-W04 — Falha na verificação de idempotência força reprocessamento

**Severidade:** ALTO  
**Categoria:** Webhook · Observabilidade  
**Prioridade:** Alta

**Explicação**  
Se `isEventProcessed` falha (erro Supabase), retorna `false` “para não perder evento”. Combinado com W03 e handlers parcialmente idempotentes, aumenta duplicação de efeitos colaterais (emails).

**Evidência técnica**

```251:254:backend/src/controllers/stripeController.ts
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar evento processado:', error);
      return false; // Em caso de erro, processar para não perder evento
    }
```

**Solução recomendada**  
Em falha de leitura: responder **503** (retry Stripe) em vez de processar às cegas. Monitorar taxa de erro na tabela de idempotência.

---

### ACHADO-W05 — Eventos fora de ordem podem sobrescrever estado mais novo

**Severidade:** ALTO  
**Categoria:** Webhook · Arquitetura · Financeiro  
**Prioridade:** Alta

**Explicação**  
Vários eventos atualizam `churches` pelo `stripe_customer_id` sem comparar `event.created` ou versão da subscription. Um `customer.subscription.updated` antigo (atrasado) pode sobrescrever plano/status mais recentes.

**Impacto real**  
Plano pago revertido para cancelado ou plano errado após upgrade/downgrade.

**Cenário de falha**  
`subscription.updated` (upgrade) processado → retry tardio de evento antigo (cancel_at_period_end=false de estado anterior) → downgrade lógico incorreto.

**Evidência técnica**  
`handleSubscriptionUpdated` aplica update direto sem guard de timestamp:

```712:724:backend/src/controllers/stripeController.ts
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .update({ ... })
      .eq('stripe_customer_id', customerId)
```

**Solução recomendada**  
Persistir `last_stripe_event_at` / `subscription_updated_at` e ignorar updates com timestamp anterior; ou sempre reconciliar via `stripe.subscriptions.retrieve` no handler (source of truth).

---

### ACHADO-W06 — Lista de IPs do Stripe desatualizada e com possível typo

**Severidade:** ALTO  
**Categoria:** Segurança  
**Prioridade:** Alta (se `NODE_ENV=production` e bloqueio 403 ativo)

**Explicação**  
IPs hardcoded em `STRIPE_WEBHOOK_IPS` divergem da [lista oficial atual](https://docs.stripe.com/ips) (IPs ausentes e entradas possivelmente obsoletas). Ex.: documentação lista `52.15.183.38`; código tem `52.15.183.88`. Em produção, webhooks legítimos podem receber **403** antes da verificação de assinatura.

**Evidência técnica**

```294:307:backend/src/controllers/stripeController.ts
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  // ...
  '52.15.183.88',
  '54.241.31.99',
  // ...
];
```

```345:352:backend/src/controllers/stripeController.ts
  if (!isValidStripeIP(clientIP)) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'IP não autorizado' });
    }
  }
```

**Solução recomendada**  
Remover allowlist da aplicação e aplicar em firewall/nginx com sync de `https://stripe.com/files/ips/ips_webhooks.json`; ou confiar **apenas** em `constructEvent` (recomendado pela Stripe como camada principal). Se manter allowlist, sincronizar automaticamente.

---

### ACHADO-W07 — `customer.subscription.*` não atualiza `pending_subscriptions`

**Severidade:** ALTO  
**Categoria:** Webhook · Multi-tenant  
**Prioridade:** Alta

**Explicação**  
Fluxo landing: `checkout.session.completed` grava `pending_subscriptions`. Eventos subsequentes (`subscription.updated`, `invoice.*`) buscam apenas `churches` por `stripe_customer_id`. Se a igreja ainda não existe, handlers retornam silenciosamente (e com W01/W02 podem marcar evento processado).

**Impacto real**  
Registro tardio vincula assinatura desatualizada (status/plano antigo no pending).

**Cenário de falha**  
Pagamento → pending `active` → `invoice.payment_failed` → igreja ainda não criada → evento “processado” sem atualizar pending → usuário registra com status errado.

**Evidência técnica**  
`handleSubscriptionUpdated` linha 727-728: `if (!church || churchError) return;`  
Pending só escrito em `handleCheckoutCompleted` (~607-620).

**Solução recomendada**  
Handlers devem também atualizar `pending_subscriptions` por `stripe_customer_id` ou `stripe_subscription_id` quando igreja não existir.

---

### ACHADO-W08 — Shadowing do logger `error` no catch de `handleWebhook`

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Média

**Explicação**  
`catch (error: any)` sombreia o import `error` de `../utils/logger`. A chamada `error('Erro ao processar webhook', ...)` no catch pode lançar `TypeError` em runtime, mascarando a falha original.

**Evidência técnica**

```8:8:backend/src/controllers/stripeController.ts
import { error, warn, debug, info } from '../utils/logger';
```

```423:430:backend/src/controllers/stripeController.ts
  } catch (error: any) {
    // ...
    error('Erro ao processar webhook', {
```

**Solução recomendada**  
Renomear catch para `err` / `processingError` e usar `logError(...)` ou alias no import.

---

### ACHADO-W09 — Eventos não tratados são marcados como processados

**Severidade:** MÉDIO  
**Categoria:** Webhook  
**Prioridade:** Média

**Explicação**  
`default` apenas registra `warn`, mas `markEventAsProcessed` roda para qualquer tipo. Eventos futuros necessários (ex.: `customer.subscription.trial_will_end`, `invoice.finalized`) não serão reprocessados pelo Stripe após terem sido “consumidos”.

**Evidência técnica**

```407:415:backend/src/controllers/stripeController.ts
      default:
        warn(`Evento não tratado: ${event.type}`, ...);
    }
    await markEventAsProcessed(event.id, event.type);
```

**Solução recomendada**  
Marcar processado apenas para tipos conhecidos; para desconhecidos retornar 200 **sem** insert (ou fila de revisão). Documentar lista exata no Dashboard Stripe vs código.

---

### ACHADO-W10 — `markEventAsProcessed` falha silenciosamente

**Severidade:** MÉDIO  
**Categoria:** Webhook · Observabilidade  
**Prioridade:** Média

**Explicação**  
Erro no insert (exceto 23505) é logado mas não falha o webhook. Stripe recebe 200; próximo retry reprocessa lógica de negócio (emails duplicados, etc.).

**Evidência técnica**

```275:286:backend/src/controllers/stripeController.ts
    if (error) {
      if (error.code === '23505') { ... return; }
      console.error('Erro ao marcar evento como processado:', error);
    }
  } catch (error) {
    // Não lançar erro para não falhar o webhook
  }
```

**Solução recomendada**  
Tratar falha de marcação como 500 ou incluir idempotência no mesmo transaction block do update de negócio.

---

### ACHADO-W11 — Polling pós-checkout só confirma `subscription_status === 'active'`

**Severidade:** MÉDIO  
**Categoria:** UX · Frontend  
**Prioridade:** Média

**Explicação**  
`checkCheckoutStatus` exige status `active`. Assinaturas em `trialing` (se habilitado no futuro) ou atraso com status `incomplete`→`active` podem falhar o polling mesmo com pagamento OK.

**Evidência técnica**

```1452:1458:backend/src/controllers/stripeController.ts
    if (church && church.subscription_status === 'active') {
      return res.json({ confirmed: true, ... });
    }
```

**Solução recomendada**  
Aceitar `trialing` e estados intermediários válidos; ou confirmar apenas presença de `stripe_subscription_id` + `payment_status=paid` na session.

---

### ACHADO-W12 — Duplicação de e-mails entre eventos

**Severidade:** MÉDIO  
**Categoria:** UX · Webhook  
**Prioridade:** Baixa

**Explicação**  
`checkout.session.completed` envia e-mail de pagamento; `customer.subscription.created/updated` pode enviar cancelamento/reativação; `invoice.payment_succeeded` envia renovação. Um checkout pode disparar múltiplos e-mails próximos.

**Solução recomendada**  
Centralizar notificações por transição de estado (máquina de estados) ou deduplicar por `(church_id, event_type, billing_period)`.

---

### ACHADO-W13 — Sem fila, sem DLQ, processamento síncrono no request HTTP

**Severidade:** MÉDIO  
**Categoria:** Arquitetura · Performance  
**Prioridade:** Média

**Explicação**  
Todo handler roda na thread da requisição webhook (inclui `stripe.subscriptions.retrieve`, envio de e-mail). Timeout do Stripe (~30s) pode estourar em lentidão de email/API.

**Solução recomendada**  
Responder 200 após persistir evento enfileirado; worker processa side effects. Mínimo: timeout budget e email assíncrono fire-and-forget com fila.

---

### ACHADO-W14 — Rate limit global aplicado ao webhook

**Severidade:** BAIXO  
**Categoria:** Performance · Segurança  
**Prioridade:** Baixa

**Explicação**  
`generalLimiter` (1000 req / 15 min por IP) em `app.ts` inclui `/api/stripe/webhook`. Burst de retries Stripe + outros tráfegos no mesmo IP de proxy pode, em teoria, limitar entregas.

**Evidência técnica**  
`app.use(generalLimiter)` antes das rotas; skip só para `/health` e `/api/health/stripe`.

**Solução recomendada**  
`skip: req => req.path === '/api/stripe/webhook'` ou limiter dedicado mais permissivo.

---

### ACHADO-W15 — `cleanup_old_webhook_events` não agendada

**Severidade:** BAIXO  
**Categoria:** Banco · Observabilidade  
**Prioridade:** Baixa

**Explicação**  
Função SQL existe em `stripe_refinement_migrations.sql` mas não há cron em `app.ts` (apenas cleanup pending e expiração de assinatura).

**Impacto**  
Crescimento da tabela; após 90 dias, reenvio manual de evento antigo poderia reprocessar se removido da tabela (cenário raro).

**Solução recomendada**  
Agendar cron semanal chamando `cleanup_old_webhook_events()` ou política de retenção no Supabase.

---

### ACHADO-W16 — IP atrás de proxy pode invalidar allowlist mesmo com assinatura OK

**Severidade:** BAIXO  
**Categoria:** Segurança  
**Prioridade:** Baixa (mitigado se assinatura passar em dev; bloqueio só prod)

**Explicação**  
`trust proxy: 1` está configurado, mas `x-forwarded-for` pode refletir IP do load balancer interno, não do Stripe, gerando falsos positivos no warn/403.

**Solução recomendada**  
Validar IP na camada de edge; na app, priorizar assinatura.

---

## Matriz de cenários extremos

| Cenário | Comportamento atual | Risco |
|---------|---------------------|-------|
| Webhook duplicado (sequencial) | Ignorado via `processed_webhook_events` | Baixo |
| Webhook duplicado (paralelo) | Possível duplo processamento (W03) | Alto |
| Webhook atrasado (ordem invertida) | Pode sobrescrever estado novo (W05) | Alto |
| Falha Supabase no handler | 200 + marcado processado (W01/W02) | Crítico |
| Falha após processar, antes do INSERT idempotência | Retry reprocessa negócio (W10) | Médio |
| Falha só no INSERT idempotência | 200 sem marcação; retry duplica side effects | Médio |
| `checkout` sem `church_id`/email | Return silencioso + processado (W02) | Alto |
| Landing: falha pagamento após pending | pending desatualizado (W07) | Alto |
| IP Stripe novo em produção | 403 (W06) | Alto |
| Stripe retry após 500 no `handleWebhook` outer catch | Reprocessa (correto) | OK |
| Evento não mapeado no switch | Marcado processado (W09) | Médio |

---

## Eventos Stripe: cobertura

| Evento | Handler | Observação |
|--------|---------|------------|
| `checkout.session.completed` | Sim | Sem validação de erro DB |
| `customer.subscription.created` | Sim (mesmo handler que updated) | |
| `customer.subscription.updated` | Sim | Lógica complexa cancel/reativar |
| `customer.subscription.deleted` | Sim | Força `plan_type: 100` |
| `invoice.payment_succeeded` | Sim | Só seta `active`; não atualiza plano |
| `invoice.payment_failed` | Sim | Seta `past_due` |
| Outros | Não | Marcados como processados (W09) |

**Eventos recomendados a avaliar na configuração do Dashboard:** `customer.subscription.paused`, `invoice.paid`, `checkout.session.async_payment_*`, `charge.dispute.*` (conforme produto).

---

## Plano de testes sugerido (manual / Stripe CLI)

1. `stripe listen --forward-to localhost:4000/api/stripe/webhook` com secret correto no `.env`.
2. `stripe trigger checkout.session.completed` — validar linha em `churches` ou `pending_subscriptions` + `processed_webhook_events`.
3. Reenviar mesmo evento no Dashboard — deve retornar `{ skipped: true }`.
4. Simular falha Supabase (credencial inválida temporária) — **esperado após correção:** 500 e **sem** linha em `processed_webhook_events`.
5. Disparar `customer.subscription.updated` com payload antigo (CLI custom) — documentar se estado regride (W05).
6. Fluxo landing: checkout sem login → registrar → confirmar vínculo pending.
7. Em staging com `NODE_ENV=production`, validar se webhooks do Stripe passam IP check (W06).

---

## Priorização de correções

| Ordem | Item | Esforço estimado |
|-------|------|------------------|
| 1 | W01 + W02 — propagar erros e validar persistência | Baixo |
| 2 | W03 + W04 — idempotência atômica / 503 em falha de leitura | Médio |
| 3 | W05 — guard de ordenação ou reconcile via API Stripe | Médio |
| 4 | W06 — corrigir/remover IP allowlist na app | Baixo |
| 5 | W07 — pending_subscriptions nos handlers de subscription/invoice | Médio |
| 6 | W08, W09, W10 — logging, eventos desconhecidos, marcação | Baixo |
| 7 | W11–W16 — UX polling, fila, cron, rate limit | Médio/alto |

---

## Próximo passo da série

Auditoria **02 — Multi-tenant** (`payment-audit-multitenant.mdc`): isolamento `church_id` / `stripe_customer_id`, vazamento entre igrejas, metadata no checkout e queries sem escopo.

---

_Relatório gerado por revisão estática. Não substitui testes de carga, pentest ou validação em conta Stripe live._
