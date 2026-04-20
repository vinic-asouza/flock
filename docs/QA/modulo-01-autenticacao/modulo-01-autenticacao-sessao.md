# QA — Módulo 01: Autenticação e Sessão

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Módulo:** Autenticação e Sessão  
> **Status:** Auditoria completa  
> **Gravidade geral:** 🔴 ALTA — há falhas críticas de segurança e bugs silenciosos com impacto real

---

## 1. Resumo Executivo

O módulo de autenticação do Flock cobre login, logout, registro, callback de e-mail, recuperação de senha e gestão de sessão via cookies HttpOnly + Supabase Auth. A arquitetura geral é sólida, mas a auditoria identificou **18 achados**, incluindo **4 críticos** com impacto direto em segurança ou bloqueio de usuário.

### Principais riscos

| Risco | Impacto |
|-------|---------|
| Open redirect na página de login | Phishing, roubo de sessão |
| Regex de senha no formulário de login bloqueia usuários válidos | Usuário não consegue logar |
| `fetch` sem `credentials: 'include'` no callback de e-mail | Confirmação de e-mail não cria sessão em produção |
| `supabase.auth.signOut()` sem efeito real no server | Token permanece válido após logout |
| Blacklist de tokens em memória | Tokens revogados voltam a ser válidos após restart |
| `login()` realiza 3 chamadas de API | Lentidão, race condition, possível sessão parcial |

---

## 2. Mapa do Fluxo Analisado

```
[Usuário] → /login → (Zod FE) → POST /api/auth/login
                                 → supabase.signIn → set cookies → { church }
           → AuthContext.login() → getCheckAuth() → getAccountData() → setState
           → setTimeout(150ms) → router.push('/') ou window.location.replace(redirectUrl)

[Sessão expirada] → Interceptor 401 (api.ts) → window.location.href = '/login'

[Logout] → POST /api/auth/logout → blacklist token (memória) → clearCookies
         → AuthContext: clear user/session/role → (sem redirect explícito)

[Callback e-mail] → /auth/callback → fetch POST /api/auth/callback → setSession cookies
                  → status: success/error → botão "Fazer Login" → /login

[Forgot password] → POST /api/password/forgot → supabase.resetPasswordForEmail
[Reset password]  → /reset-password#access_token=... → POST /api/password/reset
```

---

## 3. Achados

---

### ACHADO 01 — Open Redirect no Login

- **Gravidade:** 🔴 Crítica
- **Tipo:** Segurança / Bug
- **Impacto no usuário:** Após login, o usuário pode ser redirecionado para qualquer URL externa, possibilitando phishing e roubo de sessão/cookies
- **Onde ocorre:** `frontend/src/app/(auth)/login/page.tsx`, linha 95
- **Arquivos relacionados:** `frontend/src/app/(auth)/login/page.tsx`

**Evidência:**
```typescript
// login/page.tsx — linha 32
const redirectUrl = searchParams.get('redirect');

// linha 95 — sem validação nenhuma
window.location.replace(redirectUrl);
```

**Como reproduzir:**
1. Acesse `/login?redirect=https://evil.com`
2. Faça login com credenciais válidas
3. Após login bem-sucedido, o navegador é enviado para `https://evil.com`

**Causa provável:** O parâmetro `redirect` é lido da URL e passado diretamente para `window.location.replace` sem qualquer validação de domínio ou protocolo.

**Correção sugerida:**
```typescript
// Validar que o redirect é uma rota interna
const isInternalRedirect = (url: string) => {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith('/') && !url.startsWith('//');
  }
};

if (redirectUrl && isInternalRedirect(redirectUrl)) {
  window.location.replace(redirectUrl);
} else {
  router.push('/');
}
```

---

### ACHADO 02 — Regex de Senha no Formulário de Login Bloqueia Usuários Válidos

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug / Validação
- **Impacto no usuário:** Usuário com senha válida cadastrada (mas que não atende à regex do FE) fica **permanentemente bloqueado de logar** pela interface. Não há mensagem que explique o problema real.
- **Onde ocorre:** `frontend/src/app/(auth)/login/page.tsx`, linhas 18–22
- **Arquivos relacionados:** `frontend/src/app/(auth)/login/page.tsx`

**Evidência:**
```typescript
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
});
```

