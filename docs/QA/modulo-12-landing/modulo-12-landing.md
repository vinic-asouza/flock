# QA — Módulo 12: Landing / Aquisição

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria inicial (fluxo ponta a ponta FE/BE)  
> **Escopo:** Home `/`, `/waitlist`, CTAs de pricing, waitlist, redirecionamentos para frontend, `POST /api/waitlist`  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 12, L964–1024), `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O Módulo 12 cobre a superfície pública de aquisição: landing com hero, demo, pricing e formulário de contato (waitlist), além da rota dedicada `/waitlist`. O **caminho feliz** para visitante anônimo funciona na maior parte — navegação por âncoras, envio do waitlist com validação Zod/Joi e toast de sucesso/erro. Porém a auditoria encontrou **quebras silenciosas de conversão** (plano escolhido no pricing não sobrevive ao registro/checkout), **divergência de preços** entre marketing e Stripe, **assets críticos ausentes** (screenshots do demo, OG image) e **inconsistências de copy** que contradizem o produto já disponível para registro direto.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 4 | 01, 02, 03, 04 |
| Média | 7 | 05, 06, 07, 08, 09, 10, 11 |
| Baixa | 5 | 12, 13, 14, 15, 16 |

### Riscos centrais

- intenção de plano perdida entre pricing → registro → checkout;
- preços exibidos na landing não batem com cobrança real no Stripe;
- carrossel de demo e previews sociais (OG/schema) quebrados por assets inexistentes;
- formulário waitlist frágil quando IBGE falha ou deep link usa query string;
- copy de “lista de espera” desatualizada frente ao fluxo de registro ativo.

**Parecer:** módulo **não recomendado para fechamento de QA** sem correções de prioridade alta. O waitlist isolado é utilizável; o funil de assinatura paga tem falhas silenciosas de alto impacto comercial.

---

## 2. Mapa ponta a ponta validado

### Fluxo A — Aquisição via pricing (visitante anônimo)

1. Visitante acessa `/` (`landing/src/app/page.tsx`)  
2. Navega até `#pricing` (Hero, Header ou Footer)  
3. Clica **Assinar Agora** em um card → `CheckoutButton` com `plan` correto (`200`/`500`/`800`)  
4. `CheckoutButton` (`isAuthenticated` default `false`): `window.location.href = ${FRONTEND_URL}/register` **sem** `?plan=`  
5. Usuário preenche registro (`frontend/src/app/(auth)/register/page.tsx`)  
6. Após auto-login: `window.location.href = '/checkout'` **sem** plano  
7. Checkout pede seleção de plano novamente (`frontend/src/app/(auth)/checkout/page.tsx`)

**Saída esperada (levantamento):** conversão com plano pré-selecionado. **Comportamento real:** plano descartado em dois pontos.

### Fluxo B — Waitlist (home ou rota dedicada)

1. Entrada: `#waitlist` na home (`CTA.tsx`, `id="waitlist"`) ou `/waitlist`  
2. Opcional: deep link `#waitlist?plan=personalizado` (Pricing) pré-seleciona plano via hash  
3. `WaitlistForm`: Zod no FE; estados/cidades via API IBGE (`useIbgeData`)  
4. `POST /api/waitlist` (`waitlist.ts` → `waitlistController.subscribe`)  
5. Joi no BE; dedupe por email; insert Supabase; emails assíncronos (falha não bloqueia 201)  
6. UI: tela de sucesso inline + toast em erro

### Fluxo C — CTAs auxiliares

| CTA | Destino | Observação |
|-----|---------|------------|
| Acessar Painel (Header) | `${FRONTEND_URL}/login` | Desktop mesma aba; mobile `target="_blank"` |
| Assinar agora (Header) | `#pricing` | OK |
| Entre em contato (>800) | `#waitlist?plan=personalizado` | OK na home |
| Plano personalizado (Pricing) | hash + scroll programático | OK na home |

### Autenticação / sessão neste módulo

