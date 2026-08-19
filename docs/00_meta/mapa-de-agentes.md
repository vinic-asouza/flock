---
type: meta-mapa-agentes
titulo: Mapa de Agentes — Linear + Cursor
ultima_atualizacao: 2026-08-19
versao: "1.5"
tags: [meta, agentes, linear, cursor]
---

# Mapa de Agentes — Linear + Cursor

Cheat sheet operacional. Detalhe completo: [[00_meta/linear-cursor-workflow]].

---

## Fluxo resumido

```
Backlog
  → [comando: iniciar desenvolvimento / refinar]
  → Product Analyst → Software Architect
  → move para Todo → [para e avisa no chat]

Todo
  → aguarda comando “iniciar execução”

In Progress
  → [comando: iniciar execução] move Todo → In Progress
  → Backend Engineer e/ou Frontend Engineer
  → commit por passo de código
  → [para e avisa: verificação manual]

Review (QA + Code Review)   ← status Linear: Review
  → [comando: iniciar review] move In Progress → Review
  → Tech Lead (Code Review) → QA Analyst
  → [para e avisa no chat com apontamentos do Linear]
  → [comando: voltar ajustes] → In Progress → Engineers → commit → aviso
  → [comando: seguir para documentação] → Document

Document (Technical + Documentation Writers)
  → Technical Writer avalia docs/ (commit só se alterar) + Documentation Writer avalia Mintlify
  → atualizar só com impacto técnico ou de usabilidade real (§15.5)
  → [para e avisa no chat]

Done
  → [comando: concluir / Done]
  → perguntar merge do PR (sim/não); merge só com confirmação

Deploy (manual)
  → só com pedido explícito; Railway; marcação na Issue (sem status Released)
```

O usuário **comanda no chat**; o **agente** move o status Linear (exceto `Backlog` → `Todo`, que ocorre ao concluir PA + SA).

---

## Gate de Avanço (rápido)

Ao concluir a etapa autorizada: atualizar Linear + aviso no chat + **parar**.  
A próxima etapa só começa com comando explícito no chat.

Exceção: `Backlog` → `Todo` após PA + SA (move, avisa, para — não inicia execução).

Detalhe: workflow §15.2.

---

## Gate de Decisão (rápido)

Se a etapa precisa de decisão do usuário para avançar **dentro** do passo:

1. **Não concluir** / não mover status.
2. Registrar bloqueio + perguntas no **Linear**.
3. Perguntar no **chat do Cursor** e aguardar resposta.
4. Atualizar o Linear com a **decisão**.
5. Só então concluir o passo.

Detalhe: workflow §15.1.

---

## Gate de merge ao `Done` (rápido)

Quando o usuário autorizar `Done`:

1. Mover para `Done` (critérios §16).
2. Se houver PR: perguntar no chat se deseja mergear (sim/não).
3. Merge **só** com confirmação inequívoca.
4. Sem PR: informar e não perguntar.
5. Deploy continua pedido à parte.

Detalhe: workflow §15.3.

---

## Proporcionalidade documental (rápido)

Etapa `Document` **avalia** sempre. **Escrever** em `docs/` ou Mintlify **não** é automático.

Atualize só se a docs existente ficar incorreta, o usuário precisar fazer algo diferente, ou houver padrão/ADR permanente.

**Não** documente ajuste visual fino, polimento de CSS nem rearranjo de elementos já descritos. Detalhe fica no Linear. No chat, não inventariar polimento.

Detalhe: workflow §15.5.

---

## Tabela etapa → agente

| Etapa Linear | Agente | MDC | Output |
| --- | --- | --- | --- |
| Backlog | Product Analyst | `.cursor/rules/product-analyst.mdc` | Seção na Issue + handoff para SA |
| Backlog | Software Architect | `.cursor/rules/software-architect.mdc` | Seção na Issue + move para `Todo` + aviso no chat |
| Todo | — | — | Aguarda comando de execução |
| In Progress | Backend Engineer | `.cursor/rules/backend-engineer.mdc` | Código + commit + resumo na Issue |
| In Progress | Frontend Engineer | `.cursor/rules/frontend-engineer.mdc` | Código + commit + resumo na Issue |
| Review (Code Review) | Tech Lead | `.cursor/rules/tech-lead.mdc` | Code review na Issue + handoff para QA |
| Review (QA) | QA Analyst | `.cursor/rules/qa-analyst.mdc` | Relatório QA na Issue + aviso no chat com apontamentos |
| Document | Technical Writer | `.cursor/rules/technical-writer.mdc` | Avalia `docs/`; atualiza + commit só se necessário (§15.5) |
| Document | Documentation Writer | `.cursor/rules/documentation-writer.mdc` | Avalia Mintlify; atualiza só se necessário (§15.5) + aviso no chat |
| Done | — | — | Concluída; merge de PR só se o usuário confirmar |

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
**Próximo agente recomendado:** [par da mesma etapa | usuário no chat]
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
- Mover status sem comando de avanço (exceto `Backlog` → `Todo` após PA + SA)
- Pular etapa ou acionar o próximo papel de outra etapa
- **Regredir `Document` → `In Progress`** (status deve permanecer `Document` até `Done`)
- Passar `state` genérico (`started`) no MCP — usar nome exato do status
- Mergear PR automaticamente ao autorizar `Done`
- Deploy automático sem pedido explícito do usuário
- Tratar publicação como status (`Released` não existe)
- Inventar decisão bloqueante no lugar do usuário
- Concluir etapa com pergunta bloqueante só no Linear, sem perguntar no chat
- Atualizar `docs/` ou Mintlify por ajuste visual fino / polimento sem impacto técnico ou de usabilidade