**Problema:** Este schema é para um formulário de **registro**, não de **login**. No login, a senha deve ser enviada tal como foi digitada para o backend autenticar. A Zod vai rejeitar senhas válidas que não atendam à regex (ex: `"minhasenha123"` — sem maiúscula). O usuário vê "A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número" e nunca consegue submeter o formulário.

**Cenários de impacto:**
- Usuário que cadastrou a senha antes da regex ser adicionada
- Usuário cujo admin resetou a senha para algo simples
- Usuário que usa caracteres especiais mas sem maiúscula
- Usuário migrando de outro sistema

**Correção sugerida:**
```typescript
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  // Sem regex — o backend valida. No login, qualquer senha deve ser aceita para tentativa.
});
```

---

### ACHADO 03 — `fetch` sem `credentials: 'include'` no Callback de E-mail

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug / Contrato de API / Segurança
- **Impacto no usuário:** Em ambiente de produção (frontend e backend em domínios distintos), após confirmação de e-mail, os cookies de sessão **não são gravados no navegador**. O usuário vê "Email Confirmado!" mas está deslogado. Ao clicar em "Fazer Login", precisa logar manualmente.
- **Onde ocorre:** `frontend/src/app/auth/callback/page.tsx`, linhas 51–60
- **Arquivos relacionados:** `frontend/src/app/auth/callback/page.tsx`, `backend/src/controllers/authCallbackController.ts`

**Evidência:**
```typescript
// auth/callback/page.tsx — sem credentials
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/callback`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  // ❌ credentials: 'include' AUSENTE
});
```

**Backend retorna `Set-Cookie`** com `access_token`, `refresh_token`, `session_id`. Sem `credentials: 'include'`, o browser ignora esses cookies em requests cross-origin.

**Causa provável:** O `apiService` (Axios) usa `withCredentials: true` globalmente, mas este `fetch` foi escrito manualmente e esqueceu a configuração equivalente.

**Correção sugerida:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/callback`, {
  method: 'POST',
  credentials: 'include', // ← adicionar
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
});
```

---

### ACHADO 04 — `supabase.auth.signOut()` no Logout Não Invalida a Sessão do Usuário

- **Gravidade:** 🔴 Crítica
- **Tipo:** Segurança / Bug Silencioso
- **Impacto no usuário:** Após logout, o token de acesso do usuário permanece **tecnicamente válido no Supabase** durante todo o tempo de vida do JWT. A única proteção é a blacklist em memória, que é perdida em restart. Token vazado após logout pode ser reutilizado.
- **Onde ocorre:** `backend/src/controllers/authController.ts`, linhas 297–303
- **Arquivos relacionados:** `backend/src/controllers/authController.ts`, `backend/src/services/supabase.ts`

**Evidência:**
```typescript
// authController.ts — logout()
try {
  await supabase.auth.signOut();  // ← client anon, não invalida a sessão do usuário
} catch (signOutError) {
  console.warn('Supabase signOut não suportado no servidor:', signOutError);
}
```

**Problema:** O cliente `supabase` é o cliente anônimo (criado com `SUPABASE_KEY`). `supabase.auth.signOut()` nesse contexto encerra a sessão anônima do cliente backend, não a sessão autenticada do usuário. Para invalidar a sessão do usuário server-side, seria necessário usar `supabaseAdmin.auth.admin.signOut(userId)`.

**Causa provável:** Confusão entre o cliente anon (operações da aplicação) e o cliente admin (operações privilegiadas).

**Correção sugerida:**
```typescript
// Usar supabaseAdmin para invalidar a sessão do usuário
import supabaseAdmin from '../services/supabase'; // ou criar instância admin separada

// No logout:
if (user?.id) {
  try {
    await supabaseAdmin.auth.admin.signOut(user.id);
  } catch (signOutError) {
    console.warn('Erro ao invalidar sessão no Supabase:', signOutError);
  }
}
```

---

### ACHADO 05 — Estado Global de Erro no Login (Variáveis de Módulo)

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug / Estado inconsistente
- **Impacto no usuário:** Mensagem de erro de um login anterior pode aparecer em uma nova tentativa de login, mesmo após navegar para outra página e voltar. Em múltiplas abas, o erro de uma aba contamina a outra.
- **Onde ocorre:** `frontend/src/app/(auth)/login/page.tsx`, linhas 13–16, 27–28
- **Arquivos relacionados:** `frontend/src/app/(auth)/login/page.tsx`

**Evidência:**
```typescript
// Estado global persistido entre re-renderizações E entre navegações
let globalLoginError: string | null = null;
let globalLoginErrorDetails: string | null = null;

