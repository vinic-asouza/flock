# DEV Report — Módulo 01: Autenticação e Sessão

> **Engenheiro:** Dev Sênior (IA)
> **Data:** Abril 2026
> **Base:** QA Report `modulo-01-autenticacao-sessao.md`
> **Status:** Execução completa — 18 achados tratados

---

## Resumo da Execução

Todos os 18 achados do relatório de QA foram tratados. Nenhum item foi descartado sem justificativa. Os 5 achados críticos e os 6 de alta gravidade foram corrigidos diretamente no código. Os achados médios e baixos foram corrigidos ou documentados com comentários explicativos.

---

## Achados Tratados

---

### ACHADO 01 — Open Redirect no Login

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/(auth)/login/page.tsx`
- **O que foi feito:** Criada função `isInternalRedirect(url)` que valida se a URL pertence ao mesmo origin da aplicação. Aplicada nos dois pontos de redirect: `onSubmit` (após login) e `useEffect` (redirect automático ao carregar a página já logado). Qualquer URL externa agora cai no fallback `router.push('/')`.
- **Causa raiz:** O parâmetro `?redirect=` era usado sem nenhuma verificação de domínio/protocolo.

---

### ACHADO 02 — Regex de Senha no Formulário de Login Bloqueia Usuários Válidos

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/(auth)/login/page.tsx`
- **O que foi feito:** Removida validação de complexidade de senha do `loginSchema`. A senha agora exige apenas `min(1, 'Senha obrigatória')`. Validação de complexidade pertence ao formulário de **registro**, não de login.
- **Causa raiz:** Schema de registro aplicado erroneamente ao formulário de login.

---

### ACHADO 03 — `fetch` sem `credentials: 'include'` no Callback de E-mail

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`
- **O que foi feito:** Adicionado `credentials: 'include'` à chamada `fetch` manual. Sem isso, em ambientes cross-origin, o browser ignorava os cookies `Set-Cookie` retornados pelo backend — o usuário via "Email Confirmado!" mas estava deslogado.
- **Causa raiz:** O `fetch` foi escrito manualmente (sem usar o `apiService` Axios que tem `withCredentials: true` global).

---

### ACHADO 04 — `supabase.auth.signOut()` no Logout Não Invalida a Sessão do Usuário

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/controllers/authController.ts`
- **O que foi feito:** Substituído `supabase.auth.signOut()` (cliente anon) por `supabaseAdmin.auth.admin.signOut(user.id)`. O cliente admin usa a `SERVICE_ROLE_KEY` e invalida efetivamente a sessão do usuário no Supabase. Se `supabaseAdmin` não estiver disponível (variável de ambiente ausente), um `console.warn` explícito é emitido.
- **Causa raiz:** Confusão entre cliente anon (sessão do backend) e cliente admin (sessão do usuário).

---

### ACHADO 05 — Estado Global de Erro no Login (Variáveis de Módulo)

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/(auth)/login/page.tsx`
- **O que foi feito:** Removidas as variáveis de módulo `globalLoginError` e `globalLoginErrorDetails`. Estado de erro gerenciado exclusivamente via `useState` inicializado com `null`. Removidos também `errorRef` e `errorDetailsRef` que não tinham consumidores reais. JSX simplificado para usar apenas `error` e `errorDetails` do estado.
- **Causa raiz:** Workaround para evitar que erros sumissem durante re-renders; a solução correta é apenas `useState`.

---

### ACHADO 06 — Login Realiza 3 Chamadas de API Sequenciais

- **Status:** ✅ Corrigido
- **Arquivos:**
  - `backend/src/controllers/authController.ts` — adicionado `role: context.role` ao response de `POST /api/auth/login`
  - `frontend/src/types/index.ts` — `LoginResponse` atualizado com campo `role?: ChurchUserRole`
  - `frontend/src/context/AuthContext.tsx` — `login()` usa `response.role` diretamente, eliminando a 2ª chamada `getCheckAuth()`
- **O que foi feito:** O `role` do usuário, que já era calculado no controller (via `getChurchContextForUser`), agora é retornado no response de login. O frontend eliminou a segunda chamada redundante. A terceira chamada (`getAccountData`) é mantida por ora — tem fallback garantido com `data.email`.
- **Causa raiz:** Backend não retornava role no login, forçando o frontend a buscar separadamente.

---

### ACHADO 07 — `isLoggingIn` Nunca é Resetado em Caso de Sucesso

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/(auth)/login/page.tsx`
- **O que foi feito:** Adicionado `setTimeout(() => setIsLoggingIn(false), 2000)` no bloco `try`, após o comando de redirect. Se a navegação falhar silenciosamente, o estado será liberado após 2 segundos, permitindo que o `useEffect` de redirecionamento automático funcione novamente.
- **Causa raiz:** O código assumia que a navegação SEMPRE ocorreria, sem fallback.

