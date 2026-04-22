# QA — Módulo 02: Onboarding e Registro de Igreja

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Módulo:** Onboarding e Registro de Igreja  
> **Status:** Auditoria completa  
> **Gravidade geral:** 🔴 ALTA — há falha crítica de fluxo que torna o onboarding inutilizável em produção com confirmação de e-mail ativa

---

## 1. Resumo Executivo

O módulo de onboarding cobre o registro de novas igrejas, o auto-login pós-cadastro, a escolha de plano (checkout), o processamento do pagamento via Stripe e as páginas de retorno de sucesso/cancelamento.

A auditoria identificou **14 achados**, incluindo **2 críticos**. O achado mais grave é um bug de fluxo que faz com que o registro aparente ter falhado mesmo quando foi concluído com sucesso — causado pela tentativa de auto-login imediatamente após cadastro, em um cenário onde o Supabase exige confirmação de e-mail antes do primeiro login.

### Principais riscos

| Risco | Impacto |
|-------|---------|
| Auto-login após registro falha silenciosamente — usuário vê erro de "registro" | Onboarding bloqueado em produção |
| Estado global de formulário persiste entre navegações e abas | Dados e erros vazam entre sessões |
| Checkout não verifica `isLoading` do AuthContext | Usuário autenticado redirecionado para login desnecessariamente |
| `subscription/success` exibe "Pagamento Confirmado!" com erro de polling simultâneo | UX contraditória e confusa |
| Polling sem cleanup na página de sucesso | Memory leak e state updates em componente desmontado |

---

## 2. Mapa do Fluxo Analisado

```
[Usuário] → /register → (Zod FE) → POST /api/auth/register
                                    → Supabase signUp → church INSERT → pending_subscription link
                                    → 201 { church, subscriptionLinked }
           → auto: login({ email, password })
             → POST /api/auth/login → [FALHA se email não confirmado]
           → window.location.href = '/checkout'

[/checkout] → GET /api/plans → exibir planos
           → (gratuito) POST /api/stripe/activate-free-plan → router.push('/')
           → (pago) POST /api/stripe/create-checkout-session → { url }
                    → window.location.href = url (Stripe)
                    → (sucesso) /subscription/success?session_id=...
                      → polling GET /api/stripe/checkout-status → confirmed? → router.push('/')
                    → (cancelado) /subscription/cancel → router.push('/checkout')
```

---

## 3. Achados

---

### ACHADO 01 — Auto-login Após Registro Falha Silenciosamente com E-mail Não Confirmado

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug / Fluxo / UX
- **Impacto no usuário:** O cadastro é concluído com sucesso (conta criada, e-mail de confirmação enviado), mas o auto-login falha com "Email não confirmado". O bloco `catch` trata esse erro como falha de registro, exibindo a mensagem de erro com o formulário ainda preenchido. O usuário não sabe que a conta foi criada e que precisa confirmar o e-mail. Em produção com confirmação obrigatória no Supabase, **o fluxo de onboarding fica totalmente bloqueado neste ponto.**
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linhas 299–322
- **Arquivos relacionados:** `register/page.tsx`, `AuthContext.tsx`, `backend/src/controllers/authController.ts`

**Evidência:**
```typescript
// register/page.tsx — onSubmit
try {
  setIsSubmitting(true);

  // 1. Cria conta — SUCEDE
  await registerChurch(cleanData);

  // Flag para evitar redirect do AuthGuard
  sessionStorage.setItem('redirectingToCheckout', 'true');

  // 2. Tenta login imediato — FALHA em produção (email não confirmado)
  await login({ email: cleanData.email, password: cleanData.password });

  // 3. Redireciona — nunca chega aqui
  window.location.href = '/checkout';

} catch (err) {
  // Qualquer erro cai aqui — inclusive o erro de email não confirmado
  // O usuário vê: formulário preenchido + "Email não confirmado"
  // O usuário NÃO sabe que o cadastro foi concluído
  globalFormData = data;
  setError(errorMessage); // ex.: "Email não confirmado"
}
```

**Backend:**
```typescript
// authController.ts — login
const isUnconfirmed = raw.includes('not confirmed') || raw.includes('email not confirmed');
if (isUnconfirmed) {
  return res.status(401).json({
    error: 'Email não confirmado',
    details: 'Necessário realizar confirmação de email...'
  });
}
```

