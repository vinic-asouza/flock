---
type: regras-modulo
modulo: onboarding
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 12
tags: [regras, modulo:onboarding]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/onboarding/overview]]"
  - ""[[02_regras-de-negocio/regras-por-modulo/billing]]""
  - ""[[02_regras-de-negocio/regras-por-modulo/auth]]""
---

# Regras de Negócio — Onboarding e Registro de Igreja

## Responsabilidade do Módulo
Converter visitante em tenant (igreja + owner) e opcionalmente vincular plano via checkout.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-ONB-001 | Payload de registro completo | Restrição | Ativo |
| BR-ONB-002 | CNPJ único e válido | Restrição | Ativo |
| BR-ONB-003 | E-mail Auth único | Restrição | Ativo |
| BR-ONB-004 | Compensação se igreja falhar | Gatilho | Ativo |
| BR-ONB-005 | Owner no onboarding | Fato | Ativo |
| BR-ONB-006 | Checkout público exige e-mail e nome | Restrição | Ativo |
| BR-ONB-007 | Planos pagos no checkout | Restrição | Ativo |
| BR-ONB-008 | Pending expira em 7 dias | Fato | Ativo |
| BR-ONB-009 | E-mail igual ao checkout | Restrição | Ativo |
| BR-ONB-010 | Vínculo pending→igreja | Gatilho | Ativo |
| BR-ONB-011 | E-mails de boas-vindas | Gatilho | Ativo |
| BR-ONB-012 | Rate limit registro | Restrição | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-ONB-001: Payload de registro completo
- **Declaração:** Um registro só é aceito com e-mail, senha forte, telefone 10–11 dígitos, dados da igreja e CNPJ válidos.
- **Tipo:** Restrição
- **Gatilho:** POST /api/auth/register
- **Comportamento esperado:** 201 igreja+owner
- **Comportamento em violação:** 400 Dados inválidos
- **Implementado em:** `backend/src/validators/churchValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-002: CNPJ único e válido
- **Declaração:** Um CNPJ só registra igreja se tiver dígitos verificadores válidos e for único.
- **Tipo:** Restrição
- **Gatilho:** POST register
- **Comportamento esperado:** Igreja criada
- **Comportamento em violação:** 400 CNPJ inválido/já cadastrado
- **Implementado em:** `backend/src/controllers/authController.ts; cnpjSchema`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-019]]

### BR-ONB-003: E-mail Auth único
- **Declaração:** Um e-mail de conta só pode ser usado uma vez no cadastro.
- **Tipo:** Restrição
- **Gatilho:** POST register
- **Comportamento esperado:** User Auth criado
- **Comportamento em violação:** 400 Email já cadastrado
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-004: Compensação se igreja falhar
- **Declaração:** Se a criação da igreja falhar após criar Auth user, o usuário Auth deve ser removido.
- **Tipo:** Gatilho
- **Gatilho:** Falha insert churches
- **Comportamento esperado:** Rollback user
- **Comportamento em violação:** Erro ao criar igreja
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-005: Owner no onboarding
- **Declaração:** O registro deve criar vínculo church_users como owner da nova igreja.
- **Tipo:** Fato
- **Gatilho:** POST register
- **Comportamento esperado:** Membership owner
- **Comportamento em violação:** —
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-006: Checkout público exige e-mail e nome
- **Declaração:** Checkout sem login só com e-mail e nome informados.
- **Tipo:** Restrição
- **Gatilho:** create-checkout público
- **Comportamento esperado:** Sessão Stripe
- **Comportamento em violação:** 400 Email e nome obrigatórios
- **Implementado em:** `backend/src/controllers/stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-007: Planos pagos no checkout
- **Declaração:** Checkout de pagamento só aceita planos 200, 500 ou 800.
- **Tipo:** Restrição
- **Gatilho:** Checkout session
- **Comportamento esperado:** Sessão criada
- **Comportamento em violação:** 400 Plano inválido
- **Implementado em:** `backend/src/controllers/stripeController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-002]]

### 🔗 Regras de Relacionamento

### BR-ONB-008: Pending expira em 7 dias
- **Declaração:** pending_subscriptions deve expirar ~7 dias após criação.
- **Tipo:** Fato
- **Gatilho:** Checkout/register
- **Comportamento esperado:** Registro elegível só se não expirado
- **Comportamento em violação:** Pending inválido para vínculo
- **Implementado em:** `bd-structure / cookieUtils`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-015]]

### BR-ONB-009: E-mail igual ao checkout
- **Declaração:** Se houver pending por link_token, o e-mail do registro deve coincidir com o do pagamento.
- **Tipo:** Restrição
- **Gatilho:** POST register com token
- **Comportamento esperado:** Vínculo da assinatura
- **Comportamento em violação:** 400 Email não corresponde ao checkout
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-010: Vínculo pending→igreja
- **Declaração:** Com pending válido, deve-se vincular assinatura à igreja (RPC link_pending_to_church); falha não desfaz registro.
- **Tipo:** Gatilho
- **Gatilho:** Register com pending
- **Comportamento esperado:** subscriptionLinked ou flag de falha
- **Comportamento em violação:** Registro ok sem assinatura
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 🔔 Regras de Notificação e Eventos

### BR-ONB-011: E-mails de boas-vindas
- **Declaração:** Após registro, enviar boas-vindas ao user e notificação a admin (best-effort).
- **Tipo:** Gatilho
- **Gatilho:** POST register
- **Comportamento esperado:** E-mails Resend
- **Comportamento em violação:** Registro já concluído
- **Implementado em:** `backend/src/controllers/authController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-ONB-012: Rate limit registro
- **Declaração:** Registro ≤10 tentativas/IP/15 min.
- **Tipo:** Restrição
- **Gatilho:** POST register
- **Comportamento esperado:** Dentro da cota
- **Comportamento em violação:** 429
- **Implementado em:** `backend/src/routes/auth.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Registro sem pending cria igreja sem assinatura vinculada imediatamente.
- 🔍 Fluxo landing→register→checkout tem edge cases de usuário já logado (ver jornadas).

---

*Gerado em 2026-07-13. Regras CONFIRMADAS no código do monorepo Flock.*