// Estado local inicializado a partir do global
const [error, setError] = useState<string | null>(globalLoginError);
```

**Problema:** Variáveis de módulo em JS/TS sobrevivem durante toda a sessão do browser (até refresh completo). Se o usuário:
1. Tenta logar → erro → navega para `/forgot-password` → volta para `/login`
2. O erro do login anterior está visível imediatamente (antes de qualquer ação)

Além disso, múltiplas abas no mesmo processo compartilham o mesmo módulo em alguns bundlers.

**Causa provável:** Workaround para evitar que o erro suma durante re-renders causados por outros estados. A solução correta é usar a própria API do `useState` com `useRef` para persistência durante re-renders.

**Correção sugerida:** Remover as variáveis globais. Usar apenas `useState`. Para persistir durante re-renders específicos do componente, usar `useRef`:
```typescript
// Remover globals
// let globalLoginError: string | null = null;
// let globalLoginErrorDetails: string | null = null;

// Usar apenas estado local
const [error, setError] = useState<string | null>(null);
const [errorDetails, setErrorDetails] = useState<string | null>(null);
// Se precisar de persistência entre re-renders: usar useRef internamente,
// mas nunca expor fora do componente.
```

---

### ACHADO 06 — Login Realiza 3 Chamadas de API Sequenciais

- **Gravidade:** 🟠 Alta
- **Tipo:** Risco / Performance / Race Condition
- **Impacto no usuário:** O login demora 3× mais do que deveria (3 roundtrips sequenciais para o backend). Se qualquer chamada intermediária falhar, o estado de autenticação fica parcial.
- **Onde ocorre:** `frontend/src/context/AuthContext.tsx`, linhas 111–122
- **Arquivos relacionados:** `frontend/src/context/AuthContext.tsx`, `frontend/src/services/api.ts`

**Evidência:**
```typescript
const login = useCallback(async (data: LoginData) => {
  const response = await apiService.login(data);          // 1ª chamada: POST /auth/login
  setUser(response.church);

  const { role } = await apiService.getCheckAuth();       // 2ª chamada: GET /refresh/check
  setCurrentRole((role as ChurchUserRole) ?? 'reader');

  try {
    const accountData = await apiService.getAccountData(); // 3ª chamada: GET /account
    userEmail = accountData.email || data.email;
  } catch { /* silenciado */ }
  ...
```

**Problema:**
- Chamadas 2 e 3 são redundantes: o `POST /auth/login` já retorna `church`. O `role` poderia ser retornado no response de login.
- Se a 2ª chamada (`getCheckAuth`) falhar, `currentRole` fica `null` mas `user` está setado — estado inconsistente onde o usuário está "logado" mas sem papel definido.
- Cada chamada adiciona ~50–200ms de latência. Em redes lentas, o login pode levar >1 segundo além do necessário.

**Correção sugerida:**
- Retornar `role` no response de `POST /api/auth/login` junto com `church`
- Remover a 2ª chamada `getCheckAuth()` de dentro do `login()`
- A 3ª chamada (`getAccountData`) deve ser lazy, disparada apenas quando a UI precisar do e-mail

---

### ACHADO 07 — `isLoggingIn` Nunca é Resetado em Caso de Sucesso

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug / Estado inconsistente
- **Impacto no usuário:** Se o redirecionamento após login falhar (ex: `router.push('/')` não navegar, rede instável, erro JS), o estado `isLoggingIn = true` permanece para sempre. O `useEffect` de redirecionamento automático baseado em `user && !isLoggingIn` nunca dispara novamente, deixando o usuário preso na tela de login mesmo autenticado.
- **Onde ocorre:** `frontend/src/app/(auth)/login/page.tsx`, linhas 78, 100–101
- **Arquivos relacionados:** `frontend/src/app/(auth)/login/page.tsx`

**Evidência:**
```typescript
const onSubmit = async (data: LoginFormData) => {
  setIsLoggingIn(true);
  // ...
  await login(data);
  // Não resetar isLoggingIn aqui pois vamos sair da página
  // ↑ Comentário correto apenas se a navegação SEMPRE acontecer
  router.push('/');
  // Se router.push falhar silenciosamente: isLoggingIn = true para sempre
};
```

**Correção sugerida:**
```typescript
try {
  await login(data);
  // Navegar primeiro, resetar o estado em finally caso a navegação falhe
  if (redirectUrl) {
    window.location.replace(redirectUrl);
  } else {
    router.push('/');
  }
} catch (err) {
  // ...
  setIsLoggingIn(false);
} finally {
  // Garantir reset se por algum motivo não saiu da página
  // O timeout aqui garante que o redirect teve chance de acontecer
  setTimeout(() => setIsLoggingIn(false), 1000);
}
```

---

### ACHADO 08 — Blacklist de Tokens em Memória Não Persiste

- **Gravidade:** 🟠 Alta
- **Tipo:** Risco de Segurança / Dívida Técnica
- **Impacto no usuário:** Após um restart do servidor backend, todos os tokens revogados pelo logout voltam a ser válidos. Qualquer token que foi "invalidado" por logout pode ser reutilizado por um atacante.
- **Onde ocorre:** `backend/src/controllers/authController.ts`, linhas 307–329; `backend/src/middlewares/auth.ts`, linhas 102–107
- **Arquivos relacionados:** `backend/src/controllers/authController.ts`, `backend/src/middlewares/auth.ts`

**Evidência:**
```typescript
// authController.ts
if (!global.tokenBlacklist) {
  global.tokenBlacklist = new Set();  // ← memória volátil
}
global.tokenBlacklist.add(token);
```
```typescript
// auth.ts
if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
  return res.status(401).json({ error: 'Token revogado' });
}
```

O próprio código comenta: `// Em produção, usar Redis ou banco de dados`

**Correção sugerida:** Usar Redis (preferencial) ou tabela `revoked_tokens` no Supabase. Em caráter imediato, pelo menos documentar o risco e adicionar monitoramento de restarts.

---

### ACHADO 09 — Logout Silenciosamente Ignorado no `api.ts`

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug Silencioso / Segurança
- **Impacto no usuário:** Se o servidor estiver indisponível no momento do logout, o cliente limpa seu estado local mas o servidor **não processa a invalidação** do token. O token permanece válido e ativo sem nenhum aviso ao usuário.
- **Onde ocorre:** `frontend/src/services/api.ts`, linhas 163–171
- **Arquivos relacionados:** `frontend/src/services/api.ts`, `frontend/src/context/AuthContext.tsx`

**Evidência:**
```typescript
async logout(): Promise<void> {
  try {
    await this.api.post('/auth/logout');
  } catch {
    // Mesmo com erro, o servidor limpa os cookies automaticamente
    // Silenciar erro - não crítico, o servidor limpa os cookies automaticamente
    // ↑ Comentário incorreto: sem resposta do servidor, cookies NÃO são limpos pelo servidor
  }
}
```

**Correção sugerida:** Pelo menos logar o erro e informar ao usuário em casos de falha de rede no logout. A limpeza local de cookies/estado ainda deve ocorrer, mas o usuário deve ser informado:
```typescript
async logout(): Promise<void> {
  try {
    await this.api.post('/auth/logout');
  } catch (error) {
    console.warn('[Logout] Falha ao comunicar logout ao servidor. Token pode ainda estar ativo.', error);
    // Opcionalmente: throw para a UI exibir um aviso
  }
}
```

---

### ACHADO 10 — Dois Botões Idênticos "Fazer Login" no Estado de Erro do Callback

- **Gravidade:** 🟡 Média
- **Tipo:** Bug de UX / Interface
- **Impacto no usuário:** Na tela de erro da confirmação de e-mail, dois botões com o mesmo label "Fazer Login" e o mesmo comportamento aparecem lado a lado. O usuário não sabe o que fazer se a confirmação falhou, e não tem como reenviar o e-mail de confirmação.
- **Onde ocorre:** `frontend/src/app/auth/callback/page.tsx`, linhas 142–158
- **Arquivos relacionados:** `frontend/src/app/auth/callback/page.tsx`

**Evidência:**
```tsx
{status === 'error' && (
  <div className="space-y-3">
    <Button onClick={handleRetry} variant="primary">
      Fazer Login  {/* ← idêntico */}
    </Button>
    <Button onClick={handleGoToLogin} variant="secondary">
      Fazer Login  {/* ← idêntico */}
    </Button>
  </div>
)}
```

Ambos chamam `router.push('/login')`.

**Correção sugerida:** O segundo botão deve ser "Reenviar confirmação" ou "Voltar e tentar novamente", redirecionando para uma página que permita reenvio do e-mail de confirmação.

---

### ACHADO 11 — Mensagem de Sucesso no Callback Induz Usuário a Ação Desnecessária

- **Gravidade:** 🟡 Média
- **Tipo:** Inconsistência de UX
- **Impacto no usuário:** Após confirmação bem-sucedida, o backend seta cookies de sessão (usuário está logado), mas a UI exibe "Agora você pode fazer login" e um botão "Fazer Login". O usuário precisa clicar e só então o `AuthGuard` detecta a sessão e redireciona para `/`. Fluxo confuso e com um passo desnecessário.
- **Onde ocorre:** `frontend/src/app/auth/callback/page.tsx`, linhas 118–133
- **Arquivos relacionados:** `frontend/src/app/auth/callback/page.tsx`

**Evidência:**
```tsx
{status === 'success' && (
  <p>"Email confirmado com sucesso! Agora você pode fazer login no sistema."</p>
  <Button onClick={handleGoToLogin}>Fazer Login</Button>
)}
```

**Correção sugerida:** Se os cookies foram definidos corretamente (achado 03 resolvido), redirecionar automaticamente após 1–2 segundos para `/` ou `/checkout` (no fluxo de registro). Exibir mensagem: "Email confirmado! Redirecionando..."

---

### ACHADO 12 — `useEffect` com Dependência `router` Inutilizada no Callback

- **Gravidade:** 🟢 Baixa
- **Tipo:** Dívida Técnica / Comportamento Inesperado
- **Impacto no usuário:** `router` está na dependency array do `useEffect` mas não é usado dentro do effect. Se o objeto `router` mudar de referência entre renders (comportamento do Next.js App Router), o effect pode reexecutar, fazendo uma segunda chamada `POST /api/auth/callback` com os mesmos tokens.
- **Onde ocorre:** `frontend/src/app/auth/callback/page.tsx`, linha 83
- **Arquivos relacionados:** `frontend/src/app/auth/callback/page.tsx`

**Evidência:**
```typescript
useEffect(() => {
  const handleAuthCallback = async () => { ... };
  handleAuthCallback();
}, [router]); // ← router não é usado dentro do effect
```

**Correção sugerida:**
```typescript
useEffect(() => {
  handleAuthCallback();
}, []); // dependency array vazia — executa apenas uma vez no mount
```

---

### ACHADO 13 — `resetPassword` Backend Usa Access Token como Refresh Token

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug / Contrato de API
- **Impacto no usuário:** O reset de senha pode falhar silenciosamente ou com erros opacos em futuras versões do Supabase. O fluxo atual é semanticamente incorreto.
- **Onde ocorre:** `backend/src/controllers/passwordController.ts`, linhas 161–171
- **Arquivos relacionados:** `backend/src/controllers/passwordController.ts`

**Evidência:**
```typescript
const { data: { session }, error: sessionError } = await supabase.auth.setSession({
  access_token: token,      // ← token de reset de senha
  refresh_token: token      // ← MESMO token usado como refresh_token — incorreto
});
```

**Problema:** `setSession` espera dois tokens distintos: `access_token` (JWT curto) e `refresh_token` (token opaco longo). Usar o mesmo valor para ambos é inválido pelo design do Supabase Auth. Funciona apenas porque o Supabase tem uma lógica interna de tolerância, mas pode quebrar sem aviso.

**Correção sugerida:** O fluxo correto para reset de senha com Supabase é verificar o token via `supabase.auth.exchangeCodeForSession()` ou usar o `supabase.auth.updateUser({ password })` após o usuário estar autenticado pelo callback de reset. Verificar a documentação do Supabase para o fluxo server-side de reset de senha.

---

### ACHADO 14 — Validação de E-mail Ausente no Backend de `forgotPassword`

- **Gravidade:** 🟡 Média
- **Tipo:** Validação ausente
- **Impacto no usuário:** E-mails com formato inválido são passados diretamente ao Supabase. A mensagem de erro retornada ao usuário vem do Supabase em inglês ou sem contexto útil.
- **Onde ocorre:** `backend/src/controllers/passwordController.ts`, linhas 14–17
- **Arquivos relacionados:** `backend/src/controllers/passwordController.ts`

**Evidência:**
```typescript
const { email } = req.body;
if (!email) { // ← valida apenas vazio, não formato
  return res.status(400).json({ error: 'Email não fornecido' });
}
await supabase.auth.resetPasswordForEmail(email, { ... }); // email pode ser "nãoéumemail"
```

**Correção sugerida:** Adicionar validação Joi antes da chamada ao Supabase:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
  return res.status(400).json({ error: 'Email inválido', details: 'Informe um endereço de email válido' });
}
```

---

### ACHADO 15 — Comentário Incorreto no Rate Limiter de Registro

- **Gravidade:** 🟢 Baixa
- **Tipo:** Dívida Técnica / Documentação
- **Impacto:** Confunde desenvolvedores durante manutenção, levando a ajustes errados de configuração
- **Onde ocorre:** `backend/src/routes/auth.ts`, linha 23
- **Arquivos relacionados:** `backend/src/routes/auth.ts`

**Evidência:**
```typescript
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 hora  ← ERRADO: é 15 minutos, não 1 hora
  max: 10,
