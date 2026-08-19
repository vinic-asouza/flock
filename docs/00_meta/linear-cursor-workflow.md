---
type: meta-workflow
titulo: Linear + Cursor Development Workflow
ultima_atualizacao: 2026-08-19
versao: "1.6"
tags: [meta, linear, cursor, workflow, agentes]
---

# Linear + Cursor Development Workflow

## 1. Propósito

Este documento define como os agentes de IA do Cursor devem atuar dentro do fluxo de desenvolvimento integrado com Linear.

O objetivo do workflow é garantir que:

- O Linear seja a fonte de verdade para o ciclo de vida das demandas.
- O Cursor execute as etapas usando agentes especializados.
- O histórico da demanda permaneça centralizado na própria Issue do Linear.
- O **chat da IDE** seja o canal de avanço entre etapas (Gate de Avanço) e de decisões bloqueantes (Gate de Decisão).
- A base de conhecimento do repositório seja usada como contexto, não como local de registros temporários.
- Atualizações permanentes de documentação sejam feitas apenas quando houver mudança relevante no produto, arquitetura, módulos, integrações ou padrões.

---

## 2. Princípio Central

**Linear é o sistema de registro operacional.**

Toda análise específica de uma demanda deve ser registrada diretamente na Issue do Linear, usando MCP.

Isso inclui:

- Refinamento de produto
- Análise técnica
- Plano de implementação
- Decisões tomadas durante a execução
- Resultado de code review
- Resultado de QA
- Correções solicitadas
- Status final da demanda
- Necessidade de atualização documental

O repositório **não** deve receber arquivos como:

- `refinamento-[issue].md`
- `analise-tecnica-[issue].md`
- `qa-report-[issue].md`
- `code-review-[issue].md`

Esses conteúdos pertencem à Issue do Linear.

O **chat do Cursor** é o canal para:

- Comandar o avanço de etapa (Gate de Avanço, §15.2)
- Responder dúvidas bloqueantes (Gate de Decisão, §15.1)
- Receber o aviso de fim de etapa e, no Review, o resumo dos apontamentos do Linear
- Autorizar `Done`, merge de PR e deploy

---

## 3. Papel do Repositório

O repositório deve conter apenas documentações permanentes e reutilizáveis, como:

- Base de conhecimento do produto
- Regras de negócio
- Arquitetura
- Documentação de módulos
- Integrações externas
- Padrões de código, API, banco, testes e Git
- Instruções `.mdc` dos agentes
- Documentação técnica interna que permanece útil além de uma única Issue

A base de conhecimento deve ser consultada pelos agentes para tomada de decisão, mas **não** deve ser usada como histórico de execução de tarefas individuais.

Caminho da KB neste monorepo: `docs/`.  
Índice e mapa de agentes: `docs/README.md`, `docs/00_meta/index.md`, `docs/00_meta/mapa-de-agentes.md`.  
Templates de atualização na Issue: `docs/00_meta/templates/` (colar no Linear; não versionar por Issue).

---

## 4. Estados do Linear

O workflow considera os seguintes estados no Linear (configuração atual do workspace):

```
Backlog
└── Backlog

Unstarted
└── Todo

Started
└── In Progress
└── Review          (QA + Code Review)
└── Document        (Technical + Documentation Writers)

Completed
└── Done

Canceled
└── Canceled

Duplicate
└── Duplicate
```

Ordem operacional esperada:

```
Backlog → Todo → In Progress → Review → Document → Done
```

Notas:

- O status no Linear chama-se **`Review`** (não “In Review”). Na UI, `Review` aparece na categoria Started, junto de `In Progress` e `Document`. Os agentes operam pelos **nomes dos status**.
- O refinamento de produto e a análise técnica ocorrem com a Issue em `Backlog`. Ao concluir PA + SA sem bloqueios, o agente **move para `Todo`**, avisa no chat e **para**.
- `Todo` significa: Issue pronta, **aguardando comando no chat** para iniciar execução.
- Em `Review`, atuam **Tech Lead** (code review) e **QA Analyst** (validação funcional), nesta ordem, na mesma autorização de review.
- `Document` vem **antes** de `Done`. Writers só entram com comando no chat.
- Não existe status `Released`. Publicação em produção é processo manual; se a Issue já está publicada, observar a **marcação** na própria Issue.

Quem move o status: o **agente**, quando a transição for permitida pelo Gate de Avanço (§15.2). O usuário **comanda no chat**; não se espera que ele mova o status no Linear primeiro.

---

## 5. Responsabilidade dos Agentes por Etapa

| Etapa Linear | Agente Cursor | Responsabilidade |
| --- | --- | --- |
| Backlog | Product Analyst | Refinar valor de produto, escopo, critérios de aceite, regras de negócio e impactos |
| Backlog | Software Architect | Refinar análise técnica, riscos, arquitetura, dependências e abordagem |
| Todo | — | Issue pronta; aguarda comando no chat para execução |
| In Progress | Backend Engineer | Implementar APIs, regras de negócio, integrações e lógica backend (commit ao final do passo) |
| In Progress | Frontend Engineer | Implementar interface, UX/UI e integrações com APIs (commit ao final do passo) |
| Review (Code Review) | Tech Lead | Revisar código, arquitetura, padrões, segurança e performance |
| Review (QA) | QA Analyst | Validar requisitos, fluxos, edge cases e regressões |
| Document | Technical Writer | Atualizar documentação técnica interna quando necessário (commit se alterar `docs/`) |
| Document | Documentation Writer | Atualizar documentação de usabilidade no Mintlify quando necessário |
| Done | — | Issue concluída; merge de PR só se o usuário confirmar no chat |

