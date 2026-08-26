---
type: regras-modulo
modulo: admin-ops
ultima_atualizacao: 2026-08-26
versao: "0.2"
total_regras: 6
tags: [regras, modulo:admin-ops, plataforma]
ver_tambem:
  - "[[04_modulos/admin-ops]]"
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[02_regras-de-negocio/regras-por-modulo/auth]]"
  - "[[07_decisoes-tecnicas/ADR-001-leitura-cross-tenant-admin-ops]]"
---

# Regras de Negócio — Admin OPS

## Responsabilidade do Módulo

Autorizar o **Operador da plataforma** na API (`/api/ops`) e permitir leitura cross-tenant **somente GET** das Igrejas (clientes SaaS), separado do login do Painel da igreja.

## Índice de Regras

| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-OPS-001 | Allowlist de operadores | Restrição | Ativo |
| BR-OPS-002 | Conta sem membership de igreja | Restrição | Ativo |
| BR-OPS-003 | Login do Painel permanece por igreja | Restrição | Ativo |
| BR-OPS-004 | Cliente comercialmente ativo | Derivação | Ativo |
| BR-OPS-005 | `/api/ops` de Igrejas é somente GET | Restrição | Ativo |
| BR-OPS-006 | Sem rol nem diffs de Membros nas respostas ops | Restrição | Ativo |

---

### BR-OPS-001: Allowlist de operadores
- **Declaração:** Só e-mails listados em `PLATFORM_ADMIN_EMAILS` (split/trim/lowercase) podem obter sessão de Admin OPS. Lista vazia = fail closed (ninguém entra).
- **Tipo:** Restrição
- **Gatilho:** `POST /api/ops/login`; GETs `/api/ops/*` autenticados (`requirePlatformAdmin`)
- **Comportamento esperado:** 200 + cookies de sessão sem `flock_active_church_id`
- **Comportamento em violação:** 403 Acesso negado
- **Implementado em:** `backend/src/services/platformAdmin.ts`
- **Testado em:** `backend/src/services/__tests__/platformAdmin.test.ts`
- **Depende de:** —

### BR-OPS-002: Conta sem membership de igreja
- **Declaração:** Conta de operador não pode ter vínculo de igreja (`church_users` ativo ou owner legado em `churches.user_id`).
- **Tipo:** Restrição
- **Gatilho:** `POST /api/ops/login`; GETs `/api/ops/*` autenticados
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
- **Implementado em:** `backend/src/controllers/authController.ts` (`login`)
- **Testado em:** smoke QA DEV-74
- **Depende de:** [[BR-GEN-005]]

### BR-OPS-004: Cliente comercialmente ativo
- **Declaração:** Uma Igreja está comercialmente **ativa** se e somente se `subscription_status` ∈ `{active, trialing}`. Qualquer outro valor, inclusive `null`, é **inativo comercialmente**. Não confundir com Membro `active`.
- **Tipo:** Derivação
- **Gatilho:** `GET /api/ops/overview`; `GET /api/ops/churches`; `GET /api/ops/churches/:id`
- **Comportamento esperado:** Campo derivado `commercially_active`; totais `commercially_active` / `commercially_inactive`; filtro de lista `commercially_active=true|false`
- **Comportamento em violação:** — (derivação; não há “violação” de input além de Joi)
- **Implementado em:** `backend/src/utils/commerciallyActive.ts`
- **Testado em:** `backend/src/utils/__tests__/commerciallyActive.test.ts`
- **Depende de:** —

### BR-OPS-005: `/api/ops` de Igrejas é somente GET
- **Declaração:** Overview, lista e ficha de Igrejas no boundary `/api/ops` são somente leitura. Mutação de tenant, plano ou Stripe **não** existe neste boundary.
- **Tipo:** Restrição
- **Gatilho:** `GET /api/ops/overview`; `GET /api/ops/churches`; `GET /api/ops/churches/:id`
- **Comportamento esperado:** Só GET; 401 anônimo; 403 não-operador; 404 UUID inexistente
- **Comportamento em violação:** Não há POST/PUT/PATCH/DELETE dessas rotas
- **Implementado em:** `backend/src/routes/ops.ts`
- **Testado em:** inspeção de rotas + smoke QA DEV-78
- **Depende de:** BR-OPS-001, BR-OPS-002

### BR-OPS-006: Sem rol nem diffs de Membros nas respostas ops
- **Declaração:** Respostas do Admin OPS não incluem rol de Membros/Integrantes, diffs de `audit_logs` (`changes_before`/`changes_after`), `ip`, `user_agent` nem `payload` de eventos de assinatura. Membros = **contagens**; contato = Igreja (`email_church` / `phone_church`); ator de audit = usuário da igreja (login).
- **Tipo:** Restrição
- **Gatilho:** `GET /api/ops/churches`; `GET /api/ops/churches/:id`
- **Comportamento esperado:** Mapper whitelist; select list explícito (nunca `*` em `members` / `audit_logs`)
- **Comportamento em violação:** Campo proibido ausente do JSON
- **Implementado em:** `backend/src/services/opsChurchMappers.ts`
- **Testado em:** `backend/src/services/__tests__/opsChurches.test.ts`
- **Depende de:** BR-OPS-005
