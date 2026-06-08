# Proposta de Produto — Módulo 13: Centro de Ajuda / Tutoriais

> **Formato:** Análise de Produto (product-analist.mdc)  
> **Data:** Junho 2026

---

## Resumo Executivo

Transformar `/tutorials` de placeholder em um **Centro de Ajuda integrado ao app**: hub com busca, trilha para iniciantes e guias curtos por módulo (Membros, Integração, Congregações, Grupos, Calendário, Relatórios). Conteúdo estático versionado no repositório (MDX/Markdown), sem backend na v1. Foco em consulta rápida (< 2 min por tarefa) e deep links para cada guia.

---

## Problema Resolvido

Usuários iniciantes não sabem **por onde começar** nem **como executar operações básicas** no Flock. A sidebar expõe "Tutoriais" mas a página está vazia, gerando frustração e aumentando dependência de suporte externo.

---

## Benefícios

- **Ativação mais rápida:** reduz tempo até o primeiro cadastro de membro/congregação
- **Autonomia:** secretários e editores resolvem dúvidas sem sair do app
- **Retenção:** menos abandono nas primeiras semanas por "não sei usar"
- **Consistência:** linguagem alinhada aos rótulos reais da UI (sidebar, botões, modais)
- **Escalabilidade de conteúdo:** novos guias via PR, sem deploy de backend
- **Baixo custo operacional:** sem CMS, sem banco, sem equipe de conteúdo dedicada no MVP

---

## Fluxo de Negócio

### Fluxo principal — Consultar um guia

1. Usuário autenticado clica **Tutoriais** na sidebar
2. Vê hub com: barra de busca, trilha "Primeiros passos" e cards por módulo
3. Clica em um guia (ex.: "Como cadastrar um membro")
4. Lê passos numerados (3–7 passos) com indicação de permissão necessária
5. Clica **"Ir para Membros"** → navega para `/members`
6. (Opcional) Expande seção "Detalhes" para campos do formulário ou dicas

### Fluxo alternativo — Busca

1. Usuário digita "importar csv" ou "converter integrante"
2. Lista filtra guias por título/tags/conteúdo
3. Abre guia correspondente

### Fluxo alternativo — Deep link

1. Outro módulo ou e-mail de onboarding linka `/tutorials?guia=primeiros-passos`
2. Página abre diretamente no guia

### Restrições

- Tutoriais visíveis para **todos os papéis**; guias de escrita exibem badge "Requer perfil Editor"
- Conteúdo **não substitui** permissões — usuário reader que seguir guia de cadastro verá botão desabilitado na tela real (comportamento esperado; guia deve mencionar isso)
- Conteúdo em **português (BR)**, tom direto e acolhedor

---

## Estrutura de Interface

Ver detalhamento completo em [04-especificacao-interface.md](./04-especificacao-interface.md).

### Visão geral do layout (hub)

```
┌─────────────────────────────────────────────────────────────┐
│ Tutoriais                                    [🔍 Buscar...] │
│ Aprenda a usar o Flock passo a passo                        │
├─────────────────────────────────────────────────────────────┤
│ 🚀 Primeiros passos no Flock                    [Iniciar →] │
│    Configure congregações, cadastre membros e veja relatórios│
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Relatórios│ │ Membros  │ │Integração│ │Congrega- │ ...    │
│ │ 3 guias  │ │ 6 guias  │ │ 4 guias  │ │ 3 guias  │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Visão geral do layout (guia individual)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Voltar    Membros › Como cadastrar um membro              │
├─────────────────────────────────────────────────────────────┤
│ [Badge: Editor]  ⏱ ~2 min                                  │
│                                                              │
│ 1. Acesse Membros na barra lateral                          │
│ 2. Clique em "Adicionar membro"                             │
│ 3. Preencha nome e campos obrigatórios (*)                  │
│ 4. Selecione a congregação                                  │
│ 5. Clique em Salvar                                         │
│                                                              │
│ [ Ir para Membros → ]                                        │
│                                                              │
│ ▼ Detalhes (opcional)                                        │
│   Campos obrigatórios, limite do plano, dicas...            │
├─────────────────────────────────────────────────────────────┤
│ Guias relacionados: Editar membro · Filtrar lista           │
└─────────────────────────────────────────────────────────────┘
```

### Jornada do usuário iniciante (trilha recomendada)

| # | Guia | Rota destino |
|---|------|--------------|
| 1 | Conhecer o Painel de Relatórios | `/` |
| 2 | Cadastrar sua primeira congregação | `/congregations` |
| 3 | Cadastrar seu primeiro membro | `/members` |
| 4 | Registrar um visitante na Integração | `/integration` |
| 5 | Criar um grupo | `/groups` |
| 6 | Adicionar um evento no Calendário | `/calendar` |