### 5.1 Orquestração no chat (sem papel explícito)

Quando o usuário pedir para desenvolver / atuar em uma Issue **sem nomear o papel**, o agente sempre ativo deve:

1. Ler a Issue no Linear (status, comentários, labels).
2. Rotear pela etapa atual e pelo **comando do chat**:

| Status Linear | Comando no chat | Ação |
| --- | --- | --- |
| `Backlog` | Iniciar desenvolvimento / refinar | Product Analyst → Software Architect → mover para `Todo` → aviso e parar |
| `Todo` | Sem comando de execução | **Não** implementar. Informar que a Issue está em `Todo` e aguardar “iniciar execução” |
| `Todo` | Iniciar execução | Mover para `In Progress` → Backend e/ou Frontend Engineer |
| `In Progress` | Iniciar execução / voltar ajustes | Backend e/ou Frontend Engineer (não iniciar Review) |
| `In Progress` | Iniciar review | Mover para `Review` → Tech Lead → QA Analyst |
| `Review` | Iniciar review / revalidar | Tech Lead → QA Analyst (não mover para `Document` nem voltar sozinho) |
| `Review` | Voltar ajustes | Mover para `In Progress` → Engineers |
| `Review` | Seguir para documentação | Mover para `Document` → Technical Writer → Documentation Writer |
| `Document` | Seguir para documentação | Technical Writer → Documentation Writer (permanece `Document`) |
| `Document` | Concluir / mover para `Done` | Mover para `Done` **e** perguntar merge do PR (§15.3) |
| Qualquer | Deploy | Só se o pedido for explícito |

Dentro de uma etapa já autorizada, os pares rodam **na mesma sessão**, sem gate interno: PA → SA; BE e/ou FE; Tech Lead → QA; Technical Writer → Documentation Writer.

---

## 6. Uso Obrigatório do MCP Linear

Sempre que um agente estiver atuando sobre uma Issue, ele deve usar o MCP do Linear para:

1. Ler a Issue atual.
2. Ler título, descrição, comentários, labels, status e links relacionados.
3. Atualizar a Issue com sua análise ou resultado.
4. Adicionar comentários estruturados quando apropriado.
5. Mover status **somente** conforme o Gate de Avanço (§15.2) e os critérios do §16.
6. Preservar histórico no próprio Linear.

Os agentes não devem depender apenas do texto enviado no chat se houver uma Issue Linear associada.

---

## 7. Formato de Atualização no Linear

As atualizações feitas pelos agentes na Issue devem ser estruturadas com headings claros.

Formato recomendado:

```markdown
## [Nome do Agente] — [Tipo de Análise]

### Resumo
[Resumo objetivo da análise realizada]

### Decisões / Recomendações
- [item 1]
- [item 2]

### Critérios / Checklist
- [ ] item verificável
- [ ] item verificável

### Riscos / Pontos de Atenção
- [risco 1]
- [risco 2]

### Próximo Passo
[Indicação clara do próximo agente da mesma etapa, ou “aguardar comando no chat”]
```

Cada agente deve assinar sua seção com o nome do papel, não com nome pessoal.

Exemplos:

- `## Product Analyst — Refinamento de Produto`
- `## Software Architect — Análise Técnica`
- `## Tech Lead — Code Review`
- `## QA Analyst — Validação Funcional`

---

## 8. Fluxo de Refinamento

### 8.1 Entrada

A demanda nasce no Linear em `Backlog`, normalmente como uma ideia, bug, melhoria ou refatoração.

Quando o usuário iniciar o desenvolvimento pelo chat da IDE (Issue provavelmente em `Backlog`), o orquestrador aciona Product Analyst e, em seguida, Software Architect — mesmo que o pedido seja genérico (“desenvolver esta Issue”).

Pedidos equivalentes:

> Refinar esta Issue usando Product Analyst e Software Architect.  
> Iniciar o desenvolvimento da Issue [ID].

### 8.2 Product Analyst

O Product Analyst deve:

1. Ler a Issue no Linear via MCP.
2. Consultar a base de conhecimento:
   - `docs/01_produto/`
   - `docs/02_regras-de-negocio/`
   - `docs/04_modulos/`
3. Refinar:
   - Contexto de negócio
   - Problema
   - Objetivo
   - Escopo
   - Fora de escopo
   - Personas impactadas
   - Regras de negócio afetadas
   - Critérios de aceite
   - Riscos de produto
   - Perguntas em aberto
4. Atualizar a própria Issue no Linear.
5. Não criar arquivo de refinamento no repositório.
6. Fazer handoff para o Software Architect (mesmo etapa; sem gate de chat).

### 8.3 Software Architect

O Software Architect deve:

1. Ler a Issue já refinada pelo Product Analyst.
2. Consultar a base de conhecimento:
   - `docs/03_arquitetura/`
   - `docs/04_modulos/`
   - `docs/05_padroes/`
   - `docs/06_integracoes/`