---

### ACHADO 08 — Blacklist de Tokens em Memória Não Persiste

- **Status:** ⚠️ Documentado (dívida técnica reconhecida)
- **Arquivo:** `backend/src/controllers/authController.ts`
- **O que foi feito:** Adicionado comentário `TODO` explícito na blacklist identificando o risco: tokens revogados voltam a ser válidos após restart. Recomendação: substituir por Redis ou tabela `revoked_tokens` no Supabase antes de produção com alta criticidade.
- **Motivo de não corrigir agora:** Implementar Redis requer provisioning de infraestrutura (fora do escopo dessa sessão). A correção de ACHADO 04 (admin.signOut) mitiga parte do risco.

---

### ACHADO 09 — Logout Silenciosamente Ignorado no `api.ts`

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/services/api.ts`
- **O que foi feito:** O `catch` do `logout()` agora emite `console.warn` informando que a falha de comunicação deixa o token potencialmente ativo no Supabase. O comentário incorreto ("o servidor limpa os cookies automaticamente" — o que não é verdade sem resposta do servidor) foi removido.
- **Causa raiz:** Erro de comunicação engolido silenciosamente com comentário enganoso.

---

### ACHADO 10 — Dois Botões Idênticos "Fazer Login" no Estado de Erro do Callback

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`
- **O que foi feito:** Diferenciados labels e ações dos dois botões. O primário agora diz **"Ir para o Login"** (vai para `/login`). O secundário diz **"Reenviar confirmação"** (vai para `/login?message=email_confirm_required`), que exibe a mensagem de orientação sobre o link de confirmação. Função `handleRetry` desnecessária foi removida.
- **Causa raiz:** Labels idênticos por erro de copypaste; ações idênticas (ambas chamavam `router.push('/login')`).

---

### ACHADO 11 — Mensagem de Sucesso no Callback Induz Usuário a Ação Desnecessária

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`
- **O que foi feito:** Após confirmação bem-sucedida (com achado 03 resolvido, cookies agora são gravados corretamente), a mensagem foi atualizada para "Email confirmado com sucesso! Redirecionando..." e um `setTimeout(() => router.push('/'), 2000)` redireciona automaticamente para a home. O botão "Ir para o Login" permanece como ação manual imediata.
- **Causa raiz:** Backend setava cookies mas o frontend não aproveitava e ainda pedia login manual.

---

### ACHADO 12 — `useEffect` com Dependência `router` Inutilizada no Callback

- **Status:** ✅ Corrigido (com ajuste de entendimento)
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`
- **Ajuste de entendimento:** No código novo, `router` agora é efetivamente usado dentro do effect (para o auto-redirect do achado 11). Portanto, mantê-lo na dependency array é correto para o `exhaustive-deps`. O problema original (dupla execução) foi resolvido com `useRef hasRun` que garante execução única independente de mudança de referência do `router`.
- **Causa raiz original:** `router` na dependency array sem ser usado no effect causava risco de dupla execução do POST para o backend.

---

### ACHADO 13 — `resetPassword` Backend Usa Access Token como Refresh Token

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/controllers/passwordController.ts`
- **O que foi feito:** Removida a chamada `supabase.auth.setSession({ access_token: token, refresh_token: token })` que era semanticamente incorreta (dois campos distintos com o mesmo valor). Substituída por `supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword })` — o token de recuperação já foi validado via `supabase.auth.getUser(token)` na linha anterior, portanto o `user.id` é confiável. Se `supabaseAdmin` não estiver disponível, retorna 503.
- **Causa raiz:** Falta de conhecimento sobre a API Admin do Supabase para operações server-side.

---

### ACHADO 14 — Validação de E-mail Ausente no Backend de `forgotPassword`

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/controllers/passwordController.ts`
- **O que foi feito:** Adicionada validação de formato de email via regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` antes de chamar `supabase.auth.resetPasswordForEmail`. Retorna `400` com mensagem amigável em português se o formato for inválido.
- **Causa raiz:** Validação verificava apenas `!email` (campo vazio), não o formato.

---

### ACHADO 15 — Comentário Incorreto no Rate Limiter de Registro

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/routes/auth.ts`
- **O que foi feito:** Comentário corrigido de `// 1 hora` para `// 15 minutos`, alinhando com o valor real de `windowMs: 15 * 60 * 1000`.
- **Causa raiz:** Erro de digitação/copypaste sem revisão.

---

