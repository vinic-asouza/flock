# Auditoria 07 — Observabilidade Stripe

**Projeto:** Flock (SaaS multi-tenant — igrejas)  
**Escopo:** Logs, métricas, tracing, auditoria financeira, monitoramento e alertas da integração Stripe  
**Prompts:** [`payment-audit-general.mdc`](../prompts/PAYMENTS/payment-audit-general.mdc), [`07-observability.mdc`](../prompts/PAYMENTS/07-observability.mdc)  
**Data:** 2026-06-05  
**Modo:** Revisão estática de código + análise de artefatos de banco (pós Ciclos 1–2 dos tópicos 01–06)  
**Ambiente referência:** `flock-app-01` (Supabase)

---

## Resumo executivo

A observabilidade da camada Stripe está em estágio **inicial–intermediário**: há logging básico via `console`/`logger`, idempotência de webhooks com rastreio parcial por `stripe_event_id`, e — após o Ciclo 2 do tópico 06 — trilha de auditoria financeira em `church_subscription_events`. **Não existe** stack de métricas, tracing distribuído, correlation IDs HTTP, dashboards operacionais nem alertas para a equipe de ops.

Em produção com cobrança real, incidentes do tipo *"pagou mas não ativou"*, *"webhook falhou silenciosamente"* ou *"drift Stripe ↔ banco"* exigiriam correlação manual entre Stripe Dashboard, logs de container, `processed_webhook_events` e `church_subscription_events` — processo lento e propenso a erro.

| Severidade | Quantidade |
|------------|------------|
| CRÍTICO    | 0          |
| ALTO       | 6          |
| MÉDIO      | 10         |
| BAIXO      | 4          |

**Recomendação imediata:** logging estruturado no webhook com `church_id`/`duration_ms`; agendar `validate_subscription_integrity()` com alerta; corrigir documentação do health check; eliminar PII dos logs em produção.

---

## Matriz de maturidade

| Área | Nível | Situação |
|------|-------|----------|
| Logging | Baixa–Média | Logger centralizado; uso inconsistente; `debug`/`info` cegos em prod |
| Métricas | Ausente | Sem Prometheus/Datadog/Sentry |
| Tracing | Ausente | Sem OpenTelemetry / request ID |
| Webhooks | Média–Alta | Claim/release + logs de erro; gaps em sucesso e correlação |
| Checkout / APIs | Baixa | Quase só logs de erro; sem audit de sucesso |
| Jobs / Cron | Baixa | `console.log`; sem histórico de execução |
| Audit trail financeiro | Média | `church_subscription_events` (Ciclo 2); cobertura incompleta |
| Health / Monitoramento | Baixa | Health superficial; views SQL não consumidas |
| Alertas ops | Ausente | Só emails para usuário final |

---