**Como reproduzir:**
1. Acessar `/register`
2. Preencher todos os campos com dados válidos
3. Submeter
4. Verificar o comportamento: formulário exibe "Email não confirmado" mesmo com cadastro concluído

**Causa provável:** O fluxo foi projetado assumindo que o login imediato após registro sempre funciona. Em produção com Supabase configurado para exigir confirmação de e-mail (comportamento padrão), o `signInWithPassword` retorna 401 antes da confirmação, e o `catch` genérico do `onSubmit` trata isso como falha total do fluxo.

**Correção sugerida:** Separar os dois blocos `try/catch` ou detectar o erro de "email não confirmado" como caso esperado:

```typescript
// Passo 1: registrar (se falhar, tratar como erro de registro)
await registerChurch(cleanData);
reset(); // limpar formulário

// Passo 2: tentar login — se falhar por e-mail não confirmado, exibir estado de sucesso
try {
  await login({ email: cleanData.email, password: cleanData.password });
  window.location.href = '/checkout';
} catch (loginErr) {
  const isEmailNotConfirmed = /* verificar mensagem de erro */;
  if (isEmailNotConfirmed) {
    // Mostrar estado de sucesso: "Cadastro concluído! Verifique seu e-mail."
    setRegistrationSuccess(true);
  } else {
    // Outro erro de login — tratar como exceção
    setError(loginErr.message);
  }
}
```

---

### ACHADO 02 — Estado Global de Formulário e Erro Persiste Entre Navegações e Abas

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug / Estado inconsistente
- **Impacto no usuário:** Idêntico ao ACHADO 05 do Módulo 01, porém aqui inclui também os **dados do formulário** (`globalFormData`), não apenas o erro. Se o usuário:
  1. Preenche o formulário → recebe um erro
  2. Navega para `/forgot-password` → volta para `/register`
  
  Vê o formulário ainda preenchido (de `globalFormData`) com o erro anterior visível (de `globalRegisterError`). O erro é de uma tentativa anterior que pode já ser irrelevante.

  Em múltiplas abas, dados de uma aba contaminam a outra (módulo JS compartilhado).
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linhas 13–19, 125–126, 587–598
- **Arquivos relacionados:** `register/page.tsx`

**Evidência:**
```typescript
// Variáveis de módulo — persistem durante toda a sessão do browser
let globalRegisterError: string | null = null;
let globalRegisterErrorDetails: string | null = null;
let globalFormData: RegisterFormData | null = null;

// Estado local inicializado do global
const [error, setError] = useState<string | null>(globalRegisterError);
```

```tsx
{/* JSX usa tanto state quanto variável global — mesma inconsistência do Módulo 01 */}
{(error || globalRegisterError) && (
  <div>
    <p>{error || globalRegisterError}</p>
    {(errorDetails || globalRegisterErrorDetails) && (
      <p>{errorDetails || globalRegisterErrorDetails}</p>
    )}
  </div>
)}
```

**Causa provável:** Workaround para evitar que erros sumam durante re-renders. Mesma dívida técnica identificada no Módulo 01.

**Correção sugerida:**
```typescript
// Remover as três variáveis globais
// Usar apenas useState para error/errorDetails
// Para preservar dados do formulário em caso de erro: useRef<RegisterFormData | null>(null)
// Limpar na inicialização do componente, não em efeito de cleanup

const [error, setError] = useState<string | null>(null);
const [errorDetails, setErrorDetails] = useState<string | null>(null);
const savedFormData = useRef<RegisterFormData | null>(null);
// defaultValues: savedFormData.current || undefined
```

---

### ACHADO 03 — `checkout/page.tsx` Redireciona para Login sem Verificar `isLoading` do AuthContext

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug / Autenticação / UX
- **Impacto no usuário:** Ao acessar `/checkout` diretamente (após registro bem-sucedido com auto-login, ou por URL direta), o `useEffect` de verificação de autenticação dispara enquanto o AuthContext ainda está carregando (`isLoading = true` e `user = null`). O usuário autenticado é redirecionado para `/login` desnecessariamente, quebrando o fluxo de onboarding.
- **Onde ocorre:** `frontend/src/app/(auth)/checkout/page.tsx`, linhas 62–72
- **Arquivos relacionados:** `checkout/page.tsx`, `AuthContext.tsx`