```

**Correção sugerida:**
```typescript
windowMs: 15 * 60 * 1000, // 15 minutos
```

---

### ACHADO 16 — Layout `(main)` Sem Proteção de Autenticação

- **Gravidade:** 🟠 Alta
- **Tipo:** Risco de Segurança / UX
- **Impacto no usuário:** Usuário com sessão inválida consegue ver a "casca" do app (Header, Sidebar, Footer) por alguns milissegundos antes de qualquer erro aparecer. Em situações de falha do backend, o usuário pode ficar preso no layout autenticado sem dados e sem redirecionamento.
- **Onde ocorre:** `frontend/src/app/(main)/layout.tsx`
- **Arquivos relacionados:** `frontend/src/app/(main)/layout.tsx`

**Evidência:**
```typescript
export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  // ← sem verificação de autenticação, sem redirect para /login
  return (
    <div>
      <Header />
      <Sidebar churchName={user?.name || ''} />
      {children}
    </div>
  );
}
```

Apenas `src/app/page.tsx` (home) tem `<ProtectedRoute>`. As demais rotas — `/members`, `/integration`, `/groups`, `/congregations`, `/calendar`, `/settings`, `/tutorials` — não têm nenhuma proteção de layout.

**Correção sugerida:** Adicionar proteção no layout `(main)`:
```typescript
export default function MainLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return null; // evita flash de conteúdo

  return ( /* layout normal */ );
}
```

---

### ACHADO 17 — Sessão com `expires_at` Calculado no Cliente (Falso)

- **Gravidade:** 🟡 Média
- **Tipo:** Bug Silencioso / Contrato de API
- **Impacto no usuário:** O objeto `session` no contexto tem um `expires_at` calculado no momento do login como `Date.now() + 15min`, sem relação com o token real do Supabase. Qualquer lógica que dependa de `session.expires_at` para verificar expiração vai funcionar incorretamente.
- **Onde ocorre:** `frontend/src/context/AuthContext.tsx`, linhas 126–130
- **Arquivos relacionados:** `frontend/src/context/AuthContext.tsx`

**Evidência:**
```typescript
setSession({
  access_token: 'stored_in_cookie',    // ← placeholder
  refresh_token: 'stored_in_cookie',   // ← placeholder
  expires_at: Date.now() + 15 * 60 * 1000,  // ← calculado localmente, não é o real
  expires_in: 900,
  ...
});
```

A expiração real vem do cookie `session_id` gerenciado pelo backend. O valor aqui é puramente decorativo. Se alguém usar `session.expires_at` para pré-redirecionar antes da expiração real, o comportamento será incorreto.

**Correção sugerida:** Se o `expires_at` real não está disponível no response de login, remover o campo do objeto session fictício, ou retorná-lo explicitamente no `POST /api/auth/login`.

---

### ACHADO 18 — `getAccountData()` Silenciado Causa E-mail Vazio na UI

- **Gravidade:** 🟡 Média
- **Tipo:** Bug Silencioso / UX
- **Impacto no usuário:** Se `GET /api/account` falhar na inicialização ou no login (rede instável, timeout), o e-mail do usuário no Header fica em branco indefinidamente. Não há retry, não há fallback visível.
- **Onde ocorre:** `frontend/src/context/AuthContext.tsx`, linhas 60–66 e 118–123
- **Arquivos relacionados:** `frontend/src/context/AuthContext.tsx`

**Evidência:**
```typescript
try {
  const accountData = await apiService.getAccountData();
  userEmail = accountData.email || '';
} catch {
  // não crítico  ← mas afeta UI
}
```

**Correção sugerida:** Implementar retry com backoff ou, ao menos, usar o e-mail digitado no login como fallback confiável (o campo `data.email` já está disponível no `login()` function):
```typescript
// Na função login(), o email digitado está disponível como data.email
// Usá-lo como fallback garantido em vez de tentar buscar da API
let userEmail = data.email; // fallback confiável
try {
  const accountData = await apiService.getAccountData();
  userEmail = accountData.email || data.email;
} catch {
  // usa data.email como fallback
}
```

---

## 4. Cenários Extras a Testar

### Cenários de Login

| # | Cenário | Resultado Esperado | Risco |
|---|---------|-------------------|-------|
| 1 | Login com senha válida que não tem maiúscula | Deve logar — **atualmente bloqueado pelo Zod** | 🔴 Crítico |
| 2 | Login com `?redirect=https://google.com` | Deve redirecionar apenas para URLs internas | 🔴 Crítico |
| 3 | Duplo clique rápido no botão "Entrar" | Deve enviar apenas 1 request | 🟠 Alta |
| 4 | Login com e-mail não confirmado | Deve exibir mensagem específica | 🟡 Média |
| 5 | Login com servidor indisponível (timeout) | Deve exibir erro adequado, não spinner eterno | 🟡 Média |
| 6 | Pressionar Enter no campo e-mail (sem senha) | Deve validar antes de submeter | 🟡 Média |
| 7 | Colar senha com espaços | Deve ser aceita (espaços são válidos em senhas) | 🟡 Média |
| 8 | Login em múltiplas abas simultâneas | Sessão deve ser consistente em todas | 🟠 Alta |
| 9 | Navegar para /login estando logado | Deve redirecionar para / (AuthGuard) | 🟡 Média |
| 10 | Login após logout sem refresh de página | Estado deve ser limpo corretamente | 🟠 Alta |