## Mapa de observabilidade (estado atual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FONTES DE OBSERVABILIDADE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Stripe Dashboard          processed_webhook_events    church_subscription_events
│  (manual)                  (idempotência, sem church)  (audit trail parcial)
│       │                            │                          │
│       │ webhook POST               │ claim INSERT             │ insert void
│       ▼                            ▼                          ▼
│  ┌──────────────┐    morgan('dev')    ┌──────────────────────────────┐
│  │ processStripe│ ──────────────────► │ console / logger (warn/error) │
│  │ Webhook      │    sem request-id   │ debug/info = DEV ONLY         │
│  └──────────────┘                     └──────────────────────────────┘
│       │                                           │
│       │ fireAndForgetEmail                        │ cron jobs (console.log)
│       ▼                                           ▼
│  emailService (PII em log)              downgrade / expiration / cleanup
│  falha não propaga                      sem job_runs, sem alerta ops
│                                                                          │
│  vw_webhook_stats / validate_subscription_integrity()  ← schema only, não agendado
│                                                                          │
│  GET /api/health/stripe  →  só verifica env vars (docs desatualizada)
│  GET /health             →  { status: 'ok' }
│                                                                          │
│  Frontend billing        →  zero telemetria; catch silencioso em auto-sync
└─────────────────────────────────────────────────────────────────────────┘
```

**Correlação ponta a ponta hoje:** `session_id` (URL success) → busca manual no Stripe → grep em logs → `processed_webhook_events` → `church_subscription_events`. Não há chave única propagada do checkout ao webhook.

---

## Pontos positivos (pós-correções 01–06)

1. **Webhook resiliente** — claim atômico, `releaseWebhookClaim` em 500, 503 em `infra_error`, `stripe_event_id` em logs de erro ([`stripeWebhookService.ts`](../../backend/src/services/stripeWebhookService.ts)).
2. **Logger centralizado** — `warn`/`error` sempre ativos; abstração em [`logger.ts`](../../backend/src/utils/logger.ts).
3. **Idempotência persistida** — `processed_webhook_events` com UNIQUE em `stripe_event_id`.
4. **Audit trail financeiro (Ciclo 2)** — `church_subscription_events` com 7 pontos de inserção (webhook + API).
5. **Views/RPC de monitoramento no schema** — `vw_webhook_stats`, `vw_subscription_status`, `validate_subscription_integrity()` em [`bd-structure.sql`](../../backend/bd-structure.sql).
6. **Rate limit webhook** — 300 req/min ([`stripeSecurity.ts`](../../backend/src/middlewares/stripeSecurity.ts)).
7. **Health Stripe com token opcional** — `HEALTH_CHECK_TOKEN` em [`app.ts`](../../backend/src/app.ts).
8. **Flag explícita no registro** — `subscriptionLinkFailed` na resposta de `POST /register` ([`authController.ts`](../../backend/src/controllers/authController.ts)).
9. **Compensação documentada** — `sync-subscription`, job `downgradeExpiredSubscriptions`, polling com backoff no frontend.

---

## Achados

### ACHADO-OB01 — Logs não estruturados e sem correlation ID

**Severidade:** ALTO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Alta

**Explicação**  
O logger é um wrapper fino sobre `console.*` sem JSON, sem campos fixos e sem `request_id`/`correlation_id`. O access log usa `morgan('dev')` — formato legível, inadequado para agregação em produção (CloudWatch, Loki, Datadog).

**Impacto real**  
Impossível filtrar rapidamente todos os eventos de uma igreja, sessão ou webhook; MTTR alto em incidentes de billing.

**Cenário de falha**  
Usuário reporta "paguei mas continuo no plano 100". Ops precisa vasculhar logs não estruturados sem saber `church_id` ou `session_id` nos registros de sucesso.

**Evidência técnica**

```11:38:backend/src/utils/logger.ts
export function debug(...args: unknown[]): void {
  if (isDevelopment) {
    console.log('[DEBUG]', ...args);
  }
}
// warn/error → console.* sem schema
```

```79:79:backend/src/app.ts
app.use(morgan('dev'));
```

**Correção recomendada**  
Middleware `X-Request-Id` (gerar se ausente); logger JSON (Pino) com campos: `request_id`, `church_id`, `stripe_event_id`, `event_type`, `duration_ms`, `outcome`. Morgan em formato `combined` ou JSON em produção.

---

### ACHADO-OB02 — `debug`/`info` invisíveis em produção

**Severidade:** ALTO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Alta

**Explicação**  
`debug()` e `info()` só executam quando `NODE_ENV !== 'production'`. Eventos de sucesso de webhook, eventos stale ignorados e downgrades aplicados ficam **cegos** em prod.

**Impacto real**  
Volume normal de tráfego indistinguível de ausência de tráfego; impossível auditar taxa de processamento ou eventos ignorados sem Stripe Dashboard.

**Cenário de falha**  
Webhooks processando corretamente mas ops não consegue confirmar — único indício é ausência de `[ERROR]`.

**Evidência técnica**

```918:921:backend/src/services/stripeWebhookService.ts
debug(`Evento Stripe processado: ${event.type}`, {
  stripeEventId: event.id,
  processed: true,
});
```

```59:64:backend/src/jobs/downgradeExpiredSubscriptions.ts
debug('downgradeExpiredSubscriptions: downgrade aplicado', {
  churchId: church.id,
  previousPlan: church.plan_type,
});
```

**Correção recomendada**  
Nível de log configurável por env (`LOG_LEVEL=info` em prod); ou `info` estruturado sempre para eventos financeiros críticos, independente de `NODE_ENV`.

---

### ACHADO-OB03 — Ausência total de métricas e tracing

**Severidade:** ALTO  
**Categoria:** Observabilidade · Arquitetura  
**Prioridade:** Alta

**Explicação**  
Não há integração com Prometheus, Datadog, Sentry, OpenTelemetry ou similar em `package.json` do backend/frontend. Nenhum contador de webhooks, histograma de latência ou taxa de erro 5xx/503.

**Impacto real**  
Sem alertas proativos; detecção de degradação só após reclamação de cliente; impossível SLO/SLA de billing.

**Cenário de falha**  
Taxa de webhook 500 sobe 10× por 2 horas (bug em deploy) — ninguém percebe até múltiplos tickets de suporte.

**Evidência técnica**  
Busca em `backend/package.json` e `frontend/package.json`: zero dependências de observabilidade (sentry, prom-client, dd-trace, etc.).

**Correção recomendada**  
Mínimo: contadores `stripe_webhook_total{status,outcome}`, `stripe_webhook_duration_seconds`, `stripe_checkout_created_total`; endpoint `/metrics` ou export para provedor gerenciado.

---

### ACHADO-OB04 — Audit trail `church_subscription_events` fire-and-forget

**Severidade:** ALTO  
**Categoria:** Observabilidade · Financeiro · Banco  
**Prioridade:** Alta

**Explicação**  
Todas as inserções usam `void insertSubscriptionEvent(...)` — falha só gera `logError` interno, não bloqueia nem re-tenta. O histórico financeiro pode ficar incompleto sem que ops perceba.

**Impacto real**  
Disputas de cobrança, auditoria interna ou investigação de drift sem registro confiável de transições de plano.

**Cenário de falha**  
Supabase retorna erro transitório no INSERT de audit → plano atualizado em `churches` mas sem linha em `church_subscription_events` → investigação mostra "buraco" no histórico.

**Evidência técnica**

```34:51:backend/src/services/stripeWebhookService.ts
export async function insertSubscriptionEvent(record: SubscriptionEventRecord): Promise<void> {
  const { error } = await client.from('church_subscription_events').insert({ ... });
  if (error) {
    logError('Falha ao registrar church_subscription_events', { ...record, error });
  }
}
```

Chamadas: `void insertSubscriptionEvent` em L361, L393, L501, L675, L747, L807 (`stripeWebhookService.ts`) e L505, L801 (`stripeController.ts`).

**Correção recomendada**  
`await` com retry (1–2 tentativas); ou outbox/dead-letter table `subscription_event_failures`; métrica `church_subscription_events_insert_failed_total`.

---

### ACHADO-OB05 — Falhas de e-mail silenciosas e PII em logs

**Severidade:** ALTO  
**Categoria:** Observabilidade · Segurança  
**Prioridade:** Alta

**Explicação**  
`sendEmail` captura exceções e **não relança** — fluxo principal (webhook, jobs) continua como se o e-mail tivesse sido enviado. Em dev sem Resend, loga `to` e `subject`. Jobs logam e-mail do destinatário em texto claro.

**Impacto real**  
Usuário não notificado de falha de pagamento/cancelamento; ops não alertado; PII em logs de produção (LGPD).

**Cenário de falha**  
Resend com rate limit → dezenas de `payment_failed` processados → nenhum e-mail enviado → inadimplência sem aviso ao tenant.

**Evidência técnica**

```107:123:backend/src/services/emailService.ts
} catch (error: any) {
  console.error('❌ Erro ao enviar email:', error);
  // Não lançar erro para não quebrar o fluxo principal
}
```

```224:224:backend/src/jobs/checkSubscriptionExpiration.ts
console.log(`✅ Aviso de expiração enviado para ${userEmail} (${thresholdToNotify} dias antes)`);
```

```85:88:backend/src/services/stripeWebhookService.ts
export function fireAndForgetEmail(promise: Promise<unknown>): void {
  void promise.catch((err) => {
    logError('Falha ao enviar e-mail (webhook)', err);
  });
}
```

**Correção recomendada**  
Contador `billing_email_failed_total`; alerta se taxa > threshold; redact `to` em prod (`u***@domain.com`); tabela `email_delivery_log` opcional.

---

### ACHADO-OB06 — Zero alertas operacionais para equipe

**Severidade:** ALTO  
**Categoria:** Observabilidade · Arquitetura  
**Prioridade:** Alta

**Explicação**  
Notificações existentes são **user-facing** (templates Stripe). Não há Slack, PagerDuty, e-mail para ops (`ADMIN_EMAIL` é reply-to do Resend, não canal de alerta).

**Impacto real**  
Incidentes de infraestrutura (webhook 5xx, job de downgrade corrigindo N igrejas, drift de integridade) só descobertos por acaso ou ticket de cliente.

**Cenário de falha**  
Job `downgradeExpiredSubscriptions` corrige 15 igrejas numa noite (webhooks perdidos na semana) — nenhum alerta → padrão sistêmico não investigado.

**Evidência técnica**  
Ausência de `sendAdminEmail` / webhook Slack em handlers de erro, jobs e `validate_subscription_integrity()`.

**Correção recomendada**  
Alertas mínimos: webhook 500/503 > N/hora; `downgradeExpiredSubscriptions` count > 0; `validate_subscription_integrity()` retorna linhas; `subscriptionLinkFailed` no registro.

---

### ACHADO-OB07 — Health check superficial e documentação desatualizada

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Média

**Explicação**  
`checkStripeHealth` verifica apenas presença de env vars e retorna `{ status: 'ok' }`. A documentação em `STRIPE-MAINTENANCE.md` afirma verificação de conectividade Stripe e campos `stripe_configured`, `timestamp` — **não implementados**.

**Impacto real**  
Monitor externo pode reportar "healthy" com Stripe API indisponível ou webhook secret inválido; falsa sensação de segurança.

**Evidência técnica**

```595:607:backend/src/controllers/stripeController.ts
export const checkStripeHealth = async (_req, res) => {
  const configured = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET && ...
  if (!configured) return res.status(503).json({ status: 'unhealthy' });
  res.json({ status: 'ok' });
};
```

```514:530:docs/STRIPE-MAINTENANCE.md
**O que verifica:**
- Se há conectividade com API do Stripe
**Resposta esperada:** { "status": "healthy", "stripe_configured": true, "timestamp": "..." }
```

**Correção recomendada**  
Alinhar doc ao código **ou** implementar ping leve (`stripe.balance.retrieve`); incluir `last_webhook_processed_at` (query em `processed_webhook_events`); separar liveness/readiness.

---

### ACHADO-OB08 — `validate_subscription_integrity()` não agendado nem alertado

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Banco · Financeiro  
**Prioridade:** Média

**Explicação**  
A RPC detecta drift (cancelado não-free, active+plan 100, subscription sem customer) existe no schema e é citada na auditoria 06, mas **nenhum job, endpoint ou alerta** a invoca.

**Impacto real**  
Inconsistências Stripe ↔ banco persistem até reclamação manual ou sync acidental.

**Evidência técnica**  
Função em [`bd-structure.sql`](../../backend/bd-structure.sql) L392–421; zero referências em `backend/src/jobs/` ou controllers.

**Correção recomendada**  
Cron diário: `SELECT * FROM validate_subscription_integrity()`; alerta se `count > 0`; opcional endpoint admin protegido.

---

### ACHADO-OB09 — Jobs cron sem histórico de execução nem error boundary

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Média

**Explicação**  
Quatro jobs Stripe-related rodam via `node-cron` com `console.log` de início/fim. Não há tabela `job_runs`, duração, nem `try/catch` no wrapper do cron — exceção não tratada pode gerar unhandled rejection.

**Impacto real**  
Impossível responder "o job rodou ontem?"; falha silenciosa do scheduler.

**Evidência técnica**

```172:200:backend/src/app.ts
cron.schedule('0 3 * * *', async () => {
  console.log('🕐 Verificando assinaturas expiradas para downgrade...');
  await runDowngradeExpiredSubscriptionsJob();
}, { timezone: 'America/Sao_Paulo' });
// sem try/catch
```

**Correção recomendada**  
Tabela `job_runs(job_name, started_at, finished_at, rows_affected, error)`; wrapper com try/catch + log estruturado + alerta em falha.

---

### ACHADO-OB10 — Handlers de pagamento com early return sem log

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Webhook  
**Prioridade:** Média

**Explicação**  
`handlePaymentSucceeded` e `handlePaymentFailed` retornam silenciosamente quando `customerId` ou `subscriptionId` estão ausentes. `getUserEmailFromChurch` engole exceções com `catch { return null }`.

**Impacto real**  
Invoice válida no Stripe mas ignorada no backend — sem rastro além da ausência de update em `churches`.

**Evidência técnica**

```687:690:backend/src/services/stripeWebhookService.ts
if (!customerId || !subscriptionId) {
  return;
}
```

```133:157:backend/src/services/stripeWebhookService.ts
} catch {
  return null;
}
```

**Correção recomendada**  
`warn` estruturado com `invoice.id`, `customerId`, motivo do skip; métrica `stripe_webhook_skipped_total{reason}`.

---

### ACHADO-OB11 — Checkout e sync sem log de sucesso

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Média

**Explicação**  
`createCheckout` só loga em erro (`console.error`). `syncSubscription` não registra sync bem-sucedido nem grava `church_subscription_events`. Fluxo `pending_subscriptions` no checkout landing sem audit event.

**Impacto real**  
Dificuldade para correlacionar `session_id` criado com webhook recebido minutos depois.

**Evidência técnica**  
`createCheckout` — sucesso sem log ([`stripeController.ts`](../../backend/src/controllers/stripeController.ts) L35–176).  
`syncSubscription` — update sem `insertSubscriptionEvent` (L338–351).

**Correção recomendada**  
`info` estruturado: `checkout_session_created { session_id, church_id, plan, authenticated }`; audit event `sync_subscription` com snapshot do estado Stripe.

---

### ACHADO-OB12 — `processed_webhook_events` sem contexto de processamento

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Banco · Webhook  
**Prioridade:** Média

**Explicação**  
A tabela armazena apenas `stripe_event_id`, `event_type`, `processed_at` — sem `church_id`, status (success/failed), duração ou mensagem de erro. A view `vw_webhook_stats` agrega por tipo, mas não distingue falhas de sucesso pós-claim.

**Impacto real**  
Evento claimado e depois falho (500 + release) não deixa rastro persistente — só log efêmero.

**Evidência técnica**

```213:220:backend/bd-structure.sql
CREATE TABLE public.processed_webhook_events (
  stripe_event_id character varying NOT NULL UNIQUE,
  event_type character varying NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  ...
);
```

**Correção recomendada**  
Colunas opcionais: `church_id`, `processing_ms`, `outcome` (`success`|`failed`|`released`); ou tabela irmã `webhook_processing_log`.

---

### ACHADO-OB13 — Job de downgrade sem audit trail nem alerta ops

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Financeiro  
**Prioridade:** Média

**Explicação**  
`downgradeExpiredSubscriptions` corrige drift quando webhooks foram perdidos, mas não insere em `church_subscription_events` e só alerta via `console.log` quando count > 0 — sem notificação ops.

**Impacto real**  
Cada downgrade indica possível falha de webhook histórica; ausência de alerta impede análise de causa raiz.

**Evidência técnica**

```43:65:backend/src/jobs/downgradeExpiredSubscriptions.ts
const { error: updateError } = await supabase.from('churches').update({ plan_type: '100', ... })
// sem insertSubscriptionEvent
```

**Correção recomendada**  
`insertSubscriptionEvent({ event_type: 'downgrade_job', source: 'job', ... })`; alerta Slack se `count > 0`.

---

### ACHADO-OB14 — `syncSubscription` sem verificação de erro em ramo "sem assinatura"

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend · Financeiro  
**Prioridade:** Média

**Explicação**  
Quando Stripe retorna zero assinaturas, o controller faz `await supabase.update(...)` sem checar `error` — falha de DB passa despercebida.

**Evidência técnica**

```274:285:backend/src/controllers/stripeController.ts
await supabase
  .from('churches')
  .update({ plan_type: '100', ... })
  .eq('id', church.id);
