# Relatório de Execução — Módulo 12: Landing / Aquisição

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-12-landing/modulo-12-landing.md`  
> **Status geral:** ✅ 15/16 achados implementados · ⚠️ 1 parcial (ACHADO 11)

---

## Resumo executivo

O pacote corrige o funil de conversão pricing → registro → checkout, sincroniza preços com a API, fortalece waitlist (IBGE, email, erros, deep links), remove código morto Stripe na landing e alinha SEO/copy com o produto já disponível.

Mudanças em **landing**, **frontend** (register) e **backend** (waitlist). Utilitários compartilhados de plano isolados em `planFunnel.ts` (landing + frontend).

---

## Achados e implementações

### ACHADO 01 — Plano se perde no funil registro → checkout ✅ RESOLVIDO

**Arquivos:**  
`landing/src/components/CheckoutButton.tsx`  
`landing/src/utils/planFunnel.ts`  
`frontend/src/utils/planFunnel.ts`  
`frontend/src/app/(auth)/register/page.tsx`

**Solução aplicada:**
- `CheckoutButton` redireciona para `${FRONTEND_URL}/register?plan=${plan}` e persiste plano em `sessionStorage`;
- `register/page.tsx` lê `searchParams`, chama `persistSelectedPlan` e, após auto-login, `resolveCheckoutPath(planFromUrl)` → `/checkout?plan=...`;
- `Pricing` expõe link “Já tenho conta” via `buildLoginCheckoutUrl`.

**Resultado:** intenção de plano sobrevive ao cadastro e chega pré-selecionada no checkout.

---

### ACHADO 02 — Preços divergentes landing vs Stripe/backend ✅ RESOLVIDO

**Arquivos:** `landing/src/components/Pricing.tsx`, `landing/src/services/plans.ts`

**Solução aplicada:**
- `fetchPlans()` consome `GET /api/plans` na montagem do componente;
- fallback local alinhado ao backend (`R$ 29,99`, `59,99`, `89,99`) se a API falhar.

**Resultado:** cards refletem fonte de verdade; marketing não contradiz checkout.

---

### ACHADO 03 — Imagens demo ausentes / typo ✅ RESOLVIDO

**Arquivos:** `landing/src/components/DemoSection.tsx`, `landing/public/demo/`

**Solução aplicada:**
- path corrigido para `functions.png`; arquivo renomeado de `fuctions.png` → `functions.png`;
- `onError` + estado `imageFailed` com fallback “Preview indisponível”;
- assets PNG já presentes em `public/demo/` (painel, members, etc.).

**Resultado:** carrossel carrega screenshots reais; falha pontual não deixa área quebrada.

---

### ACHADO 04 — OG image e screenshot schema inexistentes ✅ RESOLVIDO

**Arquivos:** `landing/src/app/layout.tsx`, `landing/public/og-image.jpg`

**Solução aplicada:**
- adicionado `public/og-image.jpg` (asset de marketing existente no repo);
- OpenGraph/Twitter apontam para `/og-image.jpg`;
- JSON-LD `screenshot` aponta para `/demo/painel.png`.

**Resultado:** compartilhamento social deixa de retornar 404.  
**Nota:** imagem OG atual é 746×1000 px — substituir por arte 1200×630 quando design disponibilizar.

---

### ACHADO 05 — Deep link `?plan=` ignorado em `/waitlist` ✅ RESOLVIDO

**Arquivos:** `landing/src/utils/waitlistPlan.ts`, `landing/src/components/WaitlistForm.tsx`, `landing/src/app/waitlist/page.tsx`

**Solução aplicada:**
- `readPlanFromLocation()` lê `window.location.search` **e** hash;
- `/waitlist` passa `initialPlan={searchParams?.plan}` ao formulário.

**Resultado:** `/waitlist?plan=500` e `#waitlist?plan=personalizado` pré-selecionam plano.

---

### ACHADO 06 — Falhas IBGE não exibidas ✅ RESOLVIDO

**Arquivos:** `landing/src/hooks/useIbgeData.ts`, `landing/src/components/WaitlistForm.tsx`