- Landing **não** lê cookies nem sessão do frontend.
- `CheckoutButton` expõe ramo autenticado (`stripeService.createCheckoutSession`) mas **nunca é acionado** (`isAuthenticated` sempre default `false`; grep confirma único uso).
- `stripe.ts` da landing chama checkout **sem** `withCredentials: true` — mesmo que `isAuthenticated` fosse `true`, sessão cross-origin provavelmente não seria enviada.
- **Conclusão:** expiração de sessão e credenciais inválidas **não se aplicam** aos fluxos ativos da landing; aplicam-se indiretamente após redirect para `/register`/`/login` (Módulos 1–2, fora do escopo deste relatório, mas impactam o funil pós-CTA).

### Arquivos auditados

**Landing:**  
`landing/src/app/page.tsx`  
`landing/src/app/waitlist/page.tsx`  
`landing/src/app/layout.tsx`  
`landing/src/app/sitemap.ts`  
`landing/src/components/Header.tsx`  
`landing/src/components/Hero.tsx`  
`landing/src/components/Pricing.tsx`  
`landing/src/components/CheckoutButton.tsx`  
`landing/src/components/CTA.tsx`  
`landing/src/components/WaitlistForm.tsx`  
`landing/src/components/DemoSection.tsx`  
`landing/src/components/Footer.tsx`  
`landing/src/services/waitlist.ts`  
`landing/src/services/stripe.ts`  
`landing/src/hooks/useIbgeData.ts`  
`landing/public/` (assets)

**Frontend (funil pós-CTA):**  
`frontend/src/app/(auth)/register/page.tsx`  
`frontend/src/app/(auth)/checkout/page.tsx`

**Backend:**  
`backend/src/routes/waitlist.ts`  
`backend/src/controllers/waitlistController.ts`  
`backend/src/validators/waitlistValidator.ts`  
`backend/src/config/plans.ts`  
`backend/src/app.ts` (CORS, rate limit geral)  
`backend/src/routes/stripe.ts` (contraste com fluxo morto na landing)

---

## 3. Achados

### ACHADO 01 — Plano escolhido no pricing se perde no funil registro → checkout
- **Gravidade:** alta  
- **Tipo:** bug silencioso / UX / conversão  
- **Impacto no usuário:** visitante clica “Assinar Agora” no Plano 500, preenche cadastro longo e chega ao checkout **sem** plano pré-selecionado. Sensação de que a escolha anterior foi ignorada; risco de abandono ou assinatura do plano errado.
- **Onde ocorre:** Pricing → CheckoutButton → Register → Checkout  
- **Arquivos relacionados:**  
  `landing/src/components/CheckoutButton.tsx` (L36–39)  
  `landing/src/components/Pricing.tsx` (L142–147)  
  `frontend/src/app/(auth)/register/page.tsx` (L220–221)  
  `frontend/src/app/(auth)/checkout/page.tsx` (L27, L67–69)
- **Evidência:**
```typescript
// CheckoutButton.tsx L37-38 — comentário admite omissão do plano
window.location.href = `${FRONTEND_URL}/register`;

// register/page.tsx L221 — checkout sem query param
window.location.href = '/checkout';
```
  Checkout **suporta** `?plan=` (`initialPlan = searchParams.get('plan')`), mas a landing nunca envia.
- **Como reproduzir:** home → Plano 500 → Assinar Agora → concluir registro → observar `/checkout` sem plano selecionado.
- **Causa provável:** decisão explícita de redirecionar só para `/register`; encadeamento incompleto no frontend principal.
- **Ajuste recomendado:**  
  1. `CheckoutButton`: `${FRONTEND_URL}/register?plan=${plan}` (persistir em `sessionStorage` como fallback).  
  2. `register/page.tsx`: após login, `window.location.href = '/checkout?plan=' + planFromQuery`.  
  3. Opcional: link “Já tenho conta” no card de pricing → `${FRONTEND_URL}/login?redirect=/checkout?plan=500`.

---