---

## Abordagens de layout avaliadas

| Abordagem | Prós | Contras | Recomendação |
|-----------|------|---------|--------------|
| **A — Cards + guia inline (split view)** | Rápido de escanear; familiar (Notion/Intercom) | Em mobile, split fica apertado | ✅ **MVP** |
| **B — Accordion na mesma página** | Zero navegação extra | Poluição com muitos guias | Complementar dentro de cada card |
| **C — Vídeos embed** | Alto engajamento | Custo de produção; manutenção quando UI muda | Evolução v2 |
| **D — Tour guiado (overlay no app)** | Contextual | Complexo; quebra com updates de UI | Evolução v3 (product tours) |
| **E — CMS headless (Contentful etc.)** | Editores não-dev | Infra extra; desalinhado com monorepo | Não no MVP |
| **F — Wiki externa** | Fácil de editar | Sai do app; piora UX | Não recomendado |

**Decisão:** Abordagem **A** no MVP, com busca client-side e conteúdo MDX. Accordion apenas para seções "Detalhes" dentro de cada guia.

---

## Recursos de UX recomendados

| Recurso | Prioridade | Descrição |
|---------|------------|-----------|
| Busca instantânea | MVP | Filtra títulos, tags e corpo dos guias |
| Cards por módulo | MVP | Ícones iguais aos da sidebar (`lucide-react`) |
| Trilha "Primeiros passos" | MVP | Banner destacado no topo |
| Badge de permissão | MVP | `Reader` / `Editor` / `Admin` |
| Tempo estimado de leitura | MVP | "~2 min" calculado por palavras |
| Botão "Ir para a tela" | MVP | Link à rota do módulo |
| Deep links (`?guia=`) | MVP | Compartilhável |
| Guias relacionados | MVP | 2–3 links no rodapé do guia |
| Screenshots anotados | v1.1 | PNG/WebP estáticos em `/public/tutorials/` |
| Vídeos curtos | v2 | Loom/YouTube embed |
| Tooltips contextuais no app | v2 | "?" ao lado de botões complexos linkando ao guia |
| Progresso da trilha | v2 | localStorage: guias lidos |
| FAQ / glossário | v1.1 | "Membro vs Integrante", "Sede vs Congregação" |

---

## Impacto Técnico

### Backend

**MVP: nenhuma alteração.**

Evolução opcional (v2+):

- `GET /api/tutorials/progress` — salvar progresso por usuário (requer tabela)
- Analytics de guias mais acessados (evento de auditoria)

### Banco de Dados

**MVP: nenhuma tabela.**

Evolução v2 (se progresso persistido):

```sql
-- Opcional futuro
tutorial_progress (
  id uuid PK,
  user_id uuid FK,
  guide_slug text,
  completed_at timestamptz,
  church_id uuid FK
)
```

### Frontend

| Item | Descrição |
|------|-----------|
| `tutorials/page.tsx` | Refatorar: hub + roteamento de guia via query param ou sub-rota |
| `tutorials/[slug]/page.tsx` | (Alternativa) Rota dinâmica por guia |
| `content/tutorials/*.mdx` | Arquivos de conteúdo |
| `lib/tutorials.ts` | Registry: slug, título, módulo, tags, role, rota, related |
| `components/tutorials/*` | `TutorialHub`, `TutorialGuide`, `TutorialSearch`, `RoleBadge`, `GuideCard` |
| `public/tutorials/` | Screenshots (v1.1) |

**Dependências sugeridas:** `@next/mdx` ou `next-mdx-remote` (avaliar conforme setup Next 15); sem nova dependência se usar Markdown parseado com `gray-matter` + `react-markdown` (já comum).

### Segurança

- Conteúdo estático público **dentro do app autenticado** — sem dados sensíveis nos guias
- Não expor tokens, URLs internas de API ou detalhes de billing
- Tutoriais acessíveis a todos os papéis; badge de permissão é informativo
- Sem RLS — conteúdo igual para todos os tenants (correto para help genérico)

---

## Critérios de Aceitação

### Hub

- Dado que estou autenticado, quando acesso `/tutorials`, então vejo listagem de guias agrupados por módulo (não placeholder "Em desenvolvimento")
- Dado que digito na busca, quando o termo corresponde a um guia, então a lista filtra em tempo real
- Dado que sou usuário `reader`, quando abro um guia de cadastro, então vejo badge informando que a ação requer perfil Editor

### Guia individual

