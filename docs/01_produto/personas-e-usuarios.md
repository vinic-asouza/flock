---
type: personas-usuarios
ultima_atualizacao: 2026-07-13
versao: "1.0"
tags: [produto, usuários, permissões, personas]
---

# Personas e Usuários — Flock

> Mapa de quem usa o produto, papéis (`ChurchUserRole`), permissões e isolamento multi-tenant. Distinguir **usuário do sistema** (login) de **membro da igreja** (registro pastoral — entidade de negócio, sem login).

---

## 👥 Visão Geral dos Usuários

O Flock possui **4 papéis autenticados** na igreja (`owner` > `admin` > `editor` > `reader`) mais **atores externos sem login** (links públicos, waitlist/landing).

```text
auth.users (Supabase Auth — conta de login)
 └── church_users (vínculo usuário ↔ igreja + role + status)
       └── churches (tenant)
             ├── members              ← NÃO são usuários de login
             ├── integration_members
             ├── congregations / groups / calendar_*
             └── assinatura (plan_type, Stripe)

Atores sem conta:
 ├── Visitante da landing / waitlist
 └── Público com token (registro ou integração)
```

**Hierarquia de papéis** (ordem em `hasRoleOrHigher`):

```text
owner  >  admin  >  editor  >  reader
```

`requireRole(minRole)` exige o papel mínimo ou superior. No frontend, `canEdit = currentRole !== 'reader'`.

---

## 🧑‍💼 Personas por Role

### Owner (Dono)

- **Identificador no código:** `'owner'` (`ChurchUserRole`)
- **Descrição:** Conta que criou / possui a igreja (`churches.user_id` + registro em `church_users`). Responsável legal/administrativo do tenant.
- **Casos de uso principais:** Onboarding da igreja, billing, gestão da equipe, dados da igreja, exclusão de conta (com regras de assinatura).
- **Acesso típico:** Tudo que admin tem + proteção especial (papel owner não é alterável pela rota de usuários; UI de exclusão de conta enfatiza owner).
- **Onboarding específico:** Auto-registro em `/register` (plano free ou pós-checkout Stripe) cria igreja + `church_users` como `owner`; confirmação de e-mail obrigatória.

### Admin (Administrador)

- **Identificador no código:** `'admin'`
- **Descrição:** Administra a igreja sem ser o dono — equipe, billing e auditoria.
- **Casos de uso principais:** Convidar/desativar usuários, editar dados da igreja, portal/sync/change-plan Stripe, ver logs de auditoria.
- **Acesso típico:** Escrita operacional (como editor) + gestão de usuários e billing; **não** pode atribuir/alterar o papel `owner`.
- **Onboarding específico:** Adicionado por admin/owner (e-mail + papel); se o e-mail não existir, cria usuário Auth e envia e-mail de convite informativo.

### Editor

- **Identificador no código:** `'editor'`
- **Descrição:** Operação do dia a dia (secretariado / liderança operacional).
- **Casos de uso principais:** CRUD de membros, integração, congregações, grupos, calendário, links públicos de captação, importação CSV.
- **Acesso típico:** Leitura + escrita nos módulos de negócio; **sem** gestão de equipe, edição cadastral da igreja, billing Stripe nem logs de auditoria.
- **Onboarding específico:** Mesmo fluxo de convite por e-mail (papel `editor`).

### Reader (Leitor)

- **Identificador no código:** `'reader'`
- **Descrição:** Consulta e acompanhamento sem alterar dados.
- **Casos de uso principais:** Listar membros/integração/grupos/calendário, painel de relatórios, exportações PDF, tutoriais.
- **Acesso típico:** Somente leitura nas rotas de negócio; botões de criação/edição desabilitados (`canEdit === false`). Campos Stripe da igreja ocultos (`sanitizeChurchForRole`).
- **Onboarding específico:** Convite com papel `reader`.

### Visitante externo (público) _(persona de superfície, sem role)_

- **Identificador no código:** rotas `/api/public/*`, middlewares `publicRegistrationAuth` / `publicIntegrationAuth`
- **Descrição:** Pessoa sem login que preenche formulário via token de link.
- **Casos de uso:** Autocadastro de membro ou autointegração.
- **Acesso:** Apenas o endpoint/token válido; rate limit em POSTs públicos.
- **Onboarding:** Nenhum — conversão eventual para “membro” da igreja, não para usuário Auth.

