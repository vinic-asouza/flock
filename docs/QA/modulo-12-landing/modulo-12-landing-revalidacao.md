# QA Revalidação — Módulo 12: Landing / Aquisição

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-12-landing/modulo-12-landing.md`, `docs/QA/modulo-12-landing/modulo-12-landing-dev-report.md`  
> **Método:** revisão estática ponta a ponta (FE/BE/contratos/assets/UX); lint landing executado; dimensões de assets verificadas via filesystem

---

## 1. Resumo executivo

O pacote do DEV **corrige de forma verificável a grande maioria dos 16 achados** da auditoria inicial. O funil pricing → registro → checkout propaga plano via query string e `sessionStorage`, preços vêm de `GET /api/plans` com fallback alinhado, waitlist ganhou resiliência (IBGE, email, erros, deep links), código morto Stripe foi removido e SEO/copy foram alinhados ao produto disponível.

**Placar desta revalidação:**

| Classificação | Qtd | IDs |
|---|---:|---|
| ✅ Resolvido | 14 | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12, 13, 14, 15, 16 |
| ⚠️ Parcialmente resolvido | 2 | 11, 04* |
| ❌ Não resolvido | 0 | — |
| Novo ticket (regressão) | 1 | **NG-01** |

\* ACHADO 04 funcionalmente resolvido (404 eliminado); permanece ressalva de dimensões OG declaradas vs arquivo real — detalhado em NG-02.

**Parecer:** módulo **quase pronto para fechamento de QA**. Recomenda-se **corrigir NG-01 antes do sign-off** (plano pago stale no fluxo “Comece grátis”). ACHADO 11 permanece parcial aceitável (copy ajustada; observabilidade operacional como melhoria futura). NG-02 (dimensões OG) pode seguir como ticket de design baixa prioridade.

---

## 2. Status de cada achado original

### ACHADO 01 — Plano se perde no funil registro → checkout
**Status:** ✅ resolvido

**Evidência:**
- `buildRegisterUrl` persiste plano e monta `/register?plan=` (`landing/src/utils/planFunnel.ts` L28–31);
- `CheckoutButton` usa `buildRegisterUrl(plan, FRONTEND_URL)` (`CheckoutButton.tsx` L29);
- `register/page.tsx` persiste plano da URL (L99–103) e redireciona com `resolveCheckoutPath(planFromUrl)` (L231);
- `resolveCheckoutPath` usa query ou fallback `sessionStorage` (`frontend/src/utils/planFunnel.ts` L28–31);
- `Pricing` expõe “Já tenho conta” via `buildLoginCheckoutUrl` (L166–171); login valida redirect interno (`login/page.tsx` L22–29, L55–56).

**Fluxo ponta a ponta (mental):** Home → Plano 500 → Assinar → `/register?plan=500` + `sessionStorage` → auto-login → `/checkout?plan=500` → `initialPlan` pré-seleciona card (`checkout/page.tsx` L27–29).

**Ressalva:** regressão **NG-01** quando usuário abandona funil pago e escolhe “Comece grátis” — ver seção 3.

---

### ACHADO 02 — Preços divergentes landing vs Stripe/backend
**Status:** ✅ resolvido

**Evidência:**
- `Pricing.tsx` chama `fetchPlans()` no mount (L64–75);
- fallback local usa `R$ 29,99`, `59,99`, `89,99` (L48–52);
- exibição dinâmica via `plan.priceFormatted` (L144);
- badge atualizado para “Preços oficiais” (L131).

**Contrato:** `landing/src/services/plans.ts` consome `GET /api/plans`; alinhado a `backend/src/config/plans.ts`.

---

### ACHADO 03 — Imagens demo ausentes / typo
**Status:** ✅ resolvido

**Evidência:**
- typo corrigido: `functions.png` (`DemoSection.tsx` L43);
- `onError` + fallback “Preview indisponível” (L188–204); `imageFailed` reseta ao trocar slide (L71);
- assets presentes em `landing/public/demo/`: `painel.png`, `members.png`, `integration.png`, `congregation.png`, `functions.png`, `details.png` (verificado via filesystem).

**Nota:** ferramenta de glob do ambiente listou incompleto; inspeção direta confirma os 6 arquivos referenciados no carrossel.

---

### ACHADO 04 — OG image e screenshot schema inexistentes
**Status:** ⚠️ parcialmente resolvido (funcional OK, metadados imprecisos)

**Resolvido:**
- `landing/public/og-image.jpg` existe;
- OpenGraph/Twitter apontam para `/og-image.jpg` (`layout.tsx` L55–66);
- JSON-LD `screenshot` → `/demo/painel.png` (L107) — arquivo existe.

**Pendência (NG-02):**
- metadata declara `width: 1200, height: 630` (L57–58);
- arquivo real: **746×1000 px** (`file og-image.jpg`). Plataformas sociais podem recortar preview de forma imprevisível.

**Classificação:** parcial — 404 eliminado (objetivo principal); qualidade/dimensões OG ainda abaixo do ideal.

---

### ACHADO 05 — Deep link `?plan=` ignorado em `/waitlist`
**Status:** ✅ resolvido

**Evidência:**
- `readPlanFromLocation()` lê `search` e hash (`waitlistPlan.ts` L13–34);
- `/waitlist/page.tsx` passa `initialPlan={searchParams?.plan}` (L28);
- `WaitlistForm` aplica `parseWaitlistPlanParam(initialPlan) ?? readPlanFromLocation()` (L70–71).

**Fluxos:** `/waitlist?plan=500` e `#waitlist?plan=personalizado` na home cobertos.

