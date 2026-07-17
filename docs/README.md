---
type: index
titulo: Base de Conhecimento — Flock
ultima_atualizacao: 2026-07-17
versao: "1.2"
tags: [meta, índice, kb]
---

# Base de Conhecimento — Flock

Esta pasta (`docs/`) é a **knowledge base permanente** do monorepo.  
O ciclo de vida das demandas (refinamento, revisão, QA, handoff) vive no **Linear**, não aqui.

Antes de atuar sobre qualquer Issue, leia:

- [`00_meta/linear-cursor-workflow.md`](00_meta/linear-cursor-workflow.md)
- [`00_meta/mapa-de-agentes.md`](00_meta/mapa-de-agentes.md)

---

## Princípio

| O quê | Onde |
| --- | --- |
| Status, histórico, análises por Issue | **Linear** (via MCP) |
| Conhecimento reutilizável do produto/sistema | **`docs/`** (este repositório) |
| Documentação de usabilidade para usuários finais | **Mintlify** |
| Código e implementação | **Git** |
| Deploy | **Railway** (manual) |

**Nunca** criar no repositório arquivos temporários por Issue, por exemplo:

- `refinamento-[issue].md`
- `analise-tecnica-[issue].md`
- `qa-report-[issue].md`
- `code-review-[issue].md`
- pastas `docs/refinamentos/`, `docs/analises-tecnicas/`, etc.

Os templates em [`00_meta/templates/`](00_meta/templates/) definem a **estrutura do texto a colar na Issue do Linear**, não um arquivo a versionar por demanda.

Decisões bloqueantes (escopo, aceite, risco de review/QA, etc.): perguntar no **chat do Cursor**, registrar no Linear, e só concluir a etapa depois da resposta — ver workflow §15.1.

---

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| [`00_meta/`](00_meta/index.md) | Workflow, mapa de agentes, templates |
| [`01_produto/`](01_produto/index.md) | Visão, personas, jornadas, glossário |
| [`02_regras-de-negocio/`](02_regras-de-negocio/index.md) | Regras gerais, políticas, regras por módulo |
| [`03_arquitetura/`](03_arquitetura/index.md) | Visão, API, banco, infra, segurança, performance |
| [`04_modulos/`](04_modulos/index.md) | Catálogo técnico dos módulos de negócio |
| [`05_padroes/`](05_padroes/index.md) | Convenções de código, API, banco, testes, Git |
| [`06_integracoes/`](06_integracoes/index.md) | Stripe, Supabase, Resend, Railway, Sentry, etc. |
| [`07_decisoes-tecnicas/`](07_decisoes-tecnicas/index.md) | ADRs permanentes |
| [`releases/`](releases/) | Release notes publicadas (artefato permanente) |

---

## Agentes Cursor

Instruções por papel em [`.cursor/rules/`](../.cursor/rules/).  
Regra sempre ativa: `.cursor/rules/linear-cursor-workflow.mdc`.

---

## Como contribuir na KB

Atualize `docs/` **somente** quando a mudança for permanente e reutilizável (produto, regra, arquitetura, módulo, integração, padrão ou ADR).  
Registros de uma Issue individual → Linear.
