# DEV Report — Revalidação Módulo 01: Autenticação e Sessão

> **Engenheiro:** Dev Sênior (IA)
> **Data:** Abril 2026
> **Base:** `modulo-01-autenticacao-revalidacao.md`
> **Status:** Execução completa — todas as regressões e itens de ação tratados

---

## Resumo

O relatório de revalidação do QA identificou 2 regressões introduzidas pelas correções anteriores, 1 mensagem técnica inapropriada para usuário final, e 1 achado parcialmente resolvido (ACHADO 06). Todos foram tratados nesta rodada.

---

## Itens Tratados

---

### REGRESSÃO 01 — Botão "Ir para o Login" no Estado de Sucesso do Callback

- **Status:** ✅ Corrigido
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`
- **O que foi feito:** No estado `success`, o botão de ação manual foi alterado de `handleGoToLogin → router.push('/login')` para `router.push('/')` com label **"Ir para o Painel"**. O usuário está autenticado após o callback bem-sucedido — encaminhá-lo para `/login` gerava redirect duplo via `AuthGuard` e causava confusão com a mensagem "Redirecionando...".

---

### REGRESSÃO 02 — Comentário Residual "em 1 hora" no Rate Limiter

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/routes/auth.ts`
- **O que foi feito:** Dois resíduos corrigidos no `registerLimiter`:
  - Comentário da linha `max`: `// 10 tentativas de registro por IP em 1 hora` → `// 10 tentativas de registro por IP em 15 minutos`
  - Mensagem `details` do rate limiter: `"Tente novamente em 1 hora."` → `"Tente novamente em 15 minutos."` — esta segunda inconsistência não havia sido identificada no relatório de revalidação mas foi corrigida preventivamente.

---

### Mensagem 503 Técnica no `resetPassword`

- **Status:** ✅ Corrigido
- **Arquivo:** `backend/src/controllers/passwordController.ts`
- **O que foi feito:** A mensagem `"A redefinição de senha requer permissões administrativas que não estão configuradas."` foi substituída por `"Não foi possível redefinir sua senha no momento. Tente novamente mais tarde ou entre em contato com o suporte."`. Adicionado `console.error` interno para rastreabilidade do operador sem expor detalhes ao usuário.

---

### ACHADO 06 — Eliminação da 3ª Chamada de API no Login (fechamento completo)

- **Status:** ✅ Corrigido — Login agora faz **1 chamada** (era 3, depois 2)
- **Arquivos:**
  - `backend/src/controllers/authController.ts` — adicionado `email: authData.user.email` ao response de `POST /api/auth/login`
  - `frontend/src/types/index.ts` — `LoginResponse` atualizado com `email?: string`
  - `frontend/src/context/AuthContext.tsx` — `login()` usa `response.email || data.email` diretamente; chamada `getAccountData()` removida do fluxo de login
- **Resultado:** O fluxo de login passou de 3 roundtrips (login → getCheckAuth → getAccountData) para **1 roundtrip** único (`POST /auth/login`). `role` e `email` são retornados pelo backend no mesmo response. Fallbacks: `role → 'reader'`, `email → data.email` (digitado pelo usuário).

---

## Itens Fora de Escopo (não tratados nesta rodada, conforme QA)

| Item | Motivo |
|------|--------|
| ACHADO 08 (blacklist em memória) | Requer infraestrutura Redis — fora de escopo do ciclo atual |
| ACHADO 18 (email vazio no initializeAuth) | Baixa prioridade; sem acesso ao email no contexto de inicialização sem alteração de contrato do `/refresh/check` |

---

## Arquivos Alterados

| Arquivo | O que mudou |
|---------|-------------|
| `frontend/src/app/auth/callback/page.tsx` | Botão sucesso: `router.push('/login')` → `router.push('/')`, label → "Ir para o Painel" |
| `backend/src/routes/auth.ts` | Comentário e mensagem do `registerLimiter` corrigidos ("1 hora" → "15 minutos") |
| `backend/src/controllers/passwordController.ts` | Mensagem 503 humanizada; `console.error` adicionado |
| `backend/src/controllers/authController.ts` | `email: authData.user.email` adicionado ao response de login |
| `frontend/src/types/index.ts` | `LoginResponse` com `email?: string` |
| `frontend/src/context/AuthContext.tsx` | `login()` usa `response.email`; `getAccountData()` removido do fluxo de login |

---

## Estado Final do Módulo 01

| Achado | Status Final |
|--------|-------------|
| 01 — Open redirect | ✅ Fechado |
| 02 — Regex senha no login | ✅ Fechado |
| 03 — fetch sem credentials | ✅ Fechado |
| 04 — signOut sem efeito real | ✅ Fechado |
| 05 — Estado global de erro | ✅ Fechado |
| 06 — 3 chamadas de API no login | ✅ Fechado (1 chamada agora) |
| 07 — isLoggingIn não resetado | ✅ Fechado |
| 08 — Blacklist em memória | ⚠️ Ticket aberto — aguarda infraestrutura Redis |
| 09 — Logout silencioso | ✅ Fechado |
| 10 — Dois botões idênticos no callback | ✅ Fechado |
| 11 — Callback sucesso pede login manual | ✅ Fechado |
| 12 — router no useEffect inutilizado | ✅ Fechado |
| 13 — resetPassword com token duplicado | ✅ Fechado |
| 14 — Sem validação email no forgotPassword | ✅ Fechado |
| 15 — Comentário errado no rate limiter | ✅ Fechado (incluindo resíduo da mensagem) |
| 16 — Layout (main) sem proteção | ✅ Fechado |
| 17 — expires_at fictício | ✅ Fechado |
| 18 — getAccountData silenciado | 🟡 Parcial — login corrigido; initializeAuth com warn; ticket aberto |
| R01 — Botão sucesso callback errado | ✅ Fechado |
| R02 — Comentário residual rate limiter | ✅ Fechado |
| Msg 503 técnica | ✅ Fechado |

---

*Relatório gerado com base nos itens de ação do relatório de revalidação `modulo-01-autenticacao-revalidacao.md`.*