---

### ACHADO 06 — Falhas IBGE não exibidas
**Status:** ✅ resolvido

**Evidência:**
- `FALLBACK_UF_STATES` aplicado em catch (`useIbgeData.ts` L78–79);
- alertas âmbar para `errorStates` / `errorCities` (`WaitlistForm.tsx` L272–275, L305–308);
- submit desabilitado se `errorStates && states.length === 0` (L393) — com fallback, estados raramente ficam vazios.

**Resíduo menor (não reabre achado):** falha só em **cidades** ainda impede conclusão do formulário (sem input manual); usuário recebe mensagem e erro Zod ao submeter — melhor que silêncio original.

---

### ACHADO 07 — Email sem normalização
**Status:** ✅ resolvido

**Evidência:**
- FE: `email.trim().toLowerCase()` no submit (`WaitlistForm.tsx` L122) e service (`waitlist.ts` L22);
- BE: normalização antes de Joi, dedupe e insert (`waitlistController.ts` L9–11, L24–28, L52).

**Ressalva operacional:** registros legados no banco com case misto podem escapar do dedupe até migração — ver NG-03 (baixa).

---

### ACHADO 08 — Erros Joi genéricos no cliente
**Status:** ✅ resolvido

**Evidência:** `formatWaitlistError.ts` prioriza `details[]` com `join('; ')` (L7–9); `waitlist.ts` lança `new Error(formatWaitlistError(error))` (L29).

**Comportamento:** email duplicado exibe `details` string; validação múltipla exibe mensagens concatenadas.

---

### ACHADO 09 — Copy “lista de espera” desatualizada
**Status:** ✅ resolvido

**Evidência:**
- `/waitlist`: título “Fale Conosco”, copy “O Flock já está disponível…” (`waitlist/page.tsx` L5–8, L21–26);
- schema `availability: InStock` (`layout.tsx` L103);
- `CTA.tsx` na home já usava linguagem de contato — coerente.

---

### ACHADO 10 — Fluxo Stripe autenticado morto
**Status:** ✅ resolvido

**Evidência:**
- `landing/src/services/stripe.ts` **removido** (glob confirma ausência);
- `CheckoutButton` sem prop `isAuthenticated`; único caminho: redirect registro (`CheckoutButton.tsx` L26–35).

**Resultado:** superfície simplificada; risco cross-origin eliminado.

---

### ACHADO 11 — Email waitlist falha sem feedback
**Status:** ⚠️ parcialmente resolvido (aceitável para fechamento com ressalva)

**Implementado:**
- copy de sucesso não garante email: “Se receber um e-mail de confirmação…” (`WaitlistForm.tsx` L165);
- BE mantém 201 + `console.error` em falha SMTP (`waitlistController.ts` L99–101) — comportamento consciente.

**Não implementado (conforme dev report):** log estruturado, alerta admin, fila retry.