3. Refinar:
   - Abordagem técnica
   - Impacto arquitetural
   - Módulos afetados
   - Dependências técnicas
   - Riscos técnicos
   - Estratégia de implementação
   - Requisitos de banco/API/infra se aplicável
   - Plano técnico de alto nível
4. Atualizar a própria Issue no Linear.
5. Não criar arquivo de análise técnica no repositório.

### 8.4 Saída do Refinamento

Após Product Analyst e Software Architect concluírem suas análises, sem perguntas bloqueantes:

1. Mover a Issue para `Todo`.
2. Registrar a movimentação na Issue.
3. Emitir o **aviso de etapa concluída no chat** (§15.2) e **parar**.
4. **Não** acionar Backend/Frontend Engineer nesta sessão.

Caso existam perguntas bloqueantes, aplicar o **Gate de Decisão** (§15.1). A Issue permanece em `Backlog` até isso.

---

## 9. Fluxo de Execução

### 9.1 Entrada

A execução **só começa** com comando explícito no chat, por exemplo:

> Iniciar a execução desta Issue.  
> Atuar como Backend Engineer e Frontend Engineer.

Ao receber o comando:

1. Se a Issue estiver em `Todo` (ou `Backlog` já refinada sem ter sido movida), mover para `In Progress`.
2. Acionar Backend Engineer e/ou Frontend Engineer, conforme o escopo da Issue.
3. **Não** mover para `Review` ao terminar.

### 9.2 Backend Engineer

O Backend Engineer deve:

1. Ler a Issue no Linear via MCP.
2. Identificar refinamentos de Product Analyst e Software Architect.
3. Consultar a base de conhecimento relevante:
   - Regras de negócio
   - Arquitetura
   - Módulos
   - Integrações
   - Padrões de API, banco e testes
4. Implementar o backend necessário.
5. **Commitar** as alterações deste passo (§15.4).
6. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Arquivos principais alterados
   - Testes adicionados ou atualizados
   - Pontos pendentes ou decisões tomadas

Se ainda houver frontend na mesma autorização, fazer handoff para o Frontend Engineer (sem gate de chat).

### 9.3 Frontend Engineer

O Frontend Engineer deve:

1. Ler a Issue no Linear via MCP.
2. Identificar critérios de aceite e fluxos esperados.
3. Consultar a base de conhecimento relevante:
   - Produto
   - Jornadas
   - Módulos
   - Padrões de código
   - Padrões de API
4. Implementar a interface necessária.
5. **Commitar** as alterações deste passo (§15.4).
6. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Telas/componentes alterados
   - Integrações feitas
   - Estados tratados
   - Pontos pendentes ou decisões tomadas

### 9.4 Saída da execução

Após os Engineers concluírem (ou o único papel aplicável):

1. A Issue **permanece** em `In Progress`.
2. Emitir aviso no chat para o usuário fazer **verificação manual** e eventuais apontamentos.
3. **Parar.** Não acionar Tech Lead/QA nem mover para `Review`.

O usuário pode então pedir correções aos Engineers (ainda em `In Progress`) ou comandar o início do review.

---

## 10. Fluxo de Review

O review **só começa** com comando explícito no chat, por exemplo:

> Iniciar o review desta Issue.

Ao receber o comando:

1. Se a Issue estiver em `In Progress`, mover para `Review`.
2. Acionar Tech Lead e, em seguida, QA Analyst na mesma sessão.
3. **Não** regressar para `In Progress` nem avançar para `Document` sozinho.

O status `Review` concentra code review e QA. Na UI do Linear isso pode aparecer como etapa Started; o nome do status continua `Review`.

### 10.1 Code Review — Tech Lead

O Tech Lead deve:

1. Ler a Issue no Linear.
2. Ler os refinamentos e histórico de implementação.
3. Revisar o diff/código alterado.
4. Validar:
   - Arquitetura
   - Padrões
   - Segurança
   - Performance
   - Testabilidade
   - Consistência com a base de conhecimento
5. Atualizar a Issue no Linear com:
   - Resultado da revisão
   - Correções obrigatórias
   - Sugestões opcionais
   - Riscos remanescentes
   - Status: aprovado ou requer ajustes
6. Fazer handoff para o QA Analyst (mesma etapa; sem gate de chat), mesmo se houver correções — o QA registra o resultado funcional e o **usuário** decide o próximo passo.

### 10.2 QA — QA Analyst

O QA Analyst deve:

1. Ler a Issue no Linear.
2. Validar critérios de aceite.
3. Validar fluxos funcionais.
4. Testar edge cases.
5. Executar ou orientar testes de regressão.
6. Atualizar a Issue no Linear com:
   - Casos testados
   - Resultado
   - Bugs encontrados
   - Evidências quando aplicável
   - Status: aprovado ou requer ajustes

### 10.3 Saída do Review

Após Tech Lead e QA:

1. A Issue **permanece** em `Review`.
2. Emitir aviso no chat **espelhando os apontamentos do Linear**:
   - Correções obrigatórias (Tech Lead e QA)
   - Sugestões / melhorias opcionais
   - Resultado (aprovado / requer ajustes / bloqueado)