**Evidência:**
```typescript
// checkout/page.tsx — sem verificação de isLoading
useEffect(() => {
  if (!user) {
    // 'user' é null durante o carregamento inicial do AuthContext
    // → redireciona para login mesmo quando o usuário está autenticado
    const planToRedirect = initialPlan || selectedPlan;
    router.push('/login?redirect=/checkout' + (planToRedirect ? `?plan=${planToRedirect}` : ''));
    return;
  }
}, [user, router, initialPlan, selectedPlan]);
```

**Causa provável:** A mesma proteção implementada em `(main)/layout.tsx` (ACHADO 16 do Módulo 01) não foi aplicada na página de checkout, que é uma rota sob `(auth)/` layout.

**Correção sugerida:**
```typescript
const { user, isLoading } = useAuth();

useEffect(() => {
  if (isLoading) return; // aguardar AuthContext inicializar
  if (!user) {
    router.push('/login?redirect=/checkout' + (planToRedirect ? `?plan=${planToRedirect}` : ''));
  }
}, [isLoading, user, router, initialPlan, selectedPlan]);

// Também ajustar o guard de render:
if (isLoading || isLoadingPlans) {
  return <Loader />;
}
```

---

### ACHADO 04 — `checkout/page.tsx` usa `axios` Diretamente sem Interceptor de Autenticação

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug Silencioso / Autenticação / Contrato de API
- **Impacto no usuário:** Se a sessão expirar enquanto o usuário está na página de checkout (ex.: ficou parado sem interagir), o botão "Continuar para Pagamento" ou "Acessar Sistema" retorna 401. Como não há interceptor de 401, o erro é exibido como "Erro ao processar sua solicitação" sem redirecionar para login. O usuário tenta resolver o erro sem entender que precisa se autenticar novamente.
- **Onde ocorre:** `frontend/src/app/(auth)/checkout/page.tsx`, linhas 8, 86–93, 103–109
- **Arquivos relacionados:** `checkout/page.tsx`, `frontend/src/services/api.ts`

**Evidência:**
```typescript
// checkout/page.tsx — import direto do axios, não do apiService
import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Sem withCredentials configurado globalmente, sem interceptor de 401
await axios.post(`${API_URL}/stripe/activate-free-plan`, {}, {
  withCredentials: true, // ← configurado manualmente em cada chamada
});
```

Comparado com `apiService` que tem:
```typescript
// api.ts — interceptor global de 401
this.api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicRoute) {
      window.location.href = '/login';
    }
    throw error;
  }
);
```

**Correção sugerida:** Usar `apiService` para todas as chamadas do checkout:
```typescript
import apiService from '@/services/api';

// Ativar plano gratuito
await apiService.activateFreePlan();

// Criar sessão de checkout
const response = await apiService.createCheckoutSession({ plan: selectedPlan });
```

---

### ACHADO 05 — `subscription/success` Exibe "Pagamento Confirmado!" Simultaneamente com Erro de Polling

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug de UX / Estado inconsistente
- **Impacto no usuário:** Se o polling de 30 segundos expirar sem confirmar o pagamento (webhook do Stripe demorou, falha de rede, etc.), a página exibe o ícone `CheckCircle2` verde com o título "Pagamento Confirmado!" e logo abaixo um bloco de erro vermelho dizendo que não foi possível confirmar o pagamento. As duas mensagens são contraditórias e confundem o usuário.
- **Onde ocorre:** `frontend/src/app/subscription/success/page.tsx`, linhas 90–115
- **Arquivos relacionados:** `subscription/success/page.tsx`

**Evidência:**
```tsx
// O card de sucesso é sempre renderizado após isLoading = false,
// independentemente de 'error' estar preenchido
<div className="text-center mb-8">
  <CheckCircle2 className="h-8 w-8 text-green-600" />  {/* ← sempre verde */}
  <h1>Pagamento Confirmado!</h1>  {/* ← sempre exibido */}
</div>

{error && (
  <div className="bg-red-50 border-red-200">
    <p>{error}</p>  {/* ← "Não foi possível confirmar o pagamento" */}
  </div>
)}
```

**Correção sugerida:** Condicionar o ícone e o título ao estado de `error`:
```tsx
{error ? (
  <>
    <XCircle className="h-8 w-8 text-yellow-600" />
    <h1>Verificação Pendente</h1>
    <p>Seu pagamento foi recebido, mas a confirmação está demorando. Verifique nas configurações.</p>
  </>
) : (
  <>
    <CheckCircle2 className="h-8 w-8 text-green-600" />
    <h1>Pagamento Confirmado!</h1>
  </>
)}
```

