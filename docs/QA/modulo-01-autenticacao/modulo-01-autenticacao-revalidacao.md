# QA — Revalidação Módulo 01: Autenticação e Sessão

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Revalidação pós-correção  
> **Base:** `modulo-01-autenticacao-sessao.md` (18 achados) + `modulo-01-autenticacao-sessao-dev-report.md`  
> **Resultado geral:** 🟡 APROVADO COM RESSALVAS — 14 achados resolvidos, 2 parciais, 1 documentado, 1 com regressão nova identificada

---

## 1. Resumo Executivo

O DEV realizou correções em 9 arquivos cobrindo todos os 18 achados originais. A leitura direta do código pós-correção confirma que a maioria das mudanças foi implementada corretamente e com evidências concretas. Os 5 achados críticos originais foram endereçados com correções reais de código — não superficiais.

**Dois achados foram apenas parcialmente resolvidos**, um foi apenas documentado (sem correção de código), e foram identificadas **2 regressões** introduzidas pelas próprias correções, sendo uma delas de UX diretamente visível ao usuário.

### Placar geral

| Classificação | Qtd | Achados |
|---------------|-----|---------|
| ✅ Resolvido | 14 | 01, 02, 03, 04, 05, 07, 09, 10, 12, 13, 14, 15*, 16, 17 |
| 🟡 Parcialmente resolvido | 2 | 06, 11, 18 |
| ⚠️ Documentado (não resolvido) | 1 | 08 |
| 🔴 Regressão nova | 2 | R01 (botão callback), R02 (comentário rate limiter) |

> *ACHADO 15 resolvido no campo crítico mas com resíduo menor

---

## 2. Status de Cada Achado Original

---

### ACHADO 01 — Open Redirect no Login
**Status: ✅ RESOLVIDO**

**Validação:** Função `isInternalRedirect` criada e aplicada em ambos os pontos de redirect: `onSubmit` (pós-login) e `useEffect` (auto-redirect ao carregar).

```typescript
// login/page.tsx — linhas 22-30 (confirmado no código)
const isInternalRedirect = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith('/') && !url.startsWith('//');
  }
};
```

Ambos os usos (linha 55 e linha 83) aplicam a validação antes de qualquer redirect. URL externa cai no fallback `router.push('/')`. **Correção correta e completa.**

---

### ACHADO 02 — Regex de Senha no Formulário de Login Bloqueia Usuários Válidos
**Status: ✅ RESOLVIDO**

**Validação:** Schema de login simplificado. Regex de complexidade removida.

```typescript
// login/page.tsx — linhas 15-18 (confirmado)
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
```

Qualquer senha não-vazia passa pela validação do frontend. O backend autentica via Supabase sem restrição de formato no login. **Correção correta.**

---

### ACHADO 03 — `fetch` sem `credentials: 'include'` no Callback de E-mail
**Status: ✅ RESOLVIDO**

**Validação:** `credentials: 'include'` adicionado na linha 56 do callback.

