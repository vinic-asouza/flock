# QA — Módulo 10: Assinatura e Billing (Usabilidade)

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria de usabilidade e bugs silenciosos (fluxo ponta a ponta FE/BE)  
> **Escopo:** Checkout, success/cancel, aba Plano em Configurações, limites de membros, integração Stripe  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 10, L810–888), `docs/prompts/QA/qa-usability-master.mdc`, série `docs/PAYMENTS/` (auditorias técnicas 01–07 já concluídas)

---

## 1. Resumo executivo

O Módulo 10 passou por **ciclos técnicos extensos** em `docs/PAYMENTS/` (webhooks, multi-tenant, segurança, ciclo de vida, frontend billing, banco, observabilidade). Muitos achados históricos foram corrigidos (`past_due` CTA, cache sync por igreja, polling com backoff, `formatApiError` em `PaymentManagement`, etc.).

Esta auditoria foca na **experiência real do administrador** e em **bugs silenciosos** ainda presentes no código atual — inconsistências que não quebram a tela, mas geram comportamento incorreto, mensagens enganosas ou estados stale.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 4 | 01, 02, 03, 04 |
| Média | 8 | 05, 06, 07, 08, 09, 10, 11, 12 |
| Baixa | 5 | 13, 14, 15, 16, 17 |

### Riscos centrais

- retorno do **portal Stripe para rota inexistente** (`/settings/subscription` → 404);
- **checkout e success** não usam `formatApiError` — detalhes acionáveis da API são perdidos;
- **troca de plano** pode retornar sucesso com banco desatualizado;
- **downgrade para gratuito** sem validar contagem de membros;
- **reader/editor** vê checkout completo mas recebe 403 opaco;
- **auto-sync** grava cache mesmo quando sync não atualizou dados.

**Parecer:** módulo **não recomendado para fechamento de QA de usabilidade** sem correção dos 4 achados de alta prioridade. Achados médios impactam confiança e operação diária; baixos são polish.

---

## 2. Mapa do fluxo analisado

### Fluxo A — Onboarding / contratação

1. Usuário autenticado → `/checkout` (`checkout/page.tsx`)
2. `GET /api/plans` → seleção de plano
3. Plano 100: `POST /api/stripe/activate-free-plan` → `refreshChurch` → `/`
4. Plano pago: `POST /api/stripe/create-checkout-session` → redirect Stripe
5. Stripe success → `/subscription/success?session_id=…` → polling `GET /api/stripe/checkout-status`
6. Webhook `checkout.session.completed` confirma no banco

### Fluxo B — Gestão contínua (Settings)

1. Admin/owner → `/settings?tab=payment` → `PaymentManagement.tsx`
2. Auto-sync ao montar: `POST /api/stripe/sync-subscription`
3. Portal: `POST /api/stripe/create-portal-session` → nova aba Stripe
4. Troca de plano: modal → `POST /api/stripe/change-plan` ou `activate-free-plan`
5. Histórico: `GET /api/stripe/subscription-events`

### Fluxo C — Cancelamento no checkout

1. Stripe cancel → `/subscription/cancel` → retry via `resolveCheckoutPath()`

### Fluxo D — Limites de membros (dependência M03)

1. `checkMemberLimit()` no BE → `GET /api/church/member-limit`
2. UI: `Header.tsx`, `members/page.tsx` — bloqueio e mensagens

### Arquivos auditados

**Frontend:**  
`frontend/src/app/(auth)/checkout/page.tsx`  
`frontend/src/app/subscription/success/page.tsx`  
`frontend/src/app/subscription/cancel/page.tsx`  
`frontend/src/app/(main)/settings/page.tsx`  
`frontend/src/components/settings/PaymentManagement.tsx`  
`frontend/src/components/settings/AccountManagement.tsx`  
`frontend/src/components/main/Header.tsx`  
`frontend/src/app/(main)/members/page.tsx`  
`frontend/src/services/api.ts`  
`frontend/src/utils/planFunnel.ts`  
`frontend/src/utils/stripeSyncCache.ts`

