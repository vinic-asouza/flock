# Auditoria Stripe — Pagamentos

Série de relatórios de auditoria da integração Stripe do Flock, seguindo os prompts em [`docs/prompts/PAYMENTS/`](../prompts/PAYMENTS/).

| # | Escopo | Levantamento | Dev report | Revalidação | Status |
|---|--------|--------------|------------|-------------|--------|
| 01 | Webhooks | [01-audit-webhooks.md](./01-audit-webhooks.md) | [01-audit-webhooks-dev-report.md](./01-audit-webhooks-dev-report.md) | [01-audit-webhooks-revalidacao.md](./01-audit-webhooks-revalidacao.md) | Ciclo 1 concluído |
| 02 | Multi-tenant | [02-audit-multitenant.md](./02-audit-multitenant.md) | [02-audit-multitenant-dev-report.md](./02-audit-multitenant-dev-report.md) | [02-audit-multitenant-revalidacao.md](./02-audit-multitenant-revalidacao.md) | Ciclo 1 concluído |
| 03 | Segurança | [03-audit-security.md](./03-audit-security.md) | [03-audit-security-dev-report.md](./03-audit-security-dev-report.md) | [03-audit-security-revalidacao.md](./03-audit-security-revalidacao.md) | Ciclo 2 concluído |
| 04 | Ciclo de vida assinaturas | [04-audit-subscription-lifecycle.md](./04-audit-subscription-lifecycle.md) | [04-audit-subscription-lifecycle-dev-report.md](./04-audit-subscription-lifecycle-dev-report.md) | [04-audit-subscription-lifecycle-revalidacao.md](./04-audit-subscription-lifecycle-revalidacao.md) | Ciclo 1 concluído |
| 05 | Frontend billing (UX) | [05-audit-frontend-billing.md](./05-audit-frontend-billing.md) | [05-audit-frontend-billing-dev-report.md](./05-audit-frontend-billing-dev-report.md) | [05-audit-frontend-billing-revalidacao.md](./05-audit-frontend-billing-revalidacao.md) | Ciclo 1 concluído |
| 06 | Banco / sincronização | [06-audit-database.md](./06-audit-database.md) | [06-audit-database-dev-report.md](./06-audit-database-dev-report.md) | [06-audit-database-revalidacao.md](./06-audit-database-revalidacao.md) | Ciclo 2 concluído |
| 07 | Observabilidade | [07-audit-observability.md](./07-audit-observability.md) | [07-audit-observability-dev-report.md](./07-audit-observability-dev-report.md) | [07-audit-observability-revalidacao.md](./07-audit-observability-revalidacao.md) | Ciclo 3 (P2) concluído |

### Pós-auditoria (consolidação)

| Doc | Conteúdo |
|-----|----------|
| [08-revisao-geral-pos-auditoria.md](./08-revisao-geral-pos-auditoria.md) | Revisão cruzada, gaps, impedimentos |
| [09-pendencias-futuras.md](./09-pendencias-futuras.md) | Itens em aberto por categoria e urgência |
| [10-checklist-testes-billing.md](./10-checklist-testes-billing.md) | Testes manuais básicos pós-ajustes |

**Legenda de severidade:** CRÍTICO · ALTO · MÉDIO · BAIXO

**Metodologia por tópico:** Levantamento → Correções → Revalidação → Novas correções (se necessário)

**Deploy Webhooks (01):** executar [`backend/scripts/add_last_stripe_event_created.sql`](../../backend/scripts/add_last_stripe_event_created.sql) no Supabase antes do deploy.

**Deploy Multi-tenant (02):** executar [`add_unique_stripe_tenant_ids.sql`](../../backend/scripts/add_unique_stripe_tenant_ids.sql) e [`add_pending_link_token.sql`](../../backend/scripts/add_pending_link_token.sql) no Supabase (após saneamento de duplicatas).

**Deploy Segurança (03):** opcional `HEALTH_CHECK_TOKEN` para proteger `/api/health/stripe` em produção.

**Deploy Ciclo de vida (04):** nenhuma migração SQL necessária. O job `downgradeExpiredSubscriptions` (cron 3h) corrige automaticamente igrejas com `subscription_end_date` expirado na primeira execução.

**Deploy Banco (06):** ver checklist em [06-audit-database.md](./06-audit-database.md) — garantir scripts Stripe + `church_users` aplicados; saneamento antes de UNIQUE em `churches`.
