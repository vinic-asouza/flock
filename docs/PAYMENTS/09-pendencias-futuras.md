# Pendências Futuras — Auditoria Stripe

**Projeto:** Flock  
**Data:** 2026-06-05  
**Origem:** consolidação dos achados aceitos, parciais e fora de escopo nos tópicos 01–07

Legenda de urgência:
- 🔴 **Alta** — risco operacional ou regressão em produção
- 🟡 **Média** — melhoria relevante; compensação existe
- 🟢 **Baixa** — polish, produto ou infra opcional

---

## Infraestrutura e segurança

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| INFRA-01 | ✅ Resolvido | Migrar queries DB para `supabaseAdmin` | DB18 / revisão 08 | 28+ arquivos migrados; `supabase` (anon) só para `auth.*` |
| INFRA-05 | ✅ Resolvido | RLS global `deny_anon` em todas as tabelas | DB19 | 17 tabelas + cleanup políticas legadas + RPCs só service_role |
| INFRA-02 | 🟡 Média | CORS sem Origin em produção | S12 | Requer Origin em prod; configurar proxy/load balancer |
| INFRA-03 | 🟡 Média | Blacklist de tokens em memória | S06 | Logout revoga só em RAM; após restart tokens voltam até expirar |
| INFRA-04 | 🟢 Baixa | RLS granular por `church_id` / `auth.uid()` | MT12 | Hoje `deny_anon` + service_role; políticas finas são evolução |

---

## Webhooks e notificações

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| WH-01 | 🟡 Média | Máquina de estados para e-mails (dedup entre eventos) | W12 | Evitar e-mail duplicado checkout + subscription.updated |
| WH-02 | 🟢 Baixa | Suporte a novos event_types Stripe | W09 nota | Ex.: `customer.subscription.trial_will_end`, `invoice.finalized` |
| WH-03 | 🟢 Baixa | Testes Stripe CLI documentados | 01-revalidação | Checklist nunca executado automaticamente |

---

## Ciclo de vida e billing

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| SL-01 | 🟡 Média | Janela de inconsistência em `changePlan` | SL08 | DB atualiza antes do webhook; risco < 1s |
| SL-02 | 🟢 Baixa | `subscription_end_date` null em sub ativa | SL10 | Semântica correta; UI de renovação via portal |
| SL-03 | 🟢 Baixa | Trial no Checkout | SL11 | Feature comercial futura |
| SL-04 | 🟢 Baixa | Polling pós-checkout não confirma `past_due` | SL12 / FB11 | Cenário raro; SL05 bloqueia membros |
| SL-05 | 🟢 Baixa | Ordem `cancel_at` vs `current_period_end` | SL14 | Comportamento aceito como correto |

---

## Frontend billing

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| FE-01 | 🟡 Média | Polling checkout — estados intermediários | FB11 | Timeout melhorado; `past_due` no endpoint pendente |
| FE-02 | 🟢 Baixa | Fluxo dedicado `trialing` / `unpaid` | FB15 | Portal + sync manual compensam |
| FE-03 | 🟢 Baixa | IDs Stripe no tipo `Church` (TS) | FB16 | Sanitização em runtime já existe |
| FE-04 | 🟢 Baixa | Exclusão de conta com cancelamento agendado | FB18 | Decisão de produto |

---

## Banco de dados

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| DB-01 | 🟢 Baixa | Drift `plan_type` em scripts de seed | DB01 | Sem impacto em prod |
| DB-02 | 🟢 Baixa | CHECK adicional estados inválidos | DB11 | Coberto por `validate_subscription_integrity()` |
| DB-03 | 🟢 Baixa | Índice email, enum `custom`, redundâncias | DB13–17 | Manutenção de schema |

---

## Observabilidade

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| OB-01 | 🟡 Média | Sentry global (não só billing) | OB15 / decisão usuário | DSN opcional; expandir `global-error.tsx`, `onRequestError` |
| OB-02 | 🟡 Média | Dashboard Grafana + scrape `/metrics` | OB03 pós-P2 | Métricas existem; falta visualização |
| OB-03 | 🟢 Baixa | Cache expiração e-mails persistente | OB18 | `Map` em memória perdido em restart |
| OB-04 | 🟢 Baixa | `LOG_LEVEL` configurável global | OB02 nota | Billing já usa `billingLog` sempre ativo |
| OB-05 | 🟢 Baixa | Tabela `email_delivery_log` | OB05 nota | Rastreio de entregas Resend |

---

## Produto e UX (fora do escopo técnico imediato)

| ID | Urgência | Item | Origem | Descrição |
|----|----------|------|--------|-----------|
| PROD-01 | 🟢 Baixa | Landing — telemetria checkout público | 05 nota | Funil pré-registro na landing |
| PROD-02 | 🟢 Baixa | UI “próxima renovação” com `current_period_end` | SL10 | Dado existe no sync; não exibido |

---

## Resumo por urgência

| Urgência | Quantidade | Priorizar |
|----------|------------|-----------|
| 🔴 Alta | 0 | — |
| 🟡 Média | 6 | INFRA-02/03, WH-01, SL-01, FE-01, OB-01/02 |
| 🟢 Baixa | 15+ | Demais itens — backlog |

---

## Itens explicitamente NÃO pendentes (fechados)

- Webhooks: claim/release, stale events, 503/500, idempotência ✅
- Multi-tenant: customer 1:1, link_token, sync escopado ✅
- Segurança: rate limits, RBAC checkout, RLS global (17 tabelas) ✅
- Ciclo de vida: downgrade job, past_due limits, activate-free cancela Stripe ✅
- Frontend: past_due CTA, cache por igreja, polling backoff ✅
- Banco: audit trail, RPC link_pending, integridade ✅
- Observabilidade: logs JSON, alertas ops, job_runs, Prometheus, stats API ✅
