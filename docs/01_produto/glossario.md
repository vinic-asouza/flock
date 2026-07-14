---
type: glossario
ultima_atualizacao: 2026-07-13
versao: "1.0"
tags: [produto, domínio, vocabulário, referência]
total_termos: 72
---

# Glossário do Domínio — Flock

> Caminho canônico na knowledge base: `docs/01_produto/glossario.md` _(vault Obsidian equivalente: `obsidian/01_produto/glossario.md`)_.

---

## 📖 Como Usar Este Glossário

Sempre use os termos definidos aqui ao se referir a conceitos do produto. Em caso de ambiguidade, **o glossário é a fonte da verdade**.

- Preserve identificadores de código em inglês (`Member`, `church_id`) e use o **termo de UI em português** quando falar com usuários ou escrever copy.
- Consulte [[01_produto/personas-e-usuarios]] para detalhe de papéis e [[01_produto/jornadas-de-usuario]] para fluxos.
- Não confunda entidade pastoral (**Membro**) com conta de login (**Usuário**).

---

## 🔤 Termos por Categoria

### Entidades Principais

**Igreja** *(código: `Church`, tabela `churches`)*  
> Organização religiosa cliente do Flock — o **tenant** multi-tenant. Tudo o que acontece no app autenticado pertence a uma igreja.  
- **Atributos-chave:** `name`, `denomination`, `cnpj`, `plan_type`, `subscription_status`, endereço  
- **Relacionamentos:** tem N usuários (`church_users`), membros, congregações, grupos, etc.; `user_id` aponta o owner legado  
- **Usado em:** todo o produto autenticado; isolamento por `church_id` / `X-Church-Id`  
- **UI:** nome da igreja no Header / switcher

**Congregação** *(código: `Congregation`, `congregations`)*  
> Unidade local ou sede dentro da igreja (ex.: sede, ponto, campus). Não é o tenant.  
- **Atributos-chave:** `name`, endereço, `leader`, `phone`  
- **Relacionamentos:** pertence a 1 igreja; membros e eventos podem referenciá-la  
- **Usado em:** Membros, Integração, Grupos, Calendário, Relatórios  
- **UI:** “Congregações”

**Membro** *(código: `Member`, `members`)*  
> Pessoa no **rol oficial** da igreja. **Não** possui login no Flock por ser membro.  
- **Atributos-chave:** `name`, `birth`, `gender`, `active`, `congregation_id`, dados eclesiásticos (`admission`, batismo, etc.)  
- **Relacionamentos:** igreja; opcional congregação; N grupos (`member_groups`); pode ser mentor de integrantes  
- **Usado em:** Membros, Relatórios, Grupos, Calendário, limite de plano  
- **UI:** “Membros” · soft delete / `active`

**Integrante** *(código: `IntegrationMember`, `integration_members`)*  
> Pré-membro em processo de **Integração** antes de entrar no rol oficial.  
- **Atributos-chave:** `name`, `status`, `mentor_id`, `expected_congregation_id`, `expected_admission_type`  
- **Relacionamentos:** igreja; mentor = um `Member`; conversão gera `Member`  
- **Usado em:** módulo Integração + links públicos de integração  
- **UI:** “Integrante” / “Integração” · código: `IntegrationMember`

**Grupo** *(código: `Group`, `groups`)*  
> Estrutura interna (ministério, célula, classe, etc.) para organizar membros.  
- **Atributos-chave:** `type` (`GroupType`), `name`, `responsible_id`, `status`, `congregation_id`  
- **Relacionamentos:** igreja; opcional congregação; membros via `member_groups`  
- **Usado em:** Grupos, Membros, Relatórios  
- **Nota:** substitui o antigo conceito de “cargos” isolados documentado em FEATURES v1 legado

**Usuário da igreja** *(código: vínculo `ChurchUser` / `church_users`)*  
> Conta Auth (`auth.users`) com papel na igreja. É quem **faz login**.  
- **Atributos-chave:** `role`, `status`, `user_id`, `church_id`  
- **Relacionamentos:** 1 usuário ↔ preferencialmente 1 igreja (`user_id` UNIQUE)  
- **Usado em:** Auth, Configurações → Usuários  
- **UI:** “Usuários” · papéis: Dono, Administrador, Editor, Leitor

