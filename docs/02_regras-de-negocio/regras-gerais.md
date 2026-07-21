---
type: regras-gerais
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 49
tags: [regras, transversal, global]
---

# Regras de Negócio Gerais (Transversais) — Flock

> Regras que atravessam vários módulos. Formato declarativo: o **quê** o sistema exige, não o **como** detalhado da implementação.
>
> Legenda: regras **confirmadas** no código · 🔍 = **inferida**, revisar.

---

## 📋 Sumário de Regras

| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-GEN-001 | Autenticação obrigatória em rotas de negócio | Restrição | Ativo |
| BR-GEN-002 | Rotas públicas sem JWT de usuário | Fato | Ativo |
| BR-GEN-003 | Sessão via cookies HttpOnly + refresh | Fato | Ativo |
| BR-GEN-004 | E-mail confirmado para login | Restrição | Ativo |
| BR-GEN-005 | Login exige vínculo com igreja | Restrição | Ativo |
| BR-GEN-006 | Seleção de igreja quando há múltiplos vínculos | Gatilho de Ação | Ativo |
| BR-GEN-007 | Tokens revogados não autenticam | Restrição | Ativo |
| BR-GEN-008 | Rotas internas exigem token de ops | Restrição | Ativo |
| BR-GEN-009 | Papel mínimo hierárquico | Restrição | Ativo |
| BR-GEN-010 | Isolamento por igreja (tenant) | Restrição | Ativo |
| BR-GEN-011 | Um usuário Auth em no máximo uma igreja (convite) | Restrição | Ativo |
| BR-GEN-012 | Billing e equipe só admin+ | Restrição | Ativo |
| BR-GEN-013 | Campos financeiros ocultos a editor/reader | Restrição | Ativo |
| BR-GEN-014 | Owner imutável via gestão de usuários | Restrição | Ativo |
| BR-GEN-015 | Leitor sem mutações de negócio | Restrição | Ativo |
| BR-GEN-016 | Senha forte | Restrição | Ativo |
| BR-GEN-017 | E-mail válido em cadastros Auth | Restrição | Ativo |
| BR-GEN-018 | Telefone brasileiro | Restrição | Ativo |
| BR-GEN-019 | CNPJ válido e único por igreja | Restrição | Ativo |
| BR-GEN-020 | CEP brasileiro quando informado | Restrição | Ativo |
| BR-GEN-021 | Upload CSV apenas e ≤ 10MB | Restrição | Ativo |
| BR-GEN-022 | Validação de inputs antes de persistir | Restrição | Ativo |
| BR-GEN-023 | Links públicos: token ativo, válido e dentro do limite | Restrição | Ativo |
| BR-GEN-024 | church_id em entidades de negócio | Restrição | Ativo |
| BR-GEN-025 | Cascade ao excluir igreja | Gatilho de Ação | Ativo |
| BR-GEN-026 | Timestamps padrão | Fato | Ativo |
| BR-GEN-027 | Inativação de membro ≠ exclusão | Fato | Ativo |
| BR-GEN-028 | Exclusão de membro é permanente | Gatilho de Ação | Ativo |
| BR-GEN-029 | Desativação de links públicos é lógica | Gatilho de Ação | Ativo |
| BR-GEN-030 | Limite de membros do plano | Restrição | Ativo |
| BR-GEN-031 | past_due bloqueia novas inclusões | Restrição | Ativo |
| BR-GEN-032 | Unicidades críticas (CNPJ, e-mail waitlist, tokens) | Restrição | Ativo |
| BR-GEN-033 | Formato de erro `{ error, details? }` | Fato | Ativo |
| BR-GEN-034 | Detalhes técnicos só em development | Restrição | Ativo |
| BR-GEN-035 | Erros de pagamento em linguagem amigável | Derivação | Ativo |
| BR-GEN-036 | 401/403 em falha de authz | Gatilho de Ação | Ativo |
| BR-GEN-037 | Handler global 500 | Gatilho de Ação | Ativo |
| BR-GEN-038 | Rate limit geral da API | Restrição | Ativo |
| BR-GEN-039 | Rate limit de login/registro | Restrição | Ativo |
| BR-GEN-040 | Rate limit de recuperação de senha | Restrição | Ativo |
| BR-GEN-041 | Rate limit de POSTs públicos | Restrição | Ativo |
| BR-GEN-042 | Rate limit de relatórios de membros | Restrição | Ativo |
| BR-GEN-043 | Rate limit de operações de conta sensíveis | Restrição | Ativo |
| BR-GEN-044 | Rate limit checkout/webhook Stripe | Restrição | Ativo |
| BR-GEN-045 | Health sem rate limit geral | Exceção | Ativo |
| BR-GEN-046 | Auditoria em ações sensíveis | Gatilho de Ação | Ativo |
| BR-GEN-047 | Audit log exige user + church + entity_id | Restrição | Ativo |
| BR-GEN-048 | Histórico de atividades (audit logs) só admin+ | Restrição | Ativo |
| BR-GEN-049 | Correlação por X-Request-Id | Fato | Ativo |

