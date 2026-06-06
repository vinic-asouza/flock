# Relatório de Execução — Módulo 10: Assinatura e Billing

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-10-billing/modulo-10-billing.md`  
> **Status geral:** ✅ 17/17 achados implementados

---

## Resumo executivo

O pacote corrige os 4 bloqueadores de alta prioridade (erros opacos no funil, retorno 404 do portal Stripe, update DB ignorado em troca de plano, downgrade gratuito sem validação de membros) e fecha os achados médios/baixos de usabilidade em checkout, success, Settings/Plano, limites de membros e guards de checkout duplicado.

Mudanças em **backend** (`stripeController`, `planLimits`) e **frontend** (checkout, success, `PaymentManagement`, `Header`, `api.ts`, redirect de compatibilidade).

---

## Achados e implementações

### ACHADO 01 — Checkout e success sem `formatApiError` ✅ RESOLVIDO

**Arquivos:**  
`frontend/src/app/(auth)/checkout/page.tsx`  
`frontend/src/app/subscription/success/page.tsx`

**Solução aplicada:**
- import de `formatApiError` e uso nos blocos `catch`;
- removido parse legacy de `err.response.data`.

**Resultado:** erros 400/403/500 exibem `details` acionáveis da API.

---

### ACHADO 02 — Portal Stripe retorna para rota inexistente ✅ RESOLVIDO

**Arquivos:**  
`backend/src/controllers/stripeController.ts`  
`frontend/src/app/(main)/settings/subscription/page.tsx` (novo)

**Solução aplicada:**
- `returnUrl` alterado para `${frontendUrl}/settings?tab=payment`;
- página `/settings/subscription` com redirect 302 para compatibilidade com URLs legadas.

**Resultado:** admin retorna à aba Plano após ações no portal Stripe.

---

### ACHADO 03 — `change-plan` ignora falha de update no banco ✅ RESOLVIDO

**Arquivos:**  
`backend/src/controllers/stripeController.ts`  
`frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:**
- captura `{ error: updateError }` do update Supabase; retorna 500 com mensagem explícita se falhar;
- após sucesso de `changePlan`/`activateFreePlan`, frontend chama `syncSubscription()` como fallback antes de `refreshChurch()`.

**Resultado:** sucesso enganoso eliminado; UI tenta reconciliar estado local com Stripe.

---

### ACHADO 04 — `activate-free-plan` sem validar limite de 100 membros ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/stripeController.ts`

**Solução aplicada:**
- `checkMemberLimit(church.id, 0)` antes do downgrade;
- retorno 400 com `membersToRemove`, `currentCount`, `newLimit` (mesmo shape de `change-plan`).

**Resultado:** igreja com >100 membros não consegue ativar plano gratuito sem remover excedente.

---

### ACHADO 05 — `refreshChurch` falha após pagamento confirmado ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/subscription/success/page.tsx`

**Solução aplicada:**
- polling trata `confirmed: true` e seta sucesso **antes** do `refreshChurch`;
- falha de refresh vira aviso não bloqueante (não incrementa retries nem cai em erro falso).

**Resultado:** pagamento confirmado não exibe “Verificação Pendiente” por falha transitória de contexto.

---

### ACHADO 06 — Login na success page perde `session_id` ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/subscription/success/page.tsx`

**Solução aplicada:** redirect para login preserva `session_id` via query `redirect=/subscription/success?session_id=…`.

**Resultado:** após reautenticação, polling retoma com a mesma sessão Stripe.

---

### ACHADO 07 — Checkout sem RBAC no frontend ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/(auth)/checkout/page.tsx`

**Solução aplicada:**
- checagem `currentRole === 'admin' || 'owner'`;
- mensagem read-only + submit desabilitado para reader/editor (paridade com aba Plano em Settings).

**Resultado:** usuário sem permissão vê explicação antes de tentar pagamento.

---

### ACHADO 08 — Auto-sync grava cache com `synced: false` ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:** `setCachedStripeSync` no auto-sync **somente** quando `response.synced === true` (alinhado ao sync manual).

**Resultado:** sync manual não fica bloqueado por cache de tentativa infrutífera.

---

### ACHADO 09 — `hasSubscription` ignora `stripe_customer_id` ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:**
```ts
hasSubscription = !!(stripe_subscription_id || (stripe_customer_id && planType !== '100'))
```

**Resultado:** customer Stripe sem subscription_id ainda vê painel completo com sync/portal.

---

### ACHADO 10 — Mensagem de limite no plano gratuito incorreta ✅ RESOLVIDO