### ACHADO 16 — Layout `(main)` Sem Proteção de Autenticação

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/(main)/layout.tsx`
- **O que foi feito:** Adicionada verificação de autenticação no layout. Enquanto `isLoading` é `true`, exibe spinner. Quando `!isAuthenticated` após o carregamento, redireciona para `/login` via `useEffect` e retorna `null` imediatamente para evitar flash do conteúdo. Todas as rotas sob `(main)` — `/members`, `/groups`, `/calendar`, `/settings` etc. — agora têm proteção centralizada no layout.
- **Causa raiz:** Apenas `src/app/page.tsx` tinha `<ProtectedRoute>` individualmente; o layout compartilhado não verificava autenticação.

---

### ACHADO 17 — Sessão com `expires_at` Calculado no Cliente (Falso)

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/context/AuthContext.tsx`
- **O que foi feito:** O campo `expires_at` na session fictícia passou de `Date.now() + 15 * 60 * 1000` para `0`. O valor real de expiração está no cookie `session_id` gerenciado pelo backend. Expor um placeholder calculado localmente enganaria qualquer consumer que verificasse expiração via `session.expires_at`. O comentário explica o motivo.
- **Causa raiz:** Tentativa de preencher o tipo `Session` completo sem dados reais disponíveis no frontend.

---

### ACHADO 18 — `getAccountData()` Silenciado Causa E-mail Vazio na UI

- **Status:** ✅ Corrigido (parcial — fallback já existia em `login()`, adicionado warn em `initializeAuth`)
- **Arquivo:** `frontend/src/context/AuthContext.tsx`
- **O que foi feito:**
  - Em `login()`: `data.email` já era usado como fallback garantido (linha `let userEmail = data.email`). Adicionado `console.warn` no catch para rastreabilidade.
  - Em `initializeAuth()`: sem acesso ao email digitado, o fallback permanece `''`. Adicionado `console.warn` para diagnóstico em vez de engolir silenciosamente.
- **Limitação remanescente:** Na inicialização (`initializeAuth`), não há `data.email` disponível — o email pode ficar vazio se `getAccountData` falhar. Solução completa exigiria retry com backoff ou armazenamento temporário do email.

---

## Achados Não Aplicáveis / Fora de Escopo

Nenhum achado foi descartado. Todos foram tratados ou documentados.

---

## Arquivos Alterados

| Arquivo | Achados |
|---------|---------|
| `frontend/src/app/(auth)/login/page.tsx` | 01, 02, 05, 07 |
| `frontend/src/app/auth/callback/page.tsx` | 03, 10, 11, 12 |
| `frontend/src/app/(main)/layout.tsx` | 16 |
| `frontend/src/context/AuthContext.tsx` | 06, 17, 18 |
| `frontend/src/services/api.ts` | 09 |
| `frontend/src/types/index.ts` | 06 (contrato LoginResponse) |
| `backend/src/controllers/authController.ts` | 04, 06, 08 |
| `backend/src/controllers/passwordController.ts` | 13, 14 |
| `backend/src/routes/auth.ts` | 15 |

---

## Riscos Remanescentes

| Risco | Achado | Status |
|-------|--------|--------|
| Blacklist de tokens em memória | 08 | ⚠️ Documentado — requer Redis em produção |
| `expires_at` na sessão do FE ainda é placeholder (`0`) | 17 | ⚠️ Parcial — não causa bug imediato pois nenhuma lógica atual depende do valor |
| Email vazio na UI ao inicializar com `getAccountData` offline | 18 | ⚠️ Parcial — sem retry/backoff implementado |
| `SUPABASE_SERVICE_ROLE_KEY` ausente | 04, 13 | ⚠️ Se a variável não estiver configurada, signOut e resetPassword ficam degradados |

---

## Cenários de Revalidação Manual Recomendados

| # | Cenário | Arquivo Relevante |
|---|---------|-------------------|
| 1 | Login com senha válida sem maiúscula | `login/page.tsx` |
| 2 | `?redirect=https://evil.com` após login | `login/page.tsx` |
| 3 | Duplo clique no botão "Entrar" | `login/page.tsx` |
| 4 | Confirmação de e-mail (link válido) → deve logar e redirecionar para `/` | `auth/callback/page.tsx` |
| 5 | Confirmação de e-mail (link expirado) → botão "Reenviar confirmação" | `auth/callback/page.tsx` |
| 6 | Logout → acesso direto a `/members` → deve ir para `/login` | `(main)/layout.tsx` |
| 7 | Reset de senha com link válido | `passwordController.ts` |
| 8 | `POST /password/forgot` com email formato inválido → 400 amigável | `passwordController.ts` |
| 9 | Restart do backend → token antigo blacklistado → volta a ser aceito (risco 08 documentado) | `authController.ts` |

---

*Relatório gerado com base em leitura completa dos arquivos envolvidos e validação técnica de cada achado.*