**Backend:**  
`backend/src/controllers/stripeController.ts`  
`backend/src/controllers/plansController.ts`  
`backend/src/routes/stripe.ts`  
`backend/src/middlewares/stripeSecurity.ts`  
`backend/src/utils/planLimits.ts`  
`backend/src/config/plans.ts`

---

## 3. Achados

### ACHADO 01 — Checkout e success não usam `formatApiError` (detalhes da API perdidos)
- **Gravidade:** alta  
- **Tipo:** bug silencioso / contrato API  
- **Impacto no usuário:** erros com `details` acionáveis (plano inválido, permissão, limite de downgrade, config Stripe) aparecem **sem contexto** ou só com título curto. Admin não sabe o que fazer.
- **Onde ocorre:** submit checkout; timeout/erro final do polling em success  
- **Arquivos relacionados:**  
  `frontend/src/app/(auth)/checkout/page.tsx` (L101–113) — parse legacy `err.response.data`  
  `frontend/src/app/subscription/success/page.tsx` (L80–86) — idem  
  `frontend/src/services/api.ts` (L143–153) — interceptor produz `Error` enriquecido **sem** `.response`  
  Contraste: `PaymentManagement.tsx` (L397) usa `formatApiError` corretamente
- **Evidência:** interceptor rejeita `enhancedError` com `.message` e `.details`; catch do checkout só lê shape axios obsoleto. Para 403, `message` chega; para 400/500 com `details`, **detalhes são descartados**.
- **Como reproduzir:** reader tenta checkout pago → 403 com `details: 'Apenas administradores…'` → UI mostra só “Permissão insuficiente” (sem detalhe). Ou: erro 500 de price ID → mensagem genérica.
- **Causa provável:** refactor para `apiService` sem atualizar catches das páginas de funil.
- **Ajuste recomendado (DEV):**
  1. Importar `formatApiError` em `checkout/page.tsx` e `success/page.tsx`.
  2. Substituir blocos catch por `setError(formatApiError(err))`.
  3. Remover parse manual de `err.response`.

---

### ACHADO 02 — Portal Stripe retorna para rota inexistente (404)
- **Gravidade:** alta  
- **Tipo:** bug / UX  
- **Impacto no usuário:** após gerenciar cartão/cancelamento no portal Stripe, o admin cai em **página 404** (`/settings/subscription`). Perde contexto, não volta à aba Plano, pode achar que a operação falhou.
- **Onde ocorre:** pós-`create-portal-session`  
- **Arquivos relacionados:**  
  `backend/src/controllers/stripeController.ts` (L225): `returnUrl = …/settings/subscription`  
  Frontend: **não existe** rota `settings/subscription` (apenas `settings/page.tsx` com `?tab=payment`)  
  `frontend/src/app/(main)/settings/page.tsx` — aba correta é `payment`
- **Evidência:** grep no frontend retorna zero ocorrências de `settings/subscription`.
- **Como reproduzir:** Configurações → Plano → “Gerenciar Assinatura” → concluir ação no portal → browser redireciona para 404.
- **Causa provável:** URL legada não alinhada ao routing atual (query `tab=payment`).
- **Ajuste recomendado (DEV):**
  1. Alterar `returnUrl` para `${frontendUrl}/settings?tab=payment`.
  2. (Opcional) redirect server-side ou página `/settings/subscription` → redirect 302 para `?tab=payment` por compatibilidade.

---

