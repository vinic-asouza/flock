---
type: regras-modulo
modulo: admin-ops
ultima_atualizacao: 2026-08-26
versao: "0.1"
total_regras: 3
tags: [regras, modulo:admin-ops, plataforma]
ver_tambem:
  - "[[04_modulos/admin-ops]]"
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[02_regras-de-negocio/regras-por-modulo/auth]]"
---

# Regras de Negócio — Admin OPS

## Responsabilidade do Módulo

Autorizar o **Operador da plataforma** na API (`/api/ops`), separado do login do Painel da igreja.

## Índice de Regras

| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-OPS-001 | Allowlist de operadores | Restrição | Ativo |
| BR-OPS-002 | Conta sem membership de igreja | Restrição | Ativo |
| BR-OPS-003 | Login do Painel permanece por igreja | Restrição | Ativo |

---

### BR-OPS-001: Allowlist de operadores
- **Declaração:** Só e-mails listados em `PLATFORM_ADMIN_EMAILS` (split/trim/lowercase) podem obter sessão de Admin OPS. Lista vazia = fail closed (ninguém entra).
- **Tipo:** Restrição
- **Gatilho:** `POST /api/ops/login`; `GET /api/ops/me` (`requirePlatformAdmin`)
- **Comportamento esperado:** 200 + cookies de sessão sem `flock_active_church_id`
- **Comportamento em violação:** 403 Acesso negado
- **Implementado em:** `backend/src/services/platformAdmin.ts`
- **Testado em:** `backend/src/services/__tests__/platformAdmin.test.ts`
- **Depende de:** —

### BR-OPS-002: Conta sem membership de igreja
- **Declaração:** Conta de operador não pode ter vínculo de igreja (`church_users` ativo ou owner legado em `churches.user_id`).
- **Tipo:** Restrição
- **Gatilho:** `POST /api/ops/login`; `GET /api/ops/me`
- **Comportamento esperado:** Acesso só com membershipCount = 0
- **Comportamento em violação:** 403 — contas vinculadas a uma igreja não acessam o Admin OPS
- **Implementado em:** `evaluatePlatformOperatorAccess` + `listChurchMembershipsForUser`
- **Testado em:** `backend/src/services/__tests__/platformAdmin.test.ts`
- **Depende de:** BR-OPS-001

### BR-OPS-003: Login do Painel permanece por igreja
- **Declaração:** `POST /api/auth/login` continua exigindo igreja (BR-GEN-005). Staff sem membership recebe 404 Igreja não encontrada no Painel.
- **Tipo:** Restrição
- **Gatilho:** `POST /api/auth/login`
- **Comportamento esperado:** Painel inalterado
- **Comportamento em violação:** — (não misturar os dois logins)
- **Implementado em:** `backend/src/controllers/authController.ts` (`login`) — sem mudança nesta entrega
- **Testado em:** smoke QA DEV-74
- **Depende de:** [[BR-GEN-005]]