3. Oferecer os comandos:
   - Voltar ajustes para os Engineers (depois o usuário pede revalidação)
   - Seguir para documentação
4. **Parar.** Não mover status.

Se o usuário mandar voltar ajustes: mover para `In Progress`, acionar os Engineers, **commit** das correções, aviso no chat. A revalidação (Review de novo) só ocorre com novo comando.

---

## 11. Fluxo de Documentação e Done

### 11.1 Document

A documentação **só começa** com comando explícito no chat, por exemplo:

> Seguir para a documentação.

Ao receber o comando:

1. Se a Issue estiver em `Review` (Code Review e QA concluídos na etapa), mover para `Document`.
2. Acionar Technical Writer e, em seguida, Documentation Writer na mesma sessão.
3. **Não** mover para `Done` ao terminar.

Neste estado, a implementação já passou por review; falta avaliar (e atualizar, se necessário) a documentação permanente.

#### Regra absoluta de status em Document

Enquanto a Issue estiver na etapa `Document`:

- O status Linear **deve permanecer `Document`**.
- É **proibido** regredir para `In Progress`, `Review`, `Todo` ou `Backlog`.
- Atualizar a Issue (descrição, comentário, anexos) **não** autoriza mudar o status.
- No MCP `save_issue`: **omitir** o campo `state`, salvo correção explícita de regressão (voltar para `Document`) ou conclusão autorizada para `Done`.
- **Nunca** passar `state` pelo tipo genérico (`started`, `unstarted`, etc.) — o Linear pode resolver para o status padrão da categoria (em geral `In Progress`). Sempre usar o **nome exato**: `Document`, `Done`, etc.
- Se ao ler a Issue o status tiver regredido para `In Progress` (ex.: automação Git/PR) **durante** Document, o agente deve **restaurar para `Document`** imediatamente e registrar o fato no comentário/handoff.

Única transição válida a partir de `Document`: `Document` → `Done` (comando no chat + critérios do §16).

### 11.2 Saída de Document

Após Technical Writer e Documentation Writer:

1. A Issue **permanece** em `Document`.
2. Emitir aviso no chat: documentação avaliada; o usuário decide se autoriza `Done`.
3. **Parar.** Não mover para `Done`, não mergear PR, não fazer deploy.

### 11.3 Done

`Done` **só ocorre** com comando explícito no chat, por exemplo:

> Mover para Done.  
> Concluir esta Issue.

Ao receber o comando (critérios do §16 cumpridos):

1. Mover a Issue para `Done`.
2. Aplicar o **Gate de merge** (§15.3): perguntar no chat se o usuário deseja o merge do PR.
3. Só mergear se a resposta for um “sim” inequívoco.
4. Deploy continua **separado** e só ocorre com pedido explícito (§14).

`Done` é o **estado final** do fluxo. Não existe status `Released`.

---

## 12. Technical Writer

O Technical Writer é responsável por documentação técnica interna.

Ele deve:

1. Ler a Issue no Linear.
2. Analisar o que foi alterado no código.
3. Verificar se alguma documentação permanente da base de conhecimento precisa ser atualizada:
   - Produto
   - Regras de negócio
   - Arquitetura
   - Módulos
   - Integrações
   - Padrões
4. Atualizar os arquivos `.md` relevantes no repositório **somente se** a mudança tiver impacto permanente (produto, regra, arquitetura, módulo, integração, padrão, ADR) — ver proporcionalidade (§15.5).
5. **Commitar** se houver alteração em `docs/` (§15.4).
6. Atualizar a Issue no Linear com:
   - Resultado (atualizado / nenhuma alteração)
   - Justificativa curta
   - Lista de arquivos **alterados** (não inventariar cada ajuste fino de UI)
7. Fazer handoff para o Documentation Writer (mesma etapa).

O Technical Writer não deve criar documentação temporária por issue. A etapa `Document` é obrigatória; **escrever** em `docs/` não é.

O Technical Writer **não altera** o status da Issue para `In Progress`. Preserva `Document` (§11.1). **Não** move para `Done`.

---

## 13. Documentation Writer

O Documentation Writer é responsável pela documentação de usabilidade hospedada no Mintlify.

Ele deve:

1. Ler a Issue no Linear.
2. Avaliar se o usuário final precisa **aprender, encontrar ou fazer algo diferente** (§15.5). Ajuste visual fino (layout, alinhamento, truncate, empilhamento de elementos já descritos) **não** justifica atualizar Mintlify.
3. Consultar a documentação atual no Mintlify via MCP, quando disponível — só para verificar se alguma página **fica incorreta**.
4. Atualizar a documentação de usabilidade no Mintlify **somente se necessário** (fluxo Mintlify / PR próprio; não inventar commit neste repositório se a mudança não for aqui).
5. Atualizar a Issue no Linear com:
   - Resultado (atualizado / nenhuma alteração)
   - Justificativa curta
   - Páginas **alteradas** e links (omitir inventário de polimento visual)

O Documentation Writer **não altera** o status da Issue para `In Progress` (abrir PR Mintlify também não justifica). Preserva `Document` (§11.1). **Não** move para `Done`.

---

## 14. Deploy

O deploy é um processo manual e **não possui status próprio** no Linear.