// sem if (updateError)
```

**Correção recomendada**  
Verificar `error` e logar/retornar 500; registrar audit event.

---

### ACHADO-OB15 — Frontend billing sem telemetria de falhas

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Frontend · UX  
**Prioridade:** Média

**Explicação**  
`PaymentManagement` auto-sync usa `catch { setAutoSyncFailed(true) }` sem log nem report a serviço de erros. Páginas checkout/success/cancel não enviam telemetria — só feedback visual.

**Impacto real**  
Volume de falhas de sync/checkout invisível para produto/ops; regressões de API não detectadas por agregação.

**Evidência técnica**

```187:196:frontend/src/components/settings/PaymentManagement.tsx
} catch {
  setAutoSyncFailed(true);
}
```

**Correção recomendada**  
Sentry ou similar no frontend; evento `billing_sync_failed` com `church_id` (hash) e `error_code`.

---

### ACHADO-OB16 — Uso inconsistente de `logger` vs `console.*` no fluxo Stripe

**Severidade:** MÉDIO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Média

**Explicação**  
`stripeWebhookService` usa `debug`/`warn`/`logError`; `stripeController` usa majoritariamente `console.error` (9 ocorrências); jobs usam só `console.*`; `stripe.ts` usa `console` direto.

**Impacto real**  
Formato e filtragem inconsistentes; dificulta política central de retenção e redaction.

**Evidência técnica**  
`stripeController.ts` L161, L224, L358, L377, L572, L585, L711, L791, L816 — todos `console.error`.

**Correção recomendada**  
Migrar fluxo Stripe inteiro para `logger` estruturado; proibir `console.*` em `stripe*` via lint rule.

---

### ACHADO-OB17 — Views SQL de monitoramento não expostas

**Severidade:** BAIXO  
**Categoria:** Observabilidade · Banco  
**Prioridade:** Baixa

**Explicação**  
`vw_webhook_stats` e `vw_subscription_status` existem no banco mas não há endpoint admin, dashboard ou job que as consuma.

**Correção recomendada**  
Endpoint interno `GET /api/internal/billing/stats` (protegido) retornando agregados das views + últimos N `church_subscription_events`.

---

### ACHADO-OB18 — Cache in-memory de avisos de expiração sem persistência

**Severidade:** BAIXO  
**Categoria:** Observabilidade · Backend  
**Prioridade:** Baixa

**Explicação**  
`checkSubscriptionExpiration` usa `Map` em memória para deduplicar e-mails — perdido em restart do processo → risco de e-mail duplicado ou perdido; sem métrica de envios.

**Evidência técnica**  
[`checkSubscriptionExpiration.ts`](../../backend/src/jobs/checkSubscriptionExpiration.ts) — `expirationWarningCache`.

**Correção recomendada**  
Persistir último envio em coluna/tabela ou usar TTL em Redis; logar `emails_sent` estruturado.

---

### ACHADO-OB19 — Sem UI/API para consultar histórico de billing por igreja

**Severidade:** BAIXO  
**Categoria:** Observabilidade · UX · Backend  
**Prioridade:** Baixa

**Explicação**  
`church_subscription_events` existe mas não há tela admin nem endpoint `GET /api/stripe/subscription-events` para suporte investigar transições.

**Correção recomendada**  
Endpoint paginado admin + seção "Histórico de assinatura" em PaymentManagement (somente owner/admin).

---

### ACHADO-OB20 — `subscriptionLinkFailed` sem monitoramento agregado

**Severidade:** BAIXO  
**Categoria:** Observabilidade · Financeiro  
**Prioridade:** Baixa

**Explicação**  
A API de registro expõe `subscriptionLinkFailed: true` ao frontend, mas o backend não incrementa métrica nem alerta ops — pagamentos órfãos dependem do usuário perceber.

**Evidência técnica**

```207:212:backend/src/controllers/authController.ts
subscriptionLinked: !!pendingSubscription && !subscriptionLinkFailed,
subscriptionLinkFailed,
```

**Correção recomendada**  
Contador `register_subscription_link_failed_total`; alerta se > 0 em janela de 1h.

---

## Eventos críticos sem monitoramento

| Evento | Impacto | Monitorado hoje? |
|--------|---------|------------------|
| Webhook 500 (claim released) | Cobrança sem ativação | ⚠️ log ERROR apenas |
| Webhook 503 (`infra_error`) | Stripe retenta; fila cresce | ❌ |
| `invoice.payment_failed` | Inadimplência | ⚠️ e-mail user + audit (se insert ok) |
| Downgrade compensatório (job 3h) | Indica webhooks perdidos | ❌ ops |
| Drift Stripe ↔ DB | Plano/status errado | ❌ (RPC manual) |
| Checkout criado, webhook nunca chega | Pagamento órfão | ❌ |
| `insertSubscriptionEvent` falha | Buraco no audit trail | ❌ ops |
| E-mail billing falha em massa | Usuário não notificado | ❌ ops |
| `subscriptionLinkFailed` no registro | Pagou, conta free | ⚠️ flag API + console |
| Rate limit webhook (300/min) | Eventos rejeitados | ❌ |

---

## Priorização de correções

### Ciclo 1 — Operacional imediato (P0)

| # | Ação | Resolve |
|---|------|---------|
| 1 | Logging estruturado JSON no webhook (`stripe_event_id`, `church_id`, `duration_ms`, `outcome`) | OB01, OB02 |
| 2 | Alerta ops (Slack/e-mail) em webhook 500/503 e downgrade job > 0 | OB06, OB13 |
| 3 | Cron diário `validate_subscription_integrity()` + alerta | OB08 |
| 4 | Alinhar `STRIPE-MAINTENANCE.md` ao health check real **ou** implementar ping Stripe | OB07 |
| 5 | Redact PII em logs (`emailService`, jobs) | OB05 |

### Ciclo 2 — Audit trail e jobs (P1)

| # | Ação | Resolve |
|---|------|---------|
| 6 | `await` + retry em `insertSubscriptionEvent`; métrica de falha | OB04 |
| 7 | Audit events: `sync_subscription`, `downgrade_job`, `pending_checkout` | OB11, OB13 |
| 8 | Tabela `job_runs` + try/catch nos crons | OB09 |
| 9 | `warn` em early returns dos handlers de invoice | OB10 |
| 10 | Padronizar `logger` em todo fluxo Stripe | OB16 |

### Ciclo 3 — Plataforma (P2)

| # | Ação | Resolve |
|---|------|---------|
| 11 | Sentry (frontend + backend billing) | OB15 |
| 12 | Prometheus `/metrics` | OB03 |
| 13 | Endpoint admin billing stats (views SQL) | OB17 |
| 14 | UI histórico `church_subscription_events` | OB19 |
| 15 | Middleware `X-Request-Id` + metadata Stripe | OB01 |

---

## Relação com auditorias anteriores

| Tópico | Interseção observabilidade |
|--------|---------------------------|
| [01 — Webhooks](./01-audit-webhooks.md) | Falhas silenciosas corrigidas (500 + release); logs ainda básicos |
| [03 — Segurança](./03-audit-security.md) | S02 health check; logs com possível PII |
| [04 — Ciclo de vida](./04-audit-subscription-lifecycle.md) | Job downgrade sem audit; emails como único sinal |
| [06 — Banco](./06-audit-database.md) | `church_subscription_events`, views, RPC integridade — infra pronta, consumo ausente |

---

## Conclusão

A integração Stripe possui **fundação mínima** de observabilidade (logs de erro, idempotência de webhook, audit trail parcial pós-Ciclo 2), mas **não está pronta para operação de produção em escala** sem equipe de plantão correlacionando manualmente Stripe Dashboard, logs e SQL.

Os seis achados **ALTO** concentram-se em: ausência de métricas/alertas, logs não estruturados, audit trail não garantido e falhas de comunicação (e-mail) invisíveis para ops. O pacote P0 do Ciclo 1 pode ser implementado sem dependências externas pesadas (logger JSON + cron de integridade + alertas simples).

**Ciclos 1–3 implementados:** ver [`07-audit-observability-dev-report.md`](./07-audit-observability-dev-report.md) e [`07-audit-observability-revalidacao.md`](./07-audit-observability-revalidacao.md).

**Pendências menores:** OB18 (cache expiração), dashboard Grafana, `global-error.tsx` Sentry.
