# QA — Revalidação — Módulo 02: Onboarding e Registro de Igreja

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Revalidação pós-correção  
> **Base:** `modulo-02-onboarding-register.md` (14 achados) + `modulo-02-onboarding-register-dev-report.md`  
> **Resultado geral:** ✅ APROVADO COM RESSALVA — 14 achados resolvidos; 1 resíduo visual de baixa gravidade identificado; 1 comportamento pré-existente sem resolução documentada

---

## 1. Resumo Executivo

O DEV realizou correções em 6 arquivos cobrindo todos os 14 achados originais. A leitura direta do código confirma que todas as mudanças foram implementadas corretamente, inclusive as mais complexas (separação do try/catch de registro/login e remoção das variáveis globais de módulo).

A falha crítica que bloqueava o onboarding em produção (ACHADO 01) está **completamente resolvida**: o formulário agora exibe uma tela de sucesso clara com instrução de confirmação de e-mail após o cadastro, independentemente do resultado do auto-login.

Foram identificados **1 resíduo visual** introduzido pelas correções (card verde "Obrigado pela sua assinatura!" aparece no estado de erro da página de sucesso) e **1 comportamento pré-existente** não abordado (usuário não autenticado na `/subscription/success` não é redirecionado para login).

### Placar

| Classificação | Qtd | Achados |
|---------------|-----|---------|
| ✅ Resolvido | 14 | 01–14 todos |
| 🟡 Resíduo novo (baixa) | 1 | R01 — card verde em estado de erro |
| ⚠️ Pré-existente (baixa) | 1 | P01 — sem redirect para login em `/subscription/success` sem auth |

---

## 2. Status de Cada Achado Original

---

### ACHADO 01 — Auto-login Após Registro Falha Silenciosamente
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

O `onSubmit` foi reestruturado em dois blocos `try/catch` independentes. O fluxo agora é:

```typescript
// register/page.tsx — linhas 185-232 (verificado)
// Passo 1: registrar. Se falhar → mostra erro de registro e retorna.
try {
  await registerChurch(cleanData);
} catch (err) {
  setError(errorMessage);
  setIsSubmitting(false);
  return; // ← sai antes de setar registrationSuccess
}

// Passo 2: sucesso do registro → exibe tela de confirmação ANTES do login
setRegisteredEmail(cleanData.email);
setRegistrationSuccess(true);

// Passo 3: tenta auto-login. Falha por e-mail não confirmado → mantém success screen.
try {
  await login({ email: cleanData.email, password: cleanData.password });
  sessionStorage.setItem('redirectingToCheckout', 'true');
  window.location.href = '/checkout';
} catch (loginErr) {
  // Qualquer falha → usuário vê tela de "Verifique seu e-mail"
}
```

O `registrationSuccess` é setado **antes** do auto-login, garantindo que o usuário veja a orientação correta em qualquer cenário. ✓

---

### ACHADO 02 — Estado Global de Formulário e Erro Persiste
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

As três variáveis de módulo foram completamente removidas. Nenhuma referência a `globalRegisterError`, `globalRegisterErrorDetails` ou `globalFormData` permanece no arquivo.

```typescript
// register/page.tsx — linhas 79-80 (verificado)
const [error, setError] = useState<string | null>(null);
const [errorDetails, setErrorDetails] = useState<string | null>(null);
```

O JSX também foi corrigido — exibe apenas os estados locais:
```tsx
{error && (
  <div className="p-4 bg-red-50 ...">
    <p>{error}</p>
    {errorDetails && <p>{errorDetails}</p>}
  </div>
)}
```

Sem duplicação de estado, sem vazamento entre abas. ✓

---

### ACHADO 03 — Checkout sem Guard de `isLoading`
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// checkout/page.tsx — linhas 26, 60-72 (verificado)
const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();

useEffect(() => {
  if (isAuthLoading) return; // ← guard adicionado
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
}, [isAuthLoading, user, router, initialPlan, selectedPlan]);

// Guard de render:
if (isAuthLoading || isLoadingPlans) {
  return <Loader />;
}

