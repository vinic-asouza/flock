# Revalidação — Tópico 03 Segurança

Última atualização: 2026-06-05 (S07 resolvido via DB18 — DB Ciclo 2).  
Data inicial: 2026-05-28

| ID | Achado | Status | Notas |
|----|--------|--------|-------|
| S01 | Checkout público sem rate limit | **Resolvido** | 10 req/h/IP quando não autenticado |
| S02 | Health Stripe público | **Resolvido** | Sem API Stripe; token opcional |
| S03 | CORS sem X-Church-Id | **Resolvido** | Header permitido |
| S04 | Checkout autenticado sem admin | **Resolvido** | `requireAdminForPaidCheckout` |
| S05 | link_token em URL/JSON | **Resolvido** | Cookie + session_id; URL sem token |
| S06 | Blacklist em memória | **Aceito** | Fora do escopo; ver dev-report |
| S07 | Sem RLS nas tabelas financeiras | **Resolvido** | DB Ciclo 2 — `db18_rls_financial_tables`; DB19 estende a todas as tabelas `public` |
| S08 | Webhook sem rate limit | **Resolvido** | 300/min dedicado |
| S09 | Re-auth duplicada | **Resolvido** | Lógica centralizada em middlewares |
| S10 | Fallback pending por e-mail | **Resolvido** | Apenas link_token/cookie/session |
| S11 | Erro webhook verboso | **Resolvido** | Mensagem genérica em produção |
| S12 | CORS sem Origin | **Parcial** | Exigido em produção |
| S13 | Polling agressivo | **Resolvido** | Backoff no frontend |
| S14 | activate-free-plan | **Aceito** | By design + admin |

## S07 — Confirmação técnica

**Migrations aplicadas:** `db18_rls_financial_tables` + `db19_rls_remaining_tables` (2026-06-05, via MCP Supabase `flock-app-01`)

**Estado:** RLS ativo em **todas as 17 tabelas** `public`, cada uma com policy `deny_anon_*` (`RESTRICTIVE TO anon USING (false)`). Políticas legadas owner-only removidas. RPCs sensíveis restritas a `service_role`.

Tabelas (financeiras/ops — DB18):
- `churches`, `pending_subscriptions`, `processed_webhook_events`, `church_subscription_events`, `job_runs`

Tabelas (operacionais — DB19):
- `audit_logs`, `calendar_items`, `calendar_participants`, `church_users`, `congregations`, `groups`, `integration_members`, `member_groups`, `members`, `public_integration_links`, `public_registration_links`, `waitlist`

Pré-requisito implementado (INFRA-01):
- `SUPABASE_SERVICE_ROLE_KEY` obrigatória no startup (`services/supabase.ts`)
- Todas as queries PostgREST no backend via `supabaseAdmin` (bypassa RLS)
- `supabase.auth.*` mantido com anon key (Supabase Auth API)

**Vetor bloqueado:** acesso direto ao Supabase REST via `SUPABASE_KEY` (chave pública) não retorna dados em nenhuma tabela; RPCs críticas retornam `permission denied` para `anon`.

## Conclusão

Todos os achados críticos e de média severidade resolvidos. S06 aceito (blacklist em memória — fora do escopo da auditoria Stripe). S12 parcial (CORS sem Origin) para configuração de infraestrutura. Nenhum item bloqueador pendente.