**Conta** *(código: dados de `auth.users` via `/api/account`)*  
> Identidade de login (e-mail, telefone, senha). Independente do cadastro de membro.  
- **Usado em:** Configurações → Conta; registro; recuperação de senha

**Plano** *(código: `plan_type`, `PLAN_CONFIG`)*  
> Faixa comercial que define o **limite de membros** e preço da assinatura.  
- **Valores:** `100` (grátis), `200`, `500`, `800`, `custom`  
- **Usado em:** Billing, limites, landing pricing  
- **UI:** “Plano 100/200/…” 

**Assinatura** *(código: campos Stripe em `churches` + `pending_subscriptions`)*  
> Contrato de cobrança da igreja junto ao Stripe (status, datas, customer/subscription IDs).  
- **Usado em:** checkout, portal, webhooks, jobs de expiração/downgrade

**Item de calendário** *(código: `CalendarItem`, `calendar_items`)*  
> Compromisso da igreja: programação, evento, encontro ou reunião (com ou sem recorrência).  
- **Atributos-chave:** `title`, `type`, `start_date`, `status`, recorrência, local, vínculos  
- **UI:** “Calendário”

**Participante** *(código: `CalendarParticipant`)*  
> Quem participa de um item — **membro** cadastrado ou **convidado** (`guest_*`) sem ser membro.  
- **Usado em:** Calendário

**Link de registro / autocadastro** *(código: `PublicRegistrationLink`)*  
> URL tokenizada para o público criar um **Membro** sem login.  
- **UI:** links de autocadastro (modais em Membros)

**Link de integração / autointegração** *(código: `PublicIntegrationLink`)*  
> URL tokenizada para o público criar um **Integrante** sem login.  
- **UI:** links de integração

**Mentor** *(código: `mentor_id` → `Member`)*  
> Membro responsável por acompanhar um Integrante no processo de integração.

**Lista de espera** *(código: `waitlist`)*  
> Lead captado na landing antes/fora do funil completo de registro.

**Log de auditoria** *(código: `audit_logs`)*  
> Registro de ações sensíveis (create/update/delete/convert/import…) sobre entidades da igreja.  
- **UI:** Configurações → Logs (admin/owner)

**Assinatura pendente** *(código: `pending_subscriptions`)*  
> Intenção de plano criada no onboarding ainda não plenamente vinculada à igreja ativa.

---

### Status e Estados

#### Integração (`integration_status_enum`)

- **`em_progresso`** — integrante ainda em acompanhamento  
- **`integrado`** — processo concluído (tipicamente após conversão)  
- **`descartado`** — não seguirá para o rol de membros  

#### Usuário da igreja (`church_user_status`)

- **`active`** — pode acessar a igreja  
- **`invited`** — status previsto no schema; fluxo atual costuma criar já `active` _(inferido)_  
- **`disabled`** — vínculo desativado  

#### Membro

- **`active: true`** — membro ativo no rol  
- **`active: false`** — inativo (soft); ainda conta para regras de limite conforme implementação  

#### Calendário (`CalendarStatus`)

- **`active`** — evento vigente  
- **`cancelled`** — cancelado  
- **`postponed`** — adiado  

#### Assinatura (`subscription_status` — alinhado ao Stripe)

- **`active`** — paga/operante  
- **`trialing`** — em trial  
- **`past_due`** — inadimplência / grace — **bloqueia novas inclusões de membros**  
- **`canceled`** — cancelada (pode haver `subscription_end_date`)  
- **`unpaid` / `incomplete` / `incomplete_expired` / `paused`** — estados Stripe de cobrança interrompida ou incompleta  

#### Grupo

- **`status: true/false`** — grupo ativo/inativo (boolean, não enum nomeado)

---

### Tipos e Categorias de Domínio

#### Tipo de grupo (`GroupType`) — UI = código em português

Ministério · Departamento · Equipe · Time · Comissão · Célula · Grupo de Crescimento · Pequeno Grupo · Discipulado · Classe · Núcleo · Região · Grupo

#### Tipo de item de calendário (`CalendarItemType`)

