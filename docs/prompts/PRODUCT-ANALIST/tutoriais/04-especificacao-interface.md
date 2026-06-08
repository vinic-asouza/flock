# Especificação de Interface — Centro de Ajuda / Tutoriais

> **Tipo:** UX / Design spec  
> **Data:** Junho 2026  
> **Alinhamento:** Design system existente (Tailwind 4, `PageHeader`, `Button`, cores `primary`, padrões `(main)/*`)

---

## 1. Princípios de design

| Princípio | Aplicação |
|-----------|-----------|
| **Scan rápido** | Títulos curtos; passos numerados; máx. 7 passos visíveis sem scroll |
| **Mesma linguagem** | Rótulos idênticos à sidebar e botões reais |
| **Progressive disclosure** | Detalhes em accordion colapsado |
| **Consistência** | Reutilizar `PageHeader`, `Button`, cards `bg-white rounded-lg border border-gray-200` |
| **Permissão visível** | Badge antes do conteúdo, não escondido no rodapé |

---

## 2. Telas

### 2.1 Hub — `/tutorials`

#### Cabeçalho

```
Componente: PageHeader
title: "Tutoriais"
subtitle: "Aprenda a usar o Flock passo a passo."
actions: (vazio no MVP)
```

Abaixo do header: campo de busca full-width (max-w-xl).

#### Busca

```
┌──────────────────────────────────────────────┐
│ 🔍  Buscar tutoriais (ex.: cadastrar membro) │
└──────────────────────────────────────────────┘
```

- Input com ícone `Search` (lucide)
- Filtragem client-side instantânea
- Empty state busca: "Nenhum tutorial encontrado para «termo»"
- Placeholder rotativo opcional (v1.1)

#### Banner — Trilha Primeiros Passos

Card destacado (`border-primary/30 bg-primary/5`):

```
┌────────────────────────────────────────────────────────────┐
│ 🚀  Primeiros passos no Flock                              │
│     Configure sua igreja em 6 passos simples               │
│                                                            │
│     ① Painel  →  ② Congregação  →  ③ Membro  →  ...      │
│                                                            │
│                                    [ Começar trilha → ]    │
└────────────────────────────────────────────────────────────┘
```

- Click "Começar trilha" → abre `pp-01-conhecer-painel`
- Steps mini indicadores (6 círculos); concluídos em v2 com localStorage

#### Grid de módulos

Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`

Cada `ModuleCard`:

```
┌─────────────────────────┐
│ [Icon]  Membros         │
│         6 tutoriais     │
│                         │
│ • Cadastrar membro      │
│ • Editar membro         │
│ • Filtrar lista         │
│ +3 mais                 │
│                         │
│ [ Ver todos → ]         │
└─────────────────────────┘
```

Ícones = mesmos da `Sidebar.tsx`:

| Módulo | Ícone |
|--------|-------|
| Relatórios | `Home` |
| Membros | `Users` |
| Integração | `UserPlus` |
| Congregações | `Layers` |
| Grupos | `UserCog` |
| Calendário | `Calendar` |

Click "Ver todos" → expande lista filtrada por módulo (inline ou scroll to section).

#### Seção FAQ (v1.1)

Accordion no rodapé do hub com glossário (ver catálogo FAQ).

---

### 2.2 Vista de guia — `/tutorials?guia=<slug>`

Alternativa futura: `/tutorials/[slug]` para URLs mais limpas.

#### Layout desktop (≥ md)

Opção recomendada — **single column** (simplicidade > split):

```
┌─────────────────────────────────────────────────────────────┐
│ ← Voltar aos tutoriais                                      │
├─────────────────────────────────────────────────────────────┤
│ Membros · Como cadastrar um membro                          │
│ [Editor]  ~3 min                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. Clique em Membros na barra lateral                     │
│   2. Clique em "Adicionar membro"                           │
│   ...                                                       │
│                                                             │
│   [ Ir para Membros → ]                                     │
│                                                             │
│   ▼ Detalhes                                                │
│   ▼ Dicas                                                   │
│                                                             │
│   Guias relacionados                                        │
│   [Editar membro] [Filtrar lista]                           │
└─────────────────────────────────────────────────────────────┘
```

#### Layout mobile

- Mesma coluna única
- Botão "Ir para..." sticky no bottom (`fixed bottom-0` com padding safe-area) — opcional se CTA importante
- Breadcrumb simplificado: apenas "← Voltar"

---

## 3. Componentes novos

### `TutorialHub`

Props: `guides: TutorialGuideMeta[]`

Responsabilidades: busca, banner trilha, grid de módulos.

### `TutorialGuideView`

Props: `guide: TutorialGuideMeta`, `content: ReactNode`

Responsabilidades: render MDX, badges, passos, accordion detalhes, related, CTA.

### `TutorialSearch`

Props: `guides`, `onFilter`

Input controlado; debounce 150ms opcional.

### `RoleBadge`

| Role | Cor | Label |
|------|-----|-------|
| `reader` | `bg-gray-100 text-gray-700` | Somente leitura |
| `editor` | `bg-blue-100 text-blue-800` | Requer Editor |
| `admin` | `bg-purple-100 text-purple-800` | Requer Admin |

### `GuideStepList`

Lista ordenada estilizada:

```html
<ol class="list-decimal list-inside space-y-3 text-gray-700">
```

Passos com menção a UI em **semibold**: `"Adicionar membro"`.

### `RelatedGuides`

Row de `Button variant="secondary" size="sm"` linkando `?guia=`.

### `GoToModuleButton`

```tsx
<Button onClick={() => router.push(guide.route)}>
  Ir para {moduleLabel} →