---

## 🔐 Regras de Autenticação e Sessão

### BR-GEN-001: Autenticação obrigatória em rotas de negócio
- **Declaração:** Toda requisição a rotas de membros, congregações, grupos, calendário, igreja, conta (mutações autenticadas), export, integração autenticada, links geridos e church-users deve autenticação válida de usuário.
- **Tipo:** Restrição
- **Contexto:** Proteger dados pastorais e administrativos do tenant.
- **Comportamento esperado:** Middleware popula `user` (+ contexto de igreja quando aplicável) e segue.
- **Comportamento em violação:** `401` com mensagem de token ausente/inválido/expirado.
- **Implementado em:** `backend/src/middlewares/auth.ts`; `router.use(authMiddleware)` nas rotas de negócio
- **Exceções conhecidas:** BR-GEN-002
- **Regras relacionadas:** BR-GEN-003, BR-GEN-006, BR-GEN-010

### BR-GEN-002: Rotas públicas sem JWT de usuário
- **Declaração:** Rotas de registro/login (parcial), plans públicos, waitlist, webhook Stripe, health e superfícies `/api/public/*` (com token de link) não devem exigir sessão de usuário Auth.
- **Tipo:** Fato
- **Contexto:** Onboarding, marketing, webhooks e captação externa.
- **Comportamento esperado:** Acesso conforme regras específicas da rota (token de link, assinatura Stripe, etc.).
- **Comportamento em violação:** N/A (são rotas permitidas); link inválido → 4xx próprio.
- **Implementado em:** `backend/src/app.ts`; `routes/public.ts`; `routes/waitlist.ts`; `routes/plans.ts`; `routes/stripe.ts` (webhook); middlewares `public*Auth`
- **Exceções conhecidas:** Logout e parte do Stripe autenticado ainda exigem auth
- **Regras relacionadas:** BR-GEN-023, BR-GEN-008

### BR-GEN-003: Sessão via cookies HttpOnly + refresh
- **Declaração:** Toda sessão web deve preferir cookies HttpOnly (`flock_access_token`, `flock_refresh_token`) com renovação automática do access quando expirado; access ~15 min, refresh ~7 dias.
- **Tipo:** Fato
- **Contexto:** Reduz XSS sobre tokens; mantém UX contínua.
- **Comportamento esperado:** Auth middleware tenta refresh e atualiza cookies.
- **Comportamento em violação:** `401` se refresh falhar.
- **Implementado em:** `backend/src/utils/cookieUtils.ts`; `backend/src/middlewares/auth.ts`
- **Exceções conhecidas:** Header `Authorization` Bearer aceito como fallback
- **Regras relacionadas:** BR-GEN-001, BR-GEN-007

### BR-GEN-004: E-mail confirmado para login
- **Declaração:** Nenhum usuário deve obter sessão se o e-mail Auth não estiver confirmado.
- **Tipo:** Restrição
- **Contexto:** Garantir ownership do e-mail no onboarding.
- **Comportamento esperado:** Login só após confirmação.
- **Comportamento em violação:** `401` “Email não confirmado”.
- **Implementado em:** `backend/src/controllers/authController.ts` (`login`)
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-005

### BR-GEN-005: Login exige vínculo com igreja
- **Declaração:** Todo login bem-sucedido deve resultar em ao menos um membership de igreja ativo/resolvível; caso contrário o acesso ao produto é negado.
- **Tipo:** Restrição
- **Contexto:** O Flock é B2B por igreja; conta órfã não opera.
- **Comportamento esperado:** Define igreja ativa e devolve contexto.
- **Comportamento em violação:** `404` “Igreja não encontrada”.
- **Implementado em:** `authController.login`; `churchContext.listChurchMembershipsForUser`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-006, BR-GEN-010

### BR-GEN-006: Seleção de igreja quando há múltiplos vínculos
- **Declaração:** Quando um usuário tiver mais de um membership e nenhuma igreja ativa válida, o sistema deve exigir seleção explícita antes de operações de negócio.
- **Tipo:** Gatilho de Ação
- **Contexto:** Evitar ambiguidade de tenant.
- **Comportamento esperado:** `403` `CHURCH_SELECTION_REQUIRED` + gate no frontend.
- **Comportamento em violação:** Operações de negócio não avançam sem escolha.
- **Implementado em:** `churchContext.attachChurchContext`; `ChurchSelectionGate`
- **Exceções conhecidas:** Membership único auto-seleciona
- **Regras relacionadas:** BR-GEN-010, BR-GEN-011