**Arquivo:** `backend/src/utils/planLimits.ts`

**Solução aplicada:** ramo `planType === '100'` com copy “Faça upgrade para um plano pago”.

**Resultado:** mensagem coerente para igrejas no tier gratuito.

---

### ACHADO 11 — Modal exibe “/mês” no plano gratuito ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:** sufixo `/mês` condicionado a `planType !== '100'` e `selectedPlan !== '100'` nos cards do modal de confirmação (lista de planos já estava correta).

**Resultado:** downgrade para gratuito não mostra preço mensal enganoso.

---

### ACHADO 12 — Polling ignora `message` terminal do checkout-status ✅ RESOLVIDO

**Arquivos:**  
`frontend/src/app/subscription/success/page.tsx`  
`frontend/src/services/api.ts`

**Solução aplicada:**
- tipo `getCheckoutStatus` expandido com `message`, `error`;
- helper `isTerminalCheckoutMessage` interrompe polling e exibe erro imediato para mensagens não aguardáveis.

**Resultado:** mismatch de igreja/sessão inválida não espera timeout de ~2 min.

---

### ACHADO 13 — Botão checkout travado ao voltar do Stripe ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/(auth)/checkout/page.tsx`

**Solução aplicada:** listeners `pagehide` e `visibilitychange` resetam `isLoading` e `checkoutInFlightRef`.

**Resultado:** botão “Continuar para Pagamento” fica clicável após voltar do redirect.

---

### ACHADO 14 — Header engole erro de `getMemberLimit` ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/main/Header.tsx`

**Solução aplicada:**
- estado `memberLimitLoadFailed`;
- chip discreto “Limite indisponível” com botão retry (`RefreshCw` + tooltip).

**Resultado:** falha de API não passa silenciosa; admin pode tentar recarregar limite.

---

### ACHADO 15 — Ícone incorreto no botão sync (sem assinatura) ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:** `Loader` estático trocado por `RefreshCw` no bloco “Nenhuma Assinatura Ativa”.

**Resultado:** botão não parece loading permanente.

---

### ACHADO 16 — Downgrade bloqueado sem exibir `membersToRemove` ✅ RESOLVIDO

**Arquivos:**  
`frontend/src/services/api.ts` (`getDowngradeBlockInfo`, `DowngradeBlockInfo`)  
`frontend/src/components/settings/PaymentManagement.tsx`

**Solução aplicada:**
- parse de campos extras do 400 no catch de `handleChangePlan`;
- card âmbar “Remova X membro(s)…” nos modais de troca e confirmação.

**Resultado:** admin vê quantos membros remover antes do downgrade.

---

### ACHADO 17 — Checkout pago sem guard contra assinatura ativa ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/stripeController.ts`

**Solução aplicada:** `createCheckout` retorna 409 se `stripe_subscription_id` + status `active`/`trialing`/`past_due`, sugerindo portal ou change-plan.

**Resultado:** reduz risco de subscription duplicada no Stripe.

---

## Arquivos novos

| Arquivo | Propósito |
|---------|-----------|
| `frontend/src/app/(main)/settings/subscription/page.tsx` | Redirect legado `/settings/subscription` → `?tab=payment` |

---

## Validação

```bash
cd frontend && npm run lint   # ✔ sem warnings/erros
cd backend && npx tsc --noEmit # ✔ OK
```

### Cenários manuais recomendados

1. Portal Stripe → retorno em `/settings?tab=payment` (não 404).  
2. Reader em `/checkout` → mensagem de permissão, submit desabilitado.  
3. Checkout pago → success confirma → Header reflete plano PRO.  
4. Sessão expira na success → login → polling retoma com mesmo `session_id`.  
5. Auto-sync `synced: false` → botão manual sync ainda funciona.  
6. Downgrade 200→100 com >100 membros → 400 + card “Remova X membros”.  
7. Plano 100 no limite → mensagem sugere upgrade pago.  
8. Falha `getMemberLimit` → chip “Limite indisponível” + retry.  
9. Assinatura ativa tenta novo checkout → 409 com orientação.  
10. Voltar do Stripe no checkout → botão clicável sem reload.

---

## Parecer

Módulo 10 **pronto para revalidação QA** nos fluxos de checkout, success/cancel, aba Plano, portal Stripe, troca/downgrade de plano e alertas de limite de membros. Recomenda-se smoke do `docs/PAYMENTS/10-checklist-testes-billing.md` antes do fechamento formal.