```typescript
// auth/callback/page.tsx — linha 56 (confirmado)
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/callback`, {
  method: 'POST',
  credentials: 'include', // ← adicionado
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
});
```

Em ambientes cross-origin, os cookies `Set-Cookie` do backend agora serão aceitos pelo browser. **Correção correta.**

---

### ACHADO 04 — `supabase.auth.signOut()` no Logout Não Invalida a Sessão
**Status: ✅ RESOLVIDO**

**Validação:** O logout agora usa `supabaseAdmin.auth.admin.signOut(user.id)`. A importação de `supabaseAdmin` foi verificada em `supabase.ts`.

```typescript
// authController.ts — linhas 301-309 (confirmado)
if (supabaseAdmin) {
  try {
    await supabaseAdmin.auth.admin.signOut(user.id);
  } catch (signOutError) {
    console.warn('[Logout] Erro ao invalidar sessão via supabaseAdmin:', signOutError);
  }
} else {
  console.warn('[Logout] supabaseAdmin não disponível (SUPABASE_SERVICE_ROLE_KEY ausente).');
}
```

```typescript
// services/supabase.ts — linhas 18-20 (confirmado)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;
```

A invalidação agora é real, não uma chamada no-op do cliente anon. Fallback explícito e com aviso se `SERVICE_ROLE_KEY` ausente. **Correção correta. Risco remanescente documentado: se variável ausente, logout fica degradado.**

---

### ACHADO 05 — Estado Global de Erro no Login (Variáveis de Módulo)
**Status: ✅ RESOLVIDO**

**Validação:** Variáveis de módulo `globalLoginError` e `globalLoginErrorDetails` foram completamente removidas. O JSX também foi simplificado — não há mais referência dupla `(error || globalLoginError)`.

```typescript
// login/page.tsx — linhas 33-35 (confirmado — sem globals)
const [error, setError] = useState<string | null>(null);
const [errorDetails, setErrorDetails] = useState<string | null>(null);
```

```tsx
// login/page.tsx — linha 140 (JSX simplificado)
{error && (
  <div className="p-4 bg-red-50 ...">
    <p>{error}</p>
    {errorDetails && <p>{errorDetails}</p>}
  </div>
)}
```

Nenhuma referência a `globalLoginError` ou `errorRef` permanece. **Correção correta e completa.**

---

### ACHADO 06 — Login Realiza 3 Chamadas de API Sequenciais
**Status: 🟡 PARCIALMENTE RESOLVIDO**

**Validação:** A 2ª chamada (`getCheckAuth`) foi eliminada. O `role` agora vem no response de login.

```typescript
// authController.ts — linhas 239-243 (confirmado)
res.json({
  message: 'Login realizado com sucesso',
  church: churchData,
  role: context.role, // ← adicionado
});
```

```typescript
// AuthContext.tsx — linha 120 (confirmado)
setCurrentRole((response.role as ChurchUserRole) ?? 'reader');
```

```typescript
// types/index.ts — linhas 72-77 (confirmado)
export interface LoginResponse {
  message: string;
  church: Church;
  role?: ChurchUserRole; // ← adicionado
}
```

**O que foi feito:** Login passou de 3 para 2 chamadas de API. A 2ª chamada (`getCheckAuth`) foi eliminada com sucesso.

**O que permanece:** A 3ª chamada (`getAccountData` para obter o e-mail) ainda existe no login. O DEV manteve intencionalmente por ora. O login ainda faz 2 roundtrips quando poderia fazer 1 se o backend retornasse também o e-mail no response.

**Impacto residual:** Login levemente mais lento do que o necessário. Race condition entre `getAccountData` e a navegação pós-login ainda possível em redes muito lentas.

**Recomendação:** Abrir ticket separado para retornar o e-mail no response de `/api/auth/login` e eliminar a dependência de `getAccountData` no fluxo de login.

---

### ACHADO 07 — `isLoggingIn` Nunca é Resetado em Caso de Sucesso
**Status: ✅ RESOLVIDO**

**Validação:** `setTimeout(() => setIsLoggingIn(false), 2000)` adicionado após o comando de redirect no bloco `try`.

```typescript
// login/page.tsx — linha 90 (confirmado)
// ACHADO 07: reset de segurança caso a navegação não ocorra
setTimeout(() => setIsLoggingIn(false), 2000);
```

Se o `router.push('/')` falhar silenciosamente, o estado é liberado após 2 segundos. **Correção correta.**

---

### ACHADO 08 — Blacklist de Tokens em Memória Não Persiste
**Status: ⚠️ DOCUMENTADO — NÃO RESOLVIDO**

**Validação:** O DEV adicionou comentário `TODO` explícito no código, mas a implementação em memória permanece inalterada.

```typescript
// authController.ts — linhas 311-312 (confirmado)
// ACHADO 08: blacklist em memória — tokens revogados voltam a ser válidos após restart.
// TODO: substituir por Redis ou tabela revoked_tokens no Supabase antes de ir para produção com alta criticidade.
if (!global.tokenBlacklist) {
  global.tokenBlacklist = new Set();
}
```

O risco foi mitigado parcialmente pelo ACHADO 04 (admin.signOut agora invalida a sessão no Supabase), mas o problema da blacklist volátil persiste. Tokens coletados antes de um restart continuam sendo aceitos pelo middleware até expirar naturalmente.

**Parecer QA:** Item deve permanecer aberto como ticket de infraestrutura. A mitigação do ACHADO 04 reduz o risco em condições normais, mas não elimina o vetor de ataque.

---

### ACHADO 09 — Logout Silenciosamente Ignorado no `api.ts`
**Status: ✅ RESOLVIDO**

**Validação:** O `catch` do logout agora emite `console.warn` com mensagem informativa.

```typescript
// api.ts — linhas 166-171 (confirmado)
} catch (error) {
  console.warn('[Logout] Falha ao comunicar logout ao servidor. Token pode ainda estar ativo no Supabase.', error);
}
```

O comentário enganoso anterior ("o servidor limpa os cookies automaticamente") foi removido. **Correção correta.**

---

### ACHADO 10 — Dois Botões Idênticos "Fazer Login" no Estado de Erro do Callback
**Status: ✅ RESOLVIDO**

**Validação:** Labels e ações diferenciados.

```tsx
// auth/callback/page.tsx — linhas 155-170 (confirmado)
<Button onClick={handleGoToLogin} variant="primary">
  Ir para o Login