---

### ACHADO 06 — Polling em `subscription/success` sem Cleanup Causa Memory Leak

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug / Memory Leak / Race Condition
- **Impacto no usuário:** Se o usuário navegar para outra página durante os 30 segundos de polling (clicando em "Ir para o Sistema" antes do polling terminar, ou usando o botão voltar), os `setTimeout` recursivos continuam disparando. Cada invocação tenta atualizar o estado de um componente já desmontado (`setIsLoading`, `setError`), gerando `Warning: Can't perform a React state update on an unmounted component` e potencialmente causando inconsistências.
- **Onde ocorre:** `frontend/src/app/subscription/success/page.tsx`, linhas 27–76
- **Arquivos relacionados:** `subscription/success/page.tsx`

**Evidência:**
```typescript
useEffect(() => {
  let attempts = 0;
  const maxAttempts = 15;

  const checkSubscriptionStatus = async () => {
    try {
      // ...
      setTimeout(checkSubscriptionStatus, pollInterval); // ← timeout recursivo
    } catch (err) {
      setTimeout(checkSubscriptionStatus, pollInterval); // ← continua mesmo em erro
    }
  };

  setTimeout(checkSubscriptionStatus, pollInterval);
  // ← sem retorno de cleanup = sem clearTimeout no unmount
}, [sessionId, user, refreshChurch]);
```

**Correção sugerida:**
```typescript
useEffect(() => {
  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  let isMounted = true;

  const checkSubscriptionStatus = async () => {
    if (!isMounted) return;
    try {
      const response = await axios.get(...);
      if (response.data.confirmed) {
        if (isMounted) {
          setIsLoading(false);
          await refreshChurch?.();
        }
        return;
      }
      attempts++;
      if (attempts < maxAttempts && isMounted) {
        timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);
      } else if (isMounted) {
        setIsLoading(false);
        setError('...');
      }
    } catch (err) {
      // ...
    }
  };

  timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);

  return () => {
    isMounted = false;
    clearTimeout(timeoutId);
  };
}, [sessionId, user, refreshChurch]);
```

---

### ACHADO 07 — `sessionStorage.redirectingToCheckout` Pode Bloquear AuthGuard Indefinidamente

- **Gravidade:** 🟡 Média
- **Tipo:** Bug Silencioso / Estado inconsistente
- **Impacto no usuário:** A flag `redirectingToCheckout` é setada **antes** da tentativa de auto-login (linha 309). Se o auto-login falhar (ACHADO 01), o usuário não chega ao `/checkout` e a flag nunca é limpa pelo `AuthGuard`. A partir daí:
  - O `AuthGuard` checa `sessionStorage.getItem('redirectingToCheckout') === 'true'` para decidir se redireciona usuários autenticados para fora das páginas de auth
  - Com a flag ativa e um usuário autenticado (ex: usuário logou em outra aba), o `AuthGuard` **não redireciona** o usuário autenticado da `/register` ou `/login` para a home
  - O usuário autenticado fica "preso" nas páginas de autenticação até que visite `/checkout` ou limpe o `sessionStorage` manualmente
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linha 309; `frontend/src/components/AuthGuard.tsx`, linha 27
- **Arquivos relacionados:** `register/page.tsx`, `AuthGuard.tsx`

**Evidência:**
```typescript
// register/page.tsx — linha 309 (ANTES do login, que pode falhar)
sessionStorage.setItem('redirectingToCheckout', 'true');

// AuthGuard.tsx — linha 27 + 38
const isRedirectingToCheckout = sessionStorage.getItem('redirectingToCheckout') === 'true';

// Se isRedirectingToCheckout === true, o guard NÃO redireciona usuário autenticado
if (!isLoading && isAuthenticated && !isOnCheckoutPage && !hasRedirectParam && !isRedirectingToCheckout) {
  router.push('/');  // ← esta linha só executa se isRedirectingToCheckout === false
}
```

**Correção sugerida:** Mover o `sessionStorage.setItem` para **depois** de um login bem-sucedido, ou adicionar limpeza da flag no catch:
```typescript
} catch (err) {
  // Limpar flag se o login falhou e não vai redirecionar para checkout
  sessionStorage.removeItem('redirectingToCheckout');
  // ... resto do catch
}
```

---