### Cenários de Sessão

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 11 | Cookie expirado → acesso a /members | Deve redirecionar para /login |
| 12 | Cookie expirado → backend faz refresh automático | Novo cookie deve ser setado |
| 13 | Refresh token expirado → acesso protegido | Deve limpar cookies e redirecionar |
| 14 | Restart do servidor → token na blacklist | Token deve ser aceito novamente (risco 08) |
| 15 | Acesso direto por URL `/members` sem cookie | Deve redirecionar para /login |
| 16 | Backend retorna 500 em `/refresh/check` | Login page não deve quebrar, deve exibir estado de não autenticado |

### Cenários de Logout

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 17 | Logout com servidor indisponível | Deve limpar estado local e redirecionar para /login |
| 18 | Logout + uso imediato do token antigo via API tool | Deve ser rejeitado (blacklist) |
| 19 | Logout em múltiplas abas | Todas as abas devem ser deslogadas |

### Cenários de Callback de E-mail

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 20 | Clicar no link de confirmação após expiração | Deve exibir erro claro com opção de reenvio |
| 21 | Clicar no link de confirmação duas vezes | Segundo clique deve exibir mensagem adequada |
| 22 | Acessar `/auth/callback` sem hash na URL | Deve exibir erro "Token inválido" |
| 23 | Acessar `/auth/callback` com `?error=access_denied` | Deve exibir erro específico |

