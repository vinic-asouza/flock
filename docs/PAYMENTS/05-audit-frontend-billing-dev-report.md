# Dev Report — Tópico 05: Frontend Billing

**Data:** 2026-06-04  
**Referência:** [`05-audit-frontend-billing.md`](./05-audit-frontend-billing.md)

---

## Correções implementadas

### FB01 — Success sem `session_id` não exibe sucesso falso

**Arquivo:** `frontend/src/app/subscription/success/page.tsx`

- Estado `missingSessionId` quando não há query `session_id`
- UI neutra com título “Sessão de pagamento não encontrada”
- CTA para Configurações → Plano

---

### FB02 — Banner e CTA em `past_due`

**Arquivos:**
- `frontend/src/components/settings/PaymentManagement.tsx` — banner com botão “Atualizar pagamento”
- `frontend/src/components/main/Header.tsx` — link global “Pagamento pendente”
- `frontend/src/app/(main)/members/page.tsx` — mensagem da API + link para Plano
- `backend/src/controllers/churchController.ts` — expõe `message` e `isPastDue` em `/church/member-limit`

---

### FB03 — Cache de sync escopado por igreja

**Arquivos:**
- `frontend/src/utils/stripeSyncCache.ts` — utilitário novo (`stripe_sync_cache:{churchId}`)
- `PaymentManagement.tsx` — usa `activeChurchId`
- `AuthContext.tsx` — `clearStripeSyncCache` ao `switchChurch`

---

### FB04 — Plano 100 via `activate-free-plan`

**Arquivo:** `PaymentManagement.tsx`

- Seleção do plano 100 abre modal de confirmação (não portal)
- `handleChangePlan` chama `activateFreePlan()` quando `selectedPlan === '100'`
- Copy atualizada no modal

---

### FB05 — Refresh ao voltar do portal

**Arquivo:** `PaymentManagement.tsx`

- `visibilitychange` → `refreshChurch()` quando aba fica visível

---

### FB06 — Auto-sync respeita cache

**Arquivo:** `PaymentManagement.tsx`

- Auto-sync na montagem verifica `getCachedStripeSync(churchKey)` antes de chamar API
- Grava cache após sync bem-sucedido

---

### FB07 — Removido `window.confirm` duplicado

**Arquivo:** `PaymentManagement.tsx`

- Confirmação apenas via modal React

---

### FB08 — Loading fictício removido

**Arquivo:** `PaymentManagement.tsx`

- Removido `isLoading` com `useEffect` vazio
- Spinner só quando `!user`

---

### FB09 — Erro ao carregar planos no checkout

**Arquivo:** `frontend/src/app/(auth)/checkout/page.tsx`

- Sem fallback de preços hardcoded em caso de falha
- Tela de erro com botão “Tentar novamente”

---

### FB10 — Cancel page preserva plano

**Arquivo:** `frontend/src/app/subscription/cancel/page.tsx`

- `resolveCheckoutPath` com último `plan_type` do usuário ou `sessionStorage`

---

### FB11 — Mensagem de polling (parcial)

**Arquivo:** `success/page.tsx`

- Copy de “Verificação Pendente” ajustada (“pode ter sido recebido”)
- CTA explícito para Configurações → Plano

_Nota: backend ainda confirma só `active`/`trialing`; estado intermediário dedicado no BE fica fora deste ciclo._

---

### FB12 — Reset de auto-sync ao trocar igreja

**Arquivo:** `PaymentManagement.tsx`

- `lastSyncedChurchIdRef` + reset de `hasSyncedRef` quando `activeChurchId` muda

---

### FB13 — Header alerta `past_due`

**Arquivo:** `Header.tsx` — incluído em FB02

---

### FB14 — Membros: mensagem `past_due`

**Arquivos:** `members/page.tsx`, `churchController.ts` — incluído em FB02

---

### FB17 — Proteção duplo clique no checkout

**Arquivo:** `checkout/page.tsx` — `checkoutInFlightRef`

---

## Fora deste ciclo / Aceito

| ID | Motivo |
|----|--------|
| FB15 | `trialing`/`unpaid`: matriz de ações por status — baixa frequência; portal + sync cobrem |
| FB16 | Já mitigado: `sanitizeChurchForRole` em `getChurch`, `checkAuth`, login |
| FB18 | Exclusão de conta com `subscription_end_date` — comportamento de produto aceito |

---

## Testes manuais sugeridos

1. Abrir `/subscription/success` sem `session_id` → não deve mostrar “Pagamento Confirmado”
2. Simular `past_due` no banco → banner na aba Plano + header + bloqueio de membros com mensagem
3. Duas igrejas: sync na A, trocar para B → sync manual na B não deve usar cache da A
4. Trocar para plano 100 no modal → `activate-free-plan` (verificar cancelamento Stripe)
5. Abrir portal, cancelar, voltar à aba → dados atualizados após `visibilitychange`
6. Falha de rede em `/checkout` → erro + retry, sem preços fixos
7. Stripe cancel → “Tentar novamente” deve ir para `/checkout?plan=...` se aplicável

---

## Breaking changes / deploy

Nenhuma migração SQL. Deploy frontend + backend (campo extra em `member-limit` é aditivo).
