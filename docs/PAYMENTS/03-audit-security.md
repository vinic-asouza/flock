# Auditoria 03 — Segurança Stripe

**Projeto:** Flock (SaaS multi-tenant — igrejas)  
**Escopo:** Segurança da integração Stripe (secrets, webhooks, authZ, IDOR, vazamento, abuso de API)  
**Prompts:** [`payment-audit-general.mdc`](../prompts/PAYMENTS/payment-audit-general.mdc), [`03-security.mdc`](../prompts/PAYMENTS/03-security.mdc)  
**Data:** 2026-05-28  
**Modo:** Revisão estática de código (backend, frontend app, landing, configuração)  
**Contexto:** Pós Ciclo 1 dos tópicos [01 — Webhooks](./01-audit-webhooks.md) e [02 — Multi-tenant](./02-audit-multitenant.md)

---

## Resumo executivo

A integração Stripe está **alinhada com boas práticas centrais**: chaves secretas apenas no backend, `constructEvent` no webhook, body raw na rota correta, claim atômico de idempotência, rotas financeiras sensíveis com `authMiddleware` + `requireRole('admin')`, e correções recentes de multi-tenant (rejeição de `church_id` no body, `link_token`, escopo de polling).

Para **produção com superfície pública** (checkout landing, health check, CORS), permanecem riscos de **abuso de API**, **vazamento de metadados operacionais** e **lacunas de autorização** em rotas de menor privilégio.

| Severidade | Quantidade |
|------------|------------|
| CRÍTICO    | 0          |
| ALTO       | 4          |
| MÉDIO      | 7          |
| BAIXO      | 3          |

**Recomendação imediata:** rate limit dedicado em `create-checkout-session` público; restringir ou autenticar `/api/health/stripe`; incluir `X-Church-Id` em `allowedHeaders` do CORS.

---

## Mapa de superfície de ataque (Stripe)

```
                    ┌─────────────────────────────────────┐
                    │           Stripe (externo)         │
                    └──────────────┬──────────────────────┘
                                   │ webhook assinado
                                   ▼
┌──────────┐   POST /api/stripe/webhook (sem auth, raw body)
│ Atacante │   POST /api/stripe/create-checkout-session (optionalAuth)
│ Internet │   GET  /api/health/stripe (público)
└────┬─────┘   POST sync|portal|change-plan|activate-free (auth + admin)
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│ Backend Express                                             │
│  • constructEvent + claim processed_webhook_events          │
│  • STRIPE_SECRET_KEY (env)                                  │
│  • attachChurchContext / requireRole('admin')               │
└────────────────────────────────────────────────────────────┘
     ▲ cookies httpOnly + opcional X-Church-Id
     │
┌────┴─────┐     ┌──────────┐
│ Frontend │     │ Landing  │  (sem secret Stripe; redirect registro)
│ /checkout│     │ waitlist │
└──────────┘     └──────────┘
```

**Trust boundary:** o backend é a única fonte de verdade para plano, metadata e estado de assinatura. Frontend e landing **não** possuem `STRIPE_SECRET_KEY` nem `pk_` expostos no código analisado.

---

## Pontos positivos (pós-correções 01 e 02)

1. **Secrets no servidor** — `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` validados no startup em [`stripe.ts`](../../backend/src/services/stripe.ts); frontend sem variáveis Stripe sensíveis.
2. **Webhook** — `express.raw` antes de `express.json()`; `stripe.webhooks.constructEvent`; claim UNIQUE + `releaseWebhookClaim` em falha ([`stripeWebhookService.ts`](../../backend/src/services/stripeWebhookService.ts)).
3. **IDOR checkout** — `church_id` rejeitado no body (público e autenticado); metadata `pending` + `link_token` no fluxo landing.
4. **Autorização financeira** — portal, sync, change-plan, activate-free, checkout-status exigem `admin`+ ([`stripe.ts` routes](../../backend/src/routes/stripe.ts)).
5. **Escopo tenant** — `checkCheckoutStatus` valida `metadata.church_id` e customer da igreja ativa; webhook usa `assertCheckoutCustomerMatchesChurch`.
6. **Minimização de dados** — `sanitizeChurchForRole` omite IDs Stripe para `reader`/`editor`.
7. **Erros Stripe em produção** — `formatErrorResponse` não expõe stack/código fora de `development`.
8. **UI + API** — aba Plano e `PaymentManagement` condicionados a `admin`/`owner`; API reforça no backend.

