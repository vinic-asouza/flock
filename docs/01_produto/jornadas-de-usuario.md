---
type: jornadas-usuario
ultima_atualizacao: 2026-07-31
versao: "1.8"
tags: [produto, UX, fluxos, jornadas]
---

# Jornadas de Usuário — Flock

> Mapa das rotas e jornadas críticas do produto. Use com [[01_produto/personas-e-usuarios]] e [[01_produto/visao-do-produto]].

---

## 🗺️ Mapa de Rotas

### Frontend (app — Next.js App Router)

```text
/                              → Painel / Relatórios (via `(main)/page.tsx`)
├── (auth)/
│   ├── /login
│   ├── /register
│   ├── /forgot-password
│   ├── /reset-password
│   ├── /create-password
│   └── /checkout              → Seleção/ativação de plano (AuthGuard especial)
├── /auth/callback             → Confirmação de e-mail / callback Auth
├── (main)/                    → Shell: Header + nav (Sidebar ≥ md / drawer < md) + Footer
│   ├── /                      → Painel / Relatórios
│   ├── /members
│   ├── /integration
│   ├── /groups
│   ├── /congregations
│   ├── /calendar
│   ├── /settings?tab=…
│   │   ├── church | payment | account | users | logs
│   ├── /settings/subscription → redirect → /settings?tab=payment
│   └── /tutorials
├── /public/register/[token]   → Autocadastro de membro (sem login)
├── /public/integration/[token]
├── /subscription/success
└── /subscription/cancel
```

### Landing (marketing)

```text
/              → Homepage (hero, features, pricing, CTA)
└── /waitlist  → Lista de espera
```

### Grupos funcionais

