---
type: politicas-restricoes
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 28
tags: [políticas, planos, limites, SaaS, compliance]
---

# Políticas e Restrições — Flock

> Limites de produto ligados a **planos**, **quotas**, **assinatura**, **retenção** e **privacidade**.
>
> 💰 = impacto direto em receita · **HARDCODED** vs **CONFIGURÁVEL** (env) destacados.
>
> Relacionado: [[02_regras-de-negocio/regras-gerais]] · [[01_produto/glossario]] · [[01_produto/personas-e-usuarios]]

---

## 📋 Sumário de Políticas

| ID | Nome | Categoria | Status |
| --- | --- | --- | --- |
| BR-POL-001 | Quota de membros por plano | Quota | Ativo |
| BR-POL-002 | Avisos 80/90/100% de uso | Quota | Ativo |
| BR-POL-003 | Contagem só de membros ativos | Quota | Ativo |
| BR-POL-004 | Rate limits por IP (não por plano) | Rate limit | Ativo |
| BR-POL-005 | Acesso funcional por role (não por plano) | Acesso | Ativo |
| BR-POL-006 | Billing restrito a admin+ | Acesso | Ativo |
| BR-POL-007 | Campos Stripe ocultos a editor/reader | Acesso | Ativo |
| BR-POL-008 | Upgrade de plano | Upgrade/Downgrade | Ativo |
| BR-POL-009 | Downgrade exige cabe membros no destino | Upgrade/Downgrade | Ativo |
| BR-POL-010 | Ativar free cancela Stripe pago | Upgrade/Downgrade | Ativo |
| BR-POL-011 | Cancelamento com período até end_date | Upgrade/Downgrade | Ativo |
| BR-POL-012 | Downgrade compensatório pós-expiração | Upgrade/Downgrade | Ativo |
| BR-POL-013 | past_due bloqueia novas inclusões | Quota / Assinatura | Ativo |
| BR-POL-014 | Trialing conta como assinatura com direito | Assinatura | Ativo |
| BR-POL-015 | Cleanup de pending_subscriptions (7 dias) | Retenção | Ativo |
| BR-POL-016 | Cleanup de webhooks processados (90 dias) | Retenção | Ativo |
| BR-POL-017 | Sem retenção formal de audit_logs | Retenção | Lacuna |
| BR-POL-018 | PII em domínio pastoral e Auth | Privacidade | Ativo |
| BR-POL-019 | Redação de e-mail em logs | Privacidade | Ativo |
| BR-POL-020 | Exclusão de conta Auth | Privacidade | Ativo |
| BR-POL-021 | Exportação PDF (não pacote LGPD) | Privacidade | Parcial |
| BR-POL-022 | TTL cookies de sessão | Expiração | Ativo |
| BR-POL-023 | Expiração de links públicos | Expiração | Ativo |
| BR-POL-024 | Expiração pending checkout / link_token | Expiração | Ativo |
| BR-POL-025 | Upload CSV ≤ 10MB | Limite técnico | Ativo |
| BR-POL-026 | Paginação máx. 100 | Limite técnico | Ativo |
| BR-POL-027 | Sem feature flags por plano | Acesso | Fato |
| BR-POL-028 | Plano ausente = sem teto numérico | Quota | ⚠️ Revisar |

---

## 💎 Estrutura de Planos e Tiers

Sistema de planos **identificado** e monetizado via Stripe. Identificadores são strings `'100' | '200' | '500' | '800' | 'custom'` (`churches.plan_type`).

Fonte de preços/limites comerciais: **HARDCODED** em `backend/src/config/plans.ts` (+ espelho `PLAN_LIMITS` em `planLimits.ts`). Chaves Stripe e URLs: **CONFIGURÁVEL** via env (`STRIPE_*`, `FRONTEND_URL`, …).

### Plano 100 Membros (Gratuito) 💰

- **Identificador:** `'100'`
- **Descrição:** Entrada sem cobrança; teto de 100 membros ativos.
- **Preço:** R$ 0 (**HARDCODED**)