---

## Achados

### ACHADO-S01 — Checkout público sem rate limit; abuso de criação de Customers Stripe

**Severidade:** ALTO  
**Categoria:** Segurança · Backend  
**Prioridade:** Alta

**Explicação**  
`POST /api/stripe/create-checkout-session` aceita requisições **sem autenticação** (apenas `optionalAuth`) e não possui rate limit específico — apenas o limiter geral (1000 req / 15 min / IP). Um atacante pode disparar milhares de checkouts com e-mails arbitrários; cada chamada cria um **novo** Customer Stripe (`createPendingCheckoutCustomer`).

**Impacto real**  
Custo/quotas na conta Stripe, poluição de customers, possível alerta de abuso; negação de serviço indireta no backend (chamadas à API Stripe).

**Cenário de falha**  
Script `while true: POST create-checkout-session { email, name, plan: '200' }` a partir de botnet com IPs rotativos.

**Evidência técnica**

```15:15:backend/src/routes/stripe.ts
router.post('/create-checkout-session', express.json(), optionalAuth, createCheckout);
```

Ramo público em [`stripeController.ts`](../../backend/src/controllers/stripeController.ts) (L131–158): sempre `getOrCreateCustomerForChurch({ churchId: 'pending', ... })`.

**Correção recomendada**  
Rate limit estrito (ex.: 5–10 / hora / IP + captcha ou token de sessão na landing); opcional validação de e-mail (magic link) antes do checkout; monitorar métricas Stripe de customers criados.

---

### ACHADO-S02 — Health check Stripe público expõe configuração e consome API

**Severidade:** ALTO  
**Categoria:** Segurança · Observabilidade  
**Prioridade:** Alta

**Explicação**  
`GET /api/health/stripe` não exige autenticação e retorna booleans de configuração (`hasSecretKey`, `hasWebhookSecret`, price IDs configurados). Executa `stripe.customers.list({ limit: 1 })`, provando conectividade com a secret key.

**Impacto real**  
Reconhecimento para atacante (ambiente configurado vs não); vetor de abuso leve da API Stripe; em incidente, facilita mapeamento da stack.

**Cenário de falha**  
Scanner externo chama o endpoint a cada minuto → tráfego Stripe + fingerprint da integração.

**Evidência técnica**

```137:140:backend/src/app.ts
app.get('/api/health/stripe', async (_req, res) => {
    const { checkStripeHealth } = require('./controllers/stripeController');
```

```613:627:backend/src/controllers/stripeController.ts
    res.json({
      status: 'healthy',
      stripe: { connected: true, apiVersion: '2025-11-17.clover' },
      config: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasPriceIds: { m200: !!..., m500: !!..., m800: !!... },
      },
```

**Correção recomendada**  
Proteger com auth interno, IP allowlist ou remover endpoint público; health mínimo (`{ ok: true }`) sem chamada Stripe nem flags de secrets.

---

### ACHADO-S03 — CORS não autoriza header `X-Church-Id` (multi-tenant)

**Severidade:** ALTO  
**Categoria:** Segurança · Multi-tenant · Frontend  
**Prioridade:** Alta

**Explicação**  
Após MT07, o frontend envia `X-Church-Id` via interceptor ([`api.ts`](../../frontend/src/services/api.ts)). O CORS em `app.ts` lista apenas `Content-Type`, `Authorization`, `Cookie` — **não** inclui `X-Church-Id`.

**Impacto real**  
Em deploy cross-origin (frontend ≠ API), preflight pode falhar ou o header ser omitido pelo browser; usuários multi-igreja podem ficar em 403 intermitente ou depender só do cookie (comportamento inconsistente).

**Cenário de falha**  
Usuário com 2 igrejas no domínio do frontend em produção; troca de igreja via localStorage não chega ao backend.