</Button>
```

---

## 4. Estados da interface

### Loading

- Hub: skeleton de 6 cards (reutilizar padrão de `MembersSkeleton` simplificado)
- Guia: skeleton de 5 linhas + botão

### Empty state (hub sem conteúdo — não deve ocorrer em prod)

```
Ícone BookOpen
"Tutoriais em preparação"
```

Substitui placeholder atual "Em desenvolvimento".

### Empty state (busca)

```
Ícone Search
"Nenhum tutorial encontrado"
"Sugestão: membros, calendário, integração"
```

### Error (falha ao carregar MDX)

```
Ícone AlertCircle
"Não foi possível carregar este tutorial"
[ Voltar ao hub ]
```

### Success

Não há ação destrutiva — sem toast obrigatório. Opcional v2: toast "Marcado como lido".

### Sem permissão (informativo)

Banner amarelo suave no guia `editor`:

```
ℹ️ Seu perfil é somente leitura. Você pode acompanhar os passos,
   mas botões de cadastro aparecerão desabilitados nas telas do sistema.
```

Exibir quando `canEdit === false` do `AuthContext`.

---

## 5. Responsividade

| Breakpoint | Hub | Guia |
|------------|-----|------|
| Mobile `< md` | 1 coluna; busca full width | CTA full width; sticky opcional |
| Tablet `md` | 2 colunas no grid | max-w-2xl centralizado |
| Desktop `lg+` | 3 colunas no grid | max-w-3xl; padding generoso `p-6 md:p-10` (igual layout main) |

Sidebar existente permanece visível em desktop (`hidden md:flex`) — tutoriais não precisam de sidebar própria.

---

## 6. Navegação e URLs

| URL | Comportamento |
|-----|---------------|
| `/tutorials` | Hub |
| `/tutorials?guia=membros-cadastrar` | Guia específico |
| `/tutorials?modulo=membros` | Hub filtrado por módulo (opcional MVP) |

**Voltar:** preserva scroll do hub via `router.back()` ou state `?from=hub`.

---

## 7. Acessibilidade

- Busca: `aria-label="Buscar tutoriais"`
- Passos: lista ordenada semântica `<ol>`
- Accordion detalhes: `aria-expanded`
- Contraste badges WCAG AA
- Foco visível em links e botões (ring primary)
- Ícones decorativos: `aria-hidden`

---

## 8. Screenshots (v1.1)

Diretório: `frontend/public/tutorials/`

Convenção: `{slug}-passo-{n}.webp`

Exemplo: `membros-cadastrar-passo-2.webp` — modal "Adicionar membro" com seta anotada.

Render no MDX:

```mdx
![Passo 2 — Adicionar membro](/tutorials/membros-cadastrar-passo-2.webp)
```

Guidelines:

- Largura máx. 800px; WebP comprimido
- Anotações com cor `primary` (#...)
- Dados fictícios (LGPD)
- Atualizar screenshots quando UI mudar (checklist no PR)

---

## 9. Integrações futuras in-app (v2+)

### Link contextual em modais

No `MemberForm`, link discreto:

```
📖 Como preencher este formulário?
→ /tutorials?guia=membros-cadastrar
```

### Empty states de módulos

Quando lista vazia em `/members`:

```
Cadastre seu primeiro membro ou consulte o tutorial
[ Ver tutorial ] [ Adicionar membro ]
```

---

## 10. Wireframe ASCII — fluxo completo

```
Sidebar                Main content
────────               ──────────────────────────────────
Painel                 ┌─ TUTORIAIS (HUB) ─────────────┐
Membros                │ [busca________________]       │
Integração             │ [🚀 Primeiros passos      →]  │
Grupos                 │ ┌────┐ ┌────┐ ┌────┐         │
Congregações           │ │Memb│ │Intg│ │Cong│ ...     │
Calendário             │ └────┘ └────┘ └────┘         │
────────               │ [FAQ accordion]               │
Configurações          └───────────────────────────────┘
Tutoriais ●
                       Click guia
                       ──────────────────────────────────
                       ┌─ GUIA ─────────────────────────┐
                       │ ← Voltar                       │
                       │ Membros · Cadastrar membro     │
                       │ [Editor] ~3min                 │
                       │ 1. ... 2. ... 3. ...           │
                       │ [Ir para Membros →]            │
                       │ ▼ Detalhes                     │
                       └────────────────────────────────┘
```

---

## 11. Checklist de implementação

- [ ] Substituir placeholder em `tutorials/page.tsx`
- [ ] Criar registry tipado com 28 slugs
- [ ] Implementar `TutorialHub` + `TutorialGuideView`
- [ ] Migrar conteúdo do catálogo para MD/MDX
- [ ] Adicionar query param `?guia=`
- [ ] Badge de role + banner reader
- [ ] Botão "Ir para módulo"
- [ ] Guias relacionados
- [ ] Estados loading / empty / error
- [ ] Testes manuais mobile + desktop
- [ ] (v1.1) Screenshots + FAQ
- [ ] Atualizar `levantamento-fluxos.md` § Módulo 13 quando implementado