### ACHADO 02 — Preços da landing divergem do Stripe / backend
- **Gravidade:** alta  
- **Tipo:** inconsistência de negócio / UX  
- **Impacto no usuário:** vê R$ 29,00/mês na landing e R$ 29,99 no checkout/Stripe — quebra de confiança; suporte recebe reclamação de “preço diferente”.
- **Onde ocorre:** seção Pricing vs cobrança real  
- **Arquivos relacionados:**  
  `landing/src/components/Pricing.tsx` (L22–57: `R$ 29,00`, `59,00`, `89,00`)  
  `backend/src/config/plans.ts` (L24–39: `R$ 29,99`, `59,99`, `89,99`)
- **Evidência:** valores hardcoded na landing; fonte de verdade centralizada só no backend.
- **Como reproduzir:** comparar card Plano 200 na home com tela `/checkout` ou `GET /api/plans`.
- **Causa provável:** marketing manual desatualizado; preços anuais comentados mas mensais não sincronizados.
- **Ajuste recomendado:** buscar planos via `GET /api/plans` no build/SSR ou SSG da landing; ou compartilhar constante gerada a partir de `plans.ts`. Alinhar também textos “Valor Especial de Lançamento” com política comercial real.

---

### ACHADO 03 — Imagens do carrossel Demo ausentes em `public/`
- **Gravidade:** alta  
- **Tipo:** bug / layout  
- **Impacto no usuário:** seção “Veja o Flock em Ação” exibe placeholders quebrados ou área vazia — principal prova visual do produto falha silenciosamente.
- **Onde ocorre:** `#demo` na home  
- **Arquivos relacionados:**  
  `landing/src/components/DemoSection.tsx` (L19–49: paths `/demo/*.png`)  
  `landing/public/` (contém apenas `flock-logo.svg` e `robots.txt`)
- **Evidência:** seis imagens referenciadas; zero arquivos em `public/demo/`. Typo adicional: `fuctions.png` (L43).
- **Como reproduzir:** abrir home → scroll até Demonstração → inspecionar rede (404 em `/demo/painel.png`, etc.).
- **Causa provável:** assets não commitados ou path incorreto.
- **Ajuste recomendado:** adicionar imagens ao repositório ou CDN; corrigir typo `functions.png`; fallback visual (`onError`) com mensagem “Preview indisponível”.

---

### ACHADO 04 — OG image e screenshot do schema.org referenciados mas inexistentes
- **Gravidade:** alta  
- **Tipo:** SEO / compartilhamento social  
- **Impacto no usuário:** links compartilhados (WhatsApp, LinkedIn, Twitter) sem preview; rich results com screenshot inválido.
- **Onde ocorre:** metadata global e JSON-LD  
- **Arquivos relacionados:**  
  `landing/src/app/layout.tsx` (L55–56, L66, L112: `og-image.jpg`, `/demo/painel.png`)  
  `landing/public/` (sem `og-image.jpg`)
- **Evidência:** OpenGraph e Twitter cards apontam `${siteUrl}/og-image.jpg`; structured data usa screenshot inexistente.
- **Como reproduzir:** compartilhar URL no Facebook Debugger ou curl `-I` em `/og-image.jpg` → 404.
- **Causa provável:** asset de marketing não publicado.
- **Ajuste recomendado:** adicionar `public/og-image.jpg` (1200×630); atualizar `screenshot` no schema quando demo existir; validar com ferramentas OG.

---

### ACHADO 05 — Deep link `?plan=` ignorado na rota `/waitlist`
- **Gravidade:** média  
- **Tipo:** bug silencioso / UX  
- **Impacto no usuário:** campanha com URL `/waitlist?plan=500` não pré-seleciona plano; usuário precisa escolher manualmente (ou falha validação se não perceber).
- **Onde ocorre:** `/waitlist` dedicada  
- **Arquivos relacionados:** `landing/src/components/WaitlistForm.tsx` (L67–91)
- **Evidência:** parsing **somente** de `window.location.hash` (`hash.split('?')[1]`); query string da rota (`searchParams`) nunca lida. Funciona na home (`#waitlist?plan=personalizado`), falha em `/waitlist?plan=500`.
- **Como reproduzir:** abrir `/waitlist?plan=500` → plano não selecionado.
- **Causa provável:** implementação orientada a âncora na SPA da home.
- **Ajuste recomendado:** unificar leitura de `URLSearchParams` de `window.location.search` **e** hash; em `/waitlist/page.tsx`, passar `searchParams` como prop (App Router).