### ACHADO 08 — Formulário Não Exibe Estado de Sucesso do Registro

- **Gravidade:** 🟡 Média
- **Tipo:** UX / Inconsistência de Estado
- **Impacto no usuário:** Após o registro ser criado com sucesso no backend, não há feedback visual intermediário. Durante toda a operação (registro + auto-login + redirect), o botão mostra apenas "Processando...". Se o auto-login falhar (ACHADO 01), o usuário não tem como saber em qual etapa ocorreu o erro. O formulário volta ao estado de erro sem nunca ter exibido "Cadastro criado com sucesso! Verifique seu e-mail.".
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linhas 298–320, 576–583
- **Arquivos relacionados:** `register/page.tsx`

**Evidência:**
```typescript
const onSubmit = async (data: RegisterFormData) => {
  try {
    setIsSubmitting(true);
    await registerChurch(cleanData);  // ← sucesso: sem feedback visual distinto
    sessionStorage.setItem('redirectingToCheckout', 'true');
    await login({ ... });             // ← falha em produção
    window.location.href = '/checkout';
  } catch (err) {
    // ← usuário chega aqui sem saber que o cadastro foi concluído
    setError(errorMessage);
  }
```

```tsx
<Button type="submit" isLoading={isOperationLoading || isSubmitting}>
  {isSubmitting ? 'Processando...' : 'Registrar Igreja'}
  {/* ← sem distinção entre "registrando" e "fazendo login" */}
</Button>
```

**Correção sugerida:** Adicionar estado `registrationSuccess` e exibir tela de confirmação:
```typescript
const [registrationSuccess, setRegistrationSuccess] = useState(false);

// Após registerChurch() bem-sucedido:
setRegistrationSuccess(true);

// Render:
if (registrationSuccess) {
  return <ConfirmEmailMessage email={cleanData.email} />;
}
```

---

### ACHADO 09 — `activate-free-plan` Retorna 400 "Plano Já Ativo" Durante Checkout Normal

- **Gravidade:** 🟡 Média
- **Tipo:** Bug / Contrato de API
- **Impacto no usuário:** Quando um usuário comprou um plano antes de se registrar (fluxo da landing page), o campo `pending_subscription` é vinculado ao criar a conta. A church pode já ter `plan_type = '100'` (ou outro). Se o usuário acessar `/checkout` e clicar "Acessar Sistema" (plano 100), o backend retorna:
  ```json
  { "error": "Plano já ativo", "details": "Você já está no plano gratuito" }
  ```
  O checkout trata isso como erro e exibe a mensagem. O usuário está bloqueado em uma página de checkout que não pode completar, mesmo que já esteja com o plano ativo.
- **Onde ocorre:** `backend/src/controllers/stripeController.ts`, linhas 1506–1513; `frontend/src/app/(auth)/checkout/page.tsx`, linhas 85–99
- **Arquivos relacionados:** `checkout/page.tsx`, `stripeController.ts`

**Evidência:**
```typescript
// stripeController.ts — activateFreePlan
if (church.plan_type === '100') {
  return res.status(400).json({
    error: 'Plano já ativo',
    details: 'Você já está no plano gratuito',
  });
}

// checkout/page.tsx — trata como erro genérico
} catch (err) {
  setError(errorMessage); // Exibe "Plano já ativo" como erro de formulário
  setIsLoading(false);
}
```

**Correção sugerida no frontend:** Tratar "Plano já ativo" como estado de sucesso:
```typescript
} catch (err) {
  const isAlreadyActive = err?.response?.data?.error?.includes('já ativo');
  if (isAlreadyActive) {
    // Plano já configurado — redirecionar diretamente
    await refreshChurch();
    router.push('/');
    return;
  }
  setError(errorMessage);
}
```

**Correção alternativa no backend:** Retornar 200 em vez de 400 quando o plano já está ativo (idempotência):
```typescript
if (church.plan_type === '100') {
  return res.json({ message: 'Plano gratuito já está ativo', plan_type: '100' });
}
```

---

### ACHADO 10 — CNPJ Obrigatório sem Validação de Dígitos Verificadores no Frontend