### BR-GEN-007: Tokens revogados não autenticam
- **Declaração:** Todo access token presente na blacklist de sessão não deve autenticar.
- **Tipo:** Restrição
- **Contexto:** Logout / invalidação imediata.
- **Comportamento esperado:** `401` “Token revogado”.
- **Comportamento em violação:** Tentativa rejeitada.
- **Implementado em:** `middlewares/auth.ts`; logout em `authController`
- **Exceções conhecidas:** Blacklist em memória — não compartilhada entre instâncias 🔍 (produção multi-instância)
- **Regras relacionadas:** BR-GEN-003

### BR-GEN-008: Rotas internas exigem token de ops
- **Declaração:** Endpoints internos de métricas/stats de billing devem exigir token configurado (`METRICS_TOKEN` / `INTERNAL_BILLING_TOKEN`); em produção, ausência do token deve ocultar o recurso.
- **Tipo:** Restrição
- **Contexto:** Observabilidade sem exposição pública.
- **Comportamento esperado:** Acesso com header/query corretos.
- **Comportamento em violação:** `404` “Not found” (não vaza existência).
- **Implementado em:** `middlewares/internalToken.ts`; `app.ts` `/metrics`, `/api/internal/billing/stats`
- **Exceções conhecidas:** Em non-production, token ausente pode liberar (`next()`)
- **Regras relacionadas:** —

---

## 🛡️ Regras de Autorização

### BR-GEN-009: Papel mínimo hierárquico
- **Declaração:** Toda ação com `requireRole(min)` só deve ser executada se `role` atual for ≥ min na ordem `reader < editor < admin < owner`.
- **Tipo:** Restrição
- **Contexto:** RBAC uniforme no tenant.
- **Comportamento esperado:** Segue para o handler.
- **Comportamento em violação:** `403` permissão insuficiente.
- **Implementado em:** `middlewares/requireRole.ts`; `churchContext.hasRoleOrHigher`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-012, BR-GEN-015

### BR-GEN-010: Isolamento por igreja (tenant)
- **Declaração:** Toda operação autenticada de negócio deve ler/escrever apenas dados cuja `church_id` seja a igreja do contexto da requisição.
- **Tipo:** Restrição
- **Contexto:** Multi-tenant SaaS; privacidade entre igrejas.
- **Comportamento esperado:** Queries filtradas por `req.church.churchId`.
- **Comportamento em violação:** `404` / negação (registro “não encontrado” na igreja).
- **Implementado em:** Controllers de domínio (padrão `.eq('church_id', churchId)`); contexto via `X-Church-Id` / cookie
- **Exceções conhecidas:** Backend usa service_role (RLS bypass) — a regra é **aplicacional**
- **Regras relacionadas:** BR-GEN-006, BR-GEN-024

### BR-GEN-011: Um usuário Auth em no máximo uma igreja (convite)
- **Declaração:** Nenhum usuário Auth deve ser vinculado a uma segunda igreja via convite se já existir `church_users` para outro tenant.
- **Tipo:** Restrição
- **Contexto:** Simplifica permissões e faturamento por conta.
- **Comportamento esperado:** Convite com e-mail livre / não usado em outra igreja.
- **Comportamento em violação:** `400` “Email já em uso em outra igreja”.
- **Implementado em:** `churchUserController.createChurchUser`; UNIQUE `church_users.user_id`
- **Exceções conhecidas:** Owner legado via `churches.user_id` ainda entra em listagem de memberships
- **Regras relacionadas:** BR-GEN-006

