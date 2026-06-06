# Revalidação — Tópico 05: Frontend Billing

**Data:** 2026-06-04  
**Dev report:** [`05-audit-frontend-billing-dev-report.md`](./05-audit-frontend-billing-dev-report.md)

---

| ID | Título | Severidade | Status |
|----|--------|-----------|--------|
| FB01 | Success sem `session_id` exibe sucesso falso | ALTO | ✅ Resolvido |
| FB02 | `past_due` sem CTA para regularizar | ALTO | ✅ Resolvido |
| FB03 | Cache sync sem escopo de igreja | ALTO | ✅ Resolvido |
| FB04 | Plano 100 no modal abre portal | ALTO | ✅ Resolvido |
| FB05 | Estado stale após portal | MÉDIO | ✅ Resolvido |
| FB06 | Auto-sync ignora cache | MÉDIO | ✅ Resolvido |
| FB07 | Confirmação duplicada | MÉDIO | ✅ Resolvido |
| FB08 | `isLoading` fictício | MÉDIO | ✅ Resolvido |
| FB09 | Preços fallback hardcoded | MÉDIO | ✅ Resolvido |
| FB10 | Cancel page perde plano | MÉDIO | ✅ Resolvido |
| FB11 | Polling não cobre estados intermediários | MÉDIO | ⚪ Parcial |
| FB12 | `hasSyncedRef` sem reset por igreja | MÉDIO | ✅ Resolvido |
| FB13 | Header sem alerta `past_due` | BAIXO | ✅ Resolvido |
| FB14 | Membros sem mensagem `past_due` | BAIXO | ✅ Resolvido |
| FB15 | `trialing` / `unpaid` sem fluxo dedicado | BAIXO | ⚪ Aceito |
| FB16 | IDs Stripe no tipo `Church` | BAIXO | ⚪ Aceito |
| FB17 | Duplo clique no checkout | BAIXO | ✅ Resolvido |
| FB18 | `AccountManagement` e `subscription_end_date` | BAIXO | ⚪ Aceito |

---

## Detalhamento

- **FB11 (Parcial):** UX de timeout melhorada; confirmação de `past_due` no polling depende de evolução do endpoint `checkout-status` (SL12 no tópico 04).
- **FB15 (Aceito):** Status raros; portal Stripe e sync manual são compensação suficiente no curto prazo.
- **FB16 (Aceito):** `sanitizeChurchForRole` já remove campos Stripe para `reader` nas rotas de auth e `GET /church`.
- **FB18 (Aceito):** Permitir exclusão com cancelamento agendado é decisão de produto documentada.
