---
type: adr
id: ADR-001
titulo: Leitura cross-tenant do Admin OPS (GET-only, sem PII de Membros)
status: Aceito
data: 2026-08-26
autor: Vinicius Souza
decisores: [Vinicius Souza]
tags: [backend, segurança, admin-ops]
supersede:
supersedido_por:
---

# ADR-001 — Leitura cross-tenant do Admin OPS (GET-only, sem PII de Membros)

> ⚠️ ADRs **nunca** devem ser deletadas. Se a decisão mudar, atualize o status e crie uma nova ADR.

---

## 📌 Contexto e Problema

**Problema técnico:** o Operador da plataforma precisa ver Igrejas (clientes SaaS) — overview, lista e ficha — sem abrir o Painel de um tenant. O isolamento padrão (BR-GEN-010 / API-028) filtra por `req.church.churchId`; `supabaseAdmin` (service_role) bypassa RLS. Um GET mal desenhado vaza o universo de clientes ou PII pastoral.

**Por que decidir agora?** a API `/api/ops` de Igrejas (DEV-78) é a primeira leitura cross-tenant permanente. Sem regra explícita, o próximo endpoint ops copiaria `getAuditLogs` do Painel (diffs) ou `select('*')`.

---

## ⚖️ Forças em Jogo

- Isolamento tenant do Painel permanece (BR-GEN-010).
- Operador não tem `church_users`; guard = allowlist + `requirePlatformAdmin` (BR-OPS-001/002).
- PII de Membros é pastoral; contato da Igreja é institucional e aceitável para suporte.
- Sem Stripe live neste boundary; estado comercial = colunas já persistidas.
- Volume atual de Igrejas cabe em queries simples (sem Redis/view SQL no v1).

---

## ✅ Decisão

**Decidimos** expor leitura cross-tenant **somente GET** em `/api/ops/overview`, `/api/ops/churches` e `/api/ops/churches/:id`, atrás de `authUserOnly` + `requirePlatformAdmin` (**sem** `attachChurchContext`), via `supabaseAdmin`, com mapper whitelist. Cliente comercialmente ativo ⇔ `subscription_status ∈ {active, trialing}` (BR-OPS-004). Respostas não incluem rol de Membros, diffs de audit nem `payload` de eventos (BR-OPS-006). Não reusar `INTERNAL_BILLING_TOKEN` nem `accountController.getAuditLogs`.

---

## 🔍 Opções Consideradas

### Opção 1: Token interno (`INTERNAL_BILLING_TOKEN`) _(descartada)_

**Descrição:** Estender `/api/internal/billing/stats` ou um GET similar com token de máquina.

**✅ Prós:** já existe padrão de rota interna; sem sessão de usuário.

**❌ Contras:** viola BR-GEN-008 no cliente (token no browser); não identifica o operador; mistura observabilidade com suporte.

### Opção 2: GET `/api/ops` + sessão de operador _(escolhida)_

**Descrição:** Três GETs no boundary já autenticado do Admin OPS; DTO sanitizado; rate limit próprio.

**✅ Prós:** reusa DEV-74; auditoria de quem leu fica na sessão; UI (DEV-77) consome o mesmo contrato; exceção a BR-GEN-010 **localizada**.

**❌ Contras:** god-mode aplicacional — bug de authz vaza o SaaS; overview carrega todas as igrejas em memória no v1.

### Opção 3: Impersonation / abrir o Painel como tenant _(descartada)_

**Descrição:** Operador assume a igreja e usa rotas do Painel.

**✅ Prós:** nenhum endpoint novo.

**❌ Contras:** mutações do Painel ficam ao alcance; mistura papéis; fora do recorte read-only.

---

## 💡 Justificativa

Suporte precisa de visão unificada sem impersonation. A opção 2 concentra a exceção de isolamento em três GETs, com whitelist testável e sem secrets de máquina no cliente.

---

## 🔄 Consequências

### ✅ Positivas

- Contrato estável para a UI do console (DEV-77).
- Painel continua filtrando `church_id`; staff não usa `/api/auth/login`.

### ❌ Negativas _(trade-offs e dívida técnica assumida)_

- Isolamento = só o guard. Testes 401/403 são obrigatórios em todo GET ops novo.
- Overview sem GROUP BY SQL; contagem de membros da lista puxa rows `{church_id, active}` da página — follow-up RPC se o volume crescer.
- Cap 20 logs na ficha, sem paginação aninhada.

### 📋 Ações de Follow-up

- UI do console: DEV-77.
- Formalizar BR-OPS-004/005/006 (feito nesta entrega de Document).

---

## 📏 Conformidade

| Mecanismo | Descrição |
| --- | --- |
| Rotas | Só GET em overview/churches; `requirePlatformAdmin`; sem `attachChurchContext` |
| Select | Nunca `select('*')` em `members` / `audit_logs` |
| Mapper | Teste negativo: sem `changes_*`, `payload`, campos de Membro |
| Authz | 401 anônimo; 403 conta da igreja |

---

## 🗒️ Notas

- Issue: DEV-78 · PR #33
- Regras: [[02_regras-de-negocio/regras-por-modulo/admin-ops]]
- Módulo: [[04_modulos/admin-ops]]

---

> 📚 Índice: [[07_decisoes-tecnicas/index]]