### ACHADO 03 — `change-plan` ignora falha de update no banco
- **Gravidade:** alta  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** Stripe já cobrou/trocou plano, mas UI e limites de membros ficam no plano antigo até webhook ou sync manual. Admin vê toast de sucesso enganoso.
- **Onde ocorre:** `POST /api/stripe/change-plan`  
- **Arquivos relacionados:** `backend/src/controllers/stripeController.ts` (L550–565)
- **Evidência:**
```550:565:backend/src/controllers/stripeController.ts
    await supabase
      .from('churches')
      .update({ plan_type: planType, subscription_status: updatedSubscription.status, ... })
      .eq('id', church.id);
    // sem verificar error do update — resposta 200 segue normalmente
```
- **Como reproduzir:** simular falha DB (timeout Supabase) após `updateSubscription` no Stripe → API retorna 200 + email; `GET /church` ainda mostra plano anterior.
- **Causa provável:** confiança excessiva no webhook compensar; update “fire-and-forget”.
- **Ajuste recomendado (DEV):**
  1. Capturar `{ error }` do update.
  2. Se falhar: log + retornar 500 com mensagem “Plano alterado no Stripe; sincronize manualmente” **ou** retry 1×.
  3. Frontend: após sucesso, chamar `syncSubscription()` como fallback.

---

### ACHADO 04 — `activate-free-plan` não valida limite de 100 membros
- **Gravidade:** alta  
- **Tipo:** validação ausente  
- **Impacto no usuário:** igreja com 150+ membros ativos consegue downgrade para plano gratuito (100). Membros existentes permanecem, mas **novos cadastros bloqueados** sem aviso prévio claro; estado inconsistente com regra de negócio.
- **Onde ocorre:** checkout plano 100 e modal “Ativar Plano Gratuito” em Settings  
- **Arquivos relacionados:**  
  `backend/src/controllers/stripeController.ts` (L818–914) — sem `checkMemberLimit`  
  Contraste: `change-plan` valida downgrade (L507–531)
- **Como reproduzir:** igreja plano 200 com 150 membros → Settings → trocar para plano 100 → sucesso; limite efetivo 100 com overage silencioso.
- **Causa provável:** `activate-free-plan` tratado como idempotência simples, não como downgrade.
- **Ajuste recomendado (DEV):**
  1. Antes do downgrade, chamar `checkMemberLimit(churchId, 0)` comparando `currentCount` com limite 100.
  2. Retornar 400 com mesmo shape de `change-plan` (`membersToRemove`, etc.).
  3. Frontend: exibir contagem no modal de confirmação do plano gratuito.

---

### ACHADO 05 — `refreshChurch()` falha após pagamento confirmado → erro falso no polling
- **Gravidade:** média  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** pagamento **confirmado** (`confirmed: true`), mas falha ao atualizar contexto (rede/401 transitório) faz cair no `catch` do polling → tela “Verificação Pendente” / erro vermelho. Usuário acha que pagamento não funcionou.
- **Onde ocorre:** `/subscription/success` após polling positivo  
- **Arquivos relacionados:** `frontend/src/app/subscription/success/page.tsx` (L56–61, L73–87)
- **Evidência:** `await refreshChurch()` está dentro do mesmo `try` que chama `getCheckoutStatus`; exceção de refresh incrementa `attempts` e pode esgotar retries.
- **Como reproduzir:** mock `refreshChurch` rejeitando após `confirmed: true`.
- **Ajuste recomendado (DEV):** separar try/catch — em `confirmed: true`, setar sucesso **antes** de refresh; tratar falha de refresh com aviso não bloqueante (“Plano ativado; recarregue a página se os dados não atualizarem”).

---

### ACHADO 06 — Login na success page perde `session_id`
- **Gravidade:** média  
- **Tipo:** autenticação / UX  
- **Impacto no usuário:** sessão expira durante checkout Stripe → success page redireciona para `/login` **sem** preservar `session_id` (L115–117). Após login, polling não reexecuta; usuário fica sem confirmação automática.
- **Arquivos relacionados:** `frontend/src/app/subscription/success/page.tsx` (L115–117)  
  Contraste: checkout preserva redirect (L67–68)