if (!user) return null; // ← evita flash de conteúdo
```

Usuário autenticado não é mais redirecionado durante a inicialização do AuthContext. ✓

---

### ACHADO 04 — Checkout usa `axios` Direto sem Interceptor de 401
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

`axios` removido de `checkout/page.tsx` e `subscription/success/page.tsx`. Quatro novos métodos adicionados ao `apiService`:

```typescript
// api.ts — linhas 136-154 (verificado)
async getPlans(): Promise<{ plans: [...] }> {
  const response = await this.api.get('/plans');
  return response.data;
}
async activateFreePlan(): Promise<{ message: string; plan_type: string }> {
  const response = await this.api.post('/stripe/activate-free-plan', {});
  return response.data;
}
async createCheckoutSession(plan: string): Promise<{ url: string }> {
  const response = await this.api.post('/stripe/create-checkout-session', { plan });
  return response.data;
}
async getCheckoutStatus(sessionId: string): Promise<{ confirmed: boolean }> {
  const response = await this.api.get(`/stripe/checkout-status?session_id=${sessionId}`);
  return response.data;
}
```

Todas as chamadas agora passam pelo interceptor de 401 centralizado. ✓

---

### ACHADO 05 — "Pagamento Confirmado!" Simultâneo com Erro
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

Heading e ícone agora são condicionais ao estado de `error`:

```tsx
// subscription/success/page.tsx — linhas 99-124 (verificado)
{error ? (
  <>
    <Clock className="h-8 w-8 text-yellow-600" />
    <h1>Verificação Pendente</h1>
    <p>Seu pagamento foi recebido, mas a confirmação está demorando.</p>
  </>
) : (
  <>
    <CheckCircle2 className="h-8 w-8 text-green-600" />
    <h1>Pagamento Confirmado!</h1>
    <p>Sua assinatura foi ativada com sucesso</p>
  </>
)}
```

Não há mais contradição entre título e estado de erro. ✓

**Resíduo identificado (ver seção 3 — RESÍDUO 01):** O card verde "Obrigado pela sua assinatura!" permanece visível mesmo no estado de erro.

---

### ACHADO 06 — Polling sem Cleanup — Memory Leak
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// subscription/success/page.tsx — linhas 30-31, 76-79 (verificado)
let timeoutId: ReturnType<typeof setTimeout>;
let isMounted = true;

const checkSubscriptionStatus = async () => {
  if (!isMounted) return; // ← guard no topo
  // ...
  if (isMounted) {
    timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);
  }
};

return () => {
  isMounted = false;      // ← previne state updates após unmount
  clearTimeout(timeoutId); // ← cancela timeout pendente
};
```

Memory leak eliminado. `isMounted` previne state updates em componente desmontado. ✓

---

### ACHADO 07 — `sessionStorage.redirectingToCheckout` Persiste Após Falha
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO (via ACHADO 01)**

A flag `redirectingToCheckout` agora é setada **somente após** o auto-login bem-sucedido:

```typescript
// register/page.tsx — linhas 218-221 (verificado)
try {
  await login({ email: cleanData.email, password: cleanData.password });
  sessionStorage.setItem('redirectingToCheckout', 'true'); // ← APÓS login
  window.location.href = '/checkout';
} catch (loginErr) {
  // flag NÃO é setada em caso de falha ✓
}
```

Em qualquer cenário de falha de login (email não confirmado ou outro), a flag nunca é setada e o `AuthGuard` funciona normalmente. ✓

---

### ACHADO 08 — Formulário sem Estado de Sucesso Intermediário
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

Tela de confirmação implementada com clareza:

```tsx
// register/page.tsx — linhas 236-273 (verificado)
if (registrationSuccess) {
  return (
    <div className="space-y-6 text-center">
      <CheckCircle2 className="w-8 h-8 text-green-600" />
      <h1>Cadastro concluído!</h1>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
        <Mail className="w-5 h-5 text-blue-600" />
        <p className="text-sm font-medium text-blue-800">Confirme seu e-mail para continuar</p>
        <p>Enviamos um link de confirmação para <strong>{registeredEmail}</strong>.</p>
      </div>
      <p>Após confirmar o e-mail, acesse o sistema pelo login.</p>
      <Link href="/login">Ir para o Login</Link>
    </div>
  );
}
```

