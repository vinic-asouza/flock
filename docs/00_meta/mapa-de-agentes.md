---
type: meta-mapa-agentes
titulo: Mapa de Agentes — Linear + Cursor
ultima_atualizacao: 2026-08-31
versao: "1.7"
tags: [meta, agentes, linear, cursor]
---

# Mapa de Agentes — Linear + Cursor

Cheat sheet operacional. Detalhe completo: [[00_meta/linear-cursor-workflow]].

---

## Fluxo resumido

```
Backlog
  → [comando: iniciar desenvolvimento / refinar]
  → Product Analyst (classifica impacto visual: nenhum | menor | maior)
  → UX/UI Designer **somente se** menor ou maior (workflow §8.3)
  → Software Architect
  → move para Todo → [para e avisa no chat]

Todo
  → aguarda comando “iniciar execução”

In Progress
  → [comando: iniciar execução] move Todo → In Progress
  → Backend Engineer e/ou Frontend Engineer
  → commit + push; abrir PR se ainda não houver (§15.6)
  → [para e avisa: verificação manual + URL do PR]

Review (QA + Code Review)   ← status Linear: Review
  → [comando: iniciar review] move In Progress → Review
  → Tech Lead (Code Review) → QA Analyst
  → [para e avisa no chat com apontamentos do Linear]
  → [comando: voltar ajustes] → In Progress → Engineers → commit + push no mesmo PR → aviso
  → [comando: seguir para documentação] → Document

Document (Technical + Documentation Writers)
  → Technical Writer avalia docs/ (commit + push no PR existente se alterar) + Documentation Writer avalia Mintlify
  → atualizar só com impacto técnico ou de usabilidade real (§15.5)
  → [para e avisa no chat]

Done
  → [comando: concluir / Done]
  → perguntar merge do PR (sim/não); merge só com confirmação

Deploy (manual)
  → só com pedido explícito; Railway; marcação na Issue (sem status Released)
```

O usuário **comanda no chat**; o **agente** move o status Linear (exceto `Backlog` → `Todo`, que ocorre ao concluir PA + UX/UI se §8.3 + SA).

---

## Gate de Avanço (rápido)

Ao concluir a etapa autorizada: atualizar Linear + aviso no chat + **parar**.  
A próxima etapa só começa com comando explícito no chat.

Exceção: `Backlog` → `Todo` após PA + UX/UI **quando §8.3 exigir** + SA (move, avisa, para — não inicia execução).

Detalhe: workflow §15.2.

---

## Gate de UX/UI (rápido)

Não é obrigatório em toda Issue. Heurística completa: workflow §8.3.

| Classificação | Quando | O que o designer entrega |
| --- | --- | --- |
| `nenhum` | Nada do que o usuário vê muda (API, job, infra, docs, bugfix que só restaura) | Não atua; SA segue |
| `menor` | Parte de componente, copy, botão/campo em tela existente | Spec **objetiva** |
| `maior` | Tela, seção ou componente grande novo/redesenhado; IA; jornada | Spec **completa** |

PA classifica. Orquestrador aplica a heurística se o PA omitir (na dúvida: `menor`). UX/UI pode corrigir com justificativa. Pedido explícito no chat prevalece sobre `nenhum`.

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
2. O PR já deve estar aberto desde `In Progress`. Perguntar no chat se deseja mergear (sim/não).
3. Merge **só** com confirmação inequívoca.
4. Sem PR: informar o desvio; **não** abrir PR em `Done` (salvo pedido explícito + restaurar `Done`).
5. Deploy continua pedido à parte.

Detalhe: workflow §15.3.

---

## Proporcionalidade documental (rápido)

Etapa `Document` **avalia** sempre. **Escrever** em `docs/` ou Mintlify **não** é automático.

Atualize só se a docs existente ficar incorreta, o usuário precisar fazer algo diferente, ou houver padrão/ADR permanente.

**Não** documente ajuste visual fino, polimento de CSS nem rearranjo de elementos já descritos. Detalhe fica no Linear. No chat, não inventariar polimento.

Detalhe: workflow §15.5.

---

## PR da Issue (rápido)

Abrir o PR em `In Progress` (um por Issue). Depois só **push** na mesma branch.

Não abrir o primeiro PR em `Review`, `Document` ou `Done` — a automação GitHub do Linear regressa para `In Progress`.

Depois de push/`gh pr create`: reler a Issue; restaurar o status da etapa se tiver mudado.

Em `Done`: só merge com “sim” no chat.

Detalhe: workflow §15.6.

---

## Tabela etapa → agente

| Etapa Linear | Agente | MDC | Output |
| --- | --- | --- | --- |
| Backlog | Product Analyst | `.cursor/rules/product-analyst.mdc` | Seção na Issue + classificação visual + handoff para UX/UI **ou** SA |
| Backlog | UX/UI Designer | `.cursor/rules/ux-ui-designer.mdc` | **Condicional** (§8.3): spec ou skip na Issue + handoff para SA |
| Backlog | Software Architect | `.cursor/rules/software-architect.mdc` | Seção na Issue + move para `Todo` + aviso no chat |
| Todo | — | — | Aguarda comando de execução |
| In Progress | Backend Engineer | `.cursor/rules/backend-engineer.mdc` | Código + commit + push + PR (§15.6) + resumo na Issue |
| In Progress | Frontend Engineer | `.cursor/rules/frontend-engineer.mdc` | Código + commit + push + PR (§15.6) + resumo na Issue |
| Review (Code Review) | Tech Lead | `.cursor/rules/tech-lead.mdc` | Code review na Issue + handoff para QA |
| Review (QA) | QA Analyst | `.cursor/rules/qa-analyst.mdc` | Relatório QA na Issue + aviso no chat com apontamentos |
| Document | Technical Writer | `.cursor/rules/technical-writer.mdc` | Avalia `docs/`; atualiza + commit + push no PR existente só se necessário (§15.5 / §15.6) |
| Document | Documentation Writer | `.cursor/rules/documentation-writer.mdc` | Avalia Mintlify; atualiza só se necessário (§15.5) + aviso no chat |
| Done | — | — | Concluída; merge de PR só se o usuário confirmar |

---

## Templates de texto (colar no Linear)

| Agente | Template |
| --- | --- |
| Product Analyst | [[00_meta/templates/template-refinamento]] |
| UX/UI Designer | [[00_meta/templates/template-ux-ui]] |
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
- Mover status sem comando de avanço (exceto `Backlog` → `Todo` após PA + UX/UI se §8.3 + SA)
- Pular etapa ou acionar o próximo papel de outra etapa
- Acionar UX/UI em demanda sem impacto visual (ou pular UX/UI quando §8.3 exigir)
- **Regredir `Review` / `Document` / `Done` → `In Progress`** (automação Git/PR: restaurar na hora, §15.6)
- Abrir o primeiro PR da Issue fora de `In Progress`
- Passar `state` genérico (`started`) no MCP — usar nome exato do status
- Mergear PR automaticamente ao autorizar `Done`
- Deploy automático sem pedido explícito do usuário
- Tratar publicação como status (`Released` não existe)
- Inventar decisão bloqueante no lugar do usuário
- Concluir etapa com pergunta bloqueante só no Linear, sem perguntar no chat
- Atualizar `docs/` ou Mintlify por ajuste visual fino / polimento sem impacto técnico ou de usabilidade
