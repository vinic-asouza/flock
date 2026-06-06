# Revalidação 07 — Observabilidade Stripe

**Projeto:** Flock  
**Última atualização:** 2026-06-05 (pós-Ciclo 3 P2)  
**Dev report:** [`07-audit-observability-dev-report.md`](./07-audit-observability-dev-report.md)

---

## Resultado acumulado (Ciclos 1 + 2 + 3)

| ID | Achado | Situação |
|----|--------|----------|
| OB01 | Logs não estruturados / sem correlation ID | ✅ Resolvido |
| OB02 | `debug`/`info` cegos em produção | ✅ Resolvido |
| OB03 | Ausência de métricas/tracing | ✅ Resolvido (Prometheus) |
| OB04 | Audit trail fire-and-forget | ✅ Resolvido |
| OB05 | E-mail silencioso + PII em logs | ✅ Resolvido |
| OB06 | Zero alertas ops | ✅ Resolvido |
| OB07 | Health superficial / doc desatualizada | ✅ Resolvido |
| OB08 | Integridade não agendada | ✅ Resolvido |
| OB09 | Jobs sem histórico `job_runs` | ✅ Resolvido |
| OB10 | Early return sem log em invoice handlers | ✅ Resolvido |
| OB11 | Checkout/sync sem log de sucesso | ✅ Resolvido |
| OB12 | `processed_webhook_events` sem contexto | ✅ Resolvido |
| OB13 | Downgrade sem audit trail | ✅ Resolvido |
| OB14 | Sync sem verificação de erro (ramo sem assinatura) | ✅ Resolvido (Ciclo 2) |
| OB15 | Frontend sem telemetria | ✅ Resolvido (Sentry + billingTelemetry) |
| OB16 | Logger inconsistente no fluxo Stripe | ✅ Resolvido (Ciclo 2) |
| OB17 | Views SQL não expostas | ✅ Resolvido |
| OB18 | Cache in-memory avisos expiração | ⏳ Futuro |
| OB19 | Sem UI/API histórico billing | ✅ Resolvido |
| OB20 | `subscriptionLinkFailed` sem métrica | ✅ Resolvido |

---

## Confirmação técnica — Ciclo 3 (P2)

**OB03** — `prom-client` com 6 métricas de billing; endpoint `GET /metrics` exporta formato Prometheus.

**OB12** — `processed_webhook_events` com `church_id`, `processing_ms`, `outcome`. Claim reutiliza linhas `released`; sucesso grava `success`; falha grava `released` (retry Stripe permitido).

**OB15** — `captureBillingError` no frontend reporta `billing_sync_failed` ao Sentry (church_id hasheado). Backend captura exceções de webhook via `captureBillingException`.

**OB17** — `GET /api/internal/billing/stats` consome `vw_webhook_stats`, `vw_subscription_status`, `job_runs`, `validate_subscription_integrity()`.

**OB19** — `GET /api/stripe/subscription-events` + seção "Histórico de assinatura" em PaymentManagement (admin/owner).

**OB20** — Contador `register_subscription_link_failed_total` incrementado em falha de `link_pending_to_church`.

---

## Pendências menores (fora do escopo P2)

- OB18: persistir dedup de e-mails de expiração (Redis/coluna)
- Dashboard Grafana consumindo `/metrics`
- `global-error.tsx` Sentry (warning de setup Next.js)

---

## Conclusão

Os três ciclos de observabilidade Stripe estão **completos**: logs estruturados, alertas ops, audit trail com retry, histórico de jobs, métricas Prometheus, telemetria Sentry, stats internos e UI de histórico para suporte/tenant. A integração está pronta para operação monitorada em produção.
