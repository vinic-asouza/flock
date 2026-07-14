---
type: seguranca
ultima_atualizacao: 2026-07-13
versao: "1.0"
auth_provider: Supabase Auth (custom cookie bridge)
tags: [arquitetura, segurança, auth, OWASP, criptografia]
---

# Segurança — Flock

> Controles de autenticação, autorização, proteção de dados e postura OWASP.  
> Personas/RBAC: [[01_produto/personas-e-usuarios#matriz-de-permissoes]] · API: [[03_arquitetura/api-design]] · DB: [[03_arquitetura/banco-de-dados]] · Infra: [[03_arquitetura/infraestrutura]].

---

## 1. 🔐 Autenticação

| Item | Valor |
| --- | --- |
| Provider | **Supabase Auth** (`@supabase/supabase-js`) — sem Clerk/Auth0/NextAuth |
| Protocolo | JWT (emitido pelo Supabase) + sessão em cookies HttpOnly no backend |
| Frontend | Axios `withCredentials: true`; tokens **não** ficam em `localStorage` (exceto `flock_active_church_id`) |
| Senhas | Gerenciadas pelo Supabase Auth (hash no projeto Auth — não na tabela `public`) |

### Métodos de autenticação

| Método | Disponível | Configurado no código | Observações |
| --- | --- | --- | --- |
| Email/Senha | ✅ | ✅ | `signInWithPassword` / `signUp` |
| Confirmação de e-mail | ✅ | ✅ | Callback `/auth/callback` → `POST /api/auth/callback` |
| Recuperação de senha | ✅ | ✅ | `/api/password/forgot` + `/reset` |
| Google OAuth | ❌ | ❌ | Não encontrado |
| GitHub OAuth | ❌ | ❌ | Não encontrado |
| Magic Link | ❌ | ❌ | Não encontrado |
| SSO/SAML | ❌ | ❌ | Não encontrado |
| MFA | ❌ | ❌ | Não encontrado |

### Fluxo resumido

1. Login → Supabase retorna `access_token` + `refresh_token`  
2. Backend seta cookies `flock_*`  
3. Requests subsequentes: cookie (preferido) ou `Authorization: Bearer`  
4. `authMiddleware` valida via `supabase.auth.getUser(token)` e anexa `req.user` + `req.church`

---

## 2. 🎫 Tokens e Sessões

| Tipo | Algoritmo | Expiração (cookie maxAge) | Armazenamento | Refresh? |
| --- | --- | --- | --- | --- |
| Access Token | JWT Supabase (alg. do projeto Auth — tipicamente ES256/HS conforme projeto) | Cookie **15 min** | Cookie `flock_access_token` (HttpOnly) | Sim |
| Refresh Token | Opaco/JWT Supabase | Cookie **7 dias** | Cookie `flock_refresh_token` (HttpOnly) | N/A (usado para renovar) |
| Session cookie | JSON serializado | **24 h** | Cookie `flock_session` (HttpOnly) | — |
| Active church | UUID | **30 dias** | Cookie `flock_active_church_id` (+ espelho localStorage no front) | — |
| Pending link | UUID | **7 dias** | Cookie `flock_pending_link_token` | — |
| Public form tokens | `randomBytes(32)` → string ~48 chars | `expires_at` do link | Tabela `public_*_links.token` | N/A |

Flags de cookie (`cookieUtils.ts`): `httpOnly: true` · `secure` em production · `sameSite: 'none'` (prod, cross-origin) / `'lax'` (dev) · `path: '/'`.

### Refresh e revogação

- **Refresh automático:** middleware tenta `refreshSession` se access ausente/expirado/inválido  
- **Refresh explícito:** `POST /api/refresh/refresh`  
- **Logout:** `admin.signOut` + `clearAuthCookies` + access token entra em `global.tokenBlacklist` (Set em memória)

🚨 **Blacklist só em memória**  
- **Risco:** restart do processo ou múltiplas réplicas → logout não é globalmente honrado.  
- **Impacto:** alto (sessão “morta” pode voltar a valer).  
- **Correção:** store compartilhado (Redis/tabela) e considerar revogar refresh no Supabase.

🚨 **`flock_session` pode embutir tokens no callback**  
- Em `authCallback`, sessão pode incluir `access_token`/`refresh_token` no JSON do cookie.  
- **Risco:** redundância de segredos; superfície maior se cookie vazar.  
- **Correção:** session cookie só com metadados de user/`expires_at`.

---

## 3. 🛡️ Autorização (RBAC)

→ Matriz de produto: [[01_produto/personas-e-usuarios#matriz-de-permissoes]]

### Implementação técnica

| Camada | Mecanismo |
| --- | --- |
| Guards | `authMiddleware` / `authUserOnly` / `optionalAuth` + `requireRole(minRole)` |
| Hierarquia | `reader < editor < admin < owner` (`hasRoleOrHigher`) |
| Contexto tenant | `attachChurchContext` → `req.church = { churchId, role }` |
| Seletor de igreja | Header `X-Church-Id` → cookie `flock_active_church_id` |
| Front | `canEdit = currentRole !== 'reader'` |
| DTO | `sanitizeChurchForRole` remove campos Stripe de respostas para não-admin |

**ABAC:** não identificado (sem policies por atributo além de role + `church_id`).

### Isolamento multi-tenant

- Isolamento **aplicacional**: queries filtram `church_id`  
- Backend usa **`service_role`** (bypass RLS) — defense-in-depth de RLS não protege se a query esquecer o filtro  

🚨 **Service role + filtro app-only**  
- **Risco:** bug de `church_id` ausente → potencial IDOR cross-tenant.  
- **Impacto:** crítico (PII de outra igreja).  
- **Correção:** checklist em PR; testes de IDOR; avaliar RPC/`SET` claims ou políticas que limitem mesmo com service role onde possível.

---

## 4. 🔒 Proteção de Dados

| Categoria | Campos / superfície | Proteção aplicada |
| --- | --- | --- |
| Senhas | Auth users | Hash no **Supabase Auth** (app não armazena password; `bcryptjs` no package.json **não** é usado no fluxo Auth) |
| Dados financeiros / cartão | Pagamentos | **Não armazenados** — Stripe; IDs `cus_`/`sub_` na church |
| PII membros | name, document, email, phone, address, birth, children, … | TLS em trânsito (Railway/HTTPS); at-rest no Postgres Supabase; soft via `active`; delete = **hard** |
| Tokens públicos | `public_*_links.token` | Segredo de capability; UUID/random; ativação/`expires_at`/`max_uses` |
| Segredos API | Stripe, service_role, Resend | Só env vars no backend |
| Campos Stripe na API | customer/subscription IDs etc. | Removidos da resposta para roles &lt; admin |
| Audit | `changes_before`/`after` | Podem conter PII — acesso API ≥ admin |

🚨 **DELETE membro = hard delete** (comentário da rota diz soft)  
- **Risco:** perda irreversível; possível conflito com retenção/LGPD/auditoria.  
- **Correção:** soft delete + purge/anonimização; alinhar docs e rota.

---

## 5. 🌐 Headers de Segurança HTTP

Configuração em `app.ts`: `helmet()` **sem overrides** + CORS custom.

| Header | Configurado | Valor | Propósito |
| --- | --- | --- | --- |
| CORS | ✅ | Allowlist `FRONTEND_URL` + `LANDING_URL`; prod exige `Origin`; `credentials: true`; methods GET/POST/PUT/PATCH/DELETE/OPTIONS; headers `Content-Type`, `Authorization`, `Cookie`, `X-Church-Id` | Controle de origem |
| Helmet (suite) | ✅ | Defaults Helmet 7.x | Baseline |
| Content-Security-Policy | 🟡 | Default Helmet / possivelmente desligado em versões recentes se não setado — **sem CSP custom no código** | XSS |
| Strict-Transport-Security | 🟡 | Depende do default Helmet + TLS no proxy Railway | Forçar HTTPS |
| X-Frame-Options / framing | 🟡 | Via Helmet defaults | Clickjacking |
| X-Content-Type-Options | 🟡 | Via Helmet defaults (`nosniff` típico) | MIME sniffing |
| Referrer-Policy | 🟡 | Via Helmet defaults | Vazamento de URL |
| Cross-Origin-* | 🟡 | Via Helmet defaults | Isolamento |

Não há ajuste explícito de CSP/HSTS no repositório — **validar resposta HTTP real em produção** e reforçar se necessário.

🚨 **Sem CSRF token + cookies `SameSite=None` em prod**  
- Mitigação parcial: CORS allowlist + JSON (preflight).  
- **Risco:** XSS em origem permitida vira session riding; CSRF clássico limitado por CORS mas não eliminado se mal configurado.  
- **Correção:** SameSite=Lax se front/API same-site; senão double-submit / header custom obrigatório.

---

## 6. ✅ Validação e Sanitização de Inputs

| Aspecto | Realidade |
| --- | --- |
| Framework | **Joi** em `backend/src/validators/*` |
| express-validator | Dependência instalada, **sem uso** no `src/` |
| Onde aplica | Controllers chamam `validate*` manualmente (não um pipeline global único) |
| Zod | Frontend (forms), não backend |
| HTML sanitizer | Não identificado no backend |
| SQL | Sem SQL raw na app — PostgREST client parametrizado |
| Upload | Multer memory; CSV; max **10 MB**; MIME CSV / `vnd.ms-excel` / extensão `.csv` |

🚨 **Filtro MIME de upload relativamente frouxo** (`application/vnd.ms-excel`)  
- **Correção:** validar parse CSV real + rejeitar conteúdo não tabular.

Sanitização de saída sensível: `sanitizeChurchForRole` (Stripe fields), não sanitização XSS de strings de usuário.

Frontend app: sem `dangerouslySetInnerHTML` de user content. Landing: JSON-LD via `JSON.stringify` em `dangerouslySetInnerHTML` (risco baixo se payload controlado).

---

## 7. 🔑 Gestão de Secrets

| Prática | Status |
| --- | --- |
| Secrets via env (Railway / `.env` local) | ✅ |
| `.env` no `.gitignore` | ✅ (não rastreados no git) |
| Vault / Secrets Manager | ❌ (a configurar) |
| Hardcoded live keys no `src/` | ❌ não encontrado |
| Docs com placeholders | ✅ (exemplos fictícios em `ENVIRONMENT-VARIABLES.md`) |
| Rotação documentada | 🟡 menção genérica nas docs; **sem procedimento operacional formal** |

🚨 Críticos a nunca expor no frontend: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, tokens internos.

---

## 8. 📋 OWASP Top 10 — Análise do Projeto

| # | Vulnerabilidade | Status | Como mitigado / lacunas |
| --- | --- | --- | --- |
| A01 | Broken Access Control | 🟡 | RBAC `requireRole` + filtro `church_id`; 🚨 service_role bypass RLS; risco IDOR se filtro falhar; um user = uma igreja (unique) |
| A02 | Cryptographic Failures | 🟡 | TLS na borda; senhas no Supabase; 🚨 sem at-rest app-level para PII; cookies `secure` só em prod |
| A03 | Injection | ✅ | Supabase client parametrizado; Joi; sem raw SQL app; RPCs SQL no banco a auditar à parte |
| A04 | Insecure Design | 🟡 | Multi-tenant app-only; links públicos = bearer na URL; hard delete PII; crons no mesmo processo |
| A05 | Security Misconfiguration | 🟡 | Helmet+CORS; 🚨 rotas `/api/refresh/test-cookies` e `test-clear-cookies` **sem auth**; waitlist sem RL dedicado; CSP custom ausente |
| A06 | Vulnerable Components | 🟡 | npm packages; **sem CI de audit/`npm audit` no repo** |
| A07 | Auth/Session Failures | 🟡 | HttpOnly cookies + refresh; RL em login; 🚨 blacklist memória; SameSite=None; sem MFA |
| A08 | Software/Data Integrity | 🟡 | Webhook Stripe com assinatura; sem CI integrity; imports CSV validados parcialmente |
| A09 | Logging/Monitoring Failures | 🟡 | `audit_logs` para CRUD; Sentry billing; 🚨 falhas de login/escalação pouco alertadas; ops Slack opcional só billing |
| A10 | SSRF | ✅ | Poucos fetches server-side a URL de usuário; Slack webhook via env (não input user) |

Legenda: ✅ Mitigado · 🟡 Parcial · ❌ Não identificado / frágil

### Problemas priorizados (🚨)

| # | Problema | Risco | Impacto | Correção sugerida |
| --- | --- | --- | --- | --- |
| 1 | Rotas debug de cookies em produção | Alto | Vazamento de sessão | Remover ou `NODE_ENV!=='production'` + token interno |
| 2 | Blacklist JWT em memória | Alto | Logout ineficaz em scale-out | Store distribuído / revoke Supabase |
| 3 | Isolamento tenant só no app + service_role | Crítico se bug | Cross-tenant PII | Testes IDOR + defense-in-depth |
| 4 | SameSite=None sem CSRF app-level | Médio | Session riding via XSS origin | CSRF token / same-site cookies |
| 5 | Hard delete de membros | Médio (LGPD/ops) | Perda + inconsistência docs | Soft + purge |
| 6 | Session cookie com tokens | Médio | Superfície extra | Só metadata na session |
| 7 | Waitlist sem RL dedicado | Médio | Spam/DoS leve | express-rate-limit |
| 8 | Comentário soft delete incorreto | Baixo/ops | Decisão errada de engenharia | Corrigir docs/rota |

---

## 9. 📝 Checklist de Segurança para Agentes

O Tech Lead / Backend Engineer deve verificar em cada PR:

- [ ] Novo endpoint tem auth adequada (`authMiddleware` / token público / Stripe / interno)?
- [ ] Mutação exige `requireRole` mínimo correto (reader vs editor vs admin)?
- [ ] Toda query de domínio filtra `church_id` do `req.church` (nunca confiar só no body)?
- [ ] Validação Joi (ou equivalente) no input?
- [ ] Erros sem vazar stack/secrets em production?
- [ ] PII/tokens/secret **não** logados (cuidado com `audit_logs.changes_*` e rotas de debug)?
- [ ] Respostas de church/billing sanitizadas por role?
- [ ] Upload: tipo/tamanho; sem path traversal; sem executar conteúdo?
- [ ] Sem SQL raw não parametrizado; sem concatenar filtros do user?
- [ ] Rate limit em endpoints públicos/sensíveis novos?
- [ ] Novos campos PII documentados em [[03_arquitetura/banco-de-dados]] e aqui?
- [ ] Não reintroduzir rotas de teste que dumpam cookies/headers?
- [ ] Webhooks externos com verificação de assinatura (padrão Stripe)?

---

## Apêndice — Mapa de arquivos

| Área | Path |
| --- | --- |
| Cookies | `backend/src/utils/cookieUtils.ts` |
| Auth MW | `backend/src/middlewares/auth.ts` |
| RBAC | `middlewares/requireRole.ts`, `services/churchContext.ts` |
| Helmet/CORS/RL | `backend/src/app.ts` |
| Clients DB | `backend/src/services/supabase.ts` |
| Audit | `backend/src/utils/auditLogger.ts` |
| Public links | `publicRegistrationAuth.ts`, `publicIntegrationAuth.ts` |
| Stripe security | `middlewares/stripeSecurity.ts` |
| Validators | `backend/src/validators/*` |
| Front auth | `frontend/src/services/api.ts`, `frontend/src/context/AuthContext.tsx` |