1. Só ocorre com **pedido explícito** no chat. Autorizar `Done` ou mergear o PR **não** é autorização de deploy.
2. O deploy é feito manualmente conforme processo definido pelo projeto (Railway).
3. Se a Issue já estiver publicada, isso deve ser observado pela **marcação** na Issue — não por um status `Released`.
4. Os agentes não devem executar deploy automaticamente.

---

## 15. Regras Gerais para Todos os Agentes

### Sempre fazer

- Usar Linear MCP para ler a Issue quando houver Issue associada.
- Registrar análises e decisões na própria Issue do Linear.
- Consultar a base de conhecimento antes de decidir.
- Respeitar o papel do agente invocado e o Gate de Avanço (§15.2).
- Manter o histórico centralizado no Linear.
- Ser explícito sobre riscos, dúvidas e bloqueios.
- Diferenciar correção obrigatória de sugestão opcional.
- Seguir o **Gate de Decisão** (§15.1) quando houver dúvida bloqueante.
- **Commitar** ao final de cada passo que alterar código ou `docs/` permanentes (§15.4).
- Ao fim da etapa autorizada: aviso no chat e **parar**.

### Nunca fazer

- Criar arquivos temporários por Issue no repositório.
- Duplicar histórico do Linear em arquivos `.md`.
- Mover uma Issue de etapa sem comando de avanço (exceto `Backlog` → `Todo` após PA + SA).
- Pular etapa ou acionar o próximo papel de **outra** etapa na mesma sessão.
- **Regredir** Issue de `Document` (ou `Done`) para `In Progress` — nem por “começar a trabalhar”, nem ao atualizar descrição/comentário, nem por efeito colateral de PR/docs.
- Passar `state` no MCP com tipo genérico (`started`) em vez do nome exato do status.
- Ignorar refinamentos já feitos por agentes anteriores.
- Implementar fora do escopo refinado sem sinalizar.
- Atualizar documentação permanente sem necessidade real (incluindo ajustes visuais finos — §15.5).
- Fazer deploy automaticamente.
- Mergear PR automaticamente ao mover para `Done`.
- Inventar decisão de produto, arquitetura, aceite, merge ou release no lugar do usuário.
- Concluir a etapa com perguntas bloqueantes só registradas no Linear, sem perguntar no chat.

---

## 15.1 Gate de Decisão (dúvidas bloqueantes)

Quando uma **decisão importante** for necessária para avançar a etapa, o agente **não inventa** e **não conclui** a atuação. O canal para obter a resposta é o **chat do Cursor**; o Linear registra o bloqueio e, depois, a decisão tomada.

### O que é bloqueante

É bloqueante qualquer dúvida sem a qual a etapa atual não pode ser fechada com qualidade, por exemplo:

| Etapa | Exemplos de decisão bloqueante |
| --- | --- |
| Backlog (Product Analyst) | Escopo, problema, comportamento esperado, personas, regras de negócio, critérios de aceite |
| Backlog (Software Architect) | Trade-off técnico com impacto de produto, ADR necessário, dependência externa/config, migration arriscada |
| In Progress (Engineers) | Ambiguidade de escopo/contrato, regra indefinida, mudança fora do plano sem autorização |
| Review (Tech Lead) | Aceitar risco residual, exception a padrão, escopo vs. implementação, ADR pendente |
| Review (QA) | Comportamento esperado ambíguo, “aprovado com ressalvas”, ambiente/dados impossíveis de validar |
| Document (Writers) | Wording/promessa de produto, o que documentar vs. omitir, screenshot/conteúdo obrigatório ausente |

Dúvidas **não bloqueantes** (melhoria opcional, follow-up, nitpick) podem ir só na Issue, sem parar o fluxo.

### Protocolo obrigatório

1. **Pare** a conclusão da etapa (não marque handoff como `concluído`; não recomende/mova status para a próxima etapa).
2. **Registre no Linear** (via MCP) o progresso parcial + seção de perguntas bloqueantes + handoff com `Status: bloqueado` (ou `requer esclarecimento`).
3. **Pergunte no chat do Cursor** de forma explícita, numerada e acionável — este é o canal em que o usuário responde.
4. **Aguarde** a resposta do usuário no chat. Não continue a etapa como se a decisão já existisse.
5. **Após a resposta:** atualize o Linear com as decisões tomadas (o que foi decidido, por quem/quando no fluxo, impacto no escopo/aceite).
6. **Só então** conclua a análise/execução da etapa e faça o handoff definitivo.

### Formato mínimo no chat (perguntas)

```markdown
## Decisão necessária — Issue [ID]

Não consigo concluir [etapa/papel] sem sua decisão.

### Contexto (1–3 linhas)
[por que isso bloqueia]

### Perguntas
1. [pergunta objetiva] — opções: A) … / B) … / C) …
2. …

### Impacto se não decidir agora
- [o que fica parado]
```

### Formato mínimo no Linear (após resposta)

```markdown
## Decisões do Usuário — [data]

- **Pergunta:** …
- **Decisão:** …
- **Impacto:** [escopo / aceite / abordagem / review / docs]
```

### Regras