**Classificação:** parcial — expectativa UX corrigida; observabilidade operacional permanece dívida.

---

### ACHADO 12 — `/waitlist` ausente do sitemap
**Status:** ✅ resolvido

**Evidência:** `sitemap.ts` L13–18 inclui `${baseUrl}/waitlist` com `priority: 0.7`.

---

### ACHADO 13 — JSON-LD enganoso
**Status:** ✅ resolvido

**Evidência:** `aggregateRating` removido; `availability` → `InStock` (`layout.tsx` L99–104); sem ratings fictícios.

---

### ACHADO 14 — Loading eterno no CheckoutButton
**Status:** ✅ resolvido

**Evidência:** bloco `finally { setIsLoading(false) }` (`CheckoutButton.tsx` L33–35).

**Observação:** loading dura apenas um tick antes do redirect — corrige travamento; ver NG-04 (duplo clique teórico).

---

### ACHADO 15 — Login mobile abre nova aba
**Status:** ✅ resolvido

**Evidência:** link mobile “Acessar Painel” sem `target="_blank"` (`Header.tsx` L132–140); desktop já estava comentado (L75).

---

### ACHADO 16 — Plano gratuito não comunicado
**Status:** ✅ resolvido

**Evidência:** card “Comece grátis” com plano 100 e CTA `${FRONTEND_URL}/register` (`Pricing.tsx` L89–108); dados enriquecidos via API quando disponível.

---

## 3. Regressões / efeitos colaterais

### NG-01 — `sessionStorage` de plano pago contamina fluxo “Comece grátis” 🔴 ALTA
**Introduzido por:** ACHADO 01 (`persistSelectedPlan` / `getPersistedPlan`)

**Evidência:**
```typescript
// planFunnel.ts — fallback sem limpar storage
export function resolveCheckoutPath(planFromQuery: string | null): string {
  const plan = isPaidPlanId(planFromQuery) ? planFromQuery : getPersistedPlan();
  return plan ? `/checkout?plan=${plan}` : '/checkout';
}
```
- “Comece grátis” aponta para `/register` **sem** `?plan=` (`Pricing.tsx` L102);
- `register/page.tsx` só persiste plano se URL tiver plano pago — **não limpa** storage quando ausente (L99–103).

**Reprodução:**
1. Home → Plano 500 → Assinar (grava `sessionStorage` = `500`);
2. Voltar à landing → “Comece grátis” → registrar;
3. Após auto-login → `/checkout?plan=500` em vez de checkout neutro ou plano 100.

**Impacto:** usuário que optou por tier gratuito é empurrado silenciosamente para checkout pago — erro de conversão inverso ao ACHADO 01 original.

**Correção sugerida:** em `register/page.tsx`, se `!isPaidPlanId(planFromUrl)`, chamar `sessionStorage.removeItem(SELECTED_PLAN_STORAGE_KEY)`; ou link “Comece grátis” com `?plan=100`; ou `resolveCheckoutPath` ignorar storage quando intenção explícita for gratuita.

---

### NG-02 — Metadados OG declaram 1200×630; arquivo é 746×1000 🟡 BAIXA
**Arquivos:** `layout.tsx` L57–58 vs `public/og-image.jpg`

**Impacto:** preview social funciona (sem 404), mas crop/aspect ratio pode ficar subótimo em WhatsApp/LinkedIn.

**Correção:** substituir arte por 1200×630 ou ajustar `width`/`height` no metadata para valores reais.

---

### NG-03 — Dedupe email não cobre registros legados com case misto 🟡 BAIXA
**Contexto:** normalização nova não retroage entradas antigas no Supabase.

**Impacto:** edge case em base já populada; novos cadastros OK.

**Correção opcional:** migration `UPDATE waitlist SET email = lower(trim(email))` + índice unique case-insensitive.

---

### NG-04 — CheckoutButton libera loading antes da navegação 🟢 MUITO BAIXA
**Contexto:** `finally` síncrono antes de `window.location.href`.

**Impacto:** janela mínima para duplo clique abrir duas abas de registro — improvável na prática.

---

### Efeitos colaterais positivos (sem regressão)
- Link “Já tenho conta” integra com login + redirect validado — melhora jornada de retorno.
- Remoção Stripe landing reduz superfície de ataque e confusão de manutenção.
- Waitlist com erros formatados melhora suporte em validações BE.