A tela exibe o e-mail do usuário explicitamente, instrução clara sobre onde clicar e o caminho para o login. Excelente UX para este estado. ✓

---

### ACHADO 09 — `activate-free-plan` Retorna 400 como Erro no Checkout
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// stripeController.ts — linhas 1506-1513 (verificado)
// ACHADO 09: retornar 200 quando plano já está ativo — comportamento idempotente.
if (church.plan_type === '100') {
  return res.json({
    message: 'Plano gratuito já está ativo',
    plan_type: '100',
  });
}
```

O endpoint agora é idempotente: retorna 200 em ambos os casos (ativação nova ou já ativo). O checkout prossegue para `refreshChurch()` e `router.push('/')` sem exibir erro. ✓

Nota: o endpoint `changePlan` mantém corretamente o 400 para "plano já ativo" — sem regressão. ✓

---

### ACHADO 10 — CNPJ sem Validação de Dígitos Verificadores no FE
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// register/page.tsx — linhas 12, 32-35 (verificado)
import { validateCNPJ } from '@/utils/validations';

cnpj: z.string()
  .length(14, 'CNPJ deve ter 14 dígitos')
  .regex(/^\d+$/, 'CNPJ deve conter apenas números')
  .refine(validateCNPJ, 'CNPJ inválido — verifique os dígitos'), // ← adicionado
```

CNPJ matematicamente inválido agora é rejeitado no frontend, antes de qualquer round-trip ao backend. ✓

---

### ACHADO 11 — URL de Redirect com Segundo `?` Não Encodado
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// checkout/page.tsx — linhas 68-70 (verificado)
const redirectPath = planToRedirect ? `/checkout?plan=${planToRedirect}` : '/checkout';
router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
// Resultado: /login?redirect=%2Fcheckout%3Fplan%3D200 ✓
```

URL agora está em conformidade com RFC 3986. ✓

---

### ACHADO 12 — Ordem dos Campos Fora do Padrão
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```tsx
// register/page.tsx — linhas 286-322 (verificado)
// Nova ordem: Email → Senha → Confirmar Senha → Telefone → [divisor] → dados da igreja
<Input label="Email" ... />
<Input label="Senha" ... />
<Input label="Confirmar Senha" ... />
<Input label="Telefone" ... />
<div>[divisor "Dados da Igreja"]</div>
```

Fluxo cognitivo corrigido. ✓

---

### ACHADO 13 — ID de Sessão Stripe Exposto ao Usuário
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

O bloco `{sessionId && (...)}` foi removido integralmente da `subscription/success/page.tsx`. O comentário residual confirma:

```tsx
{/* ACHADO 13: removido bloco com ID de sessão Stripe — informação técnica sem valor para o usuário */}
```

✓

---

### ACHADO 14 — `require()` Dinâmico no `plansController`
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// plansController.ts — linhas 1-3 (verificado)
// ACHADO 14: substituído require() dinâmico por import estático
import { getAllPlans, getPlanConfig, getPaidPlans, PLAN_CONFIG } from '../config/plans';

// Nos maps:
id: Object.keys(PLAN_CONFIG).find(key => PLAN_CONFIG[key] === plan),
```

Sem mais `require()` dentro de funções. ✓

---

## 3. Resíduos e Efeitos Colaterais

---

### RESÍDUO 01 — Card Verde "Obrigado pela sua assinatura!" Aparece no Estado de Erro
- **Gravidade:** 🟢 Baixa
- **Tipo:** UX / Inconsistência visual
- **Introduzido por:** Correção do ACHADO 05 (que corrigiu o heading, mas não o card inferior)
- **Arquivo:** `frontend/src/app/subscription/success/page.tsx`, linhas 138–146

**Problema:** O ACHADO 05 foi resolvido corretamente para o cabeçalho (ícone + título). Porém, logo abaixo do cabeçalho condicional, há um card verde com "Obrigado pela sua assinatura!" que é renderizado incondicionalmente — tanto no estado de sucesso quanto no estado de erro:

```tsx
// subscription/success/page.tsx — linhas 138-146 (verificado — aparece em ambos os estados)
<div className="space-y-4 mb-8">
  <div className="p-4 bg-green-50 rounded-lg">
    <p className="text-sm text-green-800">
      <strong>Obrigado pela sua assinatura!</strong>
    </p>
    <p className="text-sm text-green-700 mt-1">
      Você receberá um email de confirmação com os detalhes da sua assinatura em breve.
    </p>
  </div>
  ...
```

**Impacto no usuário:** Quando o polling expira (estado de erro), a tela exibe:
1. Ícone de relógio amarelo + "Verificação Pendente" (correto)
2. Card vermelho com a mensagem de erro (correto)
3. Card verde: **"Obrigado pela sua assinatura!"** (incorreto — contradiz o estado de erro)
4. Card azul "Próximos passos" (inadequado — implica que a assinatura está ativa)

O problema é menos grave que o original (o heading está correto agora), mas a experiência ainda tem incoerência visual.

**Correção sugerida:**
```tsx
{!error && (
  <div className="p-4 bg-green-50 rounded-lg">
    <p><strong>Obrigado pela sua assinatura!</strong></p>
    <p>Você receberá um email de confirmação...</p>
  </div>
)}

{error && (
  <div className="p-4 bg-yellow-50 rounded-lg">
    <p><strong>O que fazer agora?</strong></p>
    <p>Verifique sua assinatura nas Configurações → Plano. Se o problema persistir, entre em contato com o suporte.</p>
  </div>
)}
```

---

### COMPORTAMENTO PRÉ-EXISTENTE NÃO RESOLVIDO — Usuário Não Autenticado em `/subscription/success` Não é Redirecionado
- **Gravidade:** 🟢 Baixa
- **Tipo:** Autenticação / UX
- **Status:** Pré-existente — não introduzido pelas correções, mas não abordado
- **Arquivo:** `frontend/src/app/subscription/success/page.tsx`, linhas 20-25

**Problema:** Se um usuário não autenticado acessar `/subscription/success?session_id=xxx`, o `useEffect` detecta `!user` e para o loading sem redirecionar:

```typescript
useEffect(() => {
  if (!sessionId || !user) {
    setIsLoading(false); // ← para loading, mas não redireciona
    return;
  }
  // ...
}, [sessionId, user, refreshChurch]);
```

Após `isLoading=false`, como não há `error` definido, a página exibe "Pagamento Confirmado!" para um usuário não autenticado. Não é possível confirmar se o pagamento é real, e o botão "Ir para o Sistema" levaria para `/`, que protegido redireciona para login.

**Não é regressão** — era assim antes das correções. Mencionado para documentação.

---

## 4. Avaliação de UX Após Correção

### Fluxo de Registro (`/register`)

**Antes:** Usuário preenchia formulário, submetia, e via erro de "Email não confirmado" — sem saber se o cadastro havia funcionado. Formulário permanecia preenchido com erro de login como se fosse erro de cadastro.

**Depois:**
- ✅ Formulário vazio a cada montagem (sem estado global contaminando)
- ✅ Erro de registro (CNPJ duplicado, email existente, etc.) mostrado no formulário com dados preservados para re-tentativa
- ✅ Registro bem-sucedido → tela de "Cadastro concluído!" com e-mail do usuário destacado e instrução clara
- ✅ Validação de CNPJ com dígitos verificadores feita no cliente — feedback mais rápido
- ✅ Ordem de campos padronizada (Email → Senha → Confirmar → Telefone)
- ✅ `isSubmitting` guard previne dupla submissão
- 🟡 Formulário sem persistência de dados no `sessionStorage` — preenchimento perdido em refresh de página (documentado pelo DEV como dívida técnica opcional)

### Fluxo de Checkout (`/checkout`)

**Antes:** Podia redirecionar para login durante inicialização do AuthContext; `axios` sem interceptor de 401; plano já ativo gerava erro falso.

**Depois:**
- ✅ `isAuthLoading` guard previne redirect prematuro
- ✅ Todas as chamadas via `apiService` com interceptor de 401
- ✅ Plano já ativo → redireciona para dashboard silenciosamente
- ✅ URL de redirect encodada corretamente
- 🟡 `price.split('/')` para exibição de preço permanece (frágil, mas funcional com o formato atual)

### Fluxo de Sucesso do Stripe (`/subscription/success`)