### Cenários de Reset de Senha

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 24 | Acessar `/reset-password` sem hash | Deve exibir "Link não encontrado" imediatamente |
| 25 | Link de reset expirado (frontend detecta) | Deve exibir erro e opção de solicitar novo link |
| 26 | Reset com a mesma senha atual | Backend deve aceitar (não há restrição, e está correto) |
| 27 | Refresh na página de reset após submissão bem-sucedida | Não deve tentar resetar novamente |

---

## 5. Lacunas de Cobertura

### Testes Automatizados Ausentes

| Tipo | O que deveria existir |
|------|----------------------|
| Teste de integração | Login com senha válida sem maiúscula — deve enviar ao backend |
| Teste unitário | `loginSchema` do Zod — verificar que não valida complexidade |
| Teste E2E | Fluxo completo: registro → confirmação de e-mail → login |
| Teste E2E | Logout → uso do token revogado → deve retornar 401 |
| Teste de segurança | Open redirect — `?redirect=https://evil.com` |
| Teste de integração | `fetch` com e sem `credentials: 'include'` em ambiente cross-origin |

### Validações Ausentes no Backend

| Endpoint | O que falta |
|----------|-------------|
| `POST /api/auth/login` | Validação Joi de formato de e-mail e senha mínima |
| `POST /api/password/forgot` | Validação de formato de e-mail |