### BR-GEN-012: Billing e equipe só admin+
- **Declaração:** Toda mutação de plano/assinatura (portal, sync, change-plan, activate-free) e gestão de `church_users` deve exigir papel `admin` ou superior.
- **Tipo:** Restrição
- **Contexto:** Proteção financeira e de quem acessa o tenant.
- **Comportamento esperado:** Fluxos de billing/equipe disponíveis.
- **Comportamento em violação:** `403`.
- **Implementado em:** `routes/stripe.ts`; `routes/churchUsers.ts`; `stripeSecurity.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-009, BR-GEN-013

### BR-GEN-013: Campos financeiros ocultos a editor/reader
- **Declaração:** Respostas de dados da igreja para papéis abaixo de admin não devem expor identificadores/status Stripe sensíveis.
- **Tipo:** Restrição
- **Contexto:** Princípio do menor privilégio na UI/API.
- **Comportamento esperado:** Payload sanitizado.
- **Comportamento em violação:** N/A (sanitização preventiva).
- **Implementado em:** `utils/churchDto.sanitizeChurchForRole`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-012

### BR-GEN-014: Owner imutável via gestão de usuários
- **Declaração:** O papel `owner` de um vínculo não deve ser alterado/removido pelas rotas padrão de church-users.
- **Tipo:** Restrição
- **Contexto:** Preservar accountability do tenant.
- **Comportamento esperado:** Edição rejeitada para linha owner.
- **Comportamento em violação:** `400` “Não permitido”.
- **Implementado em:** `churchUserController.updateChurchUser` / delete
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-012

### BR-GEN-015: Leitor sem mutações de negócio
- **Declaração:** Usuário com papel `reader` deve apenas ler módulos de negócio (listar/ver/exportar); criar/editar/excluir exige `editor`+.
- **Tipo:** Restrição
- **Contexto:** Perfil consultivo (diretoria/supervisão).
- **Comportamento esperado:** GET permitidos; POST/PUT/PATCH/DELETE bloqueados nas rotas com `requireRole('editor')`.
- **Comportamento em violação:** `403`; UI desabilita ações (`canEdit === false`).
- **Implementado em:** Rotas `members`, `integration`, `groups`, `calendar`, etc.; `AuthContext.canEdit`
- **Exceções conhecidas:** Conta própria (e-mail/senha) permanece mutável pelo próprio usuário
- **Regras relacionadas:** BR-GEN-009

---

## ✅ Regras de Validação de Dados

### BR-GEN-016: Senha forte
- **Declaração:** Toda senha nova (registro, alteração, reset) deve ter no mínimo 8 caracteres com maiúscula, minúscula e número.
- **Tipo:** Restrição
- **Contexto:** Segurança básica de contas.
- **Comportamento esperado:** Aceita e persiste hash Auth.
- **Comportamento em violação:** `400` validação Joi/Zod.
- **Implementado em:** `validators/passwordValidator.ts`; `churchValidator.ts`; `accountValidator.ts`; schemas Zod no frontend
- **Exceções conhecidas:** —
- **Regras relacionadas:** —

### BR-GEN-017: E-mail válido em cadastros Auth
- **Declaração:** Todo e-mail de conta deve ser formato válido; registro rejeita e-mail já cadastrado.
- **Tipo:** Restrição
- **Contexto:** Identidade única de login.
- **Comportamento esperado:** Conta criada / e-mail alterado.
- **Comportamento em violação:** `400`.
- **Implementado em:** `churchValidator`; `authController.register`; fluxos de account
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-004

### BR-GEN-018: Telefone brasileiro
- **Declaração:** Telefones/WhatsApp quando validados devem seguir formato BR (10 dígitos fixo ou 11 com 9 no celular).
- **Tipo:** Restrição
- **Contexto:** Domínio Brasil.
- **Comportamento esperado:** Aceito após limpeza.
- **Comportamento em violação:** Mensagem de telefone inválido.
- **Implementado em:** `utils/validations.validatePhone`; validators de membro/integração/igreja
- **Exceções conhecidas:** Campos opcionais podem omitir
- **Regras relacionadas:** BR-GEN-020

### BR-GEN-019: CNPJ válido e único por igreja
- **Declaração:** Toda igreja registrada deve ter CNPJ com dígitos verificadores válidos e único no sistema.
- **Tipo:** Restrição
- **Contexto:** Identidade legal do tenant BR.
- **Comportamento esperado:** Registro ok.
- **Comportamento em violação:** `400` CNPJ inválido ou já cadastrado.
- **Implementado em:** `cnpjSchema` / `validateCNPJ`; `authController.register`; UNIQUE `churches.cnpj`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-032

### BR-GEN-020: CEP brasileiro quando informado
- **Declaração:** CEP informado deve ter 8 dígitos válidos (não só zeros).
- **Tipo:** Restrição
- **Contexto:** Endereço nacional.
- **Comportamento esperado:** Aceito.
- **Comportamento em violação:** Erro de validação.
- **Implementado em:** `utils/validations.validateCEP`; validators de membro
- **Exceções conhecidas:** Campo opcional
- **Regras relacionadas:** BR-GEN-018

### BR-GEN-021: Upload CSV apenas e ≤ 10MB
- **Declaração:** Todo upload de importação de membros deve ser arquivo CSV e não ultrapassar 10MB.
- **Tipo:** Restrição
- **Contexto:** Prevenir abuso e formatos inválidos.
- **Comportamento esperado:** Arquivo em memória para parse.
- **Comportamento em violação:** Erro Multer / rejeição de tipo.
- **Implementado em:** `middlewares/upload.ts`
- **Exceções conhecidas:** Único upload de arquivo no produto (não há imagens)
- **Regras relacionadas:** BR-GEN-038

### BR-GEN-022: Validação de inputs antes de persistir
- **Declaração:** Todo payload de criação/atualização de domínio deve passar por schema Joi (backend) e, nas telas, Zod quando houver formulário.
- **Tipo:** Restrição
- **Contexto:** Integridade e mensagens claras.
- **Comportamento esperado:** Persistência só após validação.
- **Comportamento em violação:** `400` com detalhes de campo.
- **Implementado em:** `backend/src/validators/*`; formulários frontend com Zod
- **Exceções conhecidas:** Alguns fluxos Stripe usam mensagens amigáveis agregadas
- **Regras relacionadas:** BR-GEN-033

### BR-GEN-023: Links públicos: token ativo, válido e dentro do limite
- **Declaração:** Todo POST público de registro/integração só deve ocorrer se o token existir, `is_active`, não expirado e abaixo de `max_uses` (quando definido).
- **Tipo:** Restrição
- **Contexto:** Captação controlada sem login.
- **Comportamento esperado:** Cria membro/integrante na igreja do link.
- **Comportamento em violação:** `403`/`404` link inválido/expirado/limite.
- **Implementado em:** `publicRegistrationAuth.ts`; `publicIntegrationAuth.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-002, BR-GEN-029, BR-GEN-041

---

## 🗄️ Regras de Integridade de Dados

### BR-GEN-024: church_id em entidades de negócio
- **Declaração:** Toda entidade pastoral/operacional (membros, integrantes, congregações, grupos, calendário, links, audit) deve pertencera uma igreja.
- **Tipo:** Restrição
- **Contexto:** Modelo multi-tenant.
- **Comportamento esperado:** FK `church_id` preenchida na criação.
- **Comportamento em violação:** Falha de insert / constraint.
- **Implementado em:** `bd-structure.sql`; inserts nos controllers
- **Exceções conhecidas:** `church_subscription_events.church_id` pode ser null em pending checkout
- **Regras relacionadas:** BR-GEN-010

### BR-GEN-025: Cascade ao excluir igreja
- **Declaração:** Quando uma igreja for excluída, registros filhos com FK `ON DELETE CASCADE` devem ser removidos com ela.
- **Tipo:** Gatilho de Ação
- **Contexto:** Não deixar órfãos de tenant.
- **Comportamento esperado:** Cascade no Postgres.
- **Comportamento em violação:** N/A
- **Implementado em:** `bd-structure.sql` (congregations, groups, calendar_items, church_users, …)
- **Exceções conhecidas:** Relacionamentos `ON DELETE SET NULL` em alguns FKs (ex.: responsible)
- **Regras relacionadas:** BR-GEN-024

### BR-GEN-026: Timestamps padrão
- **Declaração:** Entidades de negócio devem registrar `created_at` e, quando mutáveis, `updated_at` com default `now()`.
- **Tipo:** Fato
- **Contexto:** Auditorabilidade temporal.
- **Comportamento esperado:** Colunas preenchidas pelo banco/triggers.
- **Comportamento em violação:** —
- **Implementado em:** `bd-structure.sql`; triggers de `updated_at` em subset (ex.: church_users, subscription)
- **Exceções conhecidas:** Nem toda tabela tem trigger de `updated_at` explícito
- **Regras relacionadas:** BR-GEN-046

### BR-GEN-027: Inativação de membro ≠ exclusão
- **Declaração:** Todo membro com `active = false` permanece no banco como registro inativo e não deve ser tratado como apagado; inativar remove participação em eventos futuros.
- **Tipo:** Fato / Gatilho de Ação
- **Contexto:** Histórico pastoral + agenda limpa.
- **Comportamento esperado:** Status atualizado; cleanup de `calendar_participants` futuros.
- **Comportamento em violação:** —
- **Implementado em:** `memberController.setMemberStatus` / update
- **Exceções conhecidas:** Contagem de limite usa membros `active = true`
- **Regras relacionadas:** BR-GEN-028, BR-GEN-030

### BR-GEN-028: Exclusão de membro é permanente
- **Declaração:** Toda exclusão via `DELETE` de membro deve remover o registro do banco (hard delete), após validar pertencimento à igreja.
- **Tipo:** Gatilho de Ação
- **Contexto:** Remoção definitiva solicitada pelo operador.
- **Comportamento esperado:** Row removida + audit `delete`.
- **Comportamento em violação:** `404` se não pertencer à igreja.
- **Implementado em:** `memberController.deleteMember`  
- **Exceções conhecidas:** Comentário na rota `members.ts` cita “soft delete”, mas o handler exclui de fato — divergência doc/código (ver §9)
- **Regras relacionadas:** BR-GEN-027, BR-GEN-046

### BR-GEN-029: Desativação de links públicos é lógica
- **Declaração:** Links de registro/integração “excluídos/desativados” devem permanecer no banco com `is_active = false` (não apagar o histórico do token).
- **Tipo:** Gatilho de Ação
- **Contexto:** Rastreio e evitar reuso acidental.
- **Comportamento esperado:** Soft deactivate.
- **Comportamento em violação:** Tentativas públicas → 403 link desativado.
- **Implementado em:** `*LinkController` deactivate; middlewares públicos
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-023

### BR-GEN-030: Limite de membros do plano
- **Declaração:** Nenhuma igreja deve adicionar membros (criar/importar/converter, conforme fluxos que checam limite) além do teto do `plan_type` ativo.
- **Tipo:** Restrição
- **Contexto:** Monetização por capacidade.
- **Comportamento esperado:** Operação permitida se `count(active) + qty ≤ limit`.
- **Comportamento em violação:** Negação com mensagem de upgrade / limite.
- **Implementado em:** `utils/planLimits.checkMemberLimit`; uso em criação de membros
- **Exceções conhecidas:** Sem `plan_type` o checker pode tratar como ilimitado 🔍
- **Regras relacionadas:** BR-GEN-031

### BR-GEN-031: past_due bloqueia novas inclusões
- **Declaração:** Igreja com `subscription_status = past_due` não deve adicionar novos membros mesmo que o contador numérico ainda tenha folga.
- **Tipo:** Restrição
- **Contexto:** Grace period de cobrança.
- **Comportamento esperado:** Bloqueio + mensagem.
- **Comportamento em violação:** Tentativa rejeitada.
- **Implementado em:** `planLimits.ts` (SL05)
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-030, BR-GEN-012

### BR-GEN-032: Unicidades críticas
- **Declaração:** O sistema deve garantir unicidade de CNPJ de igreja, e-mail de waitlist, tokens de links públicos, e IDs Stripe de customer/subscription quando preenchidos.
- **Tipo:** Restrição
- **Contexto:** Evitar colisão de tenants e eventos.
- **Comportamento esperado:** Constraint UNIQUE no banco / erro no insert.
- **Comportamento em violação:** Falha de persistência / 400 no registro.
- **Implementado em:** `bd-structure.sql` índices UNIQUE
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-019

---

## 🚨 Regras de Tratamento de Erros

### BR-GEN-033: Formato de erro `{ error, details? }`
- **Declaração:** Respostas de erro da API devem expor ao cliente uma mensagem em `error` e, quando útil, `details` (string ou lista).
- **Tipo:** Fato
- **Contexto:** Contrato estável para o frontend.
- **Comportamento esperado:** JSON previsível.
- **Comportamento em violação:** —
- **Implementado em:** Padrão dos controllers
- **Exceções conhecidas:** Alguns endpoints internos/health retornam corpos mínimos
- **Regras relacionadas:** BR-GEN-034

### BR-GEN-034: Detalhes técnicos só em development
- **Declaração:** Stack traces e detalhes internos de erros não devem ser enviados ao cliente em produção.
- **Tipo:** Restrição
- **Contexto:** Segurança e UX.
- **Comportamento esperado:** Produção omite `details` técnicos / stack.
- **Comportamento em violação:** —
- **Implementado em:** error handler em `app.ts`; `formatErrorResponse`
- **Exceções conhecidas:** Alguns controllers ainda enviam `error.message` em 500
- **Regras relacionadas:** BR-GEN-037

### BR-GEN-035: Erros de pagamento em linguagem amigável
- **Declaração:** Falhas Stripe mapeáveis devem ser traduzidas para mensagens compreensíveis ao usuário final.
- **Tipo:** Derivação
- **Contexto:** Reduz atrito no checkout.
- **Comportamento esperado:** Mensagem amigável + detalhes técnicos só em dev.
- **Comportamento em violação:** Fallback genérico de suporte.
- **Implementado em:** `utils/errorMessages.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-033

### BR-GEN-036: 401/403 em falha de authz
- **Declaração:** Falha de autenticação deve responder `401`; falha de papel/tenant deve responder `403` (ou `404` quando se ocultar existência do recurso de outro tenant).
- **Tipo:** Gatilho de Ação
- **Contexto:** Semântica HTTP + privacidade.
- **Comportamento esperado:** Códigos corretos.
- **Comportamento em violação:** —
- **Implementado em:** `auth.ts`, `requireRole.ts`, controllers
- **Exceções conhecidas:** Login sem igreja usa `404`
- **Regras relacionadas:** BR-GEN-001, BR-GEN-009

### BR-GEN-037: Handler global 500
- **Declaração:** Erros não tratados na cadeia Express devem resultar em `500` com mensagem genérica ao cliente.
- **Tipo:** Gatilho de Ação
- **Contexto:** Última linha de defesa.
- **Comportamento esperado:** Log no servidor + JSON 500.
- **Comportamento em violação:** —
- **Implementado em:** `app.ts` error middleware
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-034

---

## ⚡ Limites e Rate Limiting

### BR-GEN-038: Rate limit geral da API
- **Declaração:** Todo IP deve ficar limitado a **1000** requisições / **15 minutos** na API (exceto health).
- **Tipo:** Restrição
- **Contexto:** Proteção DDoS/abuso genérico.
- **Comportamento esperado:** Requests dentro da cota passam.
- **Comportamento em violação:** Mensagem “Muitas requisições”.
- **Implementado em:** `app.ts` `generalLimiter`
- **Exceções conhecidas:** BR-GEN-045
- **Regras relacionadas:** BR-GEN-039–044

### BR-GEN-039: Rate limit de login/registro
- **Declaração:** Login e registro devem limitar a **10** tentativas / **15 min** por IP (login não conta sucesso).
- **Tipo:** Restrição
- **Contexto:** Força bruta / spam de contas.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** 429 lógico via express-rate-limit.
- **Implementado em:** `routes/auth.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-038

### BR-GEN-040: Rate limit de recuperação de senha
- **Declaração:** Recuperação de senha deve limitar a **5** tentativas / **1 hora** por IP; alteração autenticada a **5** / **15 min**.
- **Tipo:** Restrição
- **Contexto:** Abuso de e-mail / brute force de senha.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** Bloqueio temporário.
- **Implementado em:** `routes/password.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-016

### BR-GEN-041: Rate limit de POSTs públicos
- **Declaração:** Cadastros públicos devem limitar a **15** posts / **15 min** por IP.
- **Tipo:** Restrição
- **Contexto:** Spam em links abertos.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** “Muitas tentativas de cadastro”.
- **Implementado em:** `middlewares/publicPostLimiter.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-023

### BR-GEN-042: Rate limit de relatórios de membros
- **Declaração:** Endpoint de relatórios de membros deve limitar a **10** req / **1 min** por IP.
- **Tipo:** Restrição
- **Contexto:** Query pesada.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** Mensagem específica de relatórios.
- **Implementado em:** `routes/members.ts` `reportsLimiter`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-038

### BR-GEN-043: Rate limit de operações de conta sensíveis
- **Declaração:** Operações de conta devem limitar uso geral (**20**/15 min) e sensíveis — e-mail/senha/exclusão — a **5**/hora.
- **Tipo:** Restrição
- **Contexto:** Proteção de conta.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** Mensagem de excesso.
- **Implementado em:** `routes/account.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-038

### BR-GEN-044: Rate limit checkout/webhook Stripe
- **Declaração:** Checkout público deve limitar a **10**/hora; webhook Stripe a **300**/min.
- **Tipo:** Restrição
- **Contexto:** Abuso de sessão de pagamento vs. volume legítimo de eventos.
- **Comportamento esperado:** Dentro da cota.
- **Comportamento em violação:** Rate limit message.
- **Implementado em:** `middlewares/stripeSecurity.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-012

