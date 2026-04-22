# Relatório de Execução — Módulo 02: Onboarding e Registro de Igreja

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Abril 2026  
> **Módulo:** Onboarding e Registro de Igreja  
> **Relatório referência:** `modulo-02-onboarding-register.md`  
> **Status geral:** ✅ Todos os 14 achados resolvidos

---

## 1. Resumo Executivo

O módulo de onboarding apresentava uma **falha crítica de fluxo** que tornava o registro inutilizável em produção com confirmação de e-mail ativa no Supabase. O erro de auto-login pós-registro era tratado como falha do formulário, deixando o usuário sem orientação após um cadastro que havia sido concluído com sucesso.

Além disso, estado global de módulo (variáveis `let` no escopo do arquivo) poluía sessões e abas; o checkout redirecionava prematuramente para login; o polling da página de sucesso não tinha cleanup; e a tela de confirmação exibia ícone verde mesmo com erro simultâneo.

Todos os achados foram endereçados com correções cirúrgicas e sem regressões identificadas.

---

## 2. Achados por Status

| # | Achado | Gravidade | Status | Arquivo(s) |
|---|--------|-----------|--------|-----------|
| 01 | Auto-login após registro falha silenciosamente | 🔴 Crítica | ✅ Resolvido | `register/page.tsx` |
| 02 | Estado global de formulário e erro persiste | 🔴 Crítica | ✅ Resolvido | `register/page.tsx` |
| 03 | Checkout sem guard de `isLoading` | 🟠 Alta | ✅ Resolvido | `checkout/page.tsx` |
| 04 | Checkout usa axios direto sem interceptor | 🟠 Alta | ✅ Resolvido | `checkout/page.tsx`, `api.ts` |
| 05 | "Pagamento Confirmado!" simultâneo com erro | 🟠 Alta | ✅ Resolvido | `subscription/success/page.tsx` |
| 06 | Polling sem cleanup — memory leak | 🟠 Alta | ✅ Resolvido | `subscription/success/page.tsx` |
| 07 | sessionStorage flag persiste após falha de auto-login | 🟡 Média | ✅ Resolvido (via ACHADO 01) | `register/page.tsx` |
| 08 | Formulário sem estado de sucesso intermediário | 🟡 Média | ✅ Resolvido | `register/page.tsx` |
| 09 | `activate-free-plan` 400 trata como erro | 🟡 Média | ✅ Resolvido | `stripeController.ts` |
| 10 | CNPJ sem validação de dígitos verificadores no FE | 🟡 Média | ✅ Resolvido | `register/page.tsx`, `utils/validations.ts` |
| 11 | URL de redirect com segundo `?` não encodado | 🟡 Média | ✅ Resolvido | `checkout/page.tsx` |
| 12 | Ordem dos campos fora do padrão | 🟡 Média | ✅ Resolvido | `register/page.tsx` |
| 13 | ID de sessão Stripe exposto ao usuário | 🟡 Média | ✅ Resolvido | `subscription/success/page.tsx` |
| 14 | `require()` dinâmico no plansController | 🟢 Baixa | ✅ Resolvido | `plansController.ts` |

---

## 3. Detalhamento por Achado

---

### ACHADO 01 — Auto-login falha silenciosamente pós-registro ✅

**Causa raiz confirmada:** `try/catch` único englobava tanto `registerChurch()` quanto `login()`. Quando o Supabase rejeita o login por e-mail não confirmado (401), o catch genérico exibia o erro como falha de registro — sem informar que a conta foi criada.

**Correção aplicada em `register/page.tsx`:**

Separação dos dois passos em blocos independentes:

```typescript
// Passo 1: Registrar — se falhar, é erro real de cadastro
try {
  await registerChurch(cleanData);
} catch (err) {
  setError(errorMessage);
  setIsSubmitting(false);
  return;
}

// Passo 2: Auto-login — se falhar por email não confirmado, mantém tela de sucesso
setRegistrationSuccess(true);
try {
  await login({ email: cleanData.email, password: cleanData.password });
  sessionStorage.setItem('redirectingToCheckout', 'true');
  window.location.href = '/checkout';
} catch (loginErr) {
  const msg = loginErr instanceof Error ? loginErr.message.toLowerCase() : '';
  const isEmailNotConfirmed = msg.includes('email não confirmado') || msg.includes('not confirmed') || msg.includes('confirm');
  if (!isEmailNotConfirmed) {
    console.warn('[Register] Auto-login falhou por motivo inesperado após registro:', loginErr);
  }
  // Mantém registrationSuccess=true — usuário vê orientação de confirmação de e-mail
}
```