- **Ajuste recomendado (DEV):** `router.push('/login?redirect=' + encodeURIComponent('/subscription/success?session_id=' + sessionId))`.

---

### ACHADO 07 — Checkout sem RBAC no frontend (reader/editor)
- **Gravidade:** média  
- **Tipo:** UX / autenticação  
- **Impacto no usuário:** reader vê grid de planos e botão “Continuar para Pagamento”; ao clicar, API retorna 403. Experiência de “sistema quebrado” sem explicação de papel.
- **Arquivos relacionados:**  
  `frontend/src/app/(auth)/checkout/page.tsx` — sem checagem de `currentRole`  
  `backend/src/middlewares/stripeSecurity.ts` (L69–74) — bloqueia no BE  
  Contraste: `settings/page.tsx` oculta aba Plano para non-admin
- **Ajuste recomendado (DEV):** se `currentRole` não for admin/owner, exibir mensagem read-only + link para contatar admin; desabilitar submit. Reutilizar `READER_TOOLTIP` de outros módulos.

---

### ACHADO 08 — Auto-sync grava cache mesmo quando `synced: false`
- **Gravidade:** média  
- **Tipo:** estado inconsistente  
- **Impacto no usuário:** abre aba Plano → auto-sync retorna “nenhuma assinatura encontrada” (`synced: false`) → cache 5 min gravado (L207) → botão manual informa “Dados já sincronizados recentemente” (L280–282). Admin **preso** com dados stale.
- **Arquivos relacionados:** `frontend/src/components/settings/PaymentManagement.tsx` (L203–207 vs L294–317 — manual sync só cacheia em `synced: true` ou “nenhuma assinatura”)  
  `frontend/src/utils/stripeSyncCache.ts`
- **Ajuste recomendado (DEV):** em auto-sync, chamar `setCachedStripeSync` **somente** se `response.synced === true` (alinhar com sync manual).

---

### ACHADO 09 — `hasSubscription` ignora `stripe_customer_id` sem subscription_id
- **Gravidade:** média  
- **Tipo:** UX / estado inconsistente  
- **Impacto no usuário:** igreja com customer Stripe mas subscription ainda processando (ou cancelada no Stripe) vê bloco **“Nenhuma Assinatura Ativa”** (L745–755) em vez do painel completo com sync/portal — mesmo tendo `stripe_customer_id` e botão sync secundário.
- **Arquivos relacionados:** `PaymentManagement.tsx` (L145: `hasSubscription = !!stripe_subscription_id`)
- **Ajuste recomendado (DEV):** `hasSubscription = !!(stripe_subscription_id || (stripe_customer_id && planType !== '100'))` ou estados explícitos: `active`, `pending_sync`, `free`.

---

### ACHADO 10 — Mensagem de limite no plano gratuito diz “Ative sua assinatura”
- **Gravidade:** média  
- **Tipo:** UX / copy  
- **Impacto no usuário:** igreja no plano 100 (`subscription_status: 'canceled'` após activate-free) atinge 100 membros → mensagem sugere “Ative sua assinatura” em vez de “Faça upgrade para um plano pago”.
- **Arquivos relacionados:** `backend/src/utils/planLimits.ts` (L190–191) — `hasActiveSubscription` false para free tier cancelado
- **Ajuste recomendado (DEV):** ramo específico: se `planType === '100'`, mensagem “Faça upgrade do plano gratuito para adicionar mais membros”.

---

### ACHADO 11 — Modal de confirmação exibe “/mês” no plano gratuito
- **Gravidade:** média  
- **Tipo:** UX / inconsistência visual  
- **Impacto no usuário:** ao confirmar downgrade para plano 100, cards mostram preço com sufixo “/mês” (L1012, L1033) — confuso para plano gratuito.
- **Arquivos relacionados:** `PaymentManagement.tsx` (L1011–1013, L1032–1034)
- **Ajuste recomendado (DEV):** condicionar sufixo: `{planType !== '100' && … /mês}`.

