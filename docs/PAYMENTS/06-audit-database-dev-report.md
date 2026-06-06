# Dev Report 06 — Banco de dados financeiro (Stripe)

**Projeto:** Flock  
**Última atualização:** 2026-06-05 (Ciclo 2 — DB03, DB05, DB18)  
**Data inicial (Ciclo 1):** 2026-06-04  
**Baseado em:** [`06-audit-database.md`](./06-audit-database.md) (levantamento refinado com MCP Supabase)  
**Ambiente Supabase:** `flock-app-01` (`lzsybtvywrhwsxtsywbw`)  
**Ferramentas:** MCP `apply_migration`, `execute_sql`; patches em TypeScript

---

## Resumo das correções

| ID | Título | Tipo | Ciclo | Status |
|----|--------|------|-------|--------|
| DB02 | UNIQUE `pending_subscriptions.stripe_customer_id` | SQL (migration) | 1 | ✅ Aplicado |
| DB04 | Copiar `last_stripe_event_created` no vínculo de registro | Código | 1 | ✅ Corrigido |
| DB06 | CHECK `subscription_id → customer_id` em `churches` | SQL (migration) | 1 | ✅ Aplicado |
| DB07 | Vínculo registro↔pending em transação atômica (RPC) | SQL + Código | 1 | ✅ Implementado |
| DB08 | Falha silenciosa ao vincular pending | Código | 1 | ✅ Corrigido |
| DB10 | Índice `subscription_end_date` para jobs de expiração | SQL (migration) | 1 | ✅ Aplicado |
| DB03 | `bd-structure.sql` desatualizado | Arquivo | 2 | ✅ Sincronizado |
| DB05 | Sem histórico de billing (`church_subscription_events`) | SQL + Código | 2 | ✅ Implementado |
| DB18 | RLS desabilitado nas tabelas financeiras | SQL + Código | 2 | ✅ Habilitado |

Pendentes (baixa prioridade): DB01, DB11–DB17.

---

## DB02 — UNIQUE `pending_subscriptions.stripe_customer_id`

**Migration:** `db02_unique_pending_stripe_customer_id`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_subscriptions_stripe_customer_id_unique
  ON public.pending_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

**Verificação:**

```
indexname: idx_pending_subscriptions_stripe_customer_id_unique
indexdef:  CREATE UNIQUE INDEX ... ON public.pending_subscriptions USING btree (stripe_customer_id)
           WHERE (stripe_customer_id IS NOT NULL)
```

**Impacto:** re-checkout ou retry do mesmo customer Stripe agora resulta em erro 23505 (detectável no código) em vez de duas linhas que tornam `maybeSingle()` não-determinístico.

---

## DB06 — CHECK `subscription_id → customer_id`

**Migration:** `db06_check_subscription_requires_customer`

```sql
ALTER TABLE public.churches
  ADD CONSTRAINT churches_subscription_requires_customer
  CHECK (stripe_subscription_id IS NULL OR stripe_customer_id IS NOT NULL);
```

**Verificação:**

```
conname: churches_subscription_requires_customer
def:     CHECK (((stripe_subscription_id IS NULL) OR (stripe_customer_id IS NOT NULL)))
```

**Impacto:** banco rejeita INSERT/UPDATE que coloque `stripe_subscription_id` sem `stripe_customer_id`, tornando o par sempre coerente.

---

## DB10 — Índice `subscription_end_date`

**Migration:** `db10_idx_churches_subscription_end_date`

```sql
CREATE INDEX IF NOT EXISTS idx_churches_subscription_end_date
  ON public.churches (subscription_end_date)
  WHERE subscription_end_date IS NOT NULL;
```

**Verificação:**

```
indexname: idx_churches_subscription_end_date
indexdef:  CREATE INDEX ... ON public.churches USING btree (subscription_end_date)
           WHERE (subscription_end_date IS NOT NULL)
```

**Impacto:** jobs `downgradeExpiredSubscriptions` e `checkSubscriptionExpiration` deixam de fazer seq scan completo em `churches` ao filtrar por data de expiração.

---

## DB07 — RPC `link_pending_to_church` (transação atômica)

**Migration:** `db07_rpc_link_pending_to_church`

```sql
CREATE OR REPLACE FUNCTION public.link_pending_to_church(
  p_pending_id uuid,
  p_church_id  uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pending public.pending_subscriptions%ROWTYPE;
  v_updated int;
BEGIN
  SELECT * INTO v_pending FROM public.pending_subscriptions
  WHERE id = p_pending_id AND expires_at > now() FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_not_found_or_expired');
  END IF;

  UPDATE public.churches SET
    stripe_customer_id        = v_pending.stripe_customer_id,
    stripe_subscription_id    = v_pending.stripe_subscription_id,
    subscription_status       = v_pending.subscription_status,
    plan_type                 = v_pending.plan_type,
    subscription_start_date   = v_pending.subscription_start_date,
    last_stripe_event_created = v_pending.last_stripe_event_created   -- DB04
  WHERE id = p_church_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'church_not_found');
  END IF;

  DELETE FROM public.pending_subscriptions WHERE id = p_pending_id;
  RETURN jsonb_build_object('ok', true);
END;$$;
```