</Button>
<Button onClick={handleResendConfirmation} variant="secondary">
  Reenviar confirmação
</Button>
```

`handleResendConfirmation` redireciona para `/login?message=email_confirm_required`, que exibe a mensagem orientativa sobre reenvio. **Correção correta.**

---

### ACHADO 11 — Mensagem de Sucesso no Callback Induz Usuário a Ação Desnecessária
**Status: 🟡 PARCIALMENTE RESOLVIDO — NOVA REGRESSÃO DE UX**

**Validação:** Auto-redirect foi implementado.

```typescript
// auth/callback/page.tsx — linhas 74-77 (confirmado)
setTimeout(() => {
  router.push('/');
}, 2000);
```

A mensagem foi atualizada para "Email confirmado com sucesso! Redirecionando..." — correto.

**Regressão identificada:** O botão no estado de sucesso ainda diz **"Ir para o Login"** (`handleGoToLogin → router.push('/login')`), mas o usuário **já está autenticado** (os cookies foram setados pelo backend via callback com ACHADO 03 resolvido). Ao clicar no botão, o `AuthGuard` vai redirecionar o usuário de `/login` para `/` (home), adicionando um redirect desnecessário.

```tsx
// auth/callback/page.tsx — linhas 137-143 (problema identificado)
{status === 'success' && (
  <Button onClick={handleGoToLogin} variant="primary">
    Ir para o Login  {/* ← ERRADO: usuário já está logado, deveria ir para '/' */}
  </Button>
)}
```

**Impacto no usuário:** Ao clicar no botão "Ir para o Login" após confirmação bem-sucedida, o usuário é redirecionado para `/login`, que então redireciona para `/`. Gera confusão e um redirect extra. A mensagem e o botão estão em conflito ("Redirecionando..." vs "Ir para o Login").

**Correção necessária:** Alterar o botão para `router.push('/')` com label "Ir para o Painel" ou "Ir para o Início".

---

### ACHADO 12 — `useEffect` com Dependência `router` Inutilizada no Callback
**Status: ✅ RESOLVIDO (com adaptação justificada)**

**Validação:** O `router` agora é efetivamente usado dentro do effect (no `router.push('/')` do auto-redirect). A implementação com `hasRun` ref previne dupla execução.

```typescript
// auth/callback/page.tsx — linhas 17-19 (confirmado)
const hasRun = useRef(false);

useEffect(() => {
  if (hasRun.current) return;
  hasRun.current = true;
  // ...
  setTimeout(() => { router.push('/'); }, 2000); // router usado ✓
}, [router]);
```

`router` na dependency array é correto para `exhaustive-deps`. A dupla execução é prevenida pelo `hasRun`. **Solução adequada.**

---

### ACHADO 13 — `resetPassword` Backend Usa Access Token como Refresh Token
**Status: ✅ RESOLVIDO**

**Validação:** A chamada `setSession({ access_token: token, refresh_token: token })` foi removida e substituída por `supabaseAdmin.auth.admin.updateUserById`.

```typescript
// passwordController.ts — linhas 173-182 (confirmado)
if (!supabaseAdmin) {
  return res.status(503).json({
    error: 'Serviço indisponível',
    details: 'A redefinição de senha requer permissões administrativas que não estão configuradas.'
  });
}