| Recurso | Limite | Ao atingir |
| --- | --- | --- |
| Membros ativos | 100 | Bloqueio + mensagem de upgrade |

| Feature de produto | Disponível | Observação |
| --- | --- | --- |
| Membros, integração, grupos, congregações, calendário, relatórios, PDF, links públicos, tutoriais | ✅ | Mesmo conjunto dos planos pagos |
| Billing / portal Stripe | 🔒 admin+ | Sem cobrança ativa tipicamente |
| Suporte | Landing: “Comece grátis” | Diferenciação comercial, não feature flag |

### Plano 200 Membros 💰

- **Identificador:** `'200'`
- **Descrição:** Igrejas pequenas · **R$ 29,99**/mês (**HARDCODED** em `PLAN_CONFIG`)
- **Limite membros:** 200 → bloqueio + upgrade prompt

| Feature | Disponível |
| --- | --- |
| Funcionalidades core do app | ✅ (iguais ao free, com maior teto) |
| Landing: “Suporte comercial” | Copy de marketing |

### Plano 500 Membros 💰

- **Identificador:** `'500'` · **R$ 59,99** · limite **500**
- Features core: ✅ · Copy: suporte comercial

### Plano 800 Membros 💰

- **Identificador:** `'800'` · **R$ 89,99** · limite **800**
- Features core: ✅ · Copy landing: “Suporte dedicado”

### Plano custom / personalizado 💰

- **Identificador:** `'custom'` (schema igrejas) / `'personalizado'` (waitlist)
- **Descrição:** Plano sob medida — **sem** linha em `PLAN_CONFIG` / pricing público completo
- **Limite:** sem entrada em `PLAN_LIMITS` → trata-se como **Infinity** no checker (BR-POL-028)

> **Não há tiers Enterprise/Pro nomeados.** Diferenciação real de produto = **quota de membros** (+ papéis RBAC, independente do plano).

---

## 🚦 Políticas de Quotas e Rate Limiting

### BR-POL-001: Quota de membros por plano 💰
- **Declaração:** Toda igreja com plano conhecido não deve exceder o teto de membros ativos do plano ao criar/importar/converter.
- **Aplica-se a:** Todos os planos `100`–`800`; operações que chamam `checkMemberLimit`
- **Limite:** 100 / 200 / 500 / 800 (**HARDCODED** duplicado em `plans.ts` e `planLimits.ts`)
- **Janela:** Contínua (estoque atual)
- **Ao atingir:** HTTP erro + mensagem de upgrade / ativar assinatura
- **Reset:** Ao remover/inativar membros ou fazer upgrade
- **Implementado em:** `utils/planLimits.ts`; `memberController`, `memberImportController`, `integrationController` (convert)

### BR-POL-002: Avisos 80/90/100% de uso 💰
- **Declaração:** Ao cruzar 80%, 90% ou 100% da quota, o sistema deve notificar o e-mail do owner (no máximo um aviso por limiar a cada 7 dias).
- **Aplica-se a:** Igrejas com plano e limite finito
- **Limite / janela:** Thresholds **HARDCODED**; cooldown 7 dias (cache em memória)
- **Ao atingir:** E-mail Resend (não bloqueia por si só além do 100% via BR-POL-001)
- **Reset:** Cooldown do cache / reinício de processo zera memória
- **Implementado em:** `planLimits.ts`

### BR-POL-003: Contagem só de membros ativos
- **Declaração:** Apenas membros com `active = true` entram no cálculo da quota.
- **Aplica-se a:** Todos os planos
- **Implementado em:** `planLimits.ts` `.eq('active', true)`

