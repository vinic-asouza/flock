---
type: release-notes
versao: # ex.: v1.2.3 — SemVer obrigatório
data_release:
ambiente: # staging | production
status: Draft # Draft | Em Revisão | Publicado
issues: [] # IDs das issues incluídas nesta release
breaking_changes: false
autor:
---

# Release Notes — {{versao}}

> 📁 **Onde salvar**
> - Este **template** vive em: `docs/00_meta/templates/template-release-notes.md` (vault Obsidian: `obsidian/00_meta/templates/`)
> - Cada **release preenchida** deve ser salva em: `docs/releases/[VERSAO]-[DATA].md` _(ex.: `docs/releases/v1.2.3-2026-07-13.md`)_ — equivalente Obsidian: `obsidian/releases/[VERSAO]-[DATA].md`

---

## SemVer — como ler a versão

| Tipo | Formato | Significado |
| --- | --- | --- |
| **MAJOR** | `v**X**.0.0` | Breaking changes — incompatível com a versão anterior |
| **MINOR** | `v1.**X**.0` | Nova funcionalidade — compatível com a versão anterior |
| **PATCH** | `v1.2.**X**` | Correção de bug — compatível com a versão anterior |

---

## 🚀 Sumário da Release

<!-- Escreva para um usuário não técnico entender -->

_Uma ou duas frases sobre o que esta versão entrega e por que importa._



---

## ⭐ Destaques

<!-- Máximo 5 itens — o que mais importa para o usuário -->

-
-
-

---

## ✨ Novas Funcionalidades

<!-- Descreva o benefício, não a implementação -->

| Funcionalidade | Descrição | Issue ID |
| --- | --- | --- |
| | | |

_Se não houver novas funcionalidades, escreva: "Nenhuma nesta versão."_

---

## 📈 Melhorias

| Melhoria | Impacto | Issue ID |
| --- | --- | --- |
| | | |

_Se não houver melhorias, escreva: "Nenhuma nesta versão."_

---

## 🐛 Correções de Bug

| Bug Corrigido | Módulo Afetado | Issue ID |
| --- | --- | --- |
| | | |

_Se não houver correções, escreva: "Nenhuma nesta versão."_

---

## 💥 Breaking Changes

<!-- Se vazio, escreva 'Nenhum breaking change nesta versão' -->

> Preencha **somente** se `breaking_changes: true` no frontmatter. Caso contrário: **Nenhum breaking change nesta versão.**

**O que muda:**



**O que é removido:**



**Guia de migração:**

1.
2.
3.

---

## 🔧 Mudanças Técnicas

_Público-alvo: desenvolvedores e DevOps._

- **Infraestrutura:**
- **Dependências atualizadas:**
- **Outras mudanças técnicas:**

_Se não houver, escreva: "Nenhuma mudança técnica relevante."_

---

## 📋 Notas de Deploy

<!-- Tudo que o time de deploy precisa saber antes de rodar -->

### Pré-requisitos

- [ ] Migrations SQL (Supabase) a aplicar:
- [ ] Seeds necessários:
- [ ] Ordem de operações _(ex.: migration → backend → frontend):_

### Variáveis de ambiente

| Variável | Nova / Alterada | Obrigatória | Observação |
| --- | --- | --- | --- |
| | | Sim / Não | |

### Checklist pós-deploy _(opcional)_

- [ ]
- [ ]

---

## 🔭 Próximos Passos _(opcional)_

O que está planejado para a próxima versão:



---

## Histórico de Revisões

| Data | Autor | Descrição da Alteração |
| --- | --- | --- |
| | | Versão inicial (Draft) |