**Verificação:** `information_schema.routines` retornou `link_pending_to_church`.

**Impacto:** UPDATE em `churches` e DELETE em `pending_subscriptions` são atomicamente consistentes — sem estado intermediário de "igreja sem plano / pending ainda existente".

---

## DB04 — Copiar `last_stripe_event_created` no registro

Corrigido dentro da RPC `link_pending_to_church` (linha `last_stripe_event_created = v_pending.last_stripe_event_created`).

**Antes:** campo era omitido; webhooks subsequentes com `event.created` menor podiam ser ignorados incorretamente.  
**Depois:** campo copiado atomicamente junto com os demais dados Stripe.

---

## DB08 — Falha explícita ao vincular pending

**Arquivo:** `backend/src/controllers/authController.ts`

**Antes:**
```ts
if (!linkError) {
  await supabase.from('pending_subscriptions').delete().eq('id', pendingSubscription.id);
  console.log(`✅ Assinatura pendente vinculada...`);
} else {
  console.error('Erro ao vincular assinatura pendente:', linkError);
  // sem sinalização ao frontend
}
// response: subscriptionLinked: !!pendingSubscription (sempre true se pending existia)
```

**Depois:**
```ts
const { data: rpcResult, error: rpcError } = await supabase.rpc('link_pending_to_church', {
  p_pending_id: pendingSubscription.id,
  p_church_id: churchRecord.id,
});

const rpcOk = !rpcError && rpcResult?.ok === true;
if (rpcOk) {
  console.log(`✅ Assinatura pendente vinculada à igreja ${churchRecord.id}`);
} else {
  const reason = rpcResult?.error ?? rpcError?.message ?? 'unknown';
  console.error(`[Register] Falha ao vincular assinatura pendente (${reason}):`, rpcError);
  subscriptionLinkFailed = true;
}
// response: subscriptionLinked: true somente se rpc ok; subscriptionLinkFailed: true em caso de falha
```

**Impacto:** frontend pode detectar `subscriptionLinkFailed: true` na resposta 201 e exibir aviso. Pending não é deletada em caso de falha, permitindo retry ou intervenção manual.

---

## Verificação final no Supabase (`flock-app-01`)

| Artefato | Presente? |
|----------|-----------|
| `idx_pending_subscriptions_stripe_customer_id_unique` | ✅ |
| `idx_churches_subscription_end_date` | ✅ |
| `churches_subscription_requires_customer` (CHECK) | ✅ |
| `link_pending_to_church` (FUNCTION) | ✅ |
| `church_subscription_events` (tabela) | ✅ |
| RLS em tabelas financeiras | ✅ (`churches`, `pending_subscriptions`, `processed_webhook_events`, `church_subscription_events`) |
| Migrations registradas | 6 (db02, db06, db07, db10, db05, db18) |

---

## Ciclo 2 — DB03: Sincronizar `bd-structure.sql`

**Arquivo:** `backend/bd-structure.sql`

O arquivo estava desatualizado em relação ao `flock-app-01`. Adicionados:

- Enum types: `church_user_role`, `church_user_status`, `gender_enum`, `marital_status_enum`, `admission_type_enum`, `integration_status_enum`
- Tabela `church_users` com constraints, índices e trigger
- Função e trigger `update_church_subscription_updated_at`
- Função e trigger `update_church_users_updated_at`
- RPCs: `link_pending_to_church`, `cleanup_old_webhook_events`, `validate_subscription_integrity`
- Views: `vw_subscription_status`, `vw_webhook_stats`
- Tabela `church_subscription_events` (DB05)
- Índice `idx_pending_subscriptions_stripe_customer_id_unique`
- Índice `idx_churches_subscription_end_date`
- CHECK `churches_subscription_requires_customer`

---

## Ciclo 2 — DB05: Histórico de billing (`church_subscription_events`)

**Migration:** `db05_church_subscription_events`

```sql
CREATE TABLE public.church_subscription_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  old_plan        text, new_plan text,
  old_status      text, new_status text,
  source          text NOT NULL DEFAULT 'webhook',
  stripe_event_id text,
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_church_sub_events_church_id ON public.church_subscription_events(church_id);
CREATE INDEX idx_church_sub_events_created_at ON public.church_subscription_events(created_at DESC);
```

**Helper:** `insertSubscriptionEvent()` exportado de `stripeWebhookService.ts` — usa `supabaseAdmin` para todos os inserts.