### Lead da landing / waitlist _(persona de aquisição)_

- **Identificador:** `POST /api/waitlist`, páginas da landing
- **Descrição:** Interessado em conhecer/assinar o Flock.
- **Acesso:** Marketing + formulário; não acessa o app autenticado até registrar.

> **Nota:** Registros na tabela `members` / `integration_members` **não** são personas de login. São dados pastorais gerenciados pelos papéis acima.

---

## 🔐 Matriz de Permissões

Legenda: ✅ permitido · ❌ negado · 🔶 parcial / com restrição. Baseado em `requireRole` nas rotas e condicionais de UI.

| Recurso / Ação | Owner | Admin | Editor | Reader |
| --- | --- | --- | --- | --- |
| Login + contexto da igreja | ✅ | ✅ | ✅ | ✅ |
| Ler membros / integração / grupos / congregações / calendário | ✅ | ✅ | ✅ | ✅ |
| Criar/editar/excluir membros (incl. import CSV, status) | ✅ | ✅ | ✅ | ❌ |
| Criar/editar/excluir integração + converter | ✅ | ✅ | ✅ | ❌ |
| CRUD congregações / grupos / calendário / participantes | ✅ | ✅ | ✅ | ❌ |
| Criar/gerir links públicos (registro e integração) | ✅ | ✅ | ✅ | ❌ (só listar/ver) _(inferido da rota: GET com reader)_ |
| Exportar PDFs | ✅ | ✅ | ✅ | ✅ |
| Painel / relatórios | ✅ | ✅ | ✅ | ✅ |
| Atualizar dados cadastrais da igreja | ✅ | ✅ | ❌ | ❌ |
| Ver campos Stripe da igreja | ✅ | ✅ | ❌ | ❌ |
| Checkout / portal / sync / change-plan / plano free | ✅ | ✅ | ❌ | ❌ |
| Listar/criar/editar/remover usuários da igreja | ✅ | ✅ | ❌ | ❌ |
| Alterar papel do `owner` | ❌ | ❌ | ❌ | ❌ |
| Ver audit logs (`GET /api/account/logs`) | ✅ | ✅ | ❌ | ❌ |
| Gerenciar própria conta (e-mail, senha, telefone) | ✅ | ✅ | ✅ | ✅ |
| Excluir própria conta Auth | 🔶 | 🔶 | 🔶 | 🔶 |

_Exclusão de conta: autenticado; bloqueada se houver assinatura paga ativa. UI destaca fluxo especialmente para owner._

---

## 🚪 Fluxos de Acesso

| Como entra | Quem | Observação |
| --- | --- | --- |
| Auto-registro (`/register`) | Novo **owner** | Cria Auth user + church + `church_users` owner; e-mail de confirmação |
| Checkout Stripe na landing → registro | Novo **owner** pago | `checkout_session_id` / funnel de plano |
| Convite por e-mail (admin/owner) | admin / editor / reader | Cria Auth user se necessário; status inicia `active`; e-mail informativo |
| Login e-mail/senha | Qualquer usuário Auth com membership ativa | Cookie JWT + refresh; header/cookie `X-Church-Id` / igreja ativa |
| Link público (token) | Visitante | Sem conta; formulário público |
| Waitlist | Lead | Aquisição; não concede acesso ao app |

**Diferenças de onboarding por role:** apenas o **owner** passa pelo registro de igreja + planos. Demais papéis entram por **convite**.

**Restrições por plano (tenant, não por role):** limite de membros (100/200/500/800); `past_due` bloqueia novas inclusões; billing só para admin/owner. Não há feature flags distintas por role além da matriz acima _(inferido)_.

**Multi-igreja:** código de memberships + switcher existem; regra de negócio ao convidar: _“Cada usuário pode pertencer apenas a uma igreja”_ (`user_id` UNIQUE em `church_users`). Owner legado via `churches.user_id` ainda é considerado em `listChurchMembershipsForUser`.

---

## 🔧 Campos de Perfil e Preferências

### Conta de login — `auth.users` (Supabase; exposto via `/api/account`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | uuid | Sim | ID do usuário Auth |
| `email` | string | Sim | Login e comunicações |
| `phone` | string \| null | Não | Telefone da conta |
| `email_confirmed_at` | timestamptz \| null | — | Confirmação de e-mail |
| `phone_confirmed_at` | timestamptz \| null | — | Confirmação de telefone |
| `created_at` | timestamptz | — | Criação da conta |
| `last_sign_in_at` | timestamptz \| null | — | Último login |