- Chat = obter a decisão. Linear = persistir bloqueio e decisão.
- Não encerre a atuação com “perguntas em aberto” só no Linear sem espelhar as perguntas no chat.
- Não mova status (§16) enquanto houver pergunta bloqueante sem resposta registrada.
- Após registrar a decisão no Linear, o agente pode retomar e concluir o passo na mesma sessão (se o usuário já respondeu) ou na próxima atuação.

---

## 15.2 Gate de Avanço (comando no chat)

O Gate de Avanço é distinto do Gate de Decisão. Decisão = dúvida **dentro** da etapa. Avanço = **passar** de uma etapa para a seguinte.

### Princípio

Ao concluir a etapa autorizada: atualizar o Linear + **aviso estruturado no chat** + **parar**.  
A próxima etapa só começa com **comando explícito** no chat.

Exceção: `Backlog` → `Todo` após PA + SA concluídos, sem bloqueios — o agente move, avisa e para (não inicia execução).

### Transições

| Transição | Quando o agente move |
| --- | --- |
| `Backlog` → `Todo` | Automático após PA + SA concluídos, sem perguntas bloqueantes; depois aviso e para |
| `Todo` → `In Progress` | Só com comando no chat para iniciar execução |
| `In Progress` → `Review` | Só com comando no chat para iniciar review |
| `Review` → `In Progress` | Só se o usuário mandar voltar ajustes |
| `Review` → `Document` | Só com comando no chat para documentação |
| `Document` → `Done` | Só com comando no chat para concluir; em seguida Gate de merge (§15.3) |
| Merge do PR | Nunca automático; só se o usuário responder sim à pergunta de merge |
| Deploy | Nunca sem pedido explícito |

### Template de aviso no chat (fim de etapa)

```markdown
## Etapa concluída — Issue [ID] — [status Linear]

### O que foi feito
- ...

### O que o usuário precisa fazer agora
[Verificação manual / leitura dos apontamentos / decisão de avanço]

### Comandos para continuar
- Iniciar execução
- Iniciar review
- Voltar ajustes para os Engineers
- Seguir para documentação
- Concluir Issue (`Done`)
- Deploy (pedido explícito e separado)
```

No fechamento de **Review**, o aviso **deve** listar os apontamentos do Linear (obrigatórios vs. opcionais). Nas demais etapas, o aviso é curto; o detalhe permanece na Issue.

Handoff no Linear, ao fim da etapa: **Próximo agente recomendado** = usuário no chat (exceto o par da mesma etapa ainda não executado).

---

## 15.3 Gate de merge ao autorizar `Done`

Quando o usuário autorizar concluir / mover para `Done`, o agente **não mergeia sozinho**.

1. Mover a Issue para `Done` (se os critérios do §16 forem cumpridos).
2. Se houver PR aberto da Issue, **perguntar no chat**:

```markdown
## Conclusão — Issue [ID]

A Issue será movida para `Done`.

Há um PR aberto: [url]

Deseja que eu faça o **merge do PR** agora?
1. Sim — mergear
2. Não — manter o PR aberto

Deploy continua separado e só ocorre se você pedir explicitamente.
```

3. Só mergear com “sim” (ou equivalente inequívoco).
4. “Não”, silêncio ou resposta ambígua: Issue em `Done`, PR permanece aberto.
5. Se não houver PR: informar no aviso e **não** perguntar merge.
6. Registrar no Linear a resposta (sim / não / sem PR).

Autorizar `Done` e recusar o merge é válido. Autorizar `Done` e confirmar merge também é válido. Nenhum dos dois autoriza deploy.

---

## 15.4 Commit por passo de execução

Toda atuação que **altera código** ou documentação permanente em `docs/` deve gerar **um commit** ao final daquele passo:

- Backend Engineer (implementação ou correção)
- Frontend Engineer (implementação ou correção)
- Correções pós-review pelos Engineers
- Technical Writer (se alterar `docs/`)

Regras:

- Seguir [`docs/05_padroes/padroes-de-git.md`](../05_padroes/padroes-de-git.md) e Conventional Commits.
- Não agrupar passos de papéis diferentes no mesmo commit (BE e FE = commits separados).
- Documentation Writer no Mintlify segue o fluxo Mintlify (PR/save); não inventar commit neste repositório se a mudança não for aqui.
- Push da feature branch durante a execução pode ocorrer; **merge**, conclusão (`Done`) e **deploy** exigem comando no chat.

---

## 15.5 Proporcionalidade documental (ajustes finos)

A etapa `Document` é **obrigatória** (Gate de Avanço): Technical Writer e Documentation Writer **avaliam**. **Escrever** em `docs/` ou no Mintlify **não** é automático.

### Quando atualizar

Atualize documentação permanente somente se **pelo menos um** for verdadeiro:

1. A documentação existente **fica incorreta** sem a mudança (contrato, regra, jornada, permissão, limite, API, env var, módulo, fluxo).
2. O usuário final precisa **aprender, encontrar ou fazer algo diferente**.
3. Há decisão técnica/arquitetural **reutilizável** (padrão, ADR, convenção permanente).

### Quando não atualizar

O detalhe permanece **só no Linear**. Não atualize `docs/` nem Mintlify para:

- Ajuste visual fino: alinhamento, espaçamento, truncate, z-index, touch target, empilhamento de elementos já descritos.
- Polimento de CSS/responsividade sem novo fluxo, tela, navegação ou comportamento contratual.
- Rearranjo de UI de elementos **já documentados** (ex.: logo e nome da igreja no header) se jornada, ações e regras continuam iguais.
- Bugfix que faz o comportamento já documentado funcionar.
- Nitpick de review sem alterar significado de produto.

### Relato

- **Linear:** resultado + justificativa curta. Listar só arquivos/páginas **alterados**. Não inventariar polimento visual nem listar docs “por cobertura”.
- **Chat:** dizer se houve atualização. **Não** relatar item a item ajustes finos de UI. Só detalhar o que realmente mudou em `docs/` ou Mintlify (impacto técnico ou de usabilidade).

---

## 16. Critérios para Mudar Status no Linear

Além das pré-condições abaixo, toda transição **exceto** `Backlog` → `Todo` exige o **comando de avanço no chat** (§15.2).

### Para mover para `Todo`

Permitido quando:

- Product Analyst concluiu refinamento.
- Software Architect concluiu análise técnica.
- Não há perguntas bloqueantes (se houve, foram resolvidas via Gate de Decisão §15.1 e registradas no Linear).
- Critérios de aceite estão claros.
- Escopo e fora de escopo estão definidos.
- Riscos principais estão registrados.

Não exige comando extra no chat: o agente move, avisa e para.

### Para mover para `In Progress`

Permitido quando:

- Issue está refinada (em `Todo`, ou equivalente).
- O usuário **comandou no chat** iniciar a execução (ou voltar ajustes a partir de `Review`).
- O agente executor entendeu escopo, critérios e abordagem.

### Para aprovar Code Review (ainda em `Review`)

Permitido quando:

- Não há problemas obrigatórios pendentes.
- Código segue padrões do projeto.
- Segurança e performance foram consideradas.
- Testes relevantes existem ou a ausência foi justificada.

Aprovar o review **não** move a Issue. O status permanece `Review` até o usuário comandar o próximo passo.

### Para aprovar QA (ainda em `Review`)

Permitido quando:

- Critérios de aceite foram validados.
- Fluxos principais passaram.
- Edge cases relevantes foram testados.
- Regressões críticas foram consideradas.
- Bugs bloqueantes foram resolvidos.

Aprovar QA **não** move para `Document`.

### Para mover para `Document`

Permitido quando:

- O usuário **comandou no chat** seguir para documentação.
- Code Review e QA da etapa `Review` foram concluídos (aprovados, ou o usuário optou mesmo assim — registrar a decisão).
- Não há bugs bloqueantes abertos, salvo decisão explícita do usuário no chat.

### Para permanecer em `Document` (obrigatório)

Enquanto Technical Writer e/ou Documentation Writer estiverem atuando:

- Status permanece `Document`.
- Não mover para `In Progress` ao “iniciar” documentação, editar `docs/`, abrir PR Mintlify ou atualizar a Issue.
- Se detectar regressão indevida para `In Progress`, restaurar `Document` (§11.1).

### Para concluir Document e mover para `Done`

Permitido quando:

- O usuário **comandou no chat** concluir / mover para `Done`.
- Technical Writer avaliou documentação interna.
- Documentation Writer avaliou documentação de usabilidade, se aplicável.
- Alterações necessárias foram feitas **ou** a avaliação registrou que nenhuma atualização permanente era necessária (§15.5).
- Caso nada tenha sido alterado, a justificativa foi registrada no Linear.
- A Issue ainda está (ou foi restaurada) em `Document` antes da transição para `Done`.
- A pergunta de merge (§15.3) foi feita (resposta sim, não, ou “sem PR”) e registrada no Linear.

---

## 17. Handoff entre Agentes

Cada agente deve finalizar sua atuação indicando claramente o próximo passo.

Formato recomendado:

```markdown
## Handoff

**Status:** [concluído / requer ajustes / bloqueado]

**Próximo agente recomendado:** [par da mesma etapa | usuário no chat]

**Motivo:** [por que este é o próximo passo]

**Pontos de atenção:**
- [item 1]
- [item 2]
```

Pares da **mesma** etapa (sem gate de chat): Software Architect após Product Analyst; Frontend Engineer após Backend Engineer (se houver UI); QA Analyst após Tech Lead; Documentation Writer após Technical Writer.

Ao **fechar a etapa**: próximo passo = **aguardar comando do usuário no chat** (Gate de Avanço §15.2).

Quando o status for `bloqueado` por falta de decisão, o próximo passo imediato é **aguardar resposta do usuário no chat** (Gate de Decisão §15.1).

---

## 18. Fonte de Verdade por Tipo de Informação

| Informação | Fonte de Verdade |
| --- | --- |
| Status da demanda | Linear |
| Histórico de refinamento | Linear |
| Histórico de review | Linear |
| Histórico de QA | Linear |
| Implementação | Git / código |
| Conhecimento permanente do produto | Repositório `docs/*.md` |
| Arquitetura permanente | Repositório `docs/*.md` |
| Regras de negócio permanentes | Repositório `docs/*.md` |
| Documentação de usabilidade | Mintlify |
| Deploy | Railway / processo manual |

---

## 19. Resumo Operacional

