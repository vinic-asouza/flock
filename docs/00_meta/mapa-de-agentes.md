---
type: meta-mapa-agentes
titulo: Mapa de Agentes — Linear + Cursor
ultima_atualizacao: 2026-10-19
versao: "2.0"
tags: [meta, agentes, linear, cursor]
---

# Mapa de Agentes — Linear + Cursor

Cheat sheet operacional. Detalhe completo: [[00_meta/linear-cursor-workflow]].

---

## Fluxo resumido (pipeline contínuo até Done)

```
[comando: iniciar desenvolvimento / desenvolver / continuar Issue]

Backlog
  → Product Analyst (classifica impacto visual: nenhum | menor | maior)
  → UX/UI Designer **somente se** menor ou maior (workflow §8.3)
  → Software Architect
  → Todo → In Progress (sem parar no chat)

In Progress
  → Backend Engineer e/ou Frontend Engineer (só os aplicáveis)
  → commit + push; abrir PR se ainda não houver (§15.6)
  → Review (mesma sessão)

Review (QA + Code Review)   ← status Linear: Review
  → Tech Lead (Code Review) → QA Analyst
  → se obrigatórios: In Progress → Engineers → Review (≤2 ciclos automáticos)
  → se limpo: Document

Document (Technical + Documentation Writers)
  → Technical Writer avalia docs/ (commit + push no PR existente se alterar)
  → Documentation Writer avalia Mintlify
  → atualizar só com impacto técnico ou de usabilidade real (§15.5)
  → Done (mesma sessão)

Done
  → resumo no chat + URL do PR
  → usuário: validação manual OU confirmar merge (sim/não)
  → merge só com confirmação

Única pausa intermediária: Gate de Decisão (§15.1)

Deploy (manual)
  → só com pedido explícito; Railway; marcação na Issue (sem status Released)
```

O usuário **inicia/retoma** no chat; o **agente** move o status Linear ao longo do pipeline (§15.2). Retomar Issue a meio = continuar do status atual até `Done`.

---

## Execução Contínua (rápido)

Um comando dispara o pipeline até `Done`. **Não** pedir “iniciar review / seguir docs / concluir” entre etapas.

Progresso intermediário: só Linear. Chat: Gate de Decisão ou fechamento em `Done`.

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

Única pausa intermediária. Se a etapa precisa de decisão do usuário:

1. **Não concluir** / não avançar o pipeline.
2. Registrar bloqueio + perguntas no **Linear**.
3. Perguntar no **chat do Cursor** e aguardar resposta.
4. Atualizar o Linear com a **decisão**.
5. **Retomar o pipeline** até `Done`.

Detalhe: workflow §15.1.

---

## Fechamento em `Done` + merge (rápido)

Ao terminar Writers:

1. Mover para `Done` (critérios §16).
2. Entregar no chat: **resumo + URL do PR** + opções (validação manual / merge sim / manter aberto).
3. Merge **só** com confirmação inequívoca.
4. Sem PR: informar o desvio; **não** abrir PR em `Done` (salvo pedido explícito + restaurar `Done`).
5. Deploy continua pedido à parte.

Detalhe: workflow §15.3.

---

## Loop de Review (rápido)

Correções **obrigatórias** → automático: `Review` → `In Progress` → Engineers → `Review` (máx. 2 ciclos). Depois disso: Gate de Decisão.

Sugestões **opcionais** não bloqueiam `Document`.

Detalhe: workflow §10.3.

---

## Proporcionalidade documental (rápido)

Etapa `Document` **avalia** sempre. **Escrever** em `docs/` ou Mintlify **não** é automático.

Atualize só se a docs existente ficar incorreta, o usuário precisar fazer algo diferente, ou houver padrão/ADR permanente.

**Não** documente ajuste visual fino, polimento de CSS nem rearranjo de elementos já descritos. Detalhe fica no Linear. No chat final, não inventariar polimento.

Detalhe: workflow §15.5.

---

## PR da Issue (rápido)

Abrir o PR em `In Progress` (um por Issue). Depois só **push** na mesma branch.

**Base do PR:** milestone `MVP` (e demais ≠ `v1`) → `--base main`; milestone `v1` ou filha de DEV-108 → `--base major-v1` (nunca `main`). Ao iniciar Issue v1, atualizar `major-v1` com `main` antes da feature. Done em `major-v1` ≠ produção; cutover só via épica DEV-108.

Não abrir o primeiro PR em `Review`, `Document` ou `Done` — a automação GitHub do Linear regressa para `In Progress`.

Depois de push/`gh pr create`: reler a Issue; restaurar o status da etapa se tiver mudado.

Em `Done`: só merge com “sim” no chat.

Detalhe: workflow §15.6 e §15.7.

---

## Tabela etapa → agente

| Etapa Linear | Agente | MDC | Output |
| --- | --- | --- | --- |
| Backlog | Product Analyst | `.cursor/rules/product-analyst.mdc` | Seção na Issue + classificação visual + handoff para UX/UI **ou** SA |
| Backlog | UX/UI Designer | `.cursor/rules/ux-ui-designer.mdc` | **Condicional** (§8.3): spec ou skip na Issue + handoff para SA |
| Backlog | Software Architect | `.cursor/rules/software-architect.mdc` | Seção na Issue + move para `Todo` + handoff à execução |
| Todo | — | — | Transitório; orquestrador → `In Progress` |
| In Progress | Backend Engineer | `.cursor/rules/backend-engineer.mdc` | Código + commit + push + PR (§15.6) + resumo na Issue |
| In Progress | Frontend Engineer | `.cursor/rules/frontend-engineer.mdc` | Código + commit + push + PR (§15.6) + resumo na Issue |
| Review (Code Review) | Tech Lead | `.cursor/rules/tech-lead.mdc` | Code review na Issue + handoff para QA |
| Review (QA) | QA Analyst | `.cursor/rules/qa-analyst.mdc` | Relatório QA na Issue + handoff (loop ou Document) |
| Document | Technical Writer | `.cursor/rules/technical-writer.mdc` | Avalia `docs/`; atualiza + commit + push no PR existente só se necessário (§15.5 / §15.6) |
| Document | Documentation Writer | `.cursor/rules/documentation-writer.mdc` | Avalia Mintlify; atualiza só se necessário (§15.5) + handoff a Done |
| Done | Orquestrador | — | Resumo + PR no chat; merge só se o usuário confirmar |

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
**Próximo agente recomendado:** [próximo do pipeline]
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
- **Parar entre etapas** pedindo comando de avanço no chat
- Pular etapa com escopo (omitir só papel sem escopo)
- Acionar UX/UI em demanda sem impacto visual (ou pular UX/UI quando §8.3 exigir)
- **Regredir `Document` / `Done` → `In Progress`** indevidamente (automação Git/PR: restaurar na hora, §15.6). `Review` → `In Progress` só no loop de obrigatórios (§10.3)
- Abrir o primeiro PR da Issue fora de `In Progress`
- Passar `state` genérico (`started`) no MCP — usar nome exato do status
- Mergear PR automaticamente ao chegar em `Done`
- Deploy automático sem pedido explícito do usuário
- Tratar publicação como status (`Released` não existe)
- Inventar decisão bloqueante no lugar do usuário
- Concluir passo com pergunta bloqueante só no Linear, sem perguntar no chat
- Atualizar `docs/` ou Mintlify por ajuste visual fino / polimento sem impacto técnico ou de usabilidade
