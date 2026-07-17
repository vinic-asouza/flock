---
type: index
secao: 00_meta
ultima_atualizacao: 2026-07-17
versao: "1.2"
tags: [meta, índice, workflow]
---

# 00 · Meta

Documentação sobre **como o time e os agentes trabalham** — não sobre o produto em si.

| Arquivo | Uso |
| --- | --- |
| [[00_meta/linear-cursor-workflow]] | Fonte de verdade do fluxo Linear + Cursor |
| [[00_meta/mapa-de-agentes]] | Etapa Linear → agente → output |
| [[00_meta/templates/]] | Estruturas para colar na Issue / docs permanentes |

---

## Templates

| Template | Destino do conteúdo preenchido |
| --- | --- |
| `template-refinamento.md` | **Issue Linear** (Product Analyst) |
| `template-arquitetura-issue.md` | **Issue Linear** (Software Architect) |
| `template-qa-report.md` | **Issue Linear** (QA Analyst) |
| `template-release-notes.md` | `docs/releases/` (artefato permanente de release) |
| `template-modulo.md` | `docs/04_modulos/[nome].md` (KB permanente) |
| `template-adr.md` | `docs/07_decisoes-tecnicas/` (KB permanente) |

Regra: templates de **demanda** → Linear. Templates de **conhecimento permanente** → `docs/`.

---

## Leitura obrigatória para agentes

1. [`linear-cursor-workflow.md`](linear-cursor-workflow.md)
2. [`mapa-de-agentes.md`](mapa-de-agentes.md)
3. MDC do papel em `.cursor/rules/`