---

### ACHADO 02 — Estado global de formulário e erro ✅

**Causa raiz confirmada:** Três variáveis `let` no escopo do módulo (`globalRegisterError`, `globalRegisterErrorDetails`, `globalFormData`) persistiam entre re-montagens do componente e entre abas (módulo JS compartilhado).

**Correção aplicada em `register/page.tsx`:**

- Removidas as três variáveis de módulo.
- Estado gerenciado exclusivamente via `useState` inicializado com `null`.
- Removidos todos os `useEffect` de restauração/cleanup de dados globais.
- `defaultValues` do `useForm` removido (formulário sempre começa vazio).
- `errorRef` e `errorDetailsRef` removidos (não mais necessários).

---

### ACHADO 03 — Checkout sem guard de `isLoading` ✅

**Causa raiz confirmada:** `useEffect` verificava `!user` sem aguardar `isAuthLoading`, disparando redirect para `/login` enquanto o `AuthContext` ainda inicializava.

**Correção aplicada em `checkout/page.tsx`:**

```typescript
const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();

useEffect(() => {
  if (isAuthLoading) return; // aguarda AuthContext inicializar
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
}, [isAuthLoading, user, router, initialPlan, selectedPlan]);

// Guard de render também atualizado:
if (isAuthLoading || isLoadingPlans) {
  return <Loader />;
}
```

---

### ACHADO 04 — Checkout usa axios direto sem interceptor de 401 ✅

**Causa raiz confirmada:** `checkout/page.tsx` importava `axios` diretamente e configurava `withCredentials` manualmente em cada chamada, sem o interceptor global de 401 presente no `apiService`.

**Correção aplicada em dois arquivos:**

**`frontend/src/services/api.ts`** — adicionados 4 métodos:

```typescript
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

**`checkout/page.tsx`** — removido import de `axios`, substituído por `apiService`.

**`subscription/success/page.tsx`** — polling também migrado para `apiService.getCheckoutStatus()`.

---

### ACHADO 05 — "Pagamento Confirmado!" simultâneo com erro ✅

**Causa raiz confirmada:** Ícone `CheckCircle2` e `<h1>Pagamento Confirmado!</h1>` eram renderizados incondicionalmente após `isLoading=false`, mesmo com `error` preenchido.

**Correção aplicada em `subscription/success/page.tsx`:**

```tsx
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

---

### ACHADO 06 — Polling sem cleanup — memory leak ✅

**Causa raiz confirmada:** `setTimeout` recursivo dentro do `useEffect` não retornava função de cleanup, mantendo timeouts ativos mesmo após o componente ser desmontado.

**Correção aplicada em `subscription/success/page.tsx`:**

```typescript
let timeoutId: ReturnType<typeof setTimeout>;
let isMounted = true;

const checkSubscriptionStatus = async () => {
  if (!isMounted) return;
  // ... lógica de polling
  if (isMounted) {
    timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);
  }
};

timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);

return () => {
  isMounted = false;
  clearTimeout(timeoutId);
};
```

---

### ACHADO 07 — sessionStorage flag persiste após falha ✅

**Causa raiz confirmada:** `sessionStorage.setItem('redirectingToCheckout', 'true')` era setado antes do `await login()`, nunca sendo limpo se o login falhasse.

**Correção aplicada em `register/page.tsx` (via restructuring do ACHADO 01):**

A flag agora é setada **apenas** após login bem-sucedido, imediatamente antes do `window.location.href = '/checkout'`. Em qualquer falha de login, a flag não é setada.

---

### ACHADO 08 — Formulário sem estado de sucesso intermediário ✅

**Causa raiz confirmada:** Nenhum feedback visual após `registerChurch()` bem-sucedido. Durante o auto-login (que pode falhar), o botão mostrava apenas "Processando...".

**Correção aplicada em `register/page.tsx`:**

Adicionado estado `registrationSuccess` e `registeredEmail`. Quando `registerChurch()` retorna com sucesso, o componente exibe uma tela de confirmação com orientações:

```tsx
if (registrationSuccess) {
  return (
    <div>
      <CheckCircle2 className="text-green-600" />
      <h1>Cadastro concluído!</h1>
      <div> {/* bloco com ícone de e-mail */}
        <p>Confirme seu e-mail para continuar</p>
        <p>Enviamos um link de confirmação para <strong>{registeredEmail}</strong>.</p>
      </div>
      <Link href="/login">Ir para o Login</Link>
    </div>
  );
}
```

---

### ACHADO 09 — `activate-free-plan` retorna 400 como erro ✅

**Causa raiz confirmada:** Backend retornava `400 { error: 'Plano já ativo' }` quando a igreja já estava no plano gratuito. O frontend tratava isso como erro de formulário.

**Correção aplicada em `stripeController.ts`:**

```typescript
// Comportamento idempotente: retorna 200 se plano já ativo
if (church.plan_type === '100') {
  return res.json({
    message: 'Plano gratuito já está ativo',
    plan_type: '100',
  });
}
```

Resultado: o `apiService.activateFreePlan()` retorna com sucesso em ambos os cenários (ativação nova ou já ativo), e o `checkout/page.tsx` segue para `refreshChurch()` e `router.push('/')`.

---

### ACHADO 10 — CNPJ sem validação de dígitos verificadores no FE ✅

**Causa raiz confirmada:** Schema Zod validava apenas comprimento (14 dígitos) e formato numérico, sem verificar os dígitos verificadores. Usuários podiam submeter CNPJs matematicamente inválidos, recebendo o erro apenas após round-trip ao backend.

**Correção aplicada em `register/page.tsx`:**

Importada `validateCNPJ` de `@/utils/validations` (já existente no projeto com lógica completa de dígitos verificadores) e adicionada ao schema:

```typescript
import { validateCNPJ } from '@/utils/validations';

cnpj: z.string()
  .length(14, 'CNPJ deve ter 14 dígitos')
  .regex(/^\d+$/, 'CNPJ deve conter apenas números')
  .refine(validateCNPJ, 'CNPJ inválido — verifique os dígitos'),
```

---

### ACHADO 11 — URL de redirect com segundo `?` não encodado ✅

**Causa raiz confirmada:** Concatenação de strings gerava `/login?redirect=/checkout?plan=200`, com o segundo `?` não encodado — violação do RFC 3986.

**Correção aplicada em `checkout/page.tsx`:**

```typescript
const redirectPath = planToRedirect ? `/checkout?plan=${planToRedirect}` : '/checkout';
router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
// Resultado: /login?redirect=%2Fcheckout%3Fplan%3D200
```

---

### ACHADO 12 — Ordem dos campos fora do padrão ✅

**Causa raiz confirmada:** Campo "Telefone" estava entre "Email" e "Senha", quebrando o fluxo cognitivo esperado para formulários de cadastro.

**Correção aplicada em `register/page.tsx`:**

Nova ordem: Email → **Senha** → **Confirmar Senha** → **Telefone** → [divisor Dados da Igreja] → (demais campos).

---

### ACHADO 13 — ID de sessão Stripe exposto ao usuário ✅

**Causa raiz confirmada:** Bloco JSX exibia `sessionId` (ex: `cs_live_xxx...`) diretamente na tela de confirmação.

**Correção aplicada em `subscription/success/page.tsx`:**

Bloco removido integralmente. O ID técnico não tem utilidade para o usuário final e expõe um identificador de sistema que poderia ser usado para consultar o status da sessão.

---

### ACHADO 14 — `require()` dinâmico no plansController ✅

**Causa raiz confirmada:** `require('../config/plans').PLAN_CONFIG` era chamado dentro dos métodos `map()` de `getPlans` e `getPaidPlansList`, executando chamadas síncronas de módulo a cada request.

**Correção aplicada em `plansController.ts`:**

```typescript
// Antes
import { getAllPlans, getPlanConfig, getPaidPlans } from '../config/plans';
// ...
id: Object.keys(require('../config/plans').PLAN_CONFIG).find(...)

// Depois
import { getAllPlans, getPlanConfig, getPaidPlans, PLAN_CONFIG } from '../config/plans';
// ...
id: Object.keys(PLAN_CONFIG).find(key => PLAN_CONFIG[key] === plan),
```

---

## 4. Arquivos Modificados