**Antes:** Heading "Pagamento Confirmado!" com erro de polling simultâneo; memory leak no polling; ID técnico do Stripe visível.

**Depois:**
- ✅ Heading e ícone condicionais ao estado de erro
- ✅ Polling com cleanup correto — sem memory leak
- ✅ ID do Stripe removido
- ✅ Interceptor de 401 ativo durante polling
- 🟡 Card "Obrigado pela sua assinatura!" ainda aparece no estado de erro (RESÍDUO 01)

---

## 5. Itens Encerrados

Os seguintes achados podem ser **fechados definitivamente**:

| Achado | Evidência de encerramento |
|--------|--------------------------|
| 01 — Auto-login falha silenciosamente | Dois try/catch independentes; tela de sucesso após registerChurch() |
| 02 — Estado global de formulário | Variáveis de módulo removidas; só useState |
| 03 — Checkout sem guard de isLoading | `isAuthLoading` verificado antes do redirect |
| 04 — Checkout usa axios direto | apiService com 4 novos métodos; axios removido |
| 05 — "Pagamento Confirmado!" com erro | Heading e ícone condicionais (residuo menor permanece) |
| 06 — Polling sem cleanup | isMounted + clearTimeout no return do useEffect |
| 07 — sessionStorage persiste | Flag setada apenas após login bem-sucedido |
| 08 — Sem estado de sucesso intermediário | Tela "Cadastro concluído!" com email e instrução |
| 09 — activate-free-plan 400 como erro | Backend idempotente retorna 200 |
| 10 — CNPJ sem dígitos verificadores no FE | validateCNPJ com .refine() no schema |
| 11 — URL redirect com ? não encodado | encodeURIComponent aplicado |
| 12 — Ordem dos campos fora do padrão | Email → Senha → Confirmar → Telefone |
| 13 — ID Stripe exposto | Bloco removido integralmente |
| 14 — require() dinâmico no plansController | Import estático no topo do arquivo |

---

## 6. Itens Reabertos / Novos Tickets

### NOVO TICKET — RESÍDUO 01: Card Verde no Estado de Erro de Subscription/Success
**Título:** Card "Obrigado pela sua assinatura!" aparece no estado de erro em `/subscription/success`  
**Arquivo:** `frontend/src/app/subscription/success/page.tsx`  
**Prioridade:** 🟢 Baixa — cosmético; não impede o uso do sistema  
**Ação:** Condicionar o card verde ao `!error`; exibir orientação específica de suporte no estado de erro

### DOCUMENTAR COMO DÍVIDA — Comportamento de `/subscription/success` sem Auth
**Título:** `/subscription/success` não redireciona usuário não autenticado  
**Arquivo:** `frontend/src/app/subscription/success/page.tsx`  
**Prioridade:** 🟢 Baixa — cenário improvável; "Ir para o Sistema" redireciona para login indiretamente  
**Ação:** Adicionar `if (!isLoading && !user) router.push('/login');` no useEffect, ou verificar com `(main)/layout.tsx` style guard

---

## 7. Parecer Final

O ciclo de correções do Módulo 02 foi **tecnicamente completo e de alta qualidade**. A falha crítica que bloqueava todo o fluxo de onboarding em produção foi resolvida de forma estrutural, não com patches. As demais correções (polling, estado global, redirect, API centralizada) foram implementadas corretamente.

**O módulo está apto para produção** com os dois pontos documentados acima sendo de baixíssima prioridade.

**Pré-requisito de deploy:** Nenhum além dos já listados no Módulo 01 (`SUPABASE_SERVICE_ROLE_KEY` configurada).

---

### Histórico do Ciclo QA — Módulo 02

| Etapa | Documento | Resultado |
|-------|-----------|-----------|
| Auditoria | `modulo-02-onboarding-register.md` | 14 achados (2 críticos) |
| Correção | `modulo-02-onboarding-register-dev-report.md` | 14 corrigidos |
| **Revalidação** | **`modulo-02-onboarding-register-revalidacao.md`** | **✅ Módulo aprovado** |

---

*Revalidação gerada com base em leitura direta do código atualizado. Todas as classificações têm evidência concreta dos arquivos verificados.*
