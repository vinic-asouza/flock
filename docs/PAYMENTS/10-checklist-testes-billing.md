# Checklist — Testes Básicos de Billing (pós-auditoria)

**Projeto:** Flock  
**Data:** 2026-06-05  
**Objetivo:** validar fluxos críticos após correções dos tópicos 01–07  
**Tempo estimado:** 1–2 horas com Stripe CLI + conta de teste

---

## Pré-requisitos

- [ ] Backend rodando (`npm run dev` ou deploy) com todas as env vars Stripe + Supabase
- [ ] Frontend rodando (`npm run dev` na porta 3001)
- [ ] Stripe CLI: `stripe listen --forward-to localhost:4000/api/stripe/webhook`
- [ ] Conta admin/owner de teste no app
- [ ] Cartão de teste Stripe: `4242 4242 4242 4242`

---

## 1. Webhooks (tópico 01)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 1.1 | Evento tratado | `stripe trigger checkout.session.completed` | HTTP 200; linha em `processed_webhook_events` com `outcome=success` | ☐ |
| 1.2 | Duplicata | Reenviar mesmo evento | `{ skipped: true }`; sem segundo processamento | ☐ |
| 1.3 | Evento ignorado | Disparar tipo não listado (ex. `payment_intent.created`) | `{ ignored: true }`; sem claim | ☐ |
| 1.4 | Assinatura atualizada | `stripe trigger customer.subscription.updated` | `churches` atualizado; evento em `church_subscription_events` | ☐ |

---

## 2. Checkout autenticado (02 + 05)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 2.1 | Checkout plano 200 | Login como admin → `/checkout?plan=200` → pagar | Redirect success; plano 200 ativo; histórico na aba Plano | ☐ |
| 2.2 | Polling success | Aguardar na página success | Confirmação sem timeout; redirect para app | ☐ |
| 2.3 | Reader bloqueado | Login como reader → tentar checkout | Botão desabilitado ou 403 na API | ☐ |
| 2.4 | Sync automático | Abrir Configurações → Plano | Auto-sync roda (ou usa cache 5 min); dados corretos | ☐ |

---

## 3. Checkout landing (pré-registro)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 3.1 | Fluxo completo | Checkout na landing → registrar igreja | `subscriptionLinked: true`; pending removida; plano ativo | ☐ |
| 3.2 | E-mail divergente | Registrar com e-mail diferente do checkout | Erro 400; conta não criada com plano alheio | ☐ |

---

## 4. Ciclo de vida (04)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 4.1 | Portal Stripe | Configurações → Gerenciar assinatura | Abre portal; ao voltar, dados atualizados (FB05) | ☐ |
| 4.2 | Trocar plano | Modal trocar 200 → 500 | Plano atualizado; e-mail de confirmação | ☐ |
| 4.3 | `past_due` | Simular via Stripe Dashboard ou `invoice.payment_failed` | Banner amarelo; bloqueio de novo membro; CTA portal | ☐ |
| 4.4 | Cancelamento agendado | Cancelar no portal (fim do período) | Alerta âmbar com data; plano pago até a data | ☐ |
| 4.5 | Sync manual | Botão “Sincronizar” na aba Plano | `synced: true`; evento `sync_subscription` no histórico | ☐ |
| 4.6 | Ativar plano 100 | `activate-free-plan` (admin) | Assinatura cancelada no Stripe; plano 100 no app | ☐ |

---

## 5. Multi-tenant (02)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 5.1 | Duas igrejas | Usuário com 2 igrejas; trocar no switcher | Plano/sync isolados por igreja; cache separado | ☐ |
| 5.2 | Checkout status escopo | `checkout-status` com session de outra igreja | Não confirma (403 ou `confirmed: false`) | ☐ |

---

## 6. Segurança básica (03)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 6.1 | Webhook sem assinatura | POST `/api/stripe/webhook` com body inválido | 400; sem update no banco | ☐ |
| 6.2 | Checkout público rate limit | 11+ checkouts não autenticados em 1h (mesmo IP) | 429 após limite | ☐ |
| 6.3 | Health Stripe | `GET /api/health/stripe` | `stripe_reachable`, `last_webhook_processed_at` | ☐ |

---

## 7. Banco e integridade (06)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 7.1 | Integridade limpa | `SELECT * FROM validate_subscription_integrity()` | 0 linhas (ou issues conhecidas documentadas) | ☐ |
| 7.2 | Histórico UI | Aba Plano → “Histórico de assinatura” | Lista eventos recentes da igreja ativa | ☐ |
| 7.3 | RLS anon | Tentar `churches` via REST com `SUPABASE_KEY` (anon) | Erro de permissão / 0 rows | ☐ |

---

## 8. Observabilidade (07)

| # | Teste | Passos | Esperado | OK |
|---|-------|--------|----------|-----|
| 8.1 | Log webhook | Processar evento; ver logs do backend | Linha JSON `stripe_webhook` com `outcome`, `duration_ms` | ☐ |
| 8.2 | Métricas | `GET /metrics` (dev ou com token) | Contadores `stripe_webhook_total` presentes | ☐ |
| 8.3 | Stats internos | `GET /api/internal/billing/stats` (com token) | `webhook_stats`, `job_runs`, `integrity_issue_count` | ☐ |
| 8.4 | Job downgrade | Forçar igreja com `subscription_end_date` passado + plano pago | Após cron 3h (ou execução manual): plano 100 + evento `downgrade_job` | ☐ |
| 8.5 | Alerta ops (opcional) | Simular webhook 500 | E-mail/Slack admin (se configurado) | ☐ |

---

## 9. Regressões rápidas (pós-INFRA-01 / RLS)

| # | Teste | Esperado | OK |
|---|-------|----------|-----|
| 9.1 | Login + refresh sessão | App carrega igreja sem erro (service_role no backend) | ☐ |
| 9.1b | GET /api/church | Dados da igreja retornam (não erro RLS) | ☐ |
| 9.1c | Link público de registro | Valida token + carrega nome da igreja | ☐ |
| 9.2 | Adicionar membro (plano ativo) | Membro criado dentro do limite | ☐ |
| 9.3 | Adicionar membro (`past_due`) | 400 com mensagem de pagamento pendente | ☐ |
| 9.4 | Build produção | `npm run build` backend + frontend | Sem erros | ☐ |
| 9.5 | REST anon — `members` | `GET /rest/v1/members?select=id` com `SUPABASE_KEY` | `[]` (zero linhas; RLS deny_anon) | ☐ |
| 9.6 | REST anon — `church_users` | Idem em `church_users` | `[]` | ☐ |
| 9.7 | REST anon — RPC | `POST /rest/v1/rpc/link_pending_to_church` | `401 permission denied` | ☐ |

---

## Resultado

| Categoria | Total | Passou | Falhou | N/A |
|-----------|-------|--------|--------|-----|
| Webhooks | 4 | | | |
| Checkout | 6 | | | |
| Ciclo de vida | 6 | | | |
| Multi-tenant | 2 | | | |
| Segurança | 3 | | | |
| Banco | 3 | | | |
| Observabilidade | 5 | | | |
| Regressões | 7 | | | |

**Parecer final:** ☐ Aprovado para deploy · ☐ Reprovado — listar itens falhos abaixo

### Notas / falhas

```
(preencher durante os testes)
```