Preferências de UI persistidas no cliente _(inferido / parcial):_ modo de visualização de membros (lista/grid). Sem tabela dedicada de “preferences” no schema analisado.

### Vínculo na igreja — `church_users`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | uuid | Sim | PK do vínculo |
| `church_id` | uuid | Sim | Tenant |
| `user_id` | uuid | Sim | Usuário Auth (UNIQUE global) |
| `role` | enum `owner\|admin\|editor\|reader` | Sim | Papel |
| `status` | enum `active\|invited\|disabled` | Sim | Padrão `active` |
| `created_at` / `updated_at` | timestamptz | Sim | Auditoria |

Status `invited` existe no enum; fluxo atual de criação costuma gravar `active` de imediato _(inferido)_.

### Contexto de sessão (não é coluna de perfil)

| Campo | Origem | Descrição |
| --- | --- | --- |
| `req.user` | JWT | `{ id, email }` |
| `req.church` | membership | `{ churchId, role }` |
| Igreja ativa | cookie / `X-Church-Id` | Tenant selecionado |

---

## 🏢 Estrutura Multi-tenant

```text
Church (tenant)
  ├── 1..n ChurchUser (usuários de login + role)
  ├── 1 churches.user_id  → owner “legado” / billing anchor
  └── 1..n Members, IntegrationMembers, Congregations, Groups, Calendar…
```

- **Isolamento:** queries autenticadas filtram por `church_id` do contexto; backend usa `service_role` (bypass RLS) — a segurança de tenant é **aplicacional**.
- **Seleção:** se o usuário tiver mais de um membership resolvível, API pode retornar `CHURCH_SELECTION_REQUIRED`.
- **Equipe:** admin/owner gerencia `church_users`; papéis atribuíveis no convite: `admin`, `editor`, `reader` (não `owner`).

---

## 📝 Notas para os Agentes

1. **Sempre** autenticar e anexar `req.church` antes de dados de negócio; nunca confiar só no frontend (`canEdit`).
2. Usar `requireRole` / `hasRoleOrHigher` — hierarquia `reader < editor < admin < owner`.
3. **Membro ≠ usuário:** CRUD de `members` não concede login; convites usam `church_users`.
4. **Billing e equipe** são `admin`+: editor/reader não devem ver ou mutar Stripe.
5. Respeitar limite de plano e `past_due` ao criar membros (qualquer role editor+).
6. Links públicos são superfície separada: validar token, não JWT de usuário da igreja.
7. Não permitir mutação do papel `owner` pelas APIs de igreja users.
8. Ao projetar UI, desabilitar ações de escrita para `reader` e alinhar tooltips ao padrão existente.
9. E-mail de convite é informativo (não SSO); onboarding do convidado = login com a conta criada/associada.

---

## Arquivos analisados

- `backend/src/types/index.ts` (`ChurchUserRole`, `ChurchUserStatus`, `AuthRequest`)
- `backend/src/middlewares/auth.ts`, `requireRole.ts`
- `backend/src/services/churchContext.ts`
- `backend/src/utils/churchDto.ts`
- `backend/src/routes/members.ts`, `integration.ts`, `congregations.ts`, `groups.ts`, `calendar.ts`, `calendarParticipants.ts`, `export.ts`, `church.ts`, `churchUsers.ts`, `account.ts`, `stripe.ts`, `registrationLinks.ts`, `integrationLinks.ts`
- `backend/src/controllers/churchUserController.ts`, `accountController.ts`
- `backend/src/middlewares/stripeSecurity.ts`
- `backend/bd-structure.sql` (`church_users`, enums, `churches`)
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/components/settings/AccountManagement.tsx`, `ChurchUsersManagement.tsx`, `ChurchManagement.tsx`
- `frontend/src/components/main/Header.tsx`, `ChurchSwitcher.tsx`
- `frontend/src/app/(main)/members/page.tsx` (e demais páginas com `canEdit`)
- `docs/levantamento-fluxos.md` (trechos de onboarding / church_users)
- `docs/01_produto/visao-do-produto.md` (contexto)