| Grupo | Rotas | Guard |
| --- | --- | --- |
| Auth (deslogado) | login, register, forgot/reset/create-password | `AuthGuard` — se já logado → `/` (exceto checkout/`?redirect`) |
| Onboarding / billing entry | register, checkout, subscription/* | Mistura público + auth |
| App autenticado | `/`, `(main)/*` | `(main)/layout` + `ChurchSelectionGate` (Home `/` também sob `(main)`) |
| Público / captação | `/public/*` | Token no path; sem JWT |
| Marketing | landing `/`, `/waitlist` | Público |

---

## 🧭 Arquitetura de Informação

**Nav principal (shell autenticado):** Painel → Membros → Integração → Grupos → Congregações → Calendário → _(separador)_ → Configurações → Tutoriais.  
Fonte única: `NAV_ITEMS` (`frontend/src/components/main/navItems.ts`), consumida por Sidebar e drawer mobile.

**Desktop (≥ `md` / 768px):** Sidebar fixa à esquerda.

**Mobile / tablet estreito (< `md`):** hamburger no Header abre drawer lateral (Headless UI) com os mesmos links; fecha ao navegar, Esc, overlay ou ao redimensionar para ≥ `md`.

**Funil auth / onboarding (`(auth)` + `/subscription/*`):** layout próprio (não usa shell `(main)`). Em mobile, painel de formulário com scroll, safe-area e alvos touch; painel marketing do `(auth)` só a partir de **`lg` (1024px)**. Rotas: login, register, checkout, forgot/reset/create-password; retorno Stripe em `/subscription/success|cancel`.

**Header:** igreja ativa / switcher, alerta de limite de membros (oculto < `md`), badge de plano, papel, e-mail, logout; atalho para plano; hamburger só < `md`.

**Settings:** navegação por abas (`?tab=`); abas `payment`, `users`, `logs` só para `admin`/`owner`.

**Sem:** breadcrumbs globais, busca global, bottom tab bar, wizard de primeiro acesso dedicado _(inferido)_.

**Contexts de fluxo:** `AuthContext` (sessão, role, igrejas), `MembersContext`, `IntegrationContext` — estado de listagens/filtros, não state machine formal.

---

## 🚀 Jornadas Principais

Para cada jornada: objetivo, atores, passos felizes, desvios relevantes.

### J1 — Cadastro free (novo owner)

1. Landing → “Comece grátis” → `/register?plan=100`
2. Preenche conta + igreja → `POST /api/auth/register`
3. Mensagem de confirmar e-mail → link → `/auth/callback` → app (`/`)
4. Plano free ativável via checkout/settings conforme estado da subscription

**Atores:** visitante → owner. **Crítico:** confirmação de e-mail bloqueia uso pleno.

### J2 — Cadastro pago (landing → Stripe → registro)

1. Landing pricing → plano pago → `/register?plan=200|500|800` (ou login com `redirect=/checkout?plan=…`)
2. Registro cria igreja + pending subscription
3. Confirma e-mail → `/checkout` → Stripe Checkout
4. Retorno `/subscription/success` (polling status) ou `/subscription/cancel`
5. Acesso ao app com plano ativo

**Desvio:** usuário já logado na landing pode ser mandado a `/register` em vez de `/checkout` _(limitação conhecida — ver levantamento)_.

### J3 — Login e seleção de igreja

1. `/login` → cookies JWT
2. Se múltiplas memberships → `ChurchSelectionGate`
3. Caso contrário → shell + Painel `/`

**Desvio:** token inválido/401 → redirect login; sessão renovável via refresh cookie.

### J4 — Recuperação de senha

1. `/forgot-password` → e-mail
2. Link → `/reset-password` (ou `/create-password` em fluxos de primeiro set)
3. Sucesso → `/login`

### J5 — Convite de usuário da equipe

1. Owner/admin em `/settings?tab=users` → adiciona e-mail + role
2. E-mail informativo Resend
3. Convidado faz login (conta criada se necessário)
4. Acessa módulos conforme role (`canEdit` para writer)

### J6 — Ciclo de vida do membro (core)

1. `/members` → listar / filtrar / grid|lista
2. Criar (modal/form) ou importar CSV _(multi-step)_ ou link público
3. Editar / alterar status / exportar PDF
4. Soft delete

**Bloqueios:** role `reader`; limite de plano / `past_due`.

**Mobile:** hub e modais CRUD usam layout responsivo (wrap de toolbar/filtros, sheet do `Modal` base, CTAs touch). Autocadastro público: ver J11.

### J7 — Integração → membro

1. `/integration` ou link `/public/integration/[token]`
2. Acompanhar status (`em_progresso` / etc.)
3. Editor converte integrante → membro oficial
4. Continua na jornada J6

**Mobile:** hub e modais (CRUD, Convert, export, links) usam layout responsivo (wrap de toolbar/filtros, sheet do `Modal` base, CTAs touch). Autointegração pública: ver J11.

### J8 — Estrutura e agenda

- Congregações: CRUD + vínculos de membros  
- Grupos: CRUD + membros do grupo  
- Calendário: itens + participantes + export PDF  

Readers só consultam; writers mutam.

**Mobile (Congregações):** hub `/congregations` e modais (Create/Edit/View/Delete) usam layout responsivo (cards/summary wrap, sheet do `Modal` base, CTAs touch). No view, info + lista de membros empilham em `<md` (2 colunas em `md+`); Editar/Excluir ficam no footer sticky do modal no mobile. Create/Edit usam footer sticky do Modal (CTAs fora do scroll / teclado).

**Mobile (Grupos):** hub `/groups` e modais (CRUD, view com membros, delete, exports) usam layout responsivo (wrap de busca/filtros/summary, sheet do `Modal` base, CTAs touch). No view, info + gestão de membros empilham em `<md` (2 colunas em `md+`); Export/Editar/Excluir ficam no footer sticky do modal no mobile. Create/Edit usam footer sticky do Modal (CTAs fora do scroll / teclado).

**Mobile (Calendário):** hub `/calendar` (filtros, tabs Calendário/Listas, visão mês e lista anual) e modais (CRUD, view, delete, aniversariantes) usam layout responsivo (wrap de filtros, sheet do `Modal` base, CTAs touch). No mobile, o grid mensal densifica (dots + contagem); tap no dia abre modal leve “Itens do dia”; em `md+` os chips com título permanecem. Create/Edit/View/Delete usam footer sticky do Modal (CTAs fora do scroll / teclado).

### J9 — Inteligência (Painel)

1. `/` carrega cards e gráficos (filtro por congregação)
2. Drill-down para membros via modais (demografia, geografia, ocupações); navegação para `/congregations`, `/groups`, etc. quando aplicável
3. Export PDF do dashboard

Estado vazio: “Nenhum dado disponível” quando não há membros.

**Mobile (Relatórios / Painel):** hub `/` (ViewSelector geral/congregação, Atualizar, Exportar PDF) e seções (cards, timeline, demografia, grupos, estrutura, geografia, ocupações) usam layout responsivo e CTAs touch. Drill-downs (`MembersModal`, `MemberModalWithSelect`) abrem em sheet/`dvh` no mobile; no `MembersModal` com sideLayout (demografia), categorias viram chips horizontais scrolláveis em `<md` e sidebar em `md+`. Sem migrar drill-downs para rotas full-page.

### J10 — Billing em conta existente

1. `/settings?tab=payment` (admin/owner)
2. Upgrade/change-plan, portal Stripe, sync, ativar free
3. Header mostra status/limite; e-mails de aviso ~80/90/100%

### J11 — Captação pública

1. Editor cria link (modais em Membros / Integração)
2. Visitante abre `/public/register|[integration]/[token]`
3. Submit cria membro/integrante na igreja do link
4. Rate limit e validade/usos do token

**Mobile:**
- `/public/register/[token]`: header com safe-area, formulário scrollável (`PublicMemberForm`) e CTAs full-width.
- `/public/integration/[token]`: mesmo padrão (`PublicIntegrationForm`) — uso típico no celular do visitante.

### J12 — Tutoriais (aprendizado in-app)

1. `/tutorials` → hub de guias por módulo/role
2. Abrir guia → steps textuais → CTA para rota alvo  
3. Reader vê aviso se o guia exige `editor`

---

## 🧱 Fluxos Multi-etapa Identificados

| Fluxo | Onde | Etapas |
| --- | --- | --- |
| Importação CSV de membros | `MemberImportModal` | `upload` → `validation` → `importing` → `result` |
| Funil de plano | Landing → register → callback → checkout → success/cancel | sessionStorage `flock_selected_plan` |
| Settings | Abas por query `tab` | church / payment / account / users / logs |
| Formulários longos | Membro, igreja, registro | seções em um form (sem stepper visual global) |
| Tutoriais | Guias | lista ordenada de steps (educacional, não wizard de dados) |

Não há state machine/XState; etapas via `useState` local ou URL.

---

## 🔀 Transições, Redirects e Guards

| Situação | Comportamento |
| --- | --- |
| Autenticado em rota `(auth)` | `AuthGuard` → `/` (exceto `/checkout` ou `?redirect=`) |
| Não autenticado em `(main)` | layout → `/login` |
| Não autenticado em `/` | `ProtectedRoute` → `/login` |
| `CHURCH_SELECTION_REQUIRED` | `ChurchSelectionGate` |
| `/settings/subscription` | redirect server → `/settings?tab=payment` |
| Tab sem permissão | fallback + toast de erro |
| 401 API | interceptor → logout/login _(padrão do client)_ |

OAuth social: **não identificado** — auth é e-mail/senha + callback de confirmação Supabase.

---

## 📭 Estados Vazios e Erro (UX)

| Contexto | Mensagem / padrão típico |
| --- | --- |
| Lista membros / integração / calendário | “Nenhum … encontrado” |
| Painel sem dados | “Nenhum dado disponível” |
| Grupo/congregação sem membros | empty state no modal |
| Links públicos inexistentes | CTA para criar primeiro link |
| Usuários da equipe | “Nenhum usuário extra…” |
| Tutoriais busca | “Nenhum tutorial encontrado” |
| Erros de formulário | Zod/Joi + toast (`react-hot-toast`) |
| Sem permissão (reader) | botões disabled + tooltip de somente leitura |
| Limite de membros | toast/API message + alerta no Header |

---

## 📝 Notas para Agentes (produto / UX)

1. Novas features do app devem caber no shell de navegação (`NAV_ITEMS` / Sidebar+drawer) ou em Settings tabs — evitar rotas órfãs.
2. Toda jornada de escrita precisa degradar bem para **reader** e respeitar **limite de plano**.
3. Captação externa = jornada separada (`/public/*`); não misturar com shell autenticado.
4. Onboarding de owner depende de **e-mail + plano**; não assumir acesso imediato pós-register.
5. Ao redesenhar formulários (ex.: membro), preservar continuidade com import CSV e links públicos.
6. Estados vazios e erros devem permanecer acionáveis (CTA criar / limpar filtro / upgrade).
7. Não há middleware Next.js global: proteção é layout + AuthContext + API — testar ambos.
8. Billing é jornada de admin/owner; editor/reader não devem ser bloqueados no uso operacional salvo pelo limite de membros do tenant.
9. Adaptação mobile de **conteúdo** de módulos autenticados é Issue própria; o shell (hamburger/drawer) é foundation compartilhada (breakpoint canônico do shell: `md`).
10. Funil de cadastro/planos (J1/J2) usa layout `(auth)` — responsividade própria (`lg` para marketing sidebar); não depender do drawer do shell.
11. Módulo **Membros** (J6/J11 register): hub `/members`, modais CRUD/import/export/links e `/public/register/[token]` são operáveis em ~375px via `Modal` sheet + form responsivo — sem migrar CRUD para rotas full-page.
12. Módulo **Integração** (J7/J11 integration): hub `/integration`, modais CRUD/Convert/export/links e `/public/integration/[token]` seguem o mesmo padrão mobile (~375px) — sem migrar Convert/CRUD para rotas full-page.
13. Módulo **Congregações** (J8): hub `/congregations`, modais CRUD/view/delete e export PDF da lista são operáveis em ~375px — view empilhada + ações sticky no mobile; sem migrar CRUD para rotas full-page.
14. Módulo **Grupos** (J8): hub `/groups`, modais CRUD/view (add/remove membros), delete e exports PDF são operáveis em ~375px — view empilhada + ações sticky no mobile; sem migrar CRUD para rotas full-page.
15. Módulo **Calendário** (J8): hub `/calendar`, visão mês densificada (dots + modal do dia), lista anual, modais CRUD/view/delete e aniversariantes são operáveis em ~375px — footer sticky nos CTAs; sem migrar CRUD para rotas full-page; UI de export PDF do calendário ainda não existe no app.
16. Módulo **Relatórios** (J9): hub `/`, seções do painel e modais de drill-down são operáveis em ~375px — CTAs touch, sheet/`dvh`, sideLayout com chips no mobile; sem migrar drill-downs para rotas full-page; `ReportsFilters` não está montado na Home.

---

## Arquivos analisados

- `frontend/src/app/**/page.tsx`, `layout.tsx` (árvore de rotas)
- `frontend/src/components/main/Sidebar.tsx`, `Header.tsx`, `MainNavLinks.tsx`, `MobileNavDrawer.tsx`, `navItems.ts`
- `frontend/src/components/AuthGuard.tsx`, `ProtectedRoute.tsx`
- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/components/auth/ChurchSelectionGate.tsx`
- `frontend/src/app/(main)/settings/page.tsx`
- `frontend/src/context/AuthContext.tsx`, `MembersContext.tsx`, `IntegrationContext.tsx`
- `frontend/src/components/members/MemberImportModal.tsx`, `hooks/useMemberImport.ts`
- `frontend/src/lib/tutorials/**`
- `landing/src/app/page.tsx`, `waitlist/page.tsx`
- `landing/src/utils/planFunnel.ts`, `components/Pricing.tsx`, `Hero.tsx`
- `docs/levantamento-fluxos.md` (fluxos M1–M13)
- `docs/01_produto/personas-e-usuarios.md`, `visao-do-produto.md`