const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
  password: newPassword
});
```

O fluxo agora é semanticamente correto: valida o token → extrai user.id → atualiza senha via Admin API. Sem criação de sessão temporária com tokens incorretos. **Correção correta.**

**Risco remanescente documentado:** Se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada em produção, o reset de senha retorna 503 para o usuário. Isso deve ser monitorado no deploy.

---

### ACHADO 14 — Validação de E-mail Ausente no Backend de `forgotPassword`
**Status: ✅ RESOLVIDO**

**Validação:** Regex de validação adicionada antes da chamada ao Supabase.

```typescript
// passwordController.ts — linhas 24-30 (confirmado)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({
    error: 'Email inválido',
    details: 'Informe um endereço de email válido'
  });
}
```

Formato inválido retorna 400 com mensagem em português antes de atingir o Supabase. **Correção correta.**

---

### ACHADO 15 — Comentário Incorreto no Rate Limiter de Registro
**Status: ✅ RESOLVIDO (campo crítico) / 🟡 RESÍDUO MENOR ENCONTRADO**

**Validação:** O comentário do `windowMs` foi corrigido de "1 hora" para "15 minutos".

```typescript
// auth.ts — linha 23 (confirmado)
windowMs: 15 * 60 * 1000, // 15 minutos  ← corrigido ✓
```

**Resíduo identificado:** O comentário na linha do `max` ainda menciona "em 1 hora", criando inconsistência nova:

```typescript
// auth.ts — linha 24 (resíduo)
max: 10, // 10 tentativas de registro por IP em 1 hora  ← ainda diz "1 hora"
```

Após a correção do `windowMs`, o comentário do `max` ficou desatualizado. Não afeta comportamento, mas é enganoso para manutenção.

---

### ACHADO 16 — Layout `(main)` Sem Proteção de Autenticação
**Status: ✅ RESOLVIDO**

**Validação:** Layout agora verifica autenticação com `isLoading`, `isAuthenticated`, e retorna `null` para evitar flash.

```typescript
// (main)/layout.tsx — linhas 22-42 (confirmado)
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  }
}, [isLoading, isAuthenticated, router]);

if (isLoading) {
  return <Spinner />;
}

if (!isAuthenticated) {
  return null;
}
```

Todas as rotas sob `(main)/` — `/members`, `/groups`, `/calendar`, `/settings`, etc. — agora têm proteção centralizada. **Correção correta e abrangente.**

---

### ACHADO 17 — Sessão com `expires_at` Calculado no Cliente (Falso)
**Status: ✅ RESOLVIDO**

**Validação:** Valor alterado de `Date.now() + 15 * 60 * 1000` para `0`, com comentário explicativo.

```typescript
// AuthContext.tsx — linhas 70-77 (confirmado em initializeAuth)
// ACHADO 17: expires_at=0 — o valor real de expiração está no cookie session_id
expires_at: 0,

// AuthContext.tsx — linhas 131-132 (confirmado em login)
// ACHADO 17: expires_at fictício removido — o valor real está no cookie session_id
expires_at: 0,
```

Nenhuma lógica atual consome `session.expires_at` para decisões de expiração — o risco de falso positivo foi eliminado. **Correção correta.**

---

### ACHADO 18 — `getAccountData()` Silenciado Causa E-mail Vazio na UI
**Status: 🟡 PARCIALMENTE RESOLVIDO**

**Validação — login():** E-mail do login usado como fallback garantido. `console.warn` adicionado no catch.

```typescript
// AuthContext.tsx — linhas 123-129 (confirmado)
let userEmail = data.email; // fallback garantido
try {
  const accountData = await apiService.getAccountData();
  userEmail = accountData.email || data.email;
} catch {
  console.warn('[AuthContext] getAccountData falhou no login. Usando email digitado como fallback.');
}
```

**Validação — initializeAuth():** `console.warn` adicionado, mas fallback de e-mail ainda não existe.

```typescript
// AuthContext.tsx — linhas 62-68 (confirmado — limitação remanescente)
let userEmail = '';
try {
  const accountData = await apiService.getAccountData();
  userEmail = accountData.email || '';
} catch {
  console.warn('[AuthContext] getAccountData falhou na inicialização. Email pode ficar vazio na UI.');
}
```

Na inicialização (`initializeAuth`), se `getAccountData` falhar, o e-mail fica `''`. O DEV documenta que isso é uma limitação, mas o warn foi adicionado para diagnóstico. A solução completa (retry com backoff ou armazenamento temporário do e-mail) não foi implementada.

**Impacto residual:** Se o usuário recarregar a página (`F5`) e o `GET /api/account` falhar nessa requisição, o e-mail no Header fica em branco até o próximo carregamento. Baixa prioridade mas persistente.

---

## 3. Regressões e Efeitos Colaterais

---

### REGRESSÃO 01 — Botão "Ir para o Login" no Estado de Sucesso do Callback (Nova)

- **Gravidade:** 🟡 Média
- **Tipo:** Regressão de UX
- **Introduzida por:** Correção do ACHADO 11
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`