**Evidência técnica**

```69:71:backend/src/app.ts
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
```

**Correção recomendada**  
Adicionar `X-Church-Id` a `allowedHeaders` (e documentar em deploy). Validar que `attachChurchContext` continua validando membership (já faz).

---

### ACHADO-S04 — Checkout autenticado sem `requireRole('admin')`

**Severidade:** ALTO  
**Categoria:** Segurança · Autorização  
**Prioridade:** Média–Alta

**Explicação**  
Qualquer membro autenticado com papel `reader` ou `editor` pode chamar `create-checkout-session` e abrir sessão de pagamento vinculada à igreja ativa. Operações de gestão (portal, sync, troca de plano) exigem `admin`.

**Impacto real**  
Usuário convidado com papel mínimo pode contratar plano pago em nome da igreja (impacto financeiro e governança), se a política de negócio restringe billing ao owner/admin.

**Cenário de falha**  
Conta `reader` comprometida → POST checkout plano 800 → assinatura ativa na igreja.

**Evidência técnica**

```15:22:backend/src/routes/stripe.ts
router.post('/create-checkout-session', express.json(), optionalAuth, createCheckout);
// vs
router.post('/create-portal-session', ..., requireRole('admin'), ...);
```

**Correção recomendada**  
Alinhar política: `requireRole('admin')` em `create-checkout-session` quando `req.user` presente; ou documentar explicitamente que checkout é self-service para todos os membros.

---

### ACHADO-S05 — `link_token` exposto em URL de sucesso e corpo JSON

**Severidade:** MÉDIO  
**Categoria:** Segurança · Vazamento de dados  
**Prioridade:** Média

**Explicação**  
O token de vínculo aparece em `successUrl` (`/register?link_token=...`), na resposta JSON do checkout e em `sessionStorage`. URLs podem vazar em histórico, analytics, Referer e logs de proxy.

**Impacto real**  
Terceiro com o token pode tentar registrar e vincular assinatura pendente (mitigado por validação de e-mail igual ao pending quando token presente).

**Cenário de falha**  
Usuário compartilha link de sucesso; outra pessoa registra com o mesmo e-mail usado no checkout (ou explora fallback por e-mail se token ausente).

**Evidência técnica**

```164:189:backend/src/controllers/stripeController.ts
      : `${landingUrl}/register?link_token=${linkToken}&session_id={CHECKOUT_SESSION_ID}`;
    // ...
    res.json({ session_id, url, ...(linkToken ? { link_token: linkToken } : {}) });
```

**Correção recomendada**  
Preferir cookie httpOnly de curta duração ou página intermediária POST-only; não repetir token na JSON se já está na URL; reduzir TTL de `pending_subscriptions`.

---

### ACHADO-S06 — Blacklist de tokens JWT apenas em memória

**Severidade:** MÉDIO  
**Categoria:** Segurança · Autenticação  
**Prioridade:** Média

**Explicação**  
Logout adiciona token a `global.tokenBlacklist` (Set em RAM). Após restart do processo, tokens revogados voltam a ser aceitos até expirarem naturalmente.

**Impacto real**  
Sessão roubada permanece válida após deploy/restart se o atacante ainda tiver o cookie — inclui chamadas Stripe autenticadas.

**Evidência técnica**

```312:316:backend/src/controllers/authController.ts
    // TODO: substituir por Redis ou tabela revoked_tokens no Supabase
    if (!global.tokenBlacklist) {
      global.tokenBlacklist = new Set();
```

**Correção recomendada**  
Persistir revogação (Redis/DB); ou invalidar sessão apenas via `supabaseAdmin.auth.admin.signOut` e confiar em refresh invalidado (já parcialmente implementado).

---

### ACHADO-S07 — Ausência de RLS no Supabase; confiança total no backend

**Severidade:** MÉDIO  
**Categoria:** Segurança · Banco · Multi-tenant  
**Prioridade:** Média

**Explicação**  
Tabelas `churches`, `pending_subscriptions` e `processed_webhook_events` são acessadas pelo cliente Supabase **anon** no backend, sem Row Level Security documentada. Isolamento depende 100% de filtros `.eq('id', req.church.churchId)` nos controllers.