**Pontos de inserção:**

| Evento | Origem | `event_type` |
|--------|--------|-------------|
| `handleCheckoutCompleted` | webhook | `subscription_created` |
| `handleSubscriptionUpdated` | webhook | `subscription_updated` |
| `handleSubscriptionDeleted` | webhook | `subscription_canceled` |
| `handlePaymentSucceeded` | webhook | `payment_succeeded` |
| `handlePaymentFailed` | webhook | `payment_failed` |
| `changePlan` | API | `plan_changed` |
| `activateFreePlan` | API | `activate_free` |

---

## Ciclo 2 — DB18: RLS nas tabelas financeiras

**Migration:** `db18_rls_financial_tables`

Pré-requisito — migrar todas as queries server-side para `supabaseAdmin` (service_role) que bypassa RLS. Feito em:

| Arquivo | Mudança |
|---------|---------|
| `backend/src/services/supabase.ts` | `supabaseAdmin` agora é obrigatório — startup falha se `SUPABASE_SERVICE_ROLE_KEY` ausente |
| `stripeWebhookService.ts` | Todas as queries de DB migradas para `supabaseAdmin` |
| `stripeController.ts` | Alias `const supabase = supabaseAdmin` para queries de DB |
| `stripeTenantService.ts` | Import trocado para `supabaseAdmin` |
| `authController.ts` | `const db = supabaseAdmin` para queries de DB; `supabase.auth.*` mantido com anon |
| `planLimits.ts` | Alias `const supabase = supabaseAdmin` |
| `churchContext.ts` | Queries a `church_users` e `churches` migradas para `supabaseAdmin` |

SQL aplicado:

```sql
ALTER TABLE public.churches                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_anon_churches      ON public.churches               AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_pending       ON public.pending_subscriptions  AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_webhook_events ON public.processed_webhook_events AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_sub_events    ON public.church_subscription_events AS RESTRICTIVE FOR ALL TO anon USING (false);
```

**Impacto:** acesso via `SUPABASE_KEY` (anon key pública) bloqueado em todas as tabelas financeiras. Qualquer query direta ao Supabase REST com a chave pública recebe 401/403 — eliminando o vetor de exfiltração de dados de billing.

---

## Ciclo 3 — DB19: RLS global (demais tabelas)

**Migration:** `db19_rls_remaining_tables` (2026-06-05, via MCP Supabase `flock-app-01`)

**Políticas legadas removidas** (owner-only, incompatíveis com `church_users`):
- `churches` — `Allow access to own church data`
- `congregations` — `Igrejas podem gerenciar suas próprias congregações`
- `members` — `Allow access to own members data`
- `audit_logs` — `audit_logs_insert_own_church`, `audit_logs_select_own_church`

**12 tabelas com RLS habilitado + `deny_anon`:**
`audit_logs`, `calendar_items`, `calendar_participants`, `church_users`, `congregations`, `groups`, `integration_members`, `member_groups`, `members`, `public_integration_links`, `public_registration_links`, `waitlist`

**RPCs endurecidas** (EXECUTE somente `service_role`):
`link_pending_to_church`, `cleanup_old_webhook_events`, `validate_subscription_integrity`, `cleanup_expired_pending_subscriptions`

**Estado final:** 17 tabelas `public` com RLS ativo; uma policy `deny_anon_*` por tabela; zero políticas legadas.

**Verificação pós-migration:**
- `relrowsecurity = true` em todas as 17 tabelas
- REST anon em `members`/`churches`/`church_users` → `[]` (sem linhas visíveis)
- REST anon em `link_pending_to_church` → `401 permission denied`

Script versionado: `backend/scripts/db19_rls_remaining_tables.sql`

---

## Arquivos alterados (acumulado)

| Arquivo | Mudança |
|---------|---------|
| `authController.ts` | RPC atômica, `subscriptionLinkFailed`, `db = supabaseAdmin` para queries DB |
| `stripeWebhookService.ts` | Queries migradas para `supabaseAdmin`; `insertSubscriptionEvent` helper |
| `stripeController.ts` | Queries migradas para `supabaseAdmin`; `insertSubscriptionEvent` em changePlan/activateFreePlan |
| `stripeTenantService.ts` | Trocado para `supabaseAdmin` |
| `planLimits.ts` | Trocado para `supabaseAdmin` |
| `churchContext.ts` | Queries de DB migradas para `supabaseAdmin` |
| `services/supabase.ts` | `supabaseAdmin` obrigatório (falha no startup se ausente) |
| `bd-structure.sql` | Sincronizado com `flock-app-01` (enums, tabelas, triggers, funções, views, índices) |
| Supabase (via MCP) | 6 migrations: DB02, DB06, DB07, DB10, DB05, DB18 |