**Problema:** Após confirmação bem-sucedida de e-mail, com ACHADO 03 resolvido (cookies agora setados corretamente), o usuário está **autenticado**. O auto-redirect vai para `/`. Mas o botão de ação manual ainda diz "Ir para o Login" e aponta para `router.push('/login')`.

Quando o usuário clica no botão, o `AuthGuard` detecta que ele já está autenticado e redireciona para `/`. Resultado: dois redirects onde deveria haver zero ou um. O label é enganoso — o usuário pensa que precisa fazer login novamente quando já está logado.

**Evidência:**
```tsx
{status === 'success' && (
  <Button onClick={handleGoToLogin} variant="primary">
    Ir para o Login  {/* ← incorreto: usuário já está autenticado */}
  </Button>
)}
```
```typescript
const handleGoToLogin = () => {
  router.push('/login');  // ← leva para AuthGuard que redireciona para '/'
};
```

**Correção necessária:**
```typescript
// Mudar ação e label do botão de sucesso:
<Button onClick={() => router.push('/')} variant="primary">
  Ir para o Painel
</Button>
```

---

### REGRESSÃO 02 — Comentário Residual Errado no Rate Limiter (Nova)

- **Gravidade:** 🟢 Baixa
- **Tipo:** Dívida técnica / Documentação
- **Introduzida por:** Correção parcial do ACHADO 15
- **Arquivo:** `backend/src/routes/auth.ts`

**Problema:** O campo `windowMs` foi corrigido, mas o comentário da linha `max` ainda diz "em 1 hora", que agora está inconsistente com a janela real de 15 minutos.

```typescript
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos  ← corrigido ✓
  max: 10, // 10 tentativas de registro por IP em 1 hora  ← ainda diz "1 hora" ❌
```

**Correção necessária:**
```typescript
max: 10, // 10 tentativas de registro por IP em 15 minutos
```

---

### EFEITO COLATERAL POSITIVO — Proteção do Layout `(main)` Cria Loading State Global

A adição da proteção no layout `(main)` introduz um **spinner de carregamento** que aparece enquanto `isLoading = true` (durante `initializeAuth`). Isso é um comportamento **novo e esperado** — antes, as páginas internas renderizavam sem nenhum estado de loading durante a verificação de autenticação. O impacto é positivo, mas deve ser validado manualmente em termos de tempo de exibição do spinner (se `getCheckAuth` demorar, o spinner persiste).

---

## 4. Avaliação de UX Após Correção

### Login (`/login`)

**Antes:** Schema Zod bloqueava usuários válidos; erros podiam vazar entre navegações; botão desabilitado poderia travar.

**Depois:** 
- ✅ Qualquer senha não-vazia é aceita pelo frontend — usuários não ficam mais bloqueados
- ✅ Erros limpam corretamente ao submeter novo tentativa
- ✅ Redirect externo impossível (`isInternalRedirect`)
- 🟡 O `setTimeout(150ms)` antes do redirect ainda existe — workaround para race condition que poderia ser resolvido estruturalmente (estado do contexto poderia ser retornado de forma síncrona no await)
- ✅ Link "Ainda não possui conta?" ainda aponta para landing — funcional desde que `NEXT_PUBLIC_LANDING_URL` esteja configurado em produção

### Callback de E-mail (`/auth/callback`)

