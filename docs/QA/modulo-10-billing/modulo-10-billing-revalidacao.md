# QA Revalidação — Módulo 10: Assinatura e Billing (Usabilidade)

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-10-billing/modulo-10-billing.md`, `docs/QA/modulo-10-billing/modulo-10-billing-dev-report.md`  
> **Método:** revisão estática ponta a ponta (FE/BE/contratos/UX); lint/tsc citados no dev-report não reexecutados nesta sessão

---

## 1. Resumo executivo

O pacote do DEV **entrega de forma verificável as correções dos 17 achados** da auditoria de usabilidade. Bloqueadores altos (erros opacos no funil, portal 404, update DB ignorado, downgrade gratuito sem validação) estão corrigidos no código. Achados médios/baixos de polling, RBAC visual, cache de sync, copy de limites, guards de checkout e feedback de downgrade foram implementados conforme especificado.

**Placar desta revalidação:**

| Classificação | Qtd | IDs |
|---|---:|---|
| ✅ Resolvido | 17 | 01–17 |
| ⚠️ Parcialmente resolvido | 0 | — |
| ❌ Não resolvido | 0 | — |
| Novo ticket (melhoria residual) | 1 | **NG-01** |

**Parecer:** módulo **aprovado para fechamento de QA de usabilidade** (17/17). NG-01 é fragilidade de manutenção (baixa), não bloqueia release. Smoke manual do `docs/PAYMENTS/10-checklist-testes-billing.md` recomendado antes de produção.

---

## 2. Status de cada achado original

### ACHADO 01 — Checkout e success sem `formatApiError`
**Status:** ✅ resolvido

**Evidência:**
- `checkout/page.tsx` L8, L124: `import formatApiError` + `setError(formatApiError(err))`
- `success/page.tsx` L8, L80, L103: idem nos catches de polling
- Parse legacy `err.response.data` removido

---

### ACHADO 02 — Portal Stripe retorna para rota inexistente
**Status:** ✅ resolvido

**Evidência:**
- `stripeController.ts` L232: `returnUrl = ${frontendUrl}/settings?tab=payment`
- `frontend/src/app/(main)/settings/subscription/page.tsx`: `redirect('/settings?tab=payment')` para URLs legadas

**Fluxo ponta a ponta:** portal Stripe → aba Plano em Configurações (não 404).

---

### ACHADO 03 — `change-plan` ignora falha de update no banco
**Status:** ✅ resolvido

**Evidência:**
- `stripeController.ts` L557–580: captura `updateError`, retorna 500 com mensagem “Plano alterado no Stripe, mas falhou ao atualizar localmente” + orientação de sync
- `PaymentManagement.tsx` L396–400: após sucesso, `syncSubscription()` antes de `refreshChurch()`

---

### ACHADO 04 — `activate-free-plan` sem validar limite de 100 membros
**Status:** ✅ resolvido

**Evidência:** `stripeController.ts` L865–876:
- `checkMemberLimit(church.id, 0)`
- 400 com `membersToRemove`, `currentCount`, `newLimit` (shape igual a `change-plan`)

---

### ACHADO 05 — `refreshChurch` falha após pagamento confirmado
**Status:** ✅ resolvido

**Evidência:** `success/page.tsx` L60–74:
- `confirmed: true` → seta sucesso e `isLoading=false` **antes** do refresh
- refresh em try/catch separado → `refreshWarning` não bloqueante (L69–71, L197–199)

---

### ACHADO 06 — Login na success page perde `session_id`
**Status:** ✅ resolvido

**Evidência:** `success/page.tsx` L131–134:
```ts
router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
// redirectPath inclui session_id quando presente
```

---

### ACHADO 07 — Checkout sem RBAC no frontend
**Status:** ✅ resolvido

**Evidência:** `checkout/page.tsx`:
- L27: `canManagePlan = admin || owner`
- L182–187: banner amber com `READER_TOOLTIP`
- L203, L264–265: planos e submit desabilitados para reader/editor

---

### ACHADO 08 — Auto-sync grava cache com `synced: false`
**Status:** ✅ resolvido

**Evidência:** `PaymentManagement.tsx` L215–217:
```ts
if (response.synced) {
  setCachedStripeSync(churchKey);
}
```
Sync manual mantém cache em “nenhuma assinatura” (L323–327) — comportamento intencional e distinto do auto-sync corrigido.

---

### ACHADO 09 — `hasSubscription` ignora `stripe_customer_id`
**Status:** ✅ resolvido

**Evidência:** `PaymentManagement.tsx` L150–153:
```ts
hasSubscription = !!(
  stripe_subscription_id ||
  (stripe_customer_id && planType && planType !== '100')
);
```
Customer pago sem `subscription_id` no DB acessa painel completo (sync/portal).

---

### ACHADO 10 — Mensagem de limite no plano gratuito incorreta
**Status:** ✅ resolvido

**Evidência:** `planLimits.ts` L190–191:
- ramo `planType === '100'` → “Faça upgrade para um plano pago para adicionar mais membros”

---

### ACHADO 11 — Modal exibe “/mês” no plano gratuito
**Status:** ✅ resolvido

**Evidência:** `PaymentManagement.tsx` L1045–1047, L1069–1071:
- sufixo `/mês` condicionado a `planType !== '100'` e `selectedPlan !== '100'`

---

### ACHADO 12 — Polling ignora `message` terminal do checkout-status
**Status:** ✅ resolvido

**Evidência:**
- `api.ts` L182–189: tipo expandido com `message`, `error`
- `success/page.tsx` L10–18: `isTerminalCheckoutMessage` + `WAITING_STATUS_MESSAGES`
- L77–82: interrompe polling e exibe erro imediato para mensagens não aguardáveis (ex.: “Sessão não pertence à igreja ativa”)

---

### ACHADO 13 — Botão checkout travado ao voltar do Stripe
**Status:** ✅ resolvido

**Evidência:** `checkout/page.tsx` L36–52: listeners `pagehide` e `visibilitychange` resetam `isLoading` e `checkoutInFlightRef`.

---

### ACHADO 14 — Header engole erro de `getMemberLimit`
**Status:** ✅ resolvido

**Evidência:** `Header.tsx` L27, L155–165:
- `memberLimitLoadFailed` + chip “Limite indisponível” com retry (`RefreshCw`)

---

### ACHADO 15 — Ícone incorreto no botão sync (sem assinatura)
**Status:** ✅ resolvido

**Evidência:** `PaymentManagement.tsx` L791: `RefreshCw` no bloco “Nenhuma Assinatura Ativa” (antes `Loader` estático).

---

### ACHADO 16 — Downgrade bloqueado sem exibir `membersToRemove`
**Status:** ✅ resolvido

**Evidência:**
- `api.ts` L1170–1187: `getDowngradeBlockInfo` lê `originalError.membersToRemove`
- `PaymentManagement.tsx` L413–414, L944–951, L1088–1095: cards âmbar “Remova X membro(s)…” nos modais

---

### ACHADO 17 — Checkout pago sem guard contra assinatura ativa
**Status:** ✅ resolvido

**Evidência:** `stripeController.ts` L83–93:
- 409 se `stripe_subscription_id` + status `active`/`trialing`/`past_due`
- mensagem orienta Settings → Plano ou portal

---

## 3. Regressões / efeitos colaterais

### NG-01 — `isTerminalCheckoutMessage` acoplado a strings do backend 🟡 BAIXA (novo ticket)
**Contexto:** helper trata como terminal qualquer `message` que **não** contenha fragmentos de `WAITING_STATUS_MESSAGES`.

**Risco:** se o backend alterar copy de mensagens aguardáveis, polling pode parar cedo ou continuar até timeout.

**Evidência:** `success/page.tsx` L10–18.

**Correção sugerida:** campo explícito no BE (`pending: true`) ou enum de `checkout_status` em vez de heurística por substring.

---

### Efeitos colaterais positivos (sem regressão bloqueante)

| Área | Observação |
|------|------------|
| Portal | Dupla proteção: URL correta + redirect legado |
| Troca de plano | Sync pós-sucesso reconcilia estado mesmo se webhook atrasar |
| Checkout 409 | Impede subscription duplicada; mensagem orienta portal/change-plan |
| Downgrade | Validação unificada em `change-plan` e `activate-free-plan` |
| Limites M03 | Copy coerente no plano gratuito (`planLimits.ts`) |

### Fluxos dependentes verificados

| Fluxo | Status |
|-------|--------|
| M03 — Membros (limite / past_due) | Mensagens e CTAs alinhados |
| M09 — Settings (aba Plano) | RBAC + sync + modais OK |
| M02 — Onboarding checkout | formatApiError + RBAC + guards |
| Header alertas | Retry de limite disponível |

**Nenhuma regressão bloqueante** identificada.

---

## 4. Avaliação de UX após correção

| Área | Antes | Depois |
|------|-------|--------|
| Erros no checkout/success | Detalhes perdidos | `formatApiError` completo ✅ |
| Retorno portal Stripe | 404 | Aba Plano ✅ |
| Troca de plano | Sucesso falso possível | 500 explícito + sync fallback ✅ |
| Downgrade gratuito | Overage silencioso | 400 + card “Remova X membros” ✅ |
| Success pós-pagamento | Erro falso se refresh falha | Sucesso + aviso âmbar ✅ |
| Sessão expirada no success | Perdia session_id | Redirect preserva polling ✅ |
| Reader no checkout | 403 opaco | Banner + submit disabled ✅ |
| Auto-sync | Cache bloqueava retry | Cache só em `synced: true` ✅ |
| Plano free no limite | “Ative assinatura” | “Faça upgrade pago” ✅ |
| Polling mismatch igreja | Timeout ~2 min | Erro imediato ✅ |
| Header limite | Falha silenciosa | Chip + retry ✅ |

**Experiência geral:** funil billing utilizável de ponta a ponta para admin/owner; feedback acionável em erros; estados intermediários (webhook atrasado, sync manual) tratados com orientação clara. Único gap residual é manutenibilidade do helper de polling (NG-01).

---

## 5. Itens encerrados

Todos os **17 achados originais (01–17)** podem ser **fechados** neste ciclo de QA de usabilidade.

---

## 6. Itens reabertos

**Nenhum** achado original reaberto.

### Backlog opcional (não bloqueia fechamento)

| ID | Descrição | Prioridade |
|----|-----------|------------|
| **NG-01** | Campo explícito de status no `checkout-status` vs heurística de strings | Baixa |
| — | Card downgrade no `/checkout` plano 100 (hoje só `formatApiError`; modals Settings já têm card) | Muito baixa |
| — | Copy 409 para `past_due` acessando `/checkout` direto (“regularize pagamento” vs “assinatura ativa”) | Muito baixa |

---

## Parecer final

| Decisão | Itens |
|---|---|
| **Encerrados** | ACHADOS 01–17 |
| **Reabertos** | — |
| **Novos tickets** | NG-01 (baixa) |

**Módulo 10 — usabilidade aprovado para fechamento de QA** — 17/17 achados confirmados na revisão estática.

### Smoke manual recomendado (não substituído por revisão estática)

1. Portal Stripe → retorno em `/settings?tab=payment`.  
2. Reader em `/checkout` → banner + submit desabilitado.  
3. Checkout pago → success confirma → plano no Header.  
4. Sessão expira na success → login → polling retoma.  
5. Auto-sync `synced: false` → sync manual não bloqueado por cache.  
6. Downgrade 200→100 com >100 membros → 400 + card âmbar.  
7. Plano 100 no limite → mensagem de upgrade pago.  
8. Header: falha `getMemberLimit` → “Limite indisponível” + retry.  
9. Assinatura ativa → novo checkout → 409 com orientação.  
10. Voltar do Stripe no checkout → botão clicável.
