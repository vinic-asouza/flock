# Revalidação 06 — Banco de dados financeiro (Stripe)

**Projeto:** Flock  
**Última atualização:** 2026-06-05 (pós-Ciclo 2)  
**Data inicial (Ciclo 1):** 2026-06-04  
**Dev report:** [`06-audit-database-dev-report.md`](./06-audit-database-dev-report.md)  
**Ambiente validado:** `flock-app-01` (MCP Supabase)

---

## Resultado acumulado (Ciclos 1 + 2)

| ID | Achado | Situação |
|----|--------|----------|
| DB02 | Sem UNIQUE em `pending_subscriptions.stripe_customer_id` | ✅ Resolvido (Ciclo 1) |
| DB04 | Registro não copia `last_stripe_event_created` | ✅ Resolvido (Ciclo 1) |
| DB06 | Sem CHECK `subscription_id → customer_id` | ✅ Resolvido (Ciclo 1) |
| DB07 | Vínculo registro↔pending sem transação | ✅ Resolvido (Ciclo 1) |
| DB08 | Falha silenciosa no vínculo pending | ✅ Resolvido (Ciclo 1) |
| DB10 | Sem índice em `subscription_end_date` | ✅ Resolvido (Ciclo 1) |
| DB03 | `bd-structure.sql` desatualizado | ✅ Resolvido (Ciclo 2) |
| DB05 | Sem histórico de billing | ✅ Resolvido (Ciclo 2) |
| DB18 | RLS desabilitado nas tabelas financeiras | ✅ Resolvido (Ciclo 2) |
| DB01 | Drift `plan_type` pending entre scripts | ⏳ Documentado; baixo risco em prod |
| DB09 | Trigger ausente no snapshot do repo | ✅ Corrigido via DB03 |
| DB11 | Estados logicamente inválidos sem CHECK | ⏳ Monitorar via `validate_subscription_integrity()` |
| DB12 | RPC `cleanup_old_webhook_events` opcional | ✅ Já aplicada em `flock-app-01` |
| DB13–DB17 | Índice email, `custom`, redundância, `church_users` | ⏳ Baixa prioridade |

---

## Confirmação técnica — Ciclo 2

**DB03** — `bd-structure.sql` atualizado com enums, `church_users`, triggers, RPCs (`link_pending_to_church`, `cleanup_old_webhook_events`, `validate_subscription_integrity`), views (`vw_subscription_status`, `vw_webhook_stats`), `church_subscription_events`, novos índices e CHECK.

**DB05** — Migration `db05_church_subscription_events` aplicada. Tabela criada com PKs, FKs e índices. Helper `insertSubscriptionEvent()` adicionado a `stripeWebhookService.ts`. Inserções cobertas em 7 pontos: checkout, subscription updated/deleted, payment succeeded/failed, changePlan, activateFreePlan.

**DB18** — Migration `db18_rls_financial_tables` aplicada:
- `ENABLE ROW LEVEL SECURITY` em `churches`, `pending_subscriptions`, `processed_webhook_events`, `church_subscription_events`
- Políticas `RESTRICTIVE ... TO anon USING (false)` em todas as tabelas
- `supabase.ts`: `supabaseAdmin` não-nullable; falha no startup se `SUPABASE_SERVICE_ROLE_KEY` ausente
- Todos os serviços financeiros migrados para `supabaseAdmin`: `stripeWebhookService`, `stripeController`, `stripeTenantService`, `authController`, `planLimits`, `churchContext`
- `supabase.auth.*` mantido com client anon (correto para Supabase Auth API)

---

## Confirmação técnica — Ciclo 1 (mantida)

**DB02** — `pg_indexes` lista `idx_pending_subscriptions_stripe_customer_id_unique` (UNIQUE WHERE NOT NULL).

**DB04** — RPC `link_pending_to_church` inclui `last_stripe_event_created = v_pending.last_stripe_event_created`.

**DB06** — `pg_constraint` retornou `churches_subscription_requires_customer` com definição `CHECK (stripe_subscription_id IS NULL OR stripe_customer_id IS NOT NULL)`.

**DB07/DB08** — `authController.ts` usa `db.rpc('link_pending_to_church')`, verifica `rpcResult.ok`, sinaliza `subscriptionLinkFailed` no response. Pending não é deletada em falha.

**DB10** — `pg_indexes` lista `idx_churches_subscription_end_date` (WHERE NOT NULL).

---

## Pendentes (baixa prioridade)

- **DB01:** divergência de `plan_type` nos scripts de seeding — monitorar; sem impacto em prod.
- **DB11:** estados inválidos sem CHECK adicional — coberto pelo `validate_subscription_integrity()` RPC.
- **DB13–DB17:** índice de email, enum `custom`, deduplicação de constraints — ciclo de manutenção futuro.
