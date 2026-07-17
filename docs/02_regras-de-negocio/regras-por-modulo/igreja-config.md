---
type: regras-modulo
modulo: igreja-config
ultima_atualizacao: 2026-07-17
versao: "1.1"
total_regras: 18
tags: [regras, modulo:igreja-config]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/igreja-config/overview]]"
  - ""[[02_regras-de-negocio/regras-por-modulo/auth]]""
  - ""[[02_regras-de-negocio/regras-por-modulo/billing]]""
---

# Regras de Negócio — Configurações da Igreja e Conta

## Responsabilidade do Módulo
Administrar dados da igreja, conta Auth, equipe e auditoria.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-CFG-001 | Update igreja admin+ | Restrição | Ativo |
| BR-CFG-002 | CNPJ único no update | Restrição | Ativo |
| BR-CFG-003 | Sanitize billing | Restrição | Ativo |
| BR-CFG-004 | Trocar igreja ativa | Restrição | Ativo |
| BR-CFG-005 | Alterar e-mail da conta | Restrição | Ativo |
| BR-CFG-006 | Alterar senha da conta | Restrição | Ativo |
| BR-CFG-007 | Alterar telefone | Restrição | Ativo |
| BR-CFG-008 | Gestão users admin+ | Restrição | Ativo |
| BR-CFG-009 | Roles convidáveis | Restrição | Ativo |
| BR-CFG-010 | Uma igreja por usuário | Restrição | Ativo |
| BR-CFG-011 | Owner imutável | Restrição | Ativo |
| BR-CFG-012 | Excluir conta | Restrição | Ativo |
| BR-CFG-013 | Audit logs admin+ | Restrição | Ativo |
| BR-CFG-014 | E-mail de convite | Gatilho | Ativo |
| BR-CFG-015 | E-mail exclusão conta | Gatilho | Ativo |
| BR-CFG-016 | Escopo de congregação em reader/editor | Restrição | Ativo |
| BR-CFG-017 | Admin/owner sem restrição de congregação | Restrição | Ativo |
| BR-CFG-018 | Promoção/rebaixamento e escopo | Gatilho | Ativo |

---

## Regras por Categoria

### 📝 Regras de Atualização / Edição

### BR-CFG-001: Update igreja admin+
- **Declaração:** Atualizar dados da igreja exige admin+.
- **Tipo:** Restrição
- **Gatilho:** PUT /church
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403
- **Implementado em:** `routes/church.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-012]]

### BR-CFG-002: CNPJ único no update
- **Declaração:** CNPJ novo não pode conflitar com outra igreja.
- **Tipo:** Restrição
- **Gatilho:** PUT church
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `churchController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-003: Sanitize billing
- **Declaração:** GET igreja para editor/reader omite campos Stripe.
- **Tipo:** Restrição
- **Gatilho:** GET church
- **Comportamento esperado:** Payload limpo
- **Comportamento em violação:** —
- **Implementado em:** `churchDto.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-013]]

### BR-CFG-004: Trocar igreja ativa
- **Declaração:** Só define active church se houver membership.
- **Tipo:** Restrição
- **Gatilho:** Switch church
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403
- **Implementado em:** `churchController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-005: Alterar e-mail da conta
- **Declaração:** Senha correta + e-mail ≠ atual.
- **Tipo:** Restrição
- **Gatilho:** PUT account/email
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `accountController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-006: Alterar senha da conta
- **Declaração:** Senha atual + nova forte.
- **Tipo:** Restrição
- **Gatilho:** PUT password
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `accountValidator/Controller`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-007: Alterar telefone
- **Declaração:** Telefone + senha correta.
- **Tipo:** Restrição
- **Gatilho:** PUT phone
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `accountController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📥 Regras de Criação / Cadastro