**Impacto real**  
Vazamento da `SUPABASE_KEY` anon (ou bug que exponha o client no frontend) permitiria leitura/escrita cross-tenant. Hoje o frontend **não** referencia Supabase diretamente (positivo).

**Evidência**  
MT12 aceito no tópico 02; [`supabase.ts`](../../backend/src/services/supabase.ts) usa `SUPABASE_KEY` anon.

**Correção recomendada**  
RLS por `church_id` / `auth.uid()` em ciclo futuro; usar service role apenas onde indispensável.

---

### ACHADO-S08 — Webhook isento do rate limit geral

**Severidade:** MÉDIO  
**Categoria:** Segurança · Webhook  
**Prioridade:** Média

**Explicação**  
`skip` no rate limiter inclui `/api/stripe/webhook`. Requisições forjadas sem assinatura válida retornam 400 rapidamente, mas volume alto ainda consome CPU (constructEvent + DB claim).

**Impacto real**  
DoS de camada aplicação; não altera estado financeiro sem secret, mas pode degradar API.

**Evidência técnica**

```88:93:backend/src/app.ts
  skip: (req) => {
    return (
      req.path === '/health' ||
      req.path === '/api/health/stripe' ||
      req.path === '/api/stripe/webhook'
```

**Correção recomendada**  
Rate limit separado generoso para webhook; WAF/CDN na borda; confiar em assinatura (já) — opcional não isentar totalmente.

---

### ACHADO-S09 — Re-autenticação duplicada em `createCheckout` (superfície de inconsistência)

**Severidade:** MÉDIO  
**Categoria:** Segurança · Autenticação  
**Prioridade:** Média

**Explicação**  
`createCheckout` reimplementa leitura/refresh de cookies (L54–73) em vez de usar exclusivamente `optionalAuth` + `ensureUserAndChurchContext`. Duas fontes de verdade aumentam risco de divergência futura (ex.: cookie renovado mas `req.church` não anexado em edge case).

**Correção recomendada**  
Centralizar em `ensureUserAndChurchContext(req, res)` no início do handler; remover bloco duplicado.

---

### ACHADO-S10 — Fallback de pending por e-mail sem `link_token`

**Severidade:** MÉDIO  
**Categoria:** Segurança · Multi-tenant  
**Prioridade:** Baixa–Média

**Explicação**  
Registro sem `link_token` ainda vincula o pending mais recente pelo e-mail. Dois checkouts landing com o mesmo e-mail antes do registro podem associar a assinatura errada.

**Impacto real**  
Plano pago vinculado à igreja incorreta (caso raro, depende de timing).

**Evidência**  
[`authController.ts`](../../backend/src/controllers/authController.ts) — ramo `else` com `.eq('email', email).order('created_at').limit(1)`.

**Correção recomendada**  
Exigir `link_token` para novos fluxos landing; manter fallback só para migração com prazo.

---

### ACHADO-S11 — Resposta de erro do webhook pode vazar detalhe da assinatura

**Severidade:** MÉDIO  
**Categoria:** Segurança · Webhook  
**Prioridade:** Baixa

**Explicação**  
Falha em `constructEvent` retorna `400` com corpo `Webhook Error: ${message}`, potencialmente informativo para quem envia payloads inválidos em massa.

**Evidência**

```712:715:backend/src/services/stripeWebhookService.ts
    res.status(400).send(`Webhook Error: ${message}`);
```

**Correção recomendada**  
Resposta genérica `Invalid signature` em produção; log detalhado só server-side.

---

### ACHADO-S12 — CORS permite requisição sem `Origin` e localhost amplo em dev

**Severidade:** BAIXO  
**Categoria:** Segurança  
**Prioridade:** Baixa

**Explicação**  
`if (!origin) return callback(null, true)` aceita ferramentas sem Origin. Em `development`, qualquer `localhost` é aceito.

**Impacto**  
Baixo em produção se `NODE_ENV=production` e origens fixas; risco em dev compartilhado.

**Correção recomendada**  
Em produção, rejeitar requests sem Origin em rotas autenticadas; manter exceção só para webhook/server-to-server se necessário.