| Arquivo | Achados | Natureza da Mudança |
|---------|---------|---------------------|
| `frontend/src/app/(auth)/register/page.tsx` | 01, 02, 07, 08, 10, 12 | Reescrita significativa do componente |
| `frontend/src/app/(auth)/checkout/page.tsx` | 03, 04, 09, 11 | Migração para apiService, guards de auth |
| `frontend/src/app/subscription/success/page.tsx` | 04, 05, 06, 13 | Cleanup, heading condicional, remoção de dado técnico |
| `frontend/src/services/api.ts` | 04 | Novos métodos: getPlans, activateFreePlan, createCheckoutSession, getCheckoutStatus |
| `backend/src/controllers/stripeController.ts` | 09 | Idempotência no activate-free-plan |
| `backend/src/controllers/plansController.ts` | 14 | Import estático de PLAN_CONFIG |

---

## 5. Correções Pós-Revalidação

Com base no relatório `modulo-02-onboarding-register-revalidacao.md`, foram aplicadas duas correções adicionais em `subscription/success/page.tsx`:

---

### RESÍDUO 01 — Card Verde no Estado de Erro ✅

**Problema:** O card "Obrigado pela sua assinatura!" (fundo verde) e o card "Próximos passos" (fundo azul) eram renderizados incondicionalmente após `isLoading=false`, mesmo quando `error` estava preenchido. O resultado era uma tela com heading "Verificação Pendente" (correto) mas com cards de sucesso logo abaixo (contraditório).

**Correção aplicada:**

```tsx
{/* Card verde: apenas no estado de sucesso */}
{!error && (
  <div className="p-4 bg-green-50 rounded-lg">
    <p><strong>Obrigado pela sua assinatura!</strong></p>
    <p>Você receberá um email de confirmação...</p>
  </div>
)}

{/* Card de orientação: apenas no estado de erro */}
{error && (
  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p><strong>O que fazer agora?</strong></p>
    <p>Acesse <strong>Configurações → Plano</strong> para verificar...</p>
  </div>
)}

{/* Card "Próximos passos": apenas no estado de sucesso */}
{!error && (
  <div className="p-4 bg-blue-50 rounded-lg">...</div>
)}
```

---

### P01 — Usuário Não Autenticado em `/subscription/success` Não Redirecionado ✅

**Problema (pré-existente):** Quando um usuário não autenticado acessava `/subscription/success?session_id=xxx`, o `useEffect` parava o loading (`setIsLoading(false)`) sem redirecionar. Como `error` também era `null`, a página exibia "Pagamento Confirmado!" para alguém sem sessão ativa.

**Correção aplicada:**

```typescript
const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();

useEffect(() => {
  if (isAuthLoading) return; // aguarda AuthContext inicializar
  if (!user) {
    setIsLoading(false);
    return; // estado local encerrado — render cuida do redirect
  }
  // ...
}, [sessionId, user, isAuthLoading, refreshChurch]);

// Guard de render — executado após isAuthLoading=false e isLoading=false:
if (!user) {
  router.push('/login');
  return null;
}
```

O `isAuthLoading` também foi adicionado ao guard de render (`if (isAuthLoading || isLoading)`) para evitar flash de conteúdo durante a inicialização.

---

## 6. Riscos Residuais e Dívidas Técnicas

| Item | Risco | Recomendação |
|------|-------|--------------|
| Auto-login pós-registro quando e-mail já confirmado | Neste caso o login funciona e o usuário vai para `/checkout` normalmente. Fluxo correto. | Sem ação necessária. |
| Formulário de registro sem persistência de dados no refresh | Dados perdidos ao recarregar a página durante preenchimento. | Opcional: `sessionStorage` com TTL para salvar `formValues` draft. |
| `sessionStorage.redirectingToCheckout` no `AuthGuard` | Lógica de bypassar `AuthGuard` durante checkout depende de `sessionStorage`. Funciona corretamente agora que a flag só é setada após login bem-sucedido. | Monitorar em testes E2E. |
| Polling em `subscription/success` usa `apiService` | O `apiService.getCheckoutStatus()` inclui interceptor de 401. Se a sessão expirar durante o polling, o usuário será redirecionado para login em vez de ver um erro amigável de "sessão expirada". | Aceitável — comportamento correto e esperado. |

---

## 7. Linter

Após todas as modificações — incluindo as correções pós-revalidação — nenhum erro de lint foi encontrado nos arquivos alterados (verificado via ReadLints).