- Dado que abro um guia, quando leio os passos, então cada passo usa os **mesmos rótulos** dos botões/telas reais (ex.: "Adicionar membro", não "Criar registro")
- Dado que concluo a leitura, quando clico "Ir para [Módulo]", então sou redirecionado à rota correta (`/members`, `/integration`, etc.)
- Dado que acesso `/tutorials?guia=membros-cadastrar`, então o guia correspondente é exibido diretamente

### Trilha iniciante

- Dado que sou novo usuário, quando acesso o hub, então vejo destaque "Primeiros passos" com sequência de 6 guias ordenados
- Dado que não há guias para um módulo futuro, então o card não aparece (sem empty states quebrados)

### Responsividade

- Dado que acesso em mobile, quando abro um guia, então o conteúdo ocupa largura total (sem split view)
- Dado que acesso em desktop, quando navego hub → guia, então posso voltar ao hub sem perder contexto de busca (opcional: preservar query)

### Não-regressão

- Dado que implemento tutoriais, quando acesso outros módulos, então nenhuma rota existente é alterada
- Dado deploy sem conteúdo MDX novo, então build não falha (fallback ou registry tipado)

---

## Complexidade

**Média** — Frontend com registry tipado + MDX/Markdown; sem backend. Maior esforço está na **redação e screenshots**, não na engenharia.

| Fase | Esforço estimado |
|------|------------------|
| Infra FE (hub, guia, busca, registry) | 2–3 dias dev |
| Redação 24 guias (catálogo) | 2–3 dias produto/conteúdo |
| Screenshots anotados (v1.1) | 1–2 dias design |
| **Total MVP (sem screenshots)** | **~1 semana** |

---

## Prioridade

**Média-Alta** — Não bloqueia operação do sistema, mas impacta diretamente **ativação e retenção** de novos clientes. Corrigir placeholder vazio é quick win de percepção de produto.

---

## MVP Recomendado

### Entregar

1. Hub `/tutorials` com busca e 6 cards de módulo
2. Trilha "Primeiros passos" (6 guias encadeados)
3. **24 guias** conforme [03-catalogo-guias-iniciantes.md](./03-catalogo-guias-iniciantes.md)
4. Badge de permissão + botão "Ir para a tela"
5. Deep link `?guia=<slug>`
6. Conteúdo em arquivos versionados (MD/MDX + registry TypeScript)

### Não entregar no MVP

- Vídeos
- Progresso salvo
- CMS admin
- Product tours in-app
- Tutoriais de Configurações/Billing/Links públicos
- Internacionalização

### Estrutura de arquivos sugerida (implementação)

```
frontend/
├── content/tutorials/
│   ├── primeiros-passos/
│   │   └── 01-conhecer-painel.md
│   ├── membros/
│   │   ├── cadastrar-membro.md
│   │   └── ...
│   └── ...
├── src/
│   ├── lib/tutorials/
│   │   ├── registry.ts      # metadados tipados
│   │   └── loadGuide.ts       # carrega MD
│   ├── components/tutorials/
│   │   ├── TutorialHub.tsx
│   │   ├── TutorialGuideView.tsx
│   │   ├── TutorialSearch.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── RoleBadge.tsx
│   │   └── RelatedGuides.tsx
│   └── app/(main)/tutorials/
│       └── page.tsx           # hub + ?guia= slug
```

---

## Evoluções Futuras

| Versão | Feature |
|--------|---------|
| v1.1 | Screenshots anotados por passo; FAQ/glossário |
| v1.2 | Tutoriais de Configurações, Links públicos, Import CSV avançado |
| v2.0 | Vídeos embed; analytics de guias mais lidos |
| v2.1 | Progresso da trilha (localStorage → backend) |
| v3.0 | Product tours contextuais (highlight de UI in-app) |
| v3.1 | Sugestão contextual: "Precisa de ajuda?" em modais complexos (`MemberForm`) |
| v4.0 | CMS headless se equipe de conteúdo non-dev crescer |

---

## Métricas de sucesso (pós-lançamento)

| Métrica | Meta inicial |
|---------|--------------|
| % novos usuários que visitam `/tutorials` na 1ª semana | > 40% |
| Tempo médio na página de guia | 1–3 min (leitura efetiva) |
| Redução de dúvidas de suporte "como cadastrar membro" | -30% em 60 dias |
| NPS/comentário qualitativo sobre facilidade de uso | Melhora vs. baseline |

---

## Referências internas

- Levantamento: `docs/levantamento-fluxos.md` (Módulos 3–8, §5.6)
- Sidebar: `frontend/src/components/main/Sidebar.tsx`
- Permissões: `docs/levantamento-fluxos.md` §4.2
- QA por módulo: `docs/QA/modulo-03-members/` … `modulo-08-dashboard/`