**Solução aplicada:**
- fallback estático de UFs quando API IBGE falha;
- alertas inline para `errorStates` / `errorCities`;
- submit desabilitado apenas se lista de estados ficar vazia após falha.

**Resultado:** usuário entende a degradação e ainda consegue enviar quando há fallback.

---

### ACHADO 07 — Email sem normalização ✅ RESOLVIDO

**Arquivos:** `landing/src/components/WaitlistForm.tsx`, `landing/src/services/waitlist.ts`, `backend/src/controllers/waitlistController.ts`

**Solução aplicada:**
- `trim().toLowerCase()` no FE (submit) e no BE (validação, dedupe, insert, emails).

**Resultado:** duplicatas por variação de maiúsculas eliminadas na camada de aplicação.

---

### ACHADO 08 — Erros Joi genéricos no cliente ✅ RESOLVIDO

**Arquivos:** `landing/src/utils/formatWaitlistError.ts`, `landing/src/services/waitlist.ts`

**Solução aplicada:**
- helper une `details[]` com `'; '` antes de cair no campo `error` genérico.

**Resultado:** toast acionável em validações BE (ex.: cidade inválida, email duplicado).

---

### ACHADO 09 — Copy “lista de espera” desatualizada ✅ RESOLVIDO

**Arquivos:** `landing/src/app/waitlist/page.tsx`, `landing/src/app/layout.tsx`

**Solução aplicada:**
- página renomeada para “Fale Conosco” / “Solicite contato”;
- metadata alinhada ao produto disponível;
- schema `availability` → `InStock` (ACHADO 13 relacionado).

**Resultado:** mensagem coerente com fluxo de registro/assinatura ativo.

---

### ACHADO 10 — Fluxo Stripe autenticado morto ✅ RESOLVIDO

**Arquivos:** `landing/src/components/CheckoutButton.tsx` (removido ramo autenticado), `landing/src/services/stripe.ts` (removido)

**Solução aplicada:**
- removido dead path `isAuthenticated` + serviço Stripe da landing;
- CTA único: redirect para registro com plano.

**Resultado:** superfície simplificada; sem risco de checkout cross-origin sem cookies.

---

### ACHADO 11 — Email waitlist falha sem feedback ⚠️ PARCIAL

**Arquivos:** `landing/src/components/WaitlistForm.tsx`, `backend/src/controllers/waitlistController.ts`

**Solução aplicada:**
- copy de sucesso ajustada: não promete email garantido (“Se receber um e-mail de confirmação…”);
- BE mantém 201 + `console.error` em falha SMTP (comportamento original preservado).

**Não implementado neste ciclo:** log estruturado, alerta admin, fila retry assíncrona.

**Resultado:** expectativa UX corrigida; observabilidade operacional permanece melhoria futura.

---

### ACHADO 12 — `/waitlist` ausente do sitemap ✅ RESOLVIDO

**Arquivo:** `landing/src/app/sitemap.ts`

**Solução aplicada:** entrada `${baseUrl}/waitlist` com `priority: 0.7`.

---

### ACHADO 13 — JSON-LD enganoso ✅ RESOLVIDO

**Arquivo:** `landing/src/app/layout.tsx`

**Solução aplicada:**
- removido `aggregateRating`;
- `availability` → `InStock`;
- `screenshot` aponta para demo real.

---

### ACHADO 14 — Loading eterno no CheckoutButton ✅ RESOLVIDO

**Arquivo:** `landing/src/components/CheckoutButton.tsx`

**Solução aplicada:** bloco `finally { setIsLoading(false) }` após redirect/erro.

---

### ACHADO 15 — Login mobile abre nova aba ✅ RESOLVIDO

**Arquivo:** `landing/src/components/Header.tsx`

**Solução aplicada:** removido `target="_blank"` do link “Acessar Painel” no menu mobile.

---

### ACHADO 16 — Plano gratuito não comunicado ✅ RESOLVIDO

**Arquivo:** `landing/src/components/Pricing.tsx`