**Antes:** Cookies não setados em produção; dois botões idênticos no erro; ação manual obrigatória no sucesso.

**Depois:**
- ✅ Cookies agora são setados corretamente em cross-origin
- ✅ Erro tem dois botões com ações distintas: "Ir para o Login" e "Reenviar confirmação"
- ✅ Auto-redirect após 2s implementado no sucesso
- 🔴 **Botão de sucesso diz "Ir para o Login" quando deveria dizer "Ir para o Painel"** — UX inconsistente com o comportamento real
- ✅ `hasRun` previne dupla chamada ao backend

### Logout

**Antes:** Sessão permanecia ativa no Supabase; erro engolido silenciosamente.

**Depois:**
- ✅ `supabaseAdmin.auth.admin.signOut(user.id)` invalida a sessão real
- ✅ Falha de comunicação gera `console.warn` rastreável
- ⚠️ Se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada: logout não invalida sessão no Supabase, com warn no console. Usuário não é notificado na UI.

### Reset de Senha

**Antes:** Fluxo semanticamente incorreto (mesmo token nos dois campos de `setSession`).

**Depois:**
- ✅ Admin API usado corretamente
- ⚠️ Depende de `SUPABASE_SERVICE_ROLE_KEY` — sem ela, 503 para o usuário. Mensagem de 503 ("permissões administrativas não configuradas") é técnica demais para um usuário final.

### Rotas Protegidas (`/members`, `/groups`, etc.)

**Antes:** Usuário não autenticado via o shell completo do app antes de qualquer erro.

**Depois:**
- ✅ Spinner durante verificação de autenticação
- ✅ `return null` previne flash de conteúdo
- ✅ Redirect para `/login` quando não autenticado
- 🟡 O tempo do spinner depende do tempo de resposta do `GET /refresh/check` — em redes lentas pode ser longo

---

## 5. Itens Encerrados

Os seguintes achados podem ser **marcados como encerrados** no backlog:

| Achado | Descrição | Motivo de encerramento |
|--------|-----------|------------------------|
| 01 | Open redirect | Validação de URL interna implementada e aplicada em ambos os pontos |
| 02 | Regex senha no login | Schema simplificado para `min(1)` |
| 03 | fetch sem credentials | `credentials: 'include'` adicionado |
| 04 | signOut sem efeito real | `supabaseAdmin.auth.admin.signOut(user.id)` implementado |
| 05 | Estado global de erro | Variáveis de módulo removidas |
| 07 | isLoggingIn não resetado | setTimeout de segurança adicionado |
| 09 | Logout silencioso | console.warn adicionado; comentário enganoso removido |
| 10 | Dois botões idênticos | Labels e ações distintos |
| 12 | useEffect com router inutilizado | router usado no effect; hasRun previne dupla execução |
| 13 | resetPassword com token inválido | Admin API utilizada corretamente |
| 14 | Validação email no forgotPassword | Regex adicionada antes do Supabase |
| 15 | Comentário errado no rate limiter | Comentário do windowMs corrigido (resíduo menor no max) |
| 16 | Layout main sem proteção | useEffect + return null implementados |
| 17 | expires_at falso na sessão | Valor alterado para 0 com comentário explicativo |

---

## 6. Itens Reabertos / Novos Tickets

### REABRIR — ACHADO 06 (reduzido para baixa prioridade)
**Título:** Eliminação da 3ª chamada de API no fluxo de login (`getAccountData`)  
**Contexto:** Login passou de 3 para 2 chamadas. A 3ª (`getAccountData`) permanece por limitação de design — o e-mail não é retornado no response de `/auth/login`.  
**Ação:** Retornar `email` no response de `POST /api/auth/login` para eliminar a dependência de `getAccountData` no fluxo de login.  
**Prioridade:** Baixa — não bloqueia funcionalidade; afeta apenas performance e resiliência.

---

### REABRIR — ACHADO 08 (infraestrutura)
**Título:** Blacklist de tokens em memória deve ser migrada para Redis  
**Contexto:** Documentado com TODO, mas não implementado. Após restart do backend, tokens revogados via logout voltam a ser válidos. A correção do ACHADO 04 (admin.signOut) mitiga o risco em condições normais.  
**Ação:** Implementar Redis (ou alternativa persistente) para a blacklist antes de escalar para produção com múltiplas instâncias ou alta criticidade.  
**Prioridade:** Alta — crítico antes de produção em escala.

