# Tickets Abertos — Módulo 01: Autenticação e Sessão

> **Origem:** Ciclo QA completo (auditoria + 2 revalidações)  
> **Data:** Abril 2026  
> **Status do módulo:** ✅ Aprovado para produção  
> **Tickets remanescentes:** 3 itens (1 alto, 1 baixo, 1 mínimo)

---

## TICKET-AUTH-01 — Blacklist de Tokens em Memória

- **Prioridade:** 🔴 Alta — bloqueia escalonamento horizontal
- **Origem:** ACHADO 08 (auditoria original)
- **Arquivo:** `backend/src/controllers/authController.ts`

### Problema

A blacklist de tokens revogados no logout é armazenada em `global.tokenBlacklist` (Set em memória). Após qualquer restart do processo Node.js, todos os tokens adicionados à blacklist são perdidos e voltam a ser considerados válidos.

Em ambiente com múltiplas instâncias (ex: load balancer com 2+ pods), um token revogado em uma instância não é reconhecido como revogado pelas demais.

```typescript
// situação atual
if (!global.tokenBlacklist) {
  global.tokenBlacklist = new Set();
}
global.tokenBlacklist.add(token);
// TODO: substituir por Redis ou tabela revoked_tokens no Supabase
```

### Mitigação atual

O ACHADO 04 (já resolvido) garante que `supabaseAdmin.auth.admin.signOut(user.id)` invalida a sessão no Supabase no momento do logout. Isso reduz o risco em condições normais — o token fica inválido no Supabase mesmo que saia da blacklist após restart.

A blacklist é uma segunda camada de defesa para o intervalo entre o logout e a expiração natural do JWT.

### Ação necessária

Substituir `global.tokenBlacklist` por uma das alternativas:

**Opção A — Redis (recomendado):**
```typescript
// Armazenar token com TTL igual ao tempo de expiração restante
await redis.setex(`blacklist:${token}`, timeToExpire, '1');

// Verificar no middleware
const isBlacklisted = await redis.exists(`blacklist:${token}`);
```

**Opção B — Tabela `revoked_tokens` no Supabase:**
```sql
CREATE TABLE revoked_tokens (
  token TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
-- Job periódico para limpar tokens expirados
```

### Pré-requisito de deploy

Não bloqueia deploy em instância única. **Bloqueia escalonamento horizontal** (múltiplos pods/instâncias).

---

## TICKET-AUTH-02 — E-mail Vazio no Header ao Recarregar a Página

- **Prioridade:** 🟡 Baixa
- **Origem:** ACHADO 18 parcial (auditoria original)
- **Arquivo:** `frontend/src/context/AuthContext.tsx` — função `initializeAuth`

### Problema

Ao recarregar a página (`F5`) com sessão válida, o `AuthContext` chama `GET /api/account` para obter o e-mail do usuário. Se essa chamada falhar (timeout, instabilidade de rede, backend indisponível por breve instante), o e-mail fica como `''` indefinidamente — sem retry, sem fallback.

```typescript
// situação atual em initializeAuth()
let userEmail = '';
try {
  const accountData = await apiService.getAccountData();
  userEmail = accountData.email || '';
} catch {
  console.warn('[AuthContext] getAccountData falhou na inicialização. Email pode ficar vazio na UI.');
  // ← sem fallback de email disponível aqui
}
```

No fluxo de **login** esse problema já foi resolvido (usa `response.email || data.email`). O problema persiste apenas na inicialização.

### Ação necessária (escolher uma)

**Opção A — Retornar `email` no `GET /refresh/check`:**
```typescript
// refreshController.ts — adicionar email ao response de checkAuth
res.json({
  authenticated: true,
  user: { id: user.id, email: user.email },
  church,
  role,
  // email já viria junto — elimina getAccountData no initializeAuth
});
```

**Opção B — Retry com backoff no `getAccountData`:**
```typescript
// Tentar até 3 vezes com intervalo crescente
const getEmailWithRetry = async (): Promise<string> => {
  for (let i = 0; i < 3; i++) {
    try {
      const data = await apiService.getAccountData();
      return data.email || '';
    } catch {
      if (i < 2) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return '';
};
```

A Opção A é preferível: elimina a dependência de `getAccountData` na inicialização, reduz o número de chamadas no carregamento e resolve o problema estruturalmente.

---

## TICKET-AUTH-03 — Comentário Desatualizado no `auth/callback/page.tsx`

- **Prioridade:** 🟢 Mínima — sem impacto funcional
- **Origem:** Regressão de documentação identificada na Revalidação 02
- **Arquivo:** `frontend/src/app/auth/callback/page.tsx`, linha 16

### Problema

O comentário diz "dependency array vazia" mas o array do `useEffect` é `[router]`. O comentário reflete a sugestão original do QA; a implementação evoluiu para uma solução melhor (manter `router` no array + `hasRun` ref), mas o comentário não foi atualizado.

```typescript
// comentário atual (incorreto)
// ACHADO 12: dependency array vazia — router não é usado dentro do effect
useEffect(() => {
  if (hasRun.current) return;
  // ...
}, [router]); // ← array NÃO é vazio
```

### Correção sugerida

```typescript
// ACHADO 12: hasRun ref garante execução única mesmo que router mude de referência
useEffect(() => {
  if (hasRun.current) return;
  // ...
}, [router]);
```

---

## Resumo

| Ticket | Descrição | Prioridade | Bloqueador |
|--------|-----------|------------|------------|
| TICKET-AUTH-01 | Blacklist de tokens em memória | 🔴 Alta | Escalonamento horizontal |
| TICKET-AUTH-02 | E-mail vazio no header ao recarregar | 🟡 Baixa | Não |
| TICKET-AUTH-03 | Comentário desatualizado no callback | 🟢 Mínima | Não |