Programação · Evento · Encontro · Reunião

#### Recorrência (`RecurrencePattern`)

- **`weekly`** / **`monthly`** — (schema também admite `custom`)  
- UI tipicamente em linguagem de periodicidade semanal/mensal

#### Tipo de admissão esperada (integração) / recebimento (membro)

- Código integração: `batismo` | `transferencia` | `profissao de fe` | `outro`  
- UI membro: **“Tipo de Recebimento”** / **“Data de Recebimento”** (`admission`, `admission_date`)  
- Divergência: labels de membro podem incluir variantes (“Batismo Infantil”, “Apresentação…”) — evoluem com o formulário

#### Gênero / estado civil

- Membro (UI/TS): `Masculino` | `Feminino` (| `Outro` no SQL)  
- Integração (enum SQL): `masculino` | `feminino` _(casing diferente — atenção em conversões)_  
- Estado civil: Solteiro/Casado/… · União Estável (membro TS); enums SQL em minúsculas sem acento em partes

---

### Ações e Operações

| Ação (negócio) | Código / onde | Significado |
| --- | --- | --- |
| **Converter** | `POST …/integration/:id/convert` | Transformar Integrante em Membro |
| **Importar membros** | CSV validate → import | Carga em lote com validação prévia |
| **Autocadastrar** | link `PublicRegistrationLink` | Visitante vira Membro |
| **Autointegrar** | link `PublicIntegrationLink` | Visitante vira Integrante |
| **Ativar/desativar membro** | `PATCH …/status` | Alterna `active` sem full update |
| **Excluir membro** | soft delete | Remove do uso ativo sem apagar histórico de negócio de imediato |
| **Convidar usuário** | `church_users` + e-mail | Dá login + role na igreja |
| **Checkout** | Stripe Checkout Session | Pagamento/ativação de plano pago |
| **Portal** | Stripe Customer Portal | Cliente gerencia cartão/cancelamento |
| **Downgrade** | job `downgrade_expired_subscriptions` | Ajusta igreja para plano free/limites após expiração |
| **Sincronizar assinatura** | sync Stripe ↔ DB | Alinha status local ao Stripe |

**Jobs de negócio (cron):** `cleanup_pending_subscriptions`, `downgrade_expired_subscriptions`, `validate_subscription_integrity`, `check_subscription_expiration`, `cleanup_webhook_events`.

---

### Papéis e Permissões

Hierarquia: `owner` > `admin` > `editor` > `reader`.

| Código | UI | Resumo |
| --- | --- | --- |
| `owner` | Dono | Tenant + billing + equipe; papel não reatribuível pelas rotas de usuários |
| `admin` | Administrador | Equipe, igreja, billing, logs |
| `editor` | Editor | Escrita operacional (membros, integração, estrutura, agenda) |
| `reader` | Leitor | Somente leitura / relatórios |

Detalhes: [[01_produto/personas-e-usuarios]].

---

### Configurações e Limites

| Constante / conceito | Valor | Significado |
| --- | --- | --- |
| Plano `100` | 0 / 100 membros | Plano gratuito |
| Plano `200` | R$ 29,99 / 200 | Pago pequeno |
| Plano `500` | R$ 59,99 / 500 | Pago médio |
| Plano `800` | R$ 89,99 / 800 | Pago grande |
| `custom` / `personalizado` | — | Plano sob medida (schema/waitlist); pouco exposto na landing |
| Limite de membros | = `plan.members` | Quota que trava criações ao estourar |
| Avisos de limite | ~80% / 90% / 100% | E-mails de proximidade do teto |
| `past_due` | grace | Mantém plano mas bloqueia **novos** membros |
| `ENABLE_CRON_JOBS` | true/false | Liga jobs de assinatura/limpeza |

---

## 🔄 Termos Técnicos com Significado de Negócio