---

### NOVO TICKET — REGRESSÃO 01
**Título:** Botão "Ir para o Login" na tela de sucesso do callback de e-mail deve ser "Ir para o Painel"  
**Contexto:** Introduzido pela correção do ACHADO 11. O usuário está autenticado após callback, mas o botão direciona para `/login` — que então redireciona para `/`. Confuso e com redirect desnecessário.  
**Ação:** Alterar `handleGoToLogin` no state de sucesso para `router.push('/')` e label para "Ir para o Painel".  
**Arquivo:** `frontend/src/app/auth/callback/page.tsx`  
**Prioridade:** Média — visível ao usuário em todo fluxo de confirmação de e-mail.

---

### NOVO TICKET — REGRESSÃO 02 (menor)
**Título:** Comentário residual "em 1 hora" na linha `max` do registerLimiter  
**Contexto:** Introduzido pela correção parcial do ACHADO 15. O `windowMs` foi corrigido mas o comentário do `max` ainda referencia "1 hora".  
**Ação:** Corrigir `// 10 tentativas de registro por IP em 1 hora` → `// 10 tentativas de registro por IP em 15 minutos`  
**Arquivo:** `backend/src/routes/auth.ts`, linha 24  
**Prioridade:** Baixa — não afeta comportamento, apenas manutenibilidade.

---

### NOVO TICKET — ACHADO 18 (parcial, manutenção futura)
**Título:** E-mail vazio no Header quando `getAccountData` falha na inicialização  
**Contexto:** Na função `initializeAuth()`, se `GET /api/account` falhar, o e-mail fica `''` e não há fallback disponível (diferente do login, onde `data.email` existe). `console.warn` foi adicionado mas a UX permanece degradada.  
**Ação:** Implementar retry com backoff exponencial para `getAccountData` na inicialização, ou retornar o e-mail no response de `/refresh/check` para eliminar a dependência.  
**Arquivo:** `frontend/src/context/AuthContext.tsx`  
**Prioridade:** Baixa — afeta apenas casos de falha de rede no carregamento inicial.

---

### NOVO TICKET — Mensagem 503 no Reset de Senha Inapropriada para Usuário Final
**Título:** Mensagem de 503 no resetPassword é técnica demais para usuário final  
**Contexto:** Com ACHADO 13 resolvido, se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada, o endpoint retorna: `"A redefinição de senha requer permissões administrativas que não estão configuradas."` — mensagem técnica exposta ao usuário.  
**Ação:** Substituir a mensagem de 503 por algo amigável: `"Não foi possível redefinir sua senha no momento. Tente novamente mais tarde ou entre em contato com o suporte."`  
**Arquivo:** `backend/src/controllers/passwordController.ts`  
**Prioridade:** Baixa — só manifesta em falha de configuração de ambiente.

---

## 7. Parecer Final

O ciclo de correções do Módulo 01 foi **substancial e tecnicamente sólido**. Os 5 achados críticos originais foram endereçados com código concreto e correto — não com patches superficiais. O módulo de autenticação está significativamente mais seguro e robusto do que antes.

**O que pode ir para produção com cautela:**
- As correções de autenticação (01–05, 07, 09, 10, 12–17, 16) estão aptas para produção.
- **Pré-requisito obrigatório:** `SUPABASE_SERVICE_ROLE_KEY` deve estar configurada — sem ela, logout (ACHADO 04) e reset de senha (ACHADO 13) ficam degradados.

**O que ainda deve ser resolvido antes de produção plena:**
- ACHADO 08 (blacklist em memória) — crítico em ambiente multi-instância.
- REGRESSÃO 01 (botão "Ir para o Login" na tela de sucesso) — visível em cada confirmação de e-mail.

**Recomendação geral:** ✅ Autorizar merge com os itens acima como pré-requisito de deploy. Abrir os 4 novos tickets para a próxima sprint.

---

*Revalidação gerada com base em leitura direta do código atualizado de todos os arquivos alterados pelo DEV. Cada classificação tem evidência concreta do código.*