### Observabilidade/Logs Ausentes

| Ponto | Problema |
|-------|---------|
| Logout com erro de rede | Não logado; token fica ativo sem rastreio |
| `getAccountData()` falha silenciosa | Sem log; UI fica com e-mail vazio sem diagnóstico |
| Callback de e-mail | Sem log estruturado de qual token foi processado |

### Contratos Não Garantidos

| Contrato | Status |
|----------|--------|
| `POST /api/auth/login` não retorna `role` | Frontend faz 2ª chamada para obter role — acoplamento implícito |
| `GET /refresh/check` sempre retorna 200 | Nunca dispara interceptor de erro — comportamento não documentado |
| `Session.expires_at` no FE | Valor fictício — qualquer consumer que confiar nele vai falhar |

---

## 6. Resumo dos Achados por Prioridade de Correção

| # | Achado | Gravidade | Ação Imediata |
|---|--------|-----------|---------------|
| 02 | Regex de senha no login bloqueia usuários | 🔴 Crítica | Remover regex do loginSchema |
| 01 | Open redirect no parâmetro `redirect` | 🔴 Crítica | Validar que URL é interna |
| 03 | `fetch` sem `credentials: 'include'` no callback | 🔴 Crítica | Adicionar `credentials: 'include'` |
| 04 | `supabase.auth.signOut()` sem efeito real | 🔴 Crítica | Usar `supabaseAdmin.auth.admin.signOut(userId)` |
| 13 | `resetPassword` usa access_token como refresh_token | 🔴 Crítica | Revisar fluxo de reset com Supabase |
| 08 | Blacklist em memória | 🟠 Alta | Implementar Redis ou planejar migration |
| 09 | Logout silencioso no `api.ts` | 🟠 Alta | Logar erro; não engolir silenciosamente |
| 06 | 3 chamadas de API no login | 🟠 Alta | Retornar `role` no response de login |
| 16 | Layout `(main)` sem proteção | 🟠 Alta | Adicionar verificação de auth no layout |
| 05 | Estado global de erro no login | 🟠 Alta | Remover variáveis de módulo globais |
| 07 | `isLoggingIn` não resetado no sucesso | 🟠 Alta | Adicionar reset em `finally` |
| 10 | Dois botões "Fazer Login" no callback erro | 🟡 Média | Diferenciar labels e ações |
| 11 | Callback sucesso pede login manual | 🟡 Média | Auto-redirecionar após confirmação |
| 17 | `expires_at` falso na sessão | 🟡 Média | Retornar do backend ou remover |
| 18 | `getAccountData()` silenciado | 🟡 Média | Usar e-mail do login como fallback |
| 14 | Sem validação de e-mail no forgot-password BE | 🟡 Média | Adicionar validação Joi |
| 12 | Dependência `router` inutilizada no useEffect | 🟢 Baixa | Remover da dependency array |
| 15 | Comentário errado no rate limiter | 🟢 Baixa | Corrigir comentário |

---

*Arquivo gerado com base em leitura completa do código-fonte. Todos os achados têm evidências diretas dos arquivos citados.*