---

### ACHADO 06 — Falhas da API IBGE não são exibidas no formulário waitlist
- **Gravidade:** média  
- **Tipo:** bug silencioso / UX  
- **Impacto no usuário:** se IBGE estiver fora ou bloqueado, selects de estado/cidade ficam vazios após loading; usuário não sabe se é bug ou falta de dados — abandono do formulário.
- **Onde ocorre:** WaitlistForm (home e `/waitlist`)  
- **Arquivos relacionados:**  
  `landing/src/hooks/useIbgeData.ts` (L19–20, L47–49, L78–80: expõe `errorStates`/`errorCities`)  
  `landing/src/components/WaitlistForm.tsx` (L50: destructuring **sem** errors)
- **Evidência:** hook seta erros; formulário só mostra “Carregando estados...” e nunca mensagem de falha.
- **Como reproduzir:** bloquear `servicodados.ibge.gov.br` → abrir waitlist → selects vazios sem explicação.
- **Causa provável:** UI incompleta após implementação do hook.
- **Ajuste recomendado:** exibir alerta inline + fallback de estados estáticos (lista UF) quando `errorStates`; botão submit disabled com texto explicativo se estados indisponíveis.

---

### ACHADO 07 — Email waitlist sem normalização (duplicatas case-sensitive)
- **Gravidade:** média  
- **Tipo:** validação / contrato API  
- **Impacto no usuário:** `User@Igreja.com` e `user@igreja.com` geram dois cadastros; segundo usuário real pode achar que “não cadastrou” se tentar variação de maiúsculas.
- **Onde ocorre:** waitlist FE/BE  
- **Arquivos relacionados:**  
  `landing/src/components/WaitlistForm.tsx` (email sem `trim().toLowerCase()`)  
  `backend/src/controllers/waitlistController.ts` (L24: `.eq('email', email)` literal)  
  `backend/src/validators/waitlistValidator.ts` (email Joi sem normalização)
- **Evidência:** nenhuma camada normaliza email antes de comparar/inserir.
- **Como reproduzir:** POST com email já existente em outro case → 201 em vez de 400.
- **Causa provável:** dedupe ingênuo no Supabase.
- **Ajuste recomendado:** `email.trim().toLowerCase()` no BE (e FE antes do POST); considerar unique index case-insensitive no banco.

---

### ACHADO 08 — Erros de validação Joi exibidos de forma genérica no cliente
- **Gravidade:** média  
- **Tipo:** contrato API / UX  
- **Impacto no usuário:** bypass da validação Zod (DevTools) ou divergência futura FE/BE → toast “Dados inválidos” sem indicar campo; `details` (array de mensagens) não é formatado.
- **Onde ocorre:** `waitlist.ts` → toast  
- **Arquivos relacionados:**  
  `landing/src/services/waitlist.ts` (L26–30)  
  `backend/src/controllers/waitlistController.ts` (L12–15)
- **Evidência:**
```typescript
const message =
  error.response?.data?.error ||
  error.response?.data?.details ||  // array vira "[object Object]" ou string inútil
  'Erro ao cadastrar na lista de espera';
```
- **Como reproduzir:** POST manual com `city: "A"` (1 char) → 400; toast pouco acionável.
- **Causa provável:** tratamento de erro mínimo; prioriza `error` string sobre `details[]`.
- **Ajuste recomendado:** helper `formatWaitlistError`: se `details` for array, `join('; ')`; mapear códigos conhecidos (“Email já cadastrado”).

---

### ACHADO 09 — Copy e metadata de “lista de espera” desatualizadas
- **Gravidade:** média  
- **Tipo:** UX / clareza  
- **Impacto no usuário:** `/waitlist` promete “ser notificado quando estiver disponível”, mas o produto já permite registro direto e assinatura — mensagem contraditória gera dúvida se o Flock “ainda não lançou”.
- **Onde ocorre:** `/waitlist`  
- **Arquivos relacionados:**  
  `landing/src/app/waitlist/page.tsx` (L5–8, L17–22)  
  `landing/src/components/CTA.tsx` (copy de contato — OK)  
  `landing/src/app/layout.tsx` (schema `availability: PreOrder` — L103)
