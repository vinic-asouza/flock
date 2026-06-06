# Dev report — Tópico 02 Multi-tenant (Stripe)

## Resumo

Implementação em 6 ondas conforme plano aprovado. Build backend (`npm run build`) OK.

## SQL a executar no Supabase (ordem)

1. [`backend/scripts/add_unique_stripe_tenant_ids.sql`](../../backend/scripts/add_unique_stripe_tenant_ids.sql) — após saneamento de duplicatas em `churches.stripe_customer_id` / `stripe_subscription_id`
2. [`backend/scripts/add_pending_link_token.sql`](../../backend/scripts/add_pending_link_token.sql)

## Onda 1 — MT01, MT02

- Checkout público rejeita `church_id` no body (400).
- Usuário autenticado sem igreja ativa → 403 (`CHURCH_SELECTION_REQUIRED` ou sem membership).
- Metadata `church_id: 'pending'` no ramo landing.

**Arquivos:** `stripeController.ts`, `churchContext.ts` (`ensureUserAndChurchContext`, `attachChurchContext`).

## Onda 2 — MT03, MT04, MT10, MT11

- `getOrCreateCustomerForChurch` / `createPendingCheckoutCustomer` em `stripe.ts`.
- Índices UNIQUE documentados em `bd-structure.sql` + script SQL.
- `syncSubscription` filtra por `stripe_subscription_id` da igreja ou `metadata.church_id`.

## Onda 3 — MT05, MT06

- `checkCheckoutStatus` valida `metadata.church_id`, customer e subscription da igreja ativa.
- `assertCheckoutCustomerMatchesChurch` em `stripeTenantService.ts`; usado em `handleCheckoutCompleted`.

## Onda 4 — MT07

- Cookie httpOnly `flock_active_church_id`, header `X-Church-Id`.
- `GET /api/church/memberships`, `POST /api/church/active` (auth sem igreja obrigatória).
- `checkAuth` e login retornam `memberships` / `activeChurchId`.
- Frontend: interceptor Axios, `AuthContext`, `ChurchSwitcher`, `ChurchSelectionGate`.

## Onda 5 — MT09, MT08

- `link_token` UUID no checkout landing → metadata → `pending_subscriptions` → registro.
- `sanitizeChurchForRole` em `GET /church` (reader/editor sem IDs Stripe).

## Onda 6 — MT12

- **RLS Supabase:** fora do escopo Ciclo 1; isolamento atual via middleware + queries com `req.church.churchId`. Recomendação: políticas RLS em ciclo futuro.

## Breaking changes

- Usuários com **múltiplas igrejas** precisam selecionar igreja ativa (403 até `POST /church/active` ou cookie).
- Checkout landing: `successUrl` aponta para `/register?link_token=...` (configurar `LANDING_URL`).
- Clientes antigos devem atualizar frontend para enviar `X-Church-Id` (fallback: cookie httpOnly + auto-set com 1 membership).

## Checklist manual

Ver plano — seções de testes 1–7.