**Solução aplicada:** card “Comece grátis” (plano 100) com CTA para registro sem plano pago.

---

## Arquivos novos

| Arquivo | Propósito |
|---------|-----------|
| `landing/src/utils/planFunnel.ts` | URLs e persistência de plano (landing) |
| `landing/src/utils/waitlistPlan.ts` | Parser de plano (hash + query) |
| `landing/src/utils/formatWaitlistError.ts` | Formatação de erros waitlist |
| `landing/src/services/plans.ts` | Cliente `GET /api/plans` |
| `frontend/src/utils/planFunnel.ts` | Persistência e checkout path (frontend) |
| `landing/public/og-image.jpg` | Preview social |

## Arquivos removidos

| Arquivo | Motivo |
|---------|--------|
| `landing/src/services/stripe.ts` | Código morto (ACHADO 10) |

---

## Validação

### Lint

```bash
cd landing && npm run lint   # ✔ sem warnings/erros
```

### Cenários manuais recomendados (seção 4 do QA)

1. Home → Plano 500 → Assinar → registro → checkout com plano 500 selecionado.  
2. `/waitlist?plan=500` → plano pré-preenchido.  
3. `#waitlist?plan=personalizado` na home → plano personalizado.  
4. Bloquear IBGE → mensagem âmbar + UFs fallback.  
5. POST waitlist email duplicado em case diferente → 400.  
6. Compartilhar URL → preview com `/og-image.jpg` (sem 404).  
7. Demo carrossel → imagens carregam; slide com 404 mostra “Preview indisponível”.  
8. Header mobile → login na mesma aba.  
9. Card “Comece grátis” → registro com `?plan=100` → checkout com plano gratuito selecionado.  
10. **NG-01:** Assinar 500 → voltar → Comece grátis → registrar → checkout **sem** plano 500.

---

## Riscos remanescentes

- **OG image:** arte ainda 746×1000 (metadata agora honesto); trocar por 1200×630 quando design disponibilizar.  
- **ACHADO 11:** falha SMTP ainda só em log de servidor.  
- **Email unique DB:** normalização na app; índice case-insensitive no Supabase é melhoria opcional (NG-03).  
- **Rate limit waitlist:** continua no limiter geral (melhoria opcional do QA).

---

## Parecer

Módulo 12 **pronto para revalidação QA** nos fluxos de aquisição, waitlist e SEO social. Único item parcial: observabilidade de email waitlist (ACHADO 11), com copy de sucesso já alinhada.

---

## Pós-revalidação — ciclo NG-01 / NG-02

Referência: `docs/QA/modulo-12-landing/modulo-12-landing-revalidacao.md`

### NG-01 — `sessionStorage` contamina fluxo “Comece grátis” ✅ RESOLVIDO

**Arquivos:**  
`frontend/src/utils/planFunnel.ts`  
`frontend/src/app/(auth)/register/page.tsx`  
`landing/src/utils/planFunnel.ts`  
`landing/src/components/Pricing.tsx`

**Ajuste aplicado:**
- `clearPersistedPlan()` remove plano pago stale do `sessionStorage`;
- `register/page.tsx`: sem plano pago na URL → limpa storage na montagem;
- `resolveCheckoutPath`: `?plan=100` limpa storage e vai para `/checkout?plan=100`;
- CTA “Comece grátis” usa `buildFreeRegisterUrl` → `/register?plan=100`.

**Resultado:** usuário que opta pelo tier gratuito não herda plano pago de sessão anterior.

### NG-02 — Metadados OG declaravam dimensões incorretas ✅ RESOLVIDO

**Arquivo:** `landing/src/app/layout.tsx`

**Ajuste aplicado:** `width: 746`, `height: 1000` alinhados ao arquivo real `og-image.jpg`.

**Resultado:** metadata honesto; follow-up de design (arte 1200×630) permanece opcional.

### Status atualizado

**16/16 achados** fechados ou parciais aceitos + **NG-01** e **NG-02** corrigidos. Módulo **apto para fechamento de QA** após smoke NG-01.