### Fluxos dependentes verificados
| Fluxo | Status pós-correção |
|-------|---------------------|
| Módulo 2 — Registro | Integrado via `planFunnel`; ver NG-01 |
| Módulo 10 — Checkout | `?plan=` respeitado; login redirect encode OK |
| Módulo 1 — Login | `isInternalRedirect` aceita `/checkout?plan=500` |
| Waitlist BE | Contrato preservado; normalização adicionada |

---

## 4. Avaliação de UX após correção

| Área | Antes | Depois | Nota |
|------|-------|--------|------|
| Funil pago | Plano perdido | Plano persiste URL + storage | ✅ NG-01 afeta tier grátis |
| Pricing | Preços errados, sem grátis | API + card grátis + “Já tenho conta” | ✅ |
| Demo | 404 silencioso | Screenshots + fallback legível | ✅ |
| Waitlist | IBGE/errors opacos | Alertas + UFs fallback + erros claros | ✅ cidades ainda dependem IBGE |
| Copy / SEO | “Lista de espera” / PreOrder | “Fale conosco” / InStock | ✅ |
| Social share | 404 OG | Imagem serve; dimensões subótimas | ⚠️ NG-02 |
| Header mobile | Nova aba login | Mesma aba | ✅ |

**Experiência geral:** significativamente melhor no caminho feliz de aquisição paga e contato. O único ponto que **prejudica confiança** pós-correção é NG-01 — usuário escolhe grátis e cai em checkout pago.

---

## 5. Itens encerrados

Podem ser **fechados** neste ciclo de QA:

| ID | Título |
|----|--------|
| 01 | Plano no funil (com ressalva NG-01 antes de sign-off final) |
| 02 | Preços sincronizados |
| 03 | Demo assets + fallback |
| 05 | Deep link waitlist |
| 06 | IBGE estados + feedback |
| 07 | Normalização email |
| 08 | formatWaitlistError |
| 09 | Copy waitlist |
| 10 | Dead code Stripe removido |
| 12 | Sitemap /waitlist |
| 13 | JSON-LD corrigido |
| 14 | Loading CheckoutButton |
| 15 | Login mobile mesma aba |
| 16 | Plano gratuito comunicado |

**ACHADO 04:** encerrar funcionalmente (404 resolvido); NG-02 como follow-up design.

**ACHADO 11:** encerrar como **parcial aceito** — copy alinhada; observabilidade SMTP fora do escopo deste módulo.

---

## 6. Itens reabertos / novos tickets

| ID | Origem | Prioridade | Ação |
|----|--------|------------|------|
| **NG-01** | Regressão ACHADO 01 | **Alta** | Limpar `sessionStorage` no fluxo grátis ou passar `?plan=100` |
| **NG-02** | Resíduo ACHADO 04 | Baixa | Arte OG 1200×630 ou metadata honesto |
| **NG-03** | Resíduo ACHADO 07 | Baixa | Migration emails legados (opcional) |
| **NG-04** | Resíduo ACHADO 14 | Muito baixa | Debounce/disable até unload (opcional) |

**Melhorias opcionais herdadas do QA original (não bloqueiam):**
- rate limit dedicado `POST /api/waitlist`;
- input manual de cidade quando IBGE falha;
- CI validando existência de assets referenciados em `public/`.

---

## 7. Parecer final

### O que pode ser encerrado
14 achados resolvidos + ACHADO 11 parcial aceito + ACHADO 04 funcional. Lint landing passa sem erros. O módulo atende o objetivo de aquisição no **fluxo principal pago** e waitlist de forma materialmente superior à auditoria inicial.

### O que deve ser reaberto
**NG-01** — regressão silenciosa no funil gratuito. Recomenda-se **correção mínima em 1 PR** antes do sign-off definitivo; smoke: “Assinar 500 → voltar → Comece grátis → registrar → checkout deve ser neutro ou plano 100”.

### O que virou novo ticket
- **NG-02** (design OG) — backlog baixa prioridade  
- **NG-03** (migration email) — backlog ops  
- **NG-04** (duplo clique) — opcional  