- **Gravidade:** 🟡 Média
- **Tipo:** Validação / UX
- **Impacto no usuário:** O Zod no frontend valida apenas que o CNPJ tem 14 dígitos e é numérico. A validação real dos dígitos verificadores (`isValidCNPJ`) só existe no backend. Usuário que digitar um CNPJ matematicamente inválido (ex: `12345678000190`) passa pelo frontend, o formulário submete, e recebe um erro do backend "CNPJ inválido - dígitos verificadores incorretos". Como o `globalFormData` preserva os dados, o formulário é repreenchido, mas o ciclo de feedback é mais lento do que deveria.
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linha 34; `backend/src/validators/cnpjSchema.ts`
- **Arquivos relacionados:** `register/page.tsx`, `cnpjSchema.ts`, `cnpjValidator.ts`

**Evidência:**
```typescript
// register/page.tsx — sem validação de dígitos verificadores
cnpj: z.string()
  .length(14, 'CNPJ deve ter 14 dígitos')
  .regex(/^\d+$/, 'CNPJ deve conter apenas números'),
  // ← sem isValidCNPJ()

// cnpjSchema.ts (backend) — validação completa
.custom((value, helpers) => {
  if (!isValidCNPJ(value)) {
    return helpers.error('cnpj.invalid');
  }
  return value;
})
```

**Correção sugerida:** Extrair `isValidCNPJ` para um utilitário compartilhado e usar no schema Zod:
```typescript
// utils/cnpjValidator.ts (compartilhado)
export const isValidCNPJ = (cnpj: string): boolean => { /* mesma lógica */ };

// registerSchema
cnpj: z.string()
  .length(14, 'CNPJ deve ter 14 dígitos')
  .regex(/^\d+$/, 'CNPJ deve conter apenas números')
  .refine(isValidCNPJ, 'CNPJ inválido — verifique os dígitos'),
```

---

### ACHADO 11 — URL de Redirect do Checkout para Login com Segundo `?` Não Encodado

- **Gravidade:** 🟡 Média
- **Tipo:** Bug / Contrato de URL
- **Impacto no usuário:** Se o usuário não autenticado acessar `/checkout?plan=200`, o redirect gerado é `/login?redirect=/checkout?plan=200`. O segundo `?` não é encoded como `%3F`. Embora `URLSearchParams.get('redirect')` retorne corretamente `/checkout?plan=200` na maioria dos parsers, esta construção viola o padrão RFC 3986 e pode quebrar em proxies, middlewares ou versões futuras do Next.js router.
- **Onde ocorre:** `frontend/src/app/(auth)/checkout/page.tsx`, linha 67
- **Arquivos relacionados:** `checkout/page.tsx`

**Evidência:**
```typescript
router.push('/login?redirect=/checkout' + (planToRedirect ? `?plan=${planToRedirect}` : ''));
// Resultado: /login?redirect=/checkout?plan=200
// RFC-correto: /login?redirect=%2Fcheckout%3Fplan%3D200
```

**Correção sugerida:**
```typescript
const redirectPath = planToRedirect ? `/checkout?plan=${planToRedirect}` : '/checkout';
router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
```

---

### ACHADO 12 — Ordem dos Campos do Formulário de Registro Fora do Padrão

- **Gravidade:** 🟡 Média
- **Tipo:** UX
- **Impacto no usuário:** A ordem atual é: Email → **Telefone** → Senha → Confirmar Senha → ... A inserção do campo "Telefone" entre o e-mail e os campos de senha quebra o fluxo cognitivo esperado (credenciais de acesso primeiro, depois dados de contato). Usuários familiarizados com formulários de registro padrão podem pular o campo de telefone ou ficar confusos com a sequência.
- **Onde ocorre:** `frontend/src/app/(auth)/register/page.tsx`, linhas 400–436
- **Arquivos relacionados:** `register/page.tsx`

**Correção sugerida:** Reordenar para: Email → Senha → Confirmar Senha → Telefone → (dados da Igreja).

---

### ACHADO 13 — `subscription/success` Exibe ID de Sessão do Stripe Diretamente para o Usuário

- **Gravidade:** 🟡 Média
- **Tipo:** UX / Segurança
- **Impacto no usuário:** O ID da sessão Stripe (`cs_live_xxx...`) é exibido como informação na tela de sucesso. Para um usuário final, esse dado não tem utilidade prática e pode gerar ansiedade ("o que é esse código?"). Além disso, expõe um identificador de sistema que poderia ser usado para consultar o status da sessão.
- **Onde ocorre:** `frontend/src/app/subscription/success/page.tsx`, linhas 126–133
- **Arquivos relacionados:** `subscription/success/page.tsx`

