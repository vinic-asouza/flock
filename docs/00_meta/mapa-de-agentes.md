---
type: meta-mapa-agentes
titulo: Mapa de Agentes — Linear + Cursor
ultima_atualizacao: 2026-07-14
versao: "1.0"
tags: [meta, agentes, linear, cursor]
---

# Mapa de Agentes — Linear + Cursor

Cheat sheet operacional. Detalhe completo: [[00_meta/linear-cursor-workflow]].

---

## Fluxo resumido

```
Backlog / Refinement
  → Product Analyst → Software Architect → To-Do

In Progress
  → Backend Engineer e/ou Frontend Engineer

In Review
  → Tech Lead (Code Review) → QA Analyst

Done → Document
  → Technical Writer (docs/) + Documentation Writer (Mintlify)

Released
  → Deploy manual (Railway)
```

---

## Tabela etapa → agente

| Etapa Linear | Agente | MDC | Output |
| --- | --- | --- | --- |
| Backlog / Refinement | Product Analyst | `.cursor/rules/product-analyst.mdc` | Seção na Issue + handoff |
| Backlog / Refinement | Software Architect | `.cursor/rules/software-architect.mdc` | Seção na Issue + handoff |
| To-Do | — | — | Issue pronta |
| In Progress | Backend Engineer | `.cursor/rules/backend-engineer.mdc` | Código + resumo na Issue |
| In Progress | Frontend Engineer | `.cursor/rules/frontend-engineer.mdc` | Código + resumo na Issue |
| In Review / Code Review | Tech Lead | `.cursor/rules/tech-lead.mdc` | Code review na Issue |
| In Review / QA | QA Analyst | `.cursor/rules/qa-analyst.mdc` | Relatório QA na Issue |
| Done | — | — | Aprovado |
| Document | Technical Writer | `.cursor/rules/technical-writer.mdc` | Atualiza `docs/` se necessário |
| Document | Documentation Writer | `.cursor/rules/documentation-writer.mdc` | Atualiza Mintlify se necessário |
| Released | — | — | Deploy manual |

---

## Templates de texto (colar no Linear)

| Agente | Template |
| --- | --- |
| Product Analyst | [[00_meta/templates/template-refinamento]] |
| Software Architect | [[00_meta/templates/template-arquitetura-issue]] |
| QA Analyst | [[00_meta/templates/template-qa-report]] |

Formato mínimo de toda atualização (workflow §7):

```markdown
## [Nome do Agente] — [Tipo]

### Resumo
...

### Decisões / Recomendações
- ...

### Critérios / Checklist
- [ ] ...

### Riscos / Pontos de Atenção
- ...

### Próximo Passo
...

## Handoff
**Status:** concluído | requer ajustes | bloqueado
**Próximo agente recomendado:** ...
**Motivo:** ...
**Pontos de atenção:**
- ...
```

---

## Fontes de verdade

| Informação | Fonte |
| --- | --- |
| Status / histórico da demanda | Linear |
| Implementação | Git |
| Conhecimento permanente | `docs/` |
| Usabilidade | Mintlify |
| Deploy | Railway (manual) |

---

## Proibições rápidas

- Criar arquivo por Issue em `docs/`
- Duplicar histórico do Linear no repositório
- Mover status sem autorização / sem critérios
- Deploy automático sem pedido explícito do usuário