---

### ACHADO-S13 — Polling agressivo em `/subscription/success`

**Severidade:** BAIXO  
**Categoria:** Segurança · Performance  
**Prioridade:** Baixa

**Explicação**  
15 tentativas a cada 2s chamam `checkout-status` (admin). Usuário mal-intencionado autenticado como admin pode poluir API; escopo por tenant mitiga IDOR.

**Evidência**  
[`subscription/success/page.tsx`](../../frontend/src/app/subscription/success/page.tsx) `maxAttempts = 15`.

**Correção recomendada**  
Backoff exponencial; limite server-side por `session_id` + user.

---

### ACHADO-S14 — `activate-free-plan` sem verificação Stripe (by design)

**Severidade:** BAIXO  
**Categoria:** Segurança · Financeiro  
**Prioridade:** Baixa (aceito)

**Explicação**  
Admin pode ativar plano 100 sem pagamento — esperado para produto gratuito. Protegido por `requireRole('admin')`. Risco: admin comprometido evita cobrança (aceitável com RBAC).

---

## Matriz: controles vs prompt 03-security

| Controle solicitado | Status |
|---------------------|--------|
| Secrets expostos | OK no código; validar `.env` em CI/deploy |
| Webhook signature | OK (`constructEvent`) |
| Trust excessivo no frontend | OK para estado de assinatura; plano validado no servidor |
| Replay attacks | Parcial — idempotência por `stripe_event_id`; sem janela explícita além do Stripe |
| Enumeração | Mitigado em checkout-status (admin + tenant); health expõe config |
| IDOR | Mitigado (tópico 02) em checkout/webhook/polling |
| Permissões | Gap em create-checkout (reader) |
| Vazamento de dados | Mitigado DTO igreja; token em URL (S05) |
| Logs inseguros | Parcial — `console.error` com detalhes Stripe em dev paths |
| Manipulação de requests | Plano só 200/500/800; price_id do env |
| Autenticação | Cookies httpOnly; blacklist frágil (S06) |
| Autorização | Forte em admin routes; fraca em checkout autenticado (S04) |

---

## Relação com auditorias anteriores

| Tópico | Achados críticos originais | Situação na auditoria 03 |
|--------|---------------------------|---------------------------|
| 01 Webhooks | Handlers engoliam erro, idempotência frágil | **Corrigido** — claim + release + throw |
| 02 Multi-tenant | IDOR `church_id`, customer por e-mail | **Corrigido** — ver revalidação 02 |

Achados **novos** desta rodada concentram-se em **superfície pública**, **CORS/MT07**, **rate limiting** e **política de papéis no checkout**.

---

## Priorização sugerida (Ciclo 2 — Segurança)

| Ordem | ID | Esforço |
|-------|-----|---------|
| 1 | S01 | Baixo — rate limit + métrica |
| 2 | S02 | Baixo — fechar health |
| 3 | S03 | Trivial — CORS header |
| 4 | S04 | Baixo — decisão produto + middleware |
| 5 | S05–S07 | Médio — hardening funil / logout / RLS |

---

## Critério de fechamento (futuro Ciclo 2)

- S01, S02, S03 **Resolvidos** ou mitigados com evidência em dev-report.
- S04 **Resolvido** ou **Aceito** com política documentada.
- S05–S11 tratados conforme prioridade de produto.
- Testes manuais: abuso checkout público, health sem auth, reader tentando portal (403), webhook payload inválido (400 genérico).

---

## Referências de código

| Área | Arquivo principal |
|------|-------------------|
| Rotas Stripe | `backend/src/routes/stripe.ts` |
| Checkout / health | `backend/src/controllers/stripeController.ts` |
| Webhook | `backend/src/services/stripeWebhookService.ts` |
| Auth / tenant | `backend/src/middlewares/auth.ts`, `churchContext.ts` |
| CORS / limites | `backend/src/app.ts` |
| Frontend pagamentos | `frontend/src/components/settings/PaymentManagement.tsx` |
| Registro + token | `frontend/src/app/(auth)/register/page.tsx` |