---

### ACHADO 12 — Polling ignora `message` de sessão inválida / igreja errada
- **Gravidade:** média  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** `checkout-status` retorna 200 com `confirmed: false` e `message: 'Sessão não pertence à igreja ativa'` (L736–740) — frontend só verifica `confirmed`, continua polling até timeout (~2 min), depois mensagem genérica de “verificação pendente”.
- **Arquivos relacionados:**  
  `backend/src/controllers/stripeController.ts` (L736–740)  
  `frontend/src/app/subscription/success/page.tsx` (L54–72)  
  `frontend/src/services/api.ts` — tipo `{ confirmed: boolean }` omite `message`
- **Ajuste recomendado (DEV):** se `data.message` presente e não é “aguardando processamento”, exibir erro imediato; tipar resposta completa; considerar 403 para mismatch de igreja.

---

### ACHADO 13 — Botão checkout travado se usuário volta do Stripe
- **Gravidade:** baixa  
- **Tipo:** UX / estado  
- **Impacto no usuário:** após `window.location.href = url` (L100), `isLoading=true` e `checkoutInFlightRef=true` permanecem. Se redirect falhar ou usuário usar “voltar” do browser, botão fica desabilitado até reload.
- **Arquivos relacionados:** `checkout/page.tsx` (L100 vs L117)
- **Ajuste recomendado (DEV):** `pagehide`/`visibilitychange` listener para resetar ref; ou não setar loading antes do redirect.

---

### ACHADO 14 — Header engole erro de `getMemberLimit`
- **Gravidade:** baixa  
- **Tipo:** erro engolido  
- **Impacto no usuário:** falha na API de limite remove alertas 80%/90%/100% do header **sem feedback** — admin não sabe que está perto do limite.
- **Arquivos relacionados:** `frontend/src/components/main/Header.tsx` (L34–37)
- **Ajuste recomendado (DEV):** log telemetry; tooltip discreto ou retry; não toast agressivo.

---

### ACHADO 15 — Ícone incorreto no botão sync (estado sem assinatura)
- **Gravidade:** baixa  
- **Tipo:** UX / inconsistência visual  
- **Impacto no usuário:** botão “Sincronizar Assinatura” usa ícone `Loader` estático (L773) em vez de `RefreshCw` — parece loading permanente.
- **Arquivos relacionados:** `PaymentManagement.tsx` (L773 vs L724 no bloco com subscription)
- **Ajuste recomendado (DEV):** trocar para `RefreshCw`.

---

### ACHADO 16 — Downgrade bloqueado não exibe `membersToRemove` na UI
- **Gravidade:** baixa  
- **Tipo:** UX  
- **Impacto no usuário:** API retorna `membersToRemove`, `currentCount`, `newLimit` no 400; `formatApiError` só concatena `error` + `details` string — admin não vê **quantos membros remover**.
- **Arquivos relacionados:** `stripeController.ts` (L507–531), `PaymentManagement.tsx` (L397)
- **Ajuste recomendado (DEV):** parse campos extras no catch de `changePlan`; exibir card “Remova X membros antes do downgrade”.

---

### ACHADO 17 — Checkout pago sem guard contra assinatura já ativa
- **Gravidade:** baixa  
- **Tipo:** risco / edge case  
- **Impacto no usuário:** admin com assinatura ativa pode iniciar novo checkout → possível duplicidade de subscription no Stripe (depende do Stripe Customer).
- **Arquivos relacionados:** `stripeController.ts` `createCheckout` (L37–188)
- **Ajuste recomendado (DEV):** se `stripe_subscription_id` + status active, retornar 409 sugerindo portal ou change-plan.

---

## 4. Cenários extras a testar