- **Evidência:** metadata e H1 falam em waitlist futura; levantamento confirma fluxo de registro ativo via pricing.
- **Como reproduzir:** abrir `/waitlist` e comparar com CTA “Assinar Agora” na mesma jornada.
- **Causa provável:** evolução do produto sem revisão de copy.
- **Ajuste recomendado:** renomear para “Solicitar contato” / “Fale conosco”; metadata alinhada; schema `InStock` ou `OnlineOnly` se aplicável.

---

### ACHADO 10 — Fluxo Stripe autenticado na landing é código morto e frágil
- **Gravidade:** média  
- **Tipo:** dívida técnica / risco  
- **Impacto no usuário:** hoje nenhum (ramo inacessível). Se alguém passar `isAuthenticated={true}` no futuro, checkout falhará por falta de cookies (`withCredentials`) ou 401 sem UX clara — usuário logado em outro domínio continua indo para `/register`.
- **Onde ocorre:** CheckoutButton ramo autenticado  
- **Arquivos relacionados:**  
  `landing/src/components/CheckoutButton.tsx` (L42–50)  
  `landing/src/services/stripe.ts` (L25–28: POST sem credentials)  
  `landing/src/components/Pricing.tsx` (nunca passa `isAuthenticated`)
- **Evidência:** grep `isAuthenticated` só encontra default em `CheckoutButton.tsx`.
- **Como reproduzir:** não aplicável em produção atual; code review confirma dead path.
- **Causa provável:** plano original de checkout direto abandonado em favor de `/register`.
- **Ajuste recomendado:** remover ramo morto **ou** implementar de ponta a ponta: detectar sessão (iframe/postMessage), `withCredentials`, redirect login com `?plan=`; documentar no levantamento.

---

### ACHADO 11 — Emails de confirmação waitlist podem falhar sem feedback ao usuário
- **Gravidade:** média  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** cadastro salvo (201 + tela de sucesso), mas email de confirmação não chega se SMTP falhar — usuário assume que “equipe entrará em contato” sem ter prova no inbox; suporte não correlaciona facilmente.
- **Onde ocorre:** pós-insert waitlist  
- **Arquivos relacionados:** `backend/src/controllers/waitlistController.ts` (L67–98)
- **Evidência:** `catch (emailError) { console.error(...) }` — fluxo HTTP sucesso independente de email.
- **Como reproduzir:** simular falha em `sendEmail` → API 201, UI sucesso, zero email.
- **Causa provável:** decisão de não bloquear cadastro por falha de email (razoável), mas sem observabilidade UX.
- **Ajuste recomendado:** manter 201, mas log estruturado + alerta admin; copy de sucesso não prometer email se serviço estiver degradado; fila retry assíncrona.

---

### ACHADO 12 — `/waitlist` ausente do sitemap
- **Gravidade:** baixa  
- **Tipo:** SEO  
- **Impacto no usuário:** página de contato dedicada menos indexável; campanhas com URL limpa perdem visibilidade orgânica.
- **Arquivos relacionados:** `landing/src/app/sitemap.ts` (L6–31: só `/` e âncoras)
- **Evidência:** levantamento já apontava risco; confirmado no código.
- **Ajuste recomendado:** adicionar `{ url: \`${baseUrl}/waitlist\`, priority: 0.7 }`.

---

### ACHADO 13 — JSON-LD com `aggregateRating` e `PreOrder` potencialmente enganosos
- **Gravidade:** baixa  
- **Tipo:** SEO / compliance  
- **Impacto no usuário:** rich snippets com nota 4.8 (50 avaliações) sem base verificável; `PreOrder` contradiz produto disponível — risco de penalização Google e expectativa falsa.
- **Arquivos relacionados:** `landing/src/app/layout.tsx` (L99–109)
- **Evidência:** ratings hardcoded; produto já tem registro/checkout.
- **Ajuste recomendado:** remover `aggregateRating` até haver reviews reais; corrigir `availability`; alinhar `offers.price` aos planos reais.

