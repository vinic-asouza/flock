# Dev report — Tópico 03 Segurança Stripe

**Data:** 2026-05-28 · Ciclo 2 (correções)

## Resumo

Correções aplicadas para S01–S05, S08–S11, S13 e parcial S12. Build backend OK.

## Alterações por achado

| ID | Correção |
|----|----------|
| **S01** | `publicCheckoutLimiter` (10/h por IP) em rotas públicas de checkout — [`stripeSecurity.ts`](../../backend/src/middlewares/stripeSecurity.ts) |
| **S02** | Health Stripe sem chamada à API nem flags de secrets; opcional `HEALTH_CHECK_TOKEN` / header `x-health-token` |
| **S03** | `X-Church-Id` em `allowedHeaders` do CORS — [`app.ts`](../../backend/src/app.ts) |
| **S04** | `requireAdminForPaidCheckout` após `optionalAuth` — só admin/owner inicia checkout autenticado |
| **S05** | Cookie httpOnly `flock_pending_link_token`; `successUrl` sem token na query; registro resolve token via cookie, body, ou `checkout_session_id` → metadata Stripe |
| **S08** | `stripeWebhookLimiter` (300/min) na rota webhook |
| **S09** | Removida re-auth duplicada em `createCheckout` (confia em `optionalAuth` + middlewares) |
| **S10** | Removido fallback de pending por e-mail no registro |
| **S11** | Resposta 400 do webhook: `Invalid signature` em produção |
| **S12** | Em produção, CORS exige `Origin` |
| **S13** | Polling em `/subscription/success` com backoff exponencial (cap 15s) |

## Arquivos principais

- `backend/src/middlewares/stripeSecurity.ts` (novo)
- `backend/src/routes/stripe.ts`
- `backend/src/controllers/stripeController.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/utils/cookieUtils.ts`
- `backend/src/services/stripeWebhookService.ts`
- `backend/src/app.ts`
- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/app/subscription/success/page.tsx`

## Variáveis de ambiente (opcional)

| Variável | Uso |
|----------|-----|
| `HEALTH_CHECK_TOKEN` | Protege `GET /api/health/stripe` (query `?token=` ou header `x-health-token`) |

## Fora deste ciclo (documentado)

| ID | Motivo |
|----|--------|
| **S06** | Blacklist JWT em memória — exige Redis/tabela `revoked_tokens` (escopo maior) |
| **S07** | RLS Supabase — ciclo dedicado multi-tenant DB |
| **S14** | Comportamento aceito (plano gratuito + RBAC) |

## Breaking changes

- **Reader/editor** não podem mais abrir checkout pago (403) — usar conta admin.
- **Registro** sem `link_token` / `checkout_session_id` / cookie não vincula pending automaticamente.
- **Health Stripe** público retorna só `{ status: 'ok' }` — monitoramento interno deve usar token se exposto na internet.
- **Produção:** requisições browser sem header `Origin` são rejeitadas pelo CORS.

## Testes manuais sugeridos

1. 11× checkout público na mesma hora → 429 na 11ª.
2. `GET /api/health/stripe` → `{ status: 'ok' }` sem campos de config.
3. Reader em `POST create-checkout-session` → 403.
4. Landing: checkout → registro com `?session_id=` → assinatura vinculada.
5. Webhook com assinatura inválida em produção → corpo `Invalid signature`.