**Evidência:**
```tsx
{sessionId && (
  <div className="p-4 bg-gray-50 rounded-lg">
    <p className="text-xs text-gray-600">
      <strong>ID da Sessão:</strong>
      <br />
      <span className="break-all">{sessionId}</span>  {/* ← id técnico exposto */}
    </p>
  </div>
)}
```

**Correção sugerida:** Remover o bloco ou substituir por uma mensagem amigável ("Número de confirmação: #XXXX" com os últimos 8 caracteres, por exemplo).

---

### ACHADO 14 — `plansController` usa `require()` Dentro da Função em vez de Import

- **Gravidade:** 🟢 Baixa
- **Tipo:** Dívida Técnica
- **Impacto:** `require()` dentro de funções desabilita o tree-shaking, cria chamadas síncronas de módulo a cada request e pode ocultar erros de importação circular.
- **Onde ocorre:** `backend/src/controllers/plansController.ts`, linhas 13–16, 37–40
- **Arquivos relacionados:** `plansController.ts`

**Evidência:**
```typescript
plans: plans.map(plan => ({
  id: Object.keys(require('../config/plans').PLAN_CONFIG).find(  // ← require dinâmico
    key => require('../config/plans').PLAN_CONFIG[key] === plan
  ),
```

**Correção sugerida:**
```typescript
import { PLAN_CONFIG } from '../config/plans';

// No map:
id: Object.keys(PLAN_CONFIG).find(key => PLAN_CONFIG[key] === plan),
```

---

## 4. Cenários Extras a Testar

### Registro

| # | Cenário | Resultado esperado | Risco |
|---|---------|-------------------|-------|
| 1 | Registrar com e-mail já cadastrado | Mensagem específica "Email já cadastrado", formulário preservado | 🟠 Alta |
| 2 | Registrar com CNPJ já cadastrado | Mensagem específica "CNPJ já cadastrado" | 🟠 Alta |
| 3 | Registrar com CNPJ matematicamente inválido (14 dígitos, dígito verificador errado) | Frontend deveria rejeitar; atualmente passa para o backend | 🟡 Média |
| 4 | Submeter formulário com a API do IBGE indisponível (estados/cidades) | Deve usar fallback estático | 🟡 Média |
| 5 | Duplo clique rápido no botão "Registrar Igreja" | Deve enviar apenas 1 request (guard `isSubmitting`) | 🟠 Alta |
| 6 | Refresh da página no meio do preenchimento | Dados perdidos (sem persistência local) | 🟡 Média |
| 7 | Selecionar estado → API de cidades falha | Campo cidade fica vazio sem mensagem de erro | 🟡 Média |
| 8 | Navegar para /forgot-password e voltar para /register após um erro | Formulário reaparece preenchido com erro anterior | 🔴 Crítico (ACHADO 02) |
| 9 | Registrar com senha de alta complexidade (caracteres especiais e unicode) | Backend deve aceitar; regex de senha no FE pode bloquear | 🟡 Média |
| 10 | Registrar com e-mail já confirmado que vai fazer login sem confirmação | Apenas caso em que o auto-login funciona | 🟡 Média |

### Checkout

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 11 | Acessar `/checkout` sem estar autenticado | Redirect para `/login?redirect=/checkout` |
| 12 | Acessar `/checkout` com sessão expirada durante uso | Erro claro com redirect para login (ACHADO 04) |
| 13 | Clicar "Acessar Sistema" com plano `100` já ativo | Deveria redirecionar para `/`, não exibir erro (ACHADO 09) |
| 14 | Clicar "Continuar para Pagamento" quando API Stripe indisponível | Mensagem de erro clara, botão volta ao estado inicial |
| 15 | Refresh na página de checkout após selecionar plano | Plano selecionado resetado (sem persistência de estado) |
| 16 | Acesso direto a `/checkout?plan=999` (plano inexistente) | Backend retorna 400; frontend trata corretamente |

### Subscription Success / Cancel

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 17 | Acessar `/subscription/success` sem `?session_id` | Deve parar loading e exibir estado adequado |
| 18 | Acessar `/subscription/success` sem estar logado | Polling não inicia (guarda `!user`), sem crash |
| 19 | Navegar de `/subscription/success` durante polling | Polling deve parar; sem memory leak (ACHADO 06) |
| 20 | Webhook do Stripe demorar mais de 30 segundos | Exibe mensagem orientativa sem contradiction visual (ACHADO 05) |
| 21 | Acessar `/subscription/cancel` sem estar autenticado | Página estática exibe sem erro; "Tentar Novamente" vai para `/checkout` que redireciona para login |

