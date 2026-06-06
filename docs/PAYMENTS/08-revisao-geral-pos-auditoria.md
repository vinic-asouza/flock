# Revisão Geral — Auditoria Stripe (pós-implementação)

**Projeto:** Flock  
**Data:** 2026-06-05  
**Escopo:** Revisão cruzada dos tópicos 01–07 (código + docs + banco `flock-app-01`)

---

## 1. Parecer executivo

A série de auditorias Stripe está **implementada e coerente** nos fluxos críticos de billing: webhooks resilientes, multi-tenant, segurança, ciclo de vida, frontend, banco, observabilidade.

| Dimensão | Status |
|----------|--------|
| Código billing (webhook, checkout, sync, jobs) | ✅ Completo |
| Migrações SQL em `flock-app-01` | ✅ Aplicadas (via MCP) |
| Documentação 01–07 | ✅ Completa |
| Build backend (`tsc`) | ✅ OK |
| Build frontend (`next build`) | ✅ OK (após correção lint pré-existente) |
| Testes manuais E2E | ⏳ Pendente — ver [10-checklist-testes-billing.md](./10-checklist-testes-billing.md) |
| Sentry | ⏳ Opcional — projeto funciona sem DSN |

**Conclusão:** pronto para validação manual e deploy, desde que variáveis de ambiente e checklist SQL estejam corretos.

---

## 2. Gaps identificados na revisão

### 2.1 Corrigido nesta revisão

| Gap | Impacto | Correção |
|-----|---------|----------|
| `stripe.ts` usava client `anon` em `churches` | Checkout falharia com RLS ativo | Migrado para `supabaseAdmin` |
| Lint `DeleteIntegrationModal.tsx` | `npm run build` frontend falhava | Prop `errorMessage` agora usada no catch |
| `Button variant="outline"` inválido | Build falhava em `ChurchSelectionGate` / `ChurchSwitcher` | Alterado para `secondary` |
| `getCheckAuth` retornava `church: null` | Erro de tipo no build | Alterado para `undefined` |

### 2.2 INFRA-01 — RLS × client anon ✅ Resolvido (2026-06-05)

Migração global: **todas as queries PostgREST** (`.from`, `.rpc`) no backend passam por `supabaseAdmin` (service_role). O client `supabase` (anon) permanece **somente** para `supabase.auth.*` em:

- `middlewares/auth.ts`
- `controllers/authCallbackController.ts`
- `controllers/authController.ts`, `refreshController.ts`, `passwordController.ts`, `accountController.ts` (parte auth)

**Padrão adotado:**
- `import { supabaseAdmin as supabase }` — arquivos só com queries DB
- `import supabase, { supabaseAdmin }` — arquivos mistos (auth + DB)
- Export `db` em `services/supabase.ts` como alias documentado

**Arquivos migrados (28+):** controllers (church, member, group, calendar, export, public*, integration*, etc.), middlewares públicos, utils (validations, auditLogger, planLimits), services (stripe, memberImport).

### 2.3 Gaps menores (não bloqueadores)

| Gap | Notas |
|-----|-------|
| Sentry incompleto | Sem DSN = desligado; falta `global-error.tsx` e `onRequestError` |
| Testes Stripe CLI | Documentados em 01-revalidação; nunca executados pelo agente |
| `07-audit-observability.md` desatualizado | Texto do levantamento inicial não reflete Ciclos 1–3 (só o rodapé foi atualizado) |
| E-mails duplicados (W12) | Aceito; sem máquina de estados de notificação |
| Blacklist logout em RAM (S06) | Aceito; tokens revogados voltam após restart |

---

## 3. Impedimentos para rodar o projeto

### Obrigatórios (backend não sobe sem)

| Variável | Motivo |
|----------|--------|
| `SUPABASE_URL` | Conexão banco |
| `SUPABASE_KEY` | Auth API |
| `SUPABASE_SERVICE_ROLE_KEY` | Queries DB (RLS em todas as tabelas) — **obrigatória desde DB18/DB19** |
| `STRIPE_SECRET_KEY` | API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhooks |
| `STRIPE_PRICE_ID_M200/M500/M800` | Planos |

### Opcionais (funcionalidade degradada sem eles)

| Variável | Sem ela… |
|----------|----------|
| `RESEND_API_KEY` | E-mails não enviam (fluxo continua) |
| `ADMIN_EMAIL` | Alertas ops sem destino |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry desligado |
| `METRICS_TOKEN` | `/metrics` aberto em dev; 404 em prod |
| `INTERNAL_BILLING_TOKEN` | Stats internos abertos em dev; 404 em prod |
| `HEALTH_CHECK_TOKEN` | Health Stripe público |

### Migrações SQL — checklist deploy

Confirmar aplicadas em produção (`flock-app-01` já tem a maioria):

| Script / migration | Tópico |
|--------------------|--------|
| `add_last_stripe_event_created.sql` | 01 |
| `add_unique_stripe_tenant_ids.sql` | 02 |
| `add_pending_link_token.sql` | 02 |
| `db05_church_subscription_events` | 06 |
| `db18_rls_financial_tables` | 03/06 |
| `db19_rls_remaining_tables` | 03/06 — RLS global |
| `ob04_nullable_church_id_sub_events` | 07 |
| `ob09_job_runs_table` | 07 |
| `ob12_webhook_processing_context` | 07 |

**Atenção:** se `outcome` não existir em `processed_webhook_events`, webhooks falham no claim (503).

---

## 4. Cobertura por tópico de auditoria

| # | Tópico | Implementado | Revalidado | Testes manuais |
|---|--------|--------------|------------|----------------|
| 01 | Webhooks | ✅ | ✅ estático | ⏳ CLI |
| 02 | Multi-tenant | ✅ | ✅ estático | ⏳ E2E |
| 03 | Segurança | ✅ | ✅ | ⏳ |
| 04 | Ciclo de vida | ✅ | ✅ | ⏳ |
| 05 | Frontend billing | ✅ | ✅ | ⏳ |
| 06 | Banco | ✅ | ✅ MCP | ⏳ |
| 07 | Observabilidade | ✅ | ✅ | ⏳ |

---

## 5. O que não foi revisado nesta rodada

- Landing page (checkout público pré-registro) — fora do escopo frontend billing, mas no funil
- Testes automatizados (Jest/e2e) — não existem para billing
- Performance / carga de webhooks
- Ambiente Stripe produção vs test mode
- RLS global nas tabelas operacionais — **resolvido** via DB19 (2026-06-05)

### 2.4 INFRA-05 — RLS global ✅ Resolvido (2026-06-05)

Migration `db19_rls_remaining_tables`: RLS + `deny_anon` nas 12 tabelas restantes; remoção de políticas legadas owner-only; RPCs sensíveis restritas a `service_role`. Todas as 17 tabelas `public` padronizadas.

---

## 6. Recomendação de próximos passos

1. Executar [10-checklist-testes-billing.md](./10-checklist-testes-billing.md)
2. Testar rotas gerais pós-DB19: login, GET /church, membros, export, links públicos
3. Configurar Sentry/Prometheus/Grafana quando conveniente (não bloqueia billing)
4. Atualizar `07-audit-observability.md` (texto do levantamento) se quiser doc 100% alinhada ao estado atual