---

### ACHADO 14 — `CheckoutButton` pode ficar em loading eterno se redirect falhar
- **Gravidade:** baixa  
- **Tipo:** estado inconsistente  
- **Impacto no usuário:** popup blocker ou erro de URL → botão “Processando...” disabled permanentemente na mesma página.
- **Arquivos relacionados:** `landing/src/components/CheckoutButton.tsx` (L33–39: `return` sem `setIsLoading(false)`)
- **Evidência:** ramo não autenticado seta loading e redireciona; só o `catch` reseta loading.
- **Ajuste recomendado:** `finally { setIsLoading(false) }` após timeout curto, ou usar `router.push` com fallback.

---

### ACHADO 15 — Link “Acessar Painel” inconsistente entre desktop e mobile
- **Gravidade:** baixa  
- **Tipo:** UX  
- **Impacto no usuário:** desktop abre login na mesma aba; mobile abre nova aba (`target="_blank"`) — comportamento imprevisível ao retornar à landing.
- **Arquivos relacionados:** `landing/src/components/Header.tsx` (L73–77 vs L132–136)
- **Ajuste recomendado:** unificar (preferir mesma aba em ambos).

---

### ACHADO 16 — Plano gratuito (100) não comunicado na landing
- **Gravidade:** baixa  
- **Tipo:** UX / conversão  
- **Impacto no usuário:** igrejas pequenas não descobrem tier gratuito existente no backend; pricing só mostra planos pagos 200/500/800.
- **Arquivos relacionados:**  
  `landing/src/components/Pricing.tsx`  
  `backend/src/config/plans.ts` (plano `100` gratuito)
- **Ajuste recomendado:** card “Comece grátis” ou link para registro sem plano pago; alinhar com Módulo 10.

---

## 4. Cenários extras a testar

- Pricing: cada plano → registro → checkout — verificar se plano persiste após correção do ACHADO 01.  
- Usuário **já cadastrado** clica Assinar Agora — hoje vai para `/register` de novo; validar copy/redirect desejado (`/login?redirect=...`).  
- Waitlist: sucesso, email duplicado, email com maiúsculas, telefone 10 vs 11 dígitos, plano não selecionado.  
- Deep links: `#waitlist?plan=personalizado`, `/waitlist?plan=500`, `#waitlist?plan=invalid`.  
- IBGE offline / timeout — estados e cidades.  
- Duplo clique rápido em “Enviar Solicitação” e “Assinar Agora”.  
- Enter no formulário waitlist (submit nativo — OK).  
- Voltar do navegador após tela de sucesso waitlist — estado `isSubmitted` reseta ao remount.  
- `NEXT_PUBLIC_FRONTEND_URL` / `NEXT_PUBLIC_API_URL` ausentes em produção (fallback localhost).  
- CORS: POST waitlist de domínio landing autorizado vs origem não listada.  
- Rate limit geral (1000/15min) — spam massivo waitlist (sem limiter dedicado).  
- Compartilhamento social: OG/Twitter preview.  
- Demo carrossel: todas as slides com imagens 404.  
- Mobile: menu hamburger, scroll âncoras `#waitlist` com header sticky.

---

## 5. Lacunas de cobertura

- Testes E2E do funil landing → register → checkout com assert de `?plan=`.  
- Teste de contrato `POST /api/waitlist` (400 details array, 201, dedupe email).  
- Teste visual/regressão de assets em `public/` (demo, og-image).  
- Teste de resiliência IBGE mockado (timeout, 500).  
- Monitoramento/alertas quando `sendEmail` waitlist falha.  
- Limitador dedicado para `POST /api/waitlist` (ex.: 5 req/15min por IP) — hoje só limiter geral.  
- Sincronização automática de preços landing ↔ `plans.ts` (CI check).  
- Teste a11y básico: labels, foco em cards de plano waitlist, aria nos slides demo.

---

## 6. Checklist transversal (Módulo 12)