---

## 5. Lacunas de Cobertura

### Testes Automatizados Ausentes

| Tipo | O que deveria existir |
|------|----------------------|
| Teste de integração | Registro completo → login com email não confirmado → verificar estado de sucesso exibido |
| Teste unitário | `isValidCNPJ` no frontend — edge cases de CNPJ |
| Teste E2E | Fluxo completo: registro → confirmação de email → checkout plano grátis → dashboard |
| Teste E2E | Checkout → Stripe → retorno success → polling confirma → dashboard |
| Teste de cleanup | Memory leak no polling: navegar durante polling não deve causar state updates |
| Teste de segurança | `sessionStorage.redirectingToCheckout` persistente não bloqueia AuthGuard |

### Validações Ausentes no Frontend

| Campo | O que falta |
|-------|-------------|
| CNPJ | Validação de dígitos verificadores (algoritmo) |
| Telefone | Validação de DDD válido (ex: DDD 00 não existe) |
| Senha | Feedback de força da senha em tempo real |

### Observabilidade/Logs Ausentes

| Ponto | Problema |
|-------|---------|
| Auto-login pós-registro | Sem log estruturado distinguindo falha de registro vs. falha de login |
| Checkout com plano já ativo | Sem log; usuário recebe 400 sem rastreio de contexto |
| Polling de subscription/success | Sem log das tentativas de polling no lado do cliente |

### Contratos Não Garantidos

| Contrato | Status |
|----------|--------|
| `activate-free-plan` retorna 400 quando plano já ativo | Frontend não trata como caso esperado — deve ser 200 (idempotente) |
| `checkout/page.tsx` não usa `apiService` | Sem interceptor de 401; comportamento diverge do restante do app |
| Fluxo registro → auto-login assume email não confirmado como erro de registro | Deve ser tratado como sucesso parcial com orientação ao usuário |

---

## 6. Resumo dos Achados por Prioridade de Correção

| # | Achado | Gravidade | Ação Imediata |
|---|--------|-----------|---------------|
| 01 | Auto-login falha silenciosamente pós-registro | 🔴 Crítica | Separar try/catch de registro e login; exibir tela de confirmação de e-mail |
| 02 | Estado global de formulário e erro | 🔴 Crítica | Remover variáveis de módulo; usar useState + useRef |
| 03 | Checkout sem guard de isLoading — redirect prematuro | 🟠 Alta | Adicionar `if (isLoading) return` no useEffect |
| 04 | Checkout usa axios direto sem interceptor de 401 | 🟠 Alta | Migrar para `apiService` |
| 05 | success/page: "Pagamento Confirmado!" + erro simultâneos | 🟠 Alta | Condicionar heading e ícone ao estado de erro |
| 06 | Polling sem cleanup — memory leak | 🟠 Alta | Adicionar `isMounted` flag e `clearTimeout` no cleanup |
| 07 | sessionStorage flag persiste após falha de auto-login | 🟡 Média | Limpar flag no catch do auto-login |
| 08 | Formulário sem estado de sucesso intermediário | 🟡 Média | Exibir tela de "verifique seu e-mail" após registerChurch() |
| 09 | activate-free-plan 400 trata como erro no checkout | 🟡 Média | Frontend detecta "já ativo" e redireciona; ou backend retorna 200 |
| 10 | CNPJ sem validação de dígitos verificadores no FE | 🟡 Média | Extrair isValidCNPJ para utilitário compartilhado |
| 11 | URL de redirect com segundo `?` não encodado | 🟡 Média | Usar `encodeURIComponent` na construção do redirect |
| 12 | Ordem dos campos fora do padrão (Telefone antes da Senha) | 🟡 Média | Reordenar: Email → Senha → Confirmar → Telefone |
| 13 | ID de sessão Stripe exposto ao usuário final | 🟡 Média | Remover ou truncar para referência amigável |
| 14 | require() dinâmico no plansController | 🟢 Baixa | Substituir por import estático no topo do arquivo |

---

*Arquivo gerado com base em leitura completa do código-fonte de todos os arquivos relevantes do módulo. Todos os achados têm evidências diretas dos arquivos citados.*
