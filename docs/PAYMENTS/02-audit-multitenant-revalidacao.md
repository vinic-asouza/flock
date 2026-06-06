# Revalidação — Tópico 02 Multi-tenant

Data: 2026-05-28 · Revisão estática pós-implementação.

| ID | Achado | Status | Evidência |
|----|--------|--------|-----------|
| MT01 | `church_id` no checkout público (IDOR) | **Resolvido** | `createCheckout` retorna 400 se `church_id` no body; metadata `pending` |
| MT02 | Re-auth cookie sem `req.church` | **Resolvido** | `attachChurchContext` no auth/optionalAuth; checkout autenticado exige igreja |
| MT03 | Customer compartilhado por e-mail | **Resolvido** | `getOrCreateCustomerForChurch` por `church_id` + DB |
| MT04 | Sem UNIQUE em `stripe_customer_id` | **Resolvido** | Script SQL + índices em `bd-structure.sql`; erro 23505 no update |
| MT05 | `checkCheckoutStatus` sem escopo | **Resolvido** | Valida metadata, customer e subscription da igreja ativa |
| MT06 | Webhook sem validar customer↔igreja | **Resolvido** | `assertCheckoutCustomerMatchesChurch` antes do update |
| MT07 | Multi-membership sem igreja ativa | **Resolvido** | Cookie/header, APIs, FE switcher + gate |
| MT08 | Stripe IDs expostos a reader | **Resolvido** | `sanitizeChurchForRole` em `getChurch` |
| MT09 | Pending sem vínculo seguro | **Resolvido** | `link_token` checkout → pending → register |
| MT10 | Portal com customer errado | **Resolvido** | Customer 1:1 por igreja (MT03) |
| MT11 | Sync aplica assinatura alheia | **Resolvido** | Filtro tenant em `syncSubscription` |
| MT12 | Sem RLS Supabase | **Aceito** | Documentado no dev-report; middleware + escopo de query |

## Pendências operacionais

- Executar scripts SQL em produção.
- Saneamento manual se índices UNIQUE falharem por duplicatas existentes.

## Conclusão

Critério de fechamento do Ciclo 1 atendido em código. Validação E2E manual recomendada antes de deploy.