| Item | Status | Notas |
|------|--------|-------|
| Validação FE waitlist | OK | Zod alinhado em grande parte com Joi |
| Validação BE waitlist | OK | Joi `abortEarly: false` |
| Loading / disabled waitlist | OK | `disabled={isLoading}` no submit |
| Envio duplicado waitlist | Parcial | disabled ajuda; race no 1º frame possível |
| Tratamento sucesso waitlist | OK | Tela inline + reset |
| Tratamento erro waitlist | Parcial | ACHADO 08; rede sem mensagem específica |
| Integração API waitlist | OK | payload camelCase `churchName` ↔ BE |
| Sessão / credenciais inválidas | N/A na landing | Fluxos anônimos; pós-redirect = Módulo 1 |
| Redirecionamentos pricing | **Falha** | ACHADO 01 |
| Edge case IBGE | **Falha** | ACHADO 06 |
| Edge case deep link plan | **Falha** | ACHADO 05 |

---

## 7. O que desenvolvimento deve ajustar (priorizado)

### Prioridade alta

1. **ACHADO 01** — Propagar plano end-to-end: `CheckoutButton` → `/register?plan=` → `/checkout?plan=` (e `sessionStorage` como backup). Incluir CTA “Já tenho conta” nos cards de pricing apontando para login com redirect.  
2. **ACHADO 02** — Sincronizar preços da landing com `backend/src/config/plans.ts` (ideal: fetch `GET /api/plans` ou shared package). Revisar badge “Valor Especial de Lançamento”.  
3. **ACHADO 03** — Publicar assets `/demo/*.png` ou remover carrossel até existirem; corrigir `fuctions.png` → `functions.png`; fallback `onError` na imagem.  
4. **ACHADO 04** — Adicionar `public/og-image.jpg` e validar previews; atualizar `screenshot` no JSON-LD quando demo existir.

### Prioridade média

5. **ACHADO 05** — Ler `searchParams` em `/waitlist` + unificar parser de plano (hash e query).  
6. **ACHADO 06** — Surfacear `errorStates`/`errorCities` no `WaitlistForm`; fallback UF estático.  
7. **ACHADO 07** — Normalizar email (`trim().toLowerCase()`) no BE e FE; unique case-insensitive.  
8. **ACHADO 08** — `formatWaitlistError` com join de `details[]`.  
9. **ACHADO 09** — Revisar copy/metadata/schema: de “lista de espera futura” para “solicitar contato” com produto disponível.  
10. **ACHADO 10** — Remover dead code Stripe na landing **ou** implementar checkout autenticado completo (documentar decisão).  
11. **ACHADO 11** — Observabilidade de email waitlist; ajustar copy de sucesso; fila retry.

### Prioridade baixa

12. **ACHADO 12** — Incluir `/waitlist` no sitemap.  
13. **ACHADO 13** — Remover/corrigir `aggregateRating` e `PreOrder` no schema.org.  
14. **ACHADO 14** — `finally` no `CheckoutButton` para reset de loading.  
15. **ACHADO 15** — Unificar comportamento do link login desktop/mobile.  
16. **ACHADO 16** — Comunicar plano gratuito 100 na landing (se for estratégia de aquisição).

### Melhorias opcionais (fora dos IDs)

- Rate limit dedicado em `routes/waitlist.ts` (5–10 POST/15min/IP).  
- Remover props mortas `onOpenWaitlist` em `Hero`/`Header`/`Footer` ou usá-las.  
- CI: falhar build se referências a arquivos em `public/` não existirem.  
- Alinhar validação `city` FE (`min(1)`) com BE (`min(2)`) — hoje mitigado pelo select IBGE.

---

## 8. Parecer final

O Módulo 12 entrega uma landing navegável com waitlist funcional e integração BE consistente no **happy path**, mas **não está pronto para sign-off de QA** enquanto persistirem:

- perda silenciosa do plano no funil de assinatura (impacto direto em conversão e receita);  
- divergência de preços marketing vs cobrança;  
- demo e previews sociais quebrados por assets ausentes;  
- fragilidade do waitlist em falha IBGE e deep links alternativos.

Após o pacote de **prioridade alta** e smoke da seção 4, recomenda-se ciclo de revalidação focado em campanhas com UTM/`?plan=`, compartilhamento social e jornada “já sou cliente”.