### BR-CFG-008: Gestão users admin+
- **Declaração:** CRUD church-users exige admin+.
- **Tipo:** Restrição
- **Gatilho:** Rotas church-users
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403
- **Implementado em:** `routes/churchUsers.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-009: Roles convidáveis
- **Declaração:** Convite só admin|editor|reader (nunca owner).
- **Tipo:** Restrição
- **Gatilho:** POST church-users
- **Comportamento esperado:** 201
- **Comportamento em violação:** 400 Papel inválido
- **Implementado em:** `churchUserController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-010: Uma igreja por usuário
- **Declaração:** Não convidar e-mail já em outra igreja.
- **Tipo:** Restrição
- **Gatilho:** POST
- **Comportamento esperado:** OK
- **Comportamento em violação:** 400
- **Implementado em:** `churchUserController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-011]]

### 🗑️ Regras de Exclusão / Desativação

### BR-CFG-011: Owner imutável
- **Declaração:** Não alterar/remover vínculo owner pelas rotas de users.
- **Tipo:** Restrição
- **Gatilho:** PATCH/DELETE user
- **Comportamento esperado:** —
- **Comportamento em violação:** 400
- **Implementado em:** `churchUserController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-014]]

### BR-CFG-012: Excluir conta
- **Declaração:** Senha + confirmação EXCLUIR CONTA; bloqueia se assinatura paga ativa sem end_date.
- **Tipo:** Restrição
- **Gatilho:** DELETE account
- **Comportamento esperado:** User Auth removido
- **Comportamento em violação:** 400
- **Implementado em:** `accountController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-020]]

### 🔐 Regras de Acesso Específicas do Módulo

### BR-CFG-013: Audit logs admin+
- **Declaração:** Listar audit_logs só admin+ e church_id ativa.
- **Tipo:** Restrição
- **Gatilho:** GET /account/logs
- **Comportamento esperado:** Lista
- **Comportamento em violação:** 403
- **Implementado em:** `routes/account.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-048]]

### 🔔 Regras de Notificação e Eventos

### BR-CFG-014: E-mail de convite
- **Declaração:** Ao adicionar usuário, enviar e-mail informativo (best-effort).
- **Tipo:** Gatilho
- **Gatilho:** POST church-users
- **Comportamento esperado:** E-mail
- **Comportamento em violação:** User já criado
- **Implementado em:** `churchUserController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-015: E-mail exclusão conta
- **Declaração:** Após deleteUser, e-mail de confirmação.
- **Tipo:** Gatilho
- **Gatilho:** DELETE account
- **Comportamento esperado:** E-mail
- **Comportamento em violação:** —
- **Implementado em:** `accountController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-CFG-016: Escopo de congregação em reader/editor
- **Declaração:** Ao criar/editar `reader` ou `editor`, é obrigatório marcar acesso a **todas** as congregações (`access_all_congregations=true`) **ou** selecionar ≥1 congregação da igreja. Seleção vazia é inválida. “Todas” é dinâmico (inclui congregações futuras).
- **Tipo:** Restrição
- **Gatilho:** POST/PATCH `/api/church-users`
- **Comportamento esperado:** Escopo persistido (flag e/ou `church_user_congregations`); listagens/mutações de domínio respeitam o escopo
- **Comportamento em violação:** 400 escopo inválido
- **Implementado em:** `churchUserController.ts`, `congregationScope.ts`
- **Depende de:** [[BR-CFG-008]], [[BR-CFG-009]]

### BR-CFG-017: Admin/owner sem restrição de congregação
- **Declaração:** Usuários `admin` e `owner` sempre têm acesso a todas as congregações do tenant (sem necessidade de seleção). O código trata o papel como acesso total mesmo se houver linhas N:N legadas.
- **Tipo:** Restrição
- **Gatilho:** Resolução de `req.church` / helpers de escopo
- **Comportamento esperado:** Acesso total dinâmico
- **Implementado em:** `loadCongregationScopeForUser`, `roleHasFullCongregationAccess`
- **Depende de:** —

### BR-CFG-018: Promoção/rebaixamento e escopo
- **Declaração:** Ao promover para `admin`, limpar restrições (`access_all_congregations=true`, sem linhas N:N). Ao rebaixar de `admin` para `reader`/`editor`, exigir seleção válida de escopo no mesmo update.
- **Tipo:** Gatilho
- **Gatilho:** PATCH `/api/church-users/:id`
- **Comportamento esperado:** Escopo sincronizado com o novo papel
- **Comportamento em violação:** 400 se rebaixamento sem escopo
- **Implementado em:** `updateChurchUser`
- **Depende de:** [[BR-CFG-016]], [[BR-CFG-017]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Escopo completo de cascade ao deletar Auth user vs wipe da igreja não está em um único fluxo documentado.

---

*Gerado em 2026-07-13.*
