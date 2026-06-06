# Revalidação — Tópico 04: Ciclo de vida de assinaturas

**Data:** 2026-06-04  
**Dev report:** [`04-audit-subscription-lifecycle-dev-report.md`](./04-audit-subscription-lifecycle-dev-report.md)

---

| ID | Título | Severidade | Status |
|----|--------|-----------|--------|
| SL01 | `activate-free-plan` não cancela assinatura no Stripe | CRÍTICO | ✅ Resolvido |
| SL02 | E-mail de cancelamento ao **agendar** fim (não ao encerrar) | ALTO | ✅ Resolvido |
| SL03 | `customer.subscription.created` reutiliza handler de `updated` | ALTO | ✅ Resolvido |
| SL04 | Sem garantia de downgrade para plano 100 ao fim do período sem webhook | ALTO | ✅ Resolvido |
| SL05 | `past_due`: status atualizado, plano pago e limites mantidos | ALTO | ✅ Resolvido |
| SL06 | `invoice.payment_succeeded` não atualiza `plan_type` nem datas | MÉDIO | ✅ Resolvido |
| SL07 | `sync-subscription` pode sobrescrever estado mais novo do webhook | MÉDIO | ✅ Resolvido |
| SL08 | `changePlan` atualiza DB antes do webhook (janela de inconsistência) | MÉDIO | ⚪ Aceito |
| SL09 | Detecção de "reativação" frágil e nomenclatura invertida | MÉDIO | ✅ Resolvido |
| SL10 | Checkout completo não preenche `subscription_end_date` para sub ativa | MÉDIO | ⚪ Aceito |
| SL11 | Trial não configurado no Checkout | BAIXO | ⚪ Fora do ciclo |
| SL12 | Polling pós-checkout não trata `past_due` como confirmado | BAIXO | ⚪ Aceito |
| SL13 | Cron de expiração ignora `active` + `cancel_at_period_end` | BAIXO | ✅ Resolvido |
| SL14 | `getSubscriptionEndDate` prioriza `cancel_at` sobre `current_period_end` | BAIXO | ⚪ Aceito |

---

## Detalhamento dos aceitos

- **SL08**: Janela de inconsistência entre API Stripe e banco é curta (< 1s) e o webhook eventual corrige. Sync manual disponível. Risco operacional baixo.
- **SL10**: Para assinatura recorrente sem cancelamento agendado, `subscription_end_date = null` é semanticamente correto. UI de "próxima renovação" deve usar portal Stripe ou `current_period_end` do sync.
- **SL12**: Polling só considera `active`/`trialing` como confirmados. O cenário `past_due` imediatamente após checkout é raro (Stripe não processa assim). SL05 mitiga: adição de membros bloqueada.
- **SL14**: `cancel_at > canceled_at > current_period_end` é a ordem correta para refletir o fim planejado da assinatura.