### BR-POL-004: Rate limits por IP (não por plano)
- **Declaração:** Limites de taxa aplicam-se por **IP**, iguais para free e pagos (não há rate limit por tier).
- **Limites (HARDCODED):** geral 1000/15min; login/registro 10/15min; password reset 5/h; public POST 15/15min; reports 10/min; account sensível 5/h; checkout público 10/h; webhook 300/min
- **Ao atingir:** Resposta de rate limit
- **Reset:** Fim da janela deslizante do `express-rate-limit`
- **Implementado em:** `app.ts`, rotas auth/password/account/members, `publicPostLimiter`, `stripeSecurity`
- **Detalhe transversal:** [[02_regras-de-negocio/regras-gerais#BR-GEN-038]]

### BR-POL-028: Plano ausente = sem teto numérico
- **Declaração:** Se `plan_type` for null (ou limite não mapeado, ex. `custom`), `checkMemberLimit` trata como ilimitado.
- **Aplica-se a:** Tenants sem plano / custom
- **Status:** ⚠️ Revisar intenção de negócio
- **Implementado em:** `planLimits.ts` (`Infinity`)

---

## 🔒 Políticas de Acesso por Recurso

Controle principal = **role** (`owner` > `admin` > `editor` > `reader`), **não** o plano. Matriz resumida:

| Recurso / ação | Free `100` | Paid `200+` | Reader | Editor | Admin/Owner |
| --- | --- | --- | --- | --- | --- |
| Usar app (módulos core) | ✅ (até quota) | ✅ (até quota) | ✅ leitura | ✅ | ✅ |
| Criar/editar/excluir membros | ✅ se role+quota | ✅ se role+quota | ❌ | ✅ | ✅ |
| Import CSV / converter integração | ✅ se role+quota | ✅ | ❌ | ✅ | ✅ |
| Exportar PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Links públicos | ✅ | ✅ | ver | CRUD | CRUD |
| Ver/gestão plano (Stripe) | admin+ | admin+ | ❌ | ❌ | ✅ |
| Gestão usuários igreja | — | — | ❌ | ❌ | ✅ |
| Audit logs | — | — | ❌ | ❌ | ✅ |

### BR-POL-005: Acesso funcional por role (não por plano)
- Features do produto não são gated por `plan_type` (BR-POL-027).

### BR-POL-006: Billing restrito a admin+ 💰
- Portal, sync, change-plan, activate-free, eventos de subscription.

### BR-POL-007: Campos Stripe ocultos a editor/reader
- `sanitizeChurchForRole` remove IDs/status financeiros.

### BR-POL-027: Sem feature flags por plano
- Landing lista os mesmos bullets de produto; só teto/preço/suporte mudam.

---

## 🔄 Políticas de Upgrade e Downgrade 💰

### BR-POL-008: Upgrade de plano
- **Declaração:** Upgrade (maior teto de membros) via Stripe `change-plan` / checkout deve atualizar `plan_type` e status; e-mail de confirmação.
- **Dados:** Imediatamente usa o novo limite; membros existentes preservados.
- **Implementado em:** `stripeController.changePlan`; webhooks; `PLAN_CONFIG`

### BR-POL-009: Downgrade exige cabe membros no destino
- **Declaração:** Downgrade (menor limite) só é permitido se `membros ativos ≤ limite do plano destino`; senão exigir remoção prévia.
- **Ao violar:** `400` com `membersToRemove` e mensagem clara.
- **Implementado em:** `changePlan`; `activateFreePlan` (teto 100)

### BR-POL-010: Ativar free cancela Stripe pago
- **Declaração:** Ao ativar plano `100` com subscription paga, cancelar assinatura Stripe imediatamente para evitar nova cobrança.
- **Implementado em:** `activateFreePlan` (SL01)

### BR-POL-011: Cancelamento com período até end_date
- **Declaração:** Cancelamento via portal pode manter acesso até `subscription_end_date`; exclusão de conta Auth é permitida se já há end_date (assinatura só aguardando fim).
- **Preservado:** Dados da igreja/membros até exclusão; plano pago permanece até job/webhook downgrade.
- **Implementado em:** webhooks Stripe; `deleteAccount` checagem; docs `STRIPE-MAINTENANCE.md`

### BR-POL-012: Downgrade compensatório pós-expiração
- **Declaração:** Se `subscription_end_date` passou e status ∈ {canceled, past_due, unpaid, incomplete_expired} com plano ≠ 100, job diário deve forçar `plan_type=100`, limpar `stripe_subscription_id`.
- **Não remove membros excedentes automaticamente** — apenas rebaixa o plano (quota passa a 100; novas inclusões bloqueadas se já > 100).
- **Implementado em:** `jobs/downgradeExpiredSubscriptions.ts` (SL04) · cron 03:00 America/Sao_Paulo

### BR-POL-013: past_due bloqueia novas inclusões 💰
- Grace: mantém teto do plano atual, **bloqueia** adição de membros.
- **Implementado em:** `planLimits.ts` (SL05)

### BR-POL-014: Trialing conta como assinatura com direito
- `trialing` e `active` = `hasActiveSubscription` para mensagens/limites.
- Trial dedicado comercial **não** está configurado como produto separado no código de planos (**HARDCODED** ausência).

---

## 🗑️ Políticas de Retenção de Dados

### BR-POL-015: Cleanup de pending_subscriptions (7 dias)
- **Declaração:** Registros de `pending_subscriptions` com `expires_at` no passado devem ser apagados.
- **Job:** `cleanup_pending_subscriptions` · 02:00 BRT · **HARDCODED** TTL alinhado a cookie `pendingLinkToken` 7 dias
- **Implementado em:** `jobs/cleanupPendingSubscriptions.ts`

### BR-POL-016: Cleanup de webhooks processados (90 dias)
- **Declaração:** Eventos em `processed_webhook_events` com mais de 90 dias devem ser removidos (RPC SQL).
- **Job:** semanal `cleanup_webhook_events`
- **Implementado em:** `jobs/cleanupWebhookEvents.ts`

### BR-POL-017: Sem retenção formal de audit_logs
- **Declaração:** Não há job/política de purge de `audit_logs` identificada.
- **Status:** Lacuna de compliance/ops

**Soft delete:**
- Links públicos: `is_active=false` — permanecem indefinidamente até ação manual
- Membros inativos (`active=false`): permanecem; **DELETE** é hard delete (sem TTL de soft delete)
- Membros após downgrade de plano: **não** são apagados automaticamente

**Cancelamento de assinatura:** dados da igreja/membros **preservados**; só muda plano/status.

---

## 🔏 Políticas de Privacidade e Compliance

### BR-POL-018: PII em domínio pastoral e Auth
- **PII identificado:** e-mail, telefone, WhatsApp, nome, endereço, CEP, documento (legado), dados familiares, CNPJ da igreja, IP/user-agent em audit
- **Não encontrado:** criptografia de campo at-rest além do padrão infra/Supabase; mascaramento sistemático na UI

### BR-POL-019: Redação de e-mail em logs
- E-mails em logs de billing/ops devem ser mascarados via `redactEmail`.
- **Implementado em:** `utils/redact.ts`

### BR-POL-020: Exclusão de conta Auth
- **Declaração:** Usuário autenticado pode excluir a conta Auth após senha + confirmação `"EXCLUIR CONTA"`, desde que não haja assinatura paga **ativa sem** `subscription_end_date`.
- **Efeitos:** `auth.admin.deleteUser`; e-mail de confirmação; audit best-effort. Cascade de igreja depende de FKs/`user_id` — **escopo completo de wipe de tenant não documentado em um único fluxo** ⚠️
- **Implementado em:** `accountController.deleteAccount`

### BR-POL-021: Exportação PDF (não pacote LGPD)
- Exportações de membros/integrantes/dashboard em PDF existem (direito de acesso operacional).
- **Não identificado:** endpoint de “download all my personal data” / DSR LGPD/GDPR completo, portabilidade estruturada JSON, ou consentimento versionado.

Cookies Auth: HttpOnly; secure em produção — ver BR-GEN sessão.

Service role no backend bypassa RLS: isolamento = aplicação (risco de compliance se query falhar filtro `church_id`).

---

## ⏱️ Políticas de Expiração

### BR-POL-022: TTL cookies de sessão (**HARDCODED** `cookieUtils`)
| Cookie | TTL |
| --- | --- |
| Access token | 15 minutos |
| Refresh token | 7 dias |
| Session cookie | 24 horas |
| Igreja ativa | 30 dias |
| Pending link token | 7 dias |

Timeout por **inatividade puro** (idle aparte do JWT): **não identificado**.

### BR-POL-023: Expiração de links públicos
- Cada link tem `expires_at` (definido na criação) + opcional `max_uses`.
- Middleware rejeita expirado/inativo/esgotado.

### BR-POL-024: Expiração pending checkout
- `pending_subscriptions.expires_at` + purge após expiração (BR-POL-015).

Avisos de expiração de assinatura: job `check_subscription_expiration` (e-mails D-7/D-3/D-1 — cache 30 dias) — **suporte a retenção comercial**, não TTL de dados.

---

## 📊 Limites Técnicos com Impacto de Negócio

### BR-POL-025: Upload CSV ≤ 10MB, só CSV
- **HARDCODED** `middlewares/upload.ts`
- Impacto: tamanho máximo de importação em lote de membros

### BR-POL-026: Paginação
| Endpoint | Default | Máx. |
| --- | --- | --- |
| Membros | 10 | 100 |
| Integração | 10 | 100 |
| Audit logs | 20 | 100 |
| Subscription events | 20 | 50 |

Payload JSON global: **default Express** (sem `limit` explícito) — débito se precisar política comercial de payload.

Rate limits: BR-POL-004.

---

## ⚠️ Políticas Parcialmente Implementadas / Débitos

| Item | Problema |
| --- | --- |
| 💰 Limites duplicados | `PLAN_CONFIG.members` vs `PLAN_LIMITS` — risco de drift |
| 💰 `custom` / null | Sem teto efetivo (BR-POL-028) |
| Feature parity | Planos não desbloqueiam features — só quota (ok se intencional; senão falta política) |
| Preços HARDCODED | Mudança comercial exige deploy; Stripe Prices devem permanecer alinhados |
| Cache avisos em memória | Reinício do server reenvia; multi-instância inconsistente |
| LGPD incompleto | Sem portabilidade DSR; exclusão de conta ≠ wipe certificado de tenant |
| Retenção audit | Sem purge (BR-POL-017) |
| Rate limit ≠ tier | Abuso treat free/paid iguais (pode ser ok) |
| Membros após downgrade job | Podem ficar **acima** do teto 100 sem remoção forçada — só bloqueia **novos** |
| Waitlist `personalizado` vs `custom` | Nomenclatura divergente |

---

## Totais e arquivos analisados

**Total de políticas (BR-POL):** 28.

**Arquivos analisados:**

- `backend/src/config/plans.ts`
- `backend/src/utils/planLimits.ts`, `cookieUtils.ts`, `redact.ts`, `errorMessages.ts`, `churchDto.ts`
- `backend/src/controllers/stripeController.ts`, `accountController.ts`, `memberController.ts`, `memberImportController.ts`, `integrationController.ts`
- `backend/src/jobs/downgradeExpiredSubscriptions.ts`, `cleanupPendingSubscriptions.ts`, `cleanupWebhookEvents.ts`, `checkSubscriptionExpiration.ts`
- `backend/src/middlewares/upload.ts`, `stripeSecurity.ts`, `public*Auth.ts`
- `backend/src/app.ts` (cron)
- `landing/src/components/Pricing.tsx`
- `docs/STRIPE-MAINTENANCE.md`, `docs/ENVIRONMENT-VARIABLES.md`
- `docs/02_regras-de-negocio/regras-gerais.md`, `docs/01_produto/glossario.md`