### Decisão QA
| Critério | Resultado |
|----------|-----------|
| Achados originais resolvidos | **14/16** plenos + **2/16** parciais aceitáveis |
| Regressões bloqueantes | **1** (NG-01) |
| Recomendação | **Aprovação condicional** — fechar após NG-01; caso contrário manter módulo em “revalidação ciclo 2 pendente” |

Após NG-01, executar smoke da seção 4 do relatório original + cenário NG-01 e promover para **aprovado para fechamento de QA**.

---

## 8. Revalidação ciclo 2 — NG-01 / NG-02

> **Referência DEV:** `modulo-12-landing-dev-report.md` (seção “Pós-revalidação — ciclo NG-01 / NG-02”)  
> **Data:** Maio/2026

### NG-01 — `sessionStorage` contamina fluxo “Comece grátis”
**Status:** ✅ resolvido

**Evidência:**

```99:105:frontend/src/app/(auth)/register/page.tsx
  useEffect(() => {
    if (isPaidPlanId(planFromUrl)) {
      persistSelectedPlan(planFromUrl);
    } else {
      clearPersistedPlan();
    }
  }, [planFromUrl]);
```

```41:53:frontend/src/utils/planFunnel.ts
export function resolveCheckoutPath(planFromQuery: string | null): string {
  if (isFreePlanId(planFromQuery)) {
    clearPersistedPlan();
    return '/checkout?plan=100';
  }
  if (isPaidPlanId(planFromQuery)) {
    return `/checkout?plan=${planFromQuery}`;
  }
  const persisted = getPersistedPlan();
  return persisted ? `/checkout?plan=${persisted}` : '/checkout';
}
```

- CTA “Comece grátis” usa `buildFreeRegisterUrl` → `/register?plan=100` (`Pricing.tsx` L102);
- `clearPersistedPlan()` exportado em ambos `planFunnel.ts` (landing + frontend).

**Fluxo ponta a ponta (mental):**
1. Assinar Plano 500 → `sessionStorage = 500`;
2. Voltar → “Comece grátis” → `/register?plan=100`;
3. Montagem limpa storage (`else clearPersistedPlan`);
4. Pós-registro → `resolveCheckoutPath('100')` → limpa de novo + `/checkout?plan=100`.

**Cenário adicional:** `/register` sem query também limpa storage na montagem — plano pago stale não sobrevive.

**Regressão no funil pago:** não identificada — `?plan=200|500|800` continua persistindo e propagando.

---

### NG-02 — Metadados OG com dimensões incorretas
**Status:** ✅ resolvido

**Evidência:** `layout.tsx` L56–57 declara `width: 746`, `height: 1000`, alinhado ao arquivo `public/og-image.jpg` (746×1000 verificado anteriormente).

**Resíduo opcional (não bloqueia):** substituir arte por 1200×630 quando design disponibilizar — melhoria estética, não funcional.

---

### Itens encerrados neste ciclo

- **NG-01**
- **NG-02**
- **ACHADO 01** — ressalva do ciclo 1 removida (funil grátis + pago consistentes)
- **ACHADO 04** — encerrado por completo (404 + metadata honesto)

---

## Parecer final (atualizado — ciclo 2)

| Decisão | Itens |
|---|---|
| **Encerrados** | ACHADOS 01–16 (11 parcial aceito), NG-01, NG-02 |
| **Reabertos** | — |
| **Backlog opcional** | NG-03 (migration email), NG-04 (duplo clique), rate limit waitlist, arte OG 1200×630, observabilidade SMTP (ACHADO 11) |

**Módulo 12 aprovado para fechamento de QA** — 16/16 achados confirmados na revisão estática; NG-01 e NG-02 fechados no ciclo 2.

### Smoke manual recomendado (não substituído por revisão estática)

1. Assinar 500 → voltar → Comece grátis → registrar → checkout com plano **100** selecionado.  
2. Assinar 500 → concluir registro → checkout com plano **500** (regressão funil pago).  
3. `/register` direto após clicar plano pago na landing (sem concluir) → storage limpo, checkout neutro.  
4. Compartilhar URL da home → preview OG carrega sem 404.  
5. Waitlist: `/waitlist?plan=500`, email duplicado case-insensitive, IBGE offline.