```
Backlog
→ [comando: iniciar desenvolvimento / refinar]
→ Product Analyst atualiza Issue no Linear
→ Software Architect atualiza Issue no Linear
→ Issue vai para Todo
→ aviso no chat e PARA

Todo
→ aguarda comando “iniciar execução”

In Progress
→ [comando: iniciar execução] agente move Todo → In Progress
→ Backend Engineer / Frontend Engineer implementam
→ commit por passo de código
→ agentes atualizam Issue no Linear
→ aviso no chat (verificação manual) e PARA

Review
→ [comando: iniciar review] agente move In Progress → Review
→ Tech Lead faz code review
→ QA Analyst faz validação
→ aviso no chat com apontamentos do Linear e PARA
→ [comando: voltar ajustes] → In Progress → Engineers → commit → aviso
→ [comando: seguir para documentação] → Document

Document
→ Technical Writer atualiza docs internas se necessário (commit se alterar docs/)
→ Documentation Writer atualiza Mintlify se necessário
→ aviso no chat e PARA

Done
→ [comando: concluir / Done] agente move Document → Done
→ pergunta no chat: merge do PR? (sim / não)
→ merge só com confirmação

Deploy (manual, fora do status)
→ só com pedido explícito; Railway; marcação na Issue indica se já está publicado
```

---

## 19.1 Templates no repositório

Os arquivos em `docs/00_meta/templates/` são **estruturas de texto**, não destinos de arquivo por demanda:

| Template | Destino do conteúdo |
| --- | --- |
| `template-refinamento.md` | Issue Linear (Product Analyst) |
| `template-arquitetura-issue.md` | Issue Linear (Software Architect) |
| `template-qa-report.md` | Issue Linear (QA Analyst) |
| `template-release-notes.md` | `docs/releases/` (permanente) |
| `template-modulo.md` | `docs/04_modulos/` (permanente) |
| `template-adr.md` | `docs/07_decisoes-tecnicas/` (permanente) |

---

## 20. Impacto nos MDCs dos Agentes

A partir deste workflow, todos os MDCs devem seguir estas regras base:

### 20.1 Todo agente deve referenciar o workflow

Cada MDC deve incluir:

```md
Antes de atuar, leia:
- `docs/00_meta/linear-cursor-workflow.md`
- `docs/00_meta/mapa-de-agentes.md`
- MDC do papel em `.cursor/rules/`
```

### 20.2 Todo agente deve usar Linear como output primário

Em vez de criar arquivos em `docs/refinamentos/` (ou similar), o agente deve:

```md
Atualize a Issue no Linear via MCP com sua análise estruturada.
```

### 20.3 Nenhum agente deve criar arquivos temporários por Issue

Documentações permanentes só entram no repositório quando houver **impacto técnico ou de usabilidade reutilizável**:

- Atualizam base de conhecimento
- Atualizam módulos
- Atualizam regras permanentes
- Atualizam arquitetura
- Atualizam padrões
- Atualizam integrações
- Atualizam ADRs

Ajustes visuais finos e polimento de CSS **não** entram (workflow §15.5). A avaliação na etapa `Document` continua obrigatória.

### 20.4 Cada agente deve ter um bloco de “Atualização no Linear”

Exemplo:

```md
Ao concluir sua atuação, atualize a Issue no Linear com:
- Resumo do que foi analisado ou implementado
- Decisões tomadas
- Riscos ou problemas encontrados
- Próximo passo recomendado
- Status sugerido (sem mover para a próxima etapa sem Gate de Avanço)
```

### 20.5 Handoff vira parte obrigatória dos MDCs

Todo agente deve finalizar com:

```md
## Handoff
Status:
Próximo agente recomendado:
Pontos de atenção:
```

Ao fechar a etapa: próximo = usuário no chat.

### 20.6 Gate de Decisão nos MDCs

Todo MDC deve instruir o agente a:

```md
Se surgir decisão bloqueante:
1. Não concluir a etapa.
2. Registrar bloqueio + perguntas no Linear.
3. Perguntar no chat do Cursor e aguardar resposta do usuário.
4. Atualizar o Linear com a decisão.
5. Só então concluir e fazer handoff definitivo.
```

Detalhe: workflow §15.1.

### 20.7 Gate de Avanço, commit e merge nos MDCs

Todo MDC deve instruir o agente a:

```md
- Não pular etapa. Não acionar o próximo papel de outra etapa.
- Mover status só com comando de avanço (exceto Backlog → Todo após PA + SA).
- Ao fim da etapa: aviso no chat e parar.
- Commitar cada passo que alterar código ou docs/.
- Ao autorizar Done: perguntar merge do PR; só mergear com sim.
```

Detalhe: workflow §§15.2–15.4.

### 20.8 Proporcionalidade documental nos MDCs de Writers

Os MDCs de Technical Writer e Documentation Writer devem instruir:

```md
- Avaliar na etapa Document é obrigatório; escrever em docs/ ou Mintlify não é.
- Atualizar só se a docs existente ficar incorreta, o usuário precisar fazer algo diferente, ou houver padrão/ADR permanente.
- Não documentar ajuste visual fino, polimento de CSS nem rearranjo de elementos já descritos.
- No Linear e no chat: resultado + justificativa curta; não inventariar polimento.
```

Detalhe: workflow §15.5.