### BR-GEN-045: Health sem rate limit geral
- **Declaração:** A rota `/health` não deve consumir a cota do rate limit geral.
- **Tipo:** Fato / Exceção
- **Contexto:** Probes de infraestrutura.
- **Comportamento esperado:** Sempre responde se o processo está up.
- **Comportamento em violação:** —
- **Implementado em:** `app.ts` `skip: path === '/health'`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-038

---

## 📝 Regras de Auditoria

### BR-GEN-046: Auditoria em ações sensíveis
- **Declaração:** Operações de create/update/delete/convert/import/export/deactivate sobre entidades listadas devem gerar registro em `audit_logs` quando houver usuário autenticado no contexto da igreja.
- **Tipo:** Gatilho de Ação
- **Contexto:** Rastreabilidade pastoral/administrativa (Histórico de atividades na UI).
- **Comportamento esperado:** Linha com before/after; IP e user-agent podem ser gravados, mas não são o foco da UI do app.
- **Comportamento em violação:** Falha de audit é logada mas tipicamente **não** reverte a operação (best-effort).
- **Implementado em:** `utils/auditLogger.ts`; chamadas nos controllers
- **Exceções conhecidas:** Entidades cobertas: member, congregation, integration_member, links, group, member_group, calendar_item, account, church — **não** cobre tudo (ex.: church_users). Geração de relatório **não** gera audit log (DEV-16). Import/export de lista de membros: um log genérico por operação. 🔍
- **Regras relacionadas:** BR-GEN-047, BR-GEN-048