### Funil checkout
- [ ] Admin completa checkout pago → success confirma em < 30s → plano refletido no Header
- [ ] Reader acessa `/checkout` → mensagem de permissão (após fix ACHADO 07)
- [ ] Sessão expira na success page → login → retoma polling com mesmo `session_id`
- [ ] Webhook atrasado 3+ min → timeout → sync manual funciona
- [ ] Voltar do Stripe (browser back) → botão checkout clicável

### Settings / Plano
- [ ] Portal Stripe → retorno cai em `/settings?tab=payment` (não 404)
- [ ] Auto-sync falha → banner amber → “Sincronizar agora” funciona
- [ ] Auto-sync `synced: false` → cache **não** bloqueia retry manual
- [ ] Downgrade 200→100 com >100 membros → bloqueio com contagem
- [ ] `past_due` → CTA portal + bloqueio novo membro

### Limites (M03)
- [ ] Plano 100 no limite → mensagem sugere upgrade (não “ative assinatura”)
- [ ] Header com 90% limite → alerta visível; simular falha API → comportamento documentado

### Concorrência / improvável
- [ ] Duplo clique “Confirmar Troca” no modal de plano
- [ ] Duas abas: troca plano + sync simultâneo
- [ ] Multi-igreja: checkout-status com igreja B ativa e session da igreja A

---

## 5. Lacunas de cobertura

| Área | Lacuna |
|------|--------|
| Testes E2E | Nenhum teste automatizado checkout → webhook → success polling |
| Contratos TS | `getCheckoutStatus` e `createCheckoutSession` subtipados; campos `message`, `membersToRemove` não consumidos |
| Observabilidade UX | Falhas de `getMemberLimit` no Header sem métrica |
| Paridade erro | `formatApiError` não padronizado em checkout/success (ACHADO 01) |
| Produto | Preços landing vs `plans.ts` (R$ 29 vs R$ 29,99) — documentado em levantamento, fora do escopo desta rodada |

### Relação com auditorias PAYMENTS

Itens **já tratados** (não reabrir como achados desta rodada): FB01–FB10, FB12–FB14, FB17; webhooks idempotência; RBAC backend; cache sync por igreja; `past_due` CTA.  
Itens **parciais/aceitos** em backlog: FB11/SL12 (polling `past_due`), FB15 (`trialing`/`unpaid`), FB16/FB18 — ver `docs/PAYMENTS/09-pendencias-futuras.md`.

---

## 6. Parecer final e backlog DEV

### Decisão

| Status | Itens |
|--------|-------|
| **Bloqueia fechamento QA** | ACHADOS 01–04 |
| **Recomendado antes de release** | ACHADOS 05–12 |
| **Backlog / polish** | ACHADOS 13–17 |

### Checklist objetivo para desenvolvimento

| Prioridade | ID | Ação |
|---|---|---|
| P0 | 02 | Corrigir `returnUrl` portal → `/settings?tab=payment` |
| P0 | 01 | `formatApiError` em checkout + success |
| P0 | 03 | Verificar erro do update DB em `change-plan` |
| P0 | 04 | Validar contagem membros em `activate-free-plan` |
| P1 | 05 | Isolar `refreshChurch` do try do polling |
| P1 | 06 | Preservar `session_id` no redirect de login |
| P1 | 07 | RBAC visual no checkout |
| P1 | 08 | Cache auto-sync só quando `synced: true` |
| P1 | 09 | Refinar `hasSubscription` / estados intermediários |
| P1 | 10 | Copy limite plano gratuito em `planLimits.ts` |
| P1 | 11 | Remover “/mês” do plano 100 no modal |
| P1 | 12 | Tratar `message` do checkout-status no polling |
| P2 | 13–17 | Ver tabela de achados |

**Módulo 10 — usabilidade: reprovado neste ciclo** (4 altas em aberto). Após P0+P1, recomenda-se smoke do `docs/PAYMENTS/10-checklist-testes-billing.md` e nova revalidação.
