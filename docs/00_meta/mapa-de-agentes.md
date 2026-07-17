---
type: meta-mapa-agentes
titulo: Mapa de Agentes — Linear + Cursor
ultima_atualizacao: 2026-07-17
versao: "1.2"
tags: [meta, agentes, linear, cursor]
---

# Mapa de Agentes — Linear + Cursor

Cheat sheet operacional. Detalhe completo: [[00_meta/linear-cursor-workflow]].

---

## Fluxo resumido

```
Backlog
  → Product Analyst → Software Architect → Todo

In Progress
  → Backend Engineer e/ou Frontend Engineer

Review (QA + Code Review)
  → Tech Lead (Code Review) → QA Analyst

Document (Technical + Documentation Writers)
  → Technical Writer (docs/) + Documentation Writer (Mintlify)

Done
  → Estado final do fluxo

Deploy (manual)
  → Railway; publicação indicada por marcação na Issue (sem status Released)
```

---

## Gate de Decisão (rápido)

Se a etapa precisa de decisão do usuário para avançar:

1. **Não concluir** / não mover status.
2. Registrar bloqueio + perguntas no **Linear**.
3. Perguntar no **chat do Cursor** e aguardar resposta.
4. Atualizar o Linear com a **decisão**.
5. Só então concluir o passo.

Detalhe: workflow §15.1.

---

## Tabela etapa → agente

| Etapa Linear | Agente | MDC | Output |
| --- | --- | --- | --- |
| Backlog | Product Analyst | `.cursor/rules/product-analyst.mdc` | Seção na Issue + handoff |
| Backlog | Software Architect | `.cursor/rules/software-architect.mdc` | Seção na Issue + handoff |
| Todo | — | — | Issue pronta |
| In Progress | Backend Engineer | `.cursor/rules/backend-engineer.mdc` | Código + resumo na Issue |
| In Progress | Frontend Engineer | `.cursor/rules/frontend-engineer.mdc` | Código + resumo na Issue |
| Review (Code Review) | Tech Lead | `.cursor/rules/tech-lead.mdc` | Code review na Issue |
| Review (QA) | QA Analyst | `.cursor/rules/qa-analyst.mdc` | Relatório QA na Issue |
| Document | Technical Writer | `.cursor/rules/technical-writer.mdc` | Atualiza `docs/` se necessário |
| Document | Documentation Writer | `.cursor/rules/documentation-writer.mdc` | Atualiza Mintlify se necessário |
| Done | — | — | Concluída (reviews + docs avaliados) |

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
| Deploy / publicação | Railway (manual); marcação na Issue |

---

## Proibições rápidas

- Criar arquivo por Issue em `docs/`
- Duplicar histórico do Linear no repositório
- Mover status sem autorização / sem critérios
- Deploy automático sem pedido explícito do usuário
- Tratar publicação como status (`Released` não existe)
- Inventar decisão bloqueante no lugar do usuário
- Concluir etapa com pergunta bloqueante só no Linear, sem perguntar no chat