### BR-GEN-047: Audit log exige user + church + entity_id
- **Declaração:** Nenhum audit log deve ser gravado sem `user_id`, `church_id` e `entity_id`.
- **Tipo:** Restrição
- **Contexto:** Logs atribuíveis.
- **Comportamento esperado:** Insert completo.
- **Comportamento em violação:** Skip + log de erro interno.
- **Implementado em:** `auditLogger.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-046

### BR-GEN-048: Logs de auditoria só admin+
- **Declaração:** Somente `admin` ou superior deve listar o Histórico de atividades (`audit_logs`) da igreja.
- **Tipo:** Restrição
- **Contexto:** Dados sensíveis de operação; UI Configurações → Histórico.
- **Comportamento esperado:** Lista paginada enriquecida com `actor` (sem `ip`/`user_agent` no payload do app).
- **Comportamento em violação:** `403`.
- **Implementado em:** `routes/account.ts` `GET /logs` + `requireRole('admin')`; UI `settings` só admin/owner
- **Exceções conhecidas:** —
- **Regras relacionadas:** BR-GEN-012

### BR-GEN-049: Correlação por X-Request-Id
- **Declaração:** Toda requisição HTTP deve receber/propagar um `X-Request-Id` para correlação de logs.
- **Tipo:** Fato
- **Contexto:** Observabilidade operacional.
- **Comportamento esperado:** Header na resposta; id em `req.requestId`.
- **Comportamento em violação:** —
- **Implementado em:** `middlewares/requestId.ts`
- **Exceções conhecidas:** —
- **Regras relacionadas:** —

---

## ⚠️ Regras Sem Implementação Clara / Divergências

| ID local | Observação | Severidade |
| --- | --- | --- |
| 🔍 Soft delete de membro | Rota comenta “soft delete”, mas `deleteMember` faz **hard delete**. Inativação é via `active`. Alinhar produto/docs. | Alta |
| 🔍 Retenção de audit_logs | Não há política de purge/retenção encontrada. | Média |
| 🔍 Limite de payload JSON global | Sem `express.json({ limit })` explícito encontrado — default Express. | Baixa |
| 🔍 Timeout global de request | Não padronizado no app. | Baixa |
| 🔍 Plano ausente = ilimitado | `checkMemberLimit` permite Infinity se `plan_type` null — confirmar intenção de negócio. | Alta |
| 🔍 Blacklist JWT multi-instância | Em memória; regra BR-GEN-007 enfraquece em cluster. | Alta |
| 🔍 Auditoria incompleta | Nem todas as mutações (ex.: church_users) passam por `logAudit`. | Média |
| 🔍 Testes globais | Sem suite de integração automatizada cobrindo estas regras de ponta a ponta. | Média |

---

## Totais e arquivos analisados

**Total de regras documentadas (confirmadas):** 49 (`total_regras` no frontmatter).

**Arquivos analisados (principais):**

- `backend/src/app.ts`
- `backend/src/middlewares/auth.ts`, `requireRole.ts`, `upload.ts`, `requestId.ts`, `internalToken.ts`, `publicPostLimiter.ts`, `publicRegistrationAuth.ts`, `publicIntegrationAuth.ts`, `stripeSecurity.ts`
- `backend/src/services/churchContext.ts`
- `backend/src/utils/cookieUtils.ts`, `auditLogger.ts`, `planLimits.ts`, `validations.ts`, `errorMessages.ts`, `churchDto.ts`
- `backend/src/validators/passwordValidator.ts`, `churchValidator.ts`, `accountValidator.ts`, `cnpjSchema.ts`
- `backend/src/routes/auth.ts`, `password.ts`, `account.ts`, `members.ts`, `stripe.ts`, `churchUsers.ts`
- `backend/src/controllers/authController.ts`, `memberController.ts`, `churchUserController.ts`
- `backend/bd-structure.sql`
- `frontend/src/context/AuthContext.tsx` (canEdit / seleção de igreja)
- Documentação de apoio: `docs/01_produto/personas-e-usuarios.md`
