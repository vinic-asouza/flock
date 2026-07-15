---
type: regras-modulo
modulo: auth
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 14
tags: [regras, modulo:auth]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/auth/overview]]"
  - ""[[02_regras-de-negocio/politicas-e-restricoes]]""
---

# Regras de Negócio — Autenticação e Sessão

## Responsabilidade do Módulo
Garantir acesso seguro à conta (login, sessão, recuperação de senha e confirmação de e-mail).

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-AUTH-001 | Senha forte | Restrição | Ativo |
| BR-AUTH-002 | Alteração com senha atual | Restrição | Ativo |
| BR-AUTH-003 | E-mail confirmado para login | Restrição | Ativo |
| BR-AUTH-004 | Vínculo com igreja no login | Restrição | Ativo |
| BR-AUTH-005 | Seleção de igreja | Gatilho | Ativo |
| BR-AUTH-006 | Credenciais válidas | Restrição | Ativo |
| BR-AUTH-007 | Token revogado | Restrição | Ativo |
| BR-AUTH-008 | Refresh com cookie | Restrição | Ativo |
| BR-AUTH-009 | Callback com tokens e e-mail confirmado | Restrição | Ativo |
| BR-AUTH-010 | Reset com token válido | Restrição | Ativo |
| BR-AUTH-011 | Forgot exige e-mail válido | Restrição | Ativo |
| BR-AUTH-012 | E-mail após troca/reset de senha | Gatilho | Ativo |
| BR-AUTH-013 | Logout revoga token | Gatilho | Ativo |
| BR-AUTH-014 | Rate limit auth | Restrição | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-AUTH-001: Senha forte
- **Declaração:** Uma nova senha só pode ser aceita quando tiver ≥8 caracteres com maiúscula, minúscula e número.
- **Tipo:** Restrição
- **Gatilho:** Change/reset/register password
- **Comportamento esperado:** Persiste nova senha
- **Comportamento em violação:** 400 validação
- **Implementado em:** `backend/src/validators/passwordValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-016]]

### 📝 Regras de Atualização / Edição

### BR-AUTH-002: Alteração com senha atual
- **Declaração:** Um usuário autenticado só pode alterar a senha quando a senha atual estiver correta.
- **Tipo:** Restrição
- **Gatilho:** PUT change password
- **Comportamento esperado:** Senha atualizada + e-mail
- **Comportamento em violação:** 400 Senha atual incorreta
- **Implementado em:** `backend/src/controllers/passwordController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔄 Regras de Estado / Status

### BR-AUTH-003: E-mail confirmado para login
- **Declaração:** Um usuário só pode fazer login quando o e-mail Auth estiver confirmado.
- **Tipo:** Restrição
- **Gatilho:** POST /api/auth/login
- **Comportamento esperado:** Sessão criada
- **Comportamento em violação:** 401 Email não confirmado
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-004]]

### BR-AUTH-004: Vínculo com igreja no login
- **Declaração:** Um login só completa quando o usuário tiver ao menos um membership de igreja.
- **Tipo:** Restrição
- **Gatilho:** POST /api/auth/login
- **Comportamento esperado:** Cookies + igreja ativa
- **Comportamento em violação:** 404 Igreja não encontrada
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-005]]

### BR-AUTH-005: Seleção de igreja
- **Declaração:** Quando há múltiplos vínculos sem igreja ativa válida, a sessão exige seleção explícita.
- **Tipo:** Gatilho
- **Gatilho:** Login/refresh/auth middleware
- **Comportamento esperado:** 403 CHURCH_SELECTION_REQUIRED
- **Comportamento em violação:** Operações bloqueadas até escolher
- **Implementado em:** `backend/src/controllers/refreshController.ts; middlewares/auth.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-006]]

### 🔐 Regras de Acesso Específicas do Módulo

### BR-AUTH-006: Credenciais válidas
- **Declaração:** Um usuário só autenticar com e-mail e senha corretos.
- **Tipo:** Restrição
- **Gatilho:** POST login
- **Comportamento esperado:** Tokens emitidos
- **Comportamento em violação:** 401 Credenciais inválidas
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-007: Token revogado
- **Declaração:** Um access token na blacklist não pode autenticar.
- **Tipo:** Restrição
- **Gatilho:** Qualquer rota com authMiddleware
- **Comportamento esperado:** —
- **Comportamento em violação:** 401 Token revogado
- **Implementado em:** `backend/src/middlewares/auth.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-007]]

### BR-AUTH-008: Refresh com cookie
- **Declaração:** Um access token só renova com refresh token válido no cookie.
- **Tipo:** Restrição
- **Gatilho:** POST refresh
- **Comportamento esperado:** Novos cookies
- **Comportamento em violação:** 401 Refresh inválido/ausente
- **Implementado em:** `backend/src/controllers/refreshController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-009: Callback com tokens e e-mail confirmado
- **Declaração:** O callback de confirmação só ativa sessão com access+refresh válidos e email_confirmed_at.
- **Tipo:** Restrição
- **Gatilho:** POST auth/callback
- **Comportamento esperado:** Sessão estabelecida
- **Comportamento em violação:** 400 Tokens/email inválidos
- **Implementado em:** `backend/src/controllers/authCallbackController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-010: Reset com token válido
- **Declaração:** Redefinição só ocorre com token de recuperação válido/não expirado.
- **Tipo:** Restrição
- **Gatilho:** Reset password
- **Comportamento esperado:** Senha redefinida
- **Comportamento em violação:** 400 Token inválido ou expirado
- **Implementado em:** `backend/src/controllers/passwordController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-011: Forgot exige e-mail válido
- **Declaração:** Pedido de recuperação só com e-mail presente e formato válido.
- **Tipo:** Restrição
- **Gatilho:** Forgot password
- **Comportamento esperado:** E-mail enviado (fluxo Auth)
- **Comportamento em violação:** 400 Email não fornecido/inválido
- **Implementado em:** `backend/src/controllers/passwordController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔔 Regras de Notificação e Eventos

### BR-AUTH-012: E-mail após troca/reset de senha
- **Declaração:** Após change/reset bem-sucedido, o sistema deve notificar por e-mail (falha não bloqueia).
- **Tipo:** Gatilho
- **Gatilho:** Change/reset password
- **Comportamento esperado:** E-mail Resend best-effort
- **Comportamento em violação:** Operação já concluída
- **Implementado em:** `backend/src/controllers/passwordController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-013: Logout revoga token
- **Declaração:** No logout, o access token deve ir à blacklist e cookies devem ser limpos.
- **Tipo:** Gatilho
- **Gatilho:** POST logout
- **Comportamento esperado:** Logout ok
- **Comportamento em violação:** 401 se não autenticado
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-AUTH-014: Rate limit auth
- **Declaração:** Login ≤10/15min IP; forgot/reset ≤5/1h; change ≤5/15min; refresh ≤20/15min.
- **Tipo:** Restrição
- **Gatilho:** Rotas auth/password/refresh
- **Comportamento esperado:** Dentro da cota
- **Comportamento em violação:** 429 muitas tentativas
- **Implementado em:** `backend/src/routes/auth.ts, password.ts, refresh.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-039]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Blacklist JWT em memória não compartilha entre instâncias (risco multi-process).
- 🔍 Timeout por inatividade puro (além do JWT) não identificado.

---

*Gerado em 2026-07-13. Regras CONFIRMADAS no código do monorepo Flock.*