| Termo técnico | Significado no produto |
| --- | --- |
| Tenant / multi-tenant | Uma **Igreja**; dados isolados por `church_id` |
| Membership | Vínculo usuário↔igreja + role (`church_users` + owner legado) |
| Soft delete (membro) | Membro deixa de estar ativo/uso corrente; não é “apagar igreja” |
| Webhook (Stripe) | Evento de pagamento/assinatura que atualiza a Igreja |
| Service role (Supabase) | Acesso backend que bypassa RLS — segurança de tenant é na aplicação |
| Plan type `100`…`800` | Identificador do plano (= teto de membros no nome) |
| Guest (calendário) | Participante externo sem cadastro de Membro |
| Painel | Home `/` — dashboard de relatórios (não “dashboard admin” genérico) |
| Integração (módulo) | Funil de pré-membros — **não** é integração de API/sistema |
| CNPJ | Identificador da igreja no Brasil (cadastro/tenant) |

---

## ❌ Termos a Evitar (Ambiguidades)

| Evitar | Usar em vez disso | Motivo |
| --- | --- | --- |
| Chamar Membro de “usuário” | **Membro** vs **Usuário (da igreja)** | Membro não faz login; Usuário sim |
| “Igreja” para filial local | **Congregação** | Igreja = tenant; Congregação = unidade interna |
| “Integração” no sentido técnico (API) | Nomear o sistema externo (Stripe, …) | “Integração” no Flock = módulo de pré-membros |
| “Cargo” como módulo atual | **Grupo** (tipo Ministério/… ) | Cargos CRUD legado; modelo vigente é Grupos |
| “Customer” sem contexto | **Igreja** (cliente SaaS) ou customer Stripe | Evitar misturar billing Stripe com linguagem pastoral |
| “Role” sem qualificar | **Papel (`ChurchUserRole`)** ou tipo de **Grupo** | “Role” no código = permissão; não cargo eclesial |
| “Member” na UI em inglês | **Membro** | UI é em português |
| “Workspace/Team” | **Igreja** / **Usuários da igreja** | Vocabulário do produto não usa workspace |

---

## 🔤 Índice Alfabético

- **A:** Assinatura, Assinatura pendente, Autocadastro, Autointegração, Auditoria (log), Admin/Administrador  
- **B:** Batismo (tipo de admissão), Billing (ver Assinatura)  
- **C:** Calendário (item), Checkout, Congregação, Conta, Converter, CNPJ, Célula (tipo de grupo)  
- **D:** Dono (`owner`), Downgrade, Descartado (`descartado`)  
- **E:** Editor, Em progresso (`em_progresso`), Evento (tipo calendário), Encontro  
- **G:** Grupo, Guest/Convidado (calendário)  
- **I:** Igreja, Integrante, Integração (módulo), Integrado (`integrado`), Importar membros  
- **L:** Leitor (`reader`), Limite de membros, Lista de espera, Link de registro, Link de integração  
- **M:** Membro, Mentor, Membership, Ministério (tipo de grupo)  
- **P:** Painel, Plano (`100`/`200`/`500`/`800`/`custom`), Participante, Portal (Stripe), Past due, Programação  
- **R:** Recebimento (tipo/data), Reader, Recorrência, Reunião  
- **S:** Soft delete, Subscription status, Sincronizar assinatura  
- **T:** Tenant, Tipo de grupo, Trialing  
- **U:** Usuário da igreja, União Estável  
- **W:** Waitlist, Webhook (Stripe)

---

## Contagem e arquivos analisados

**Total de termos documentados:** 72 _(frontmatter `total_termos`)_.

**Arquivos analisados:**

- `backend/src/types/index.ts`
- `frontend/src/types/index.ts`, `calendar.ts`, `integration.ts`, `congregation.ts`, `reports.ts`, `role.ts`
- `backend/bd-structure.sql`
- `backend/src/config/plans.ts`, `utils/planLimits.ts`
- `backend/src/app.ts` (jobs)
- `backend/src/controllers/churchUserController.ts` (labels de roles)
- `frontend/src/components/main/Sidebar.tsx`, `Header.tsx`
- `frontend/src/components/settings/ChurchUsersManagement.tsx`
- `frontend/src/components/integration/*`, `members/ExportMembersModal.tsx`, `public/PublicMemberForm.tsx`
- `docs/01_produto/visao-do-produto.md`, `personas-e-usuarios.md`, `jornadas-de-usuario.md`
- `docs/FEATURES_V1.0.md`, `docs/levantamento-fluxos.md`, `README.md`
