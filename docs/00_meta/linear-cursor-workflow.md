---
type: meta-workflow
titulo: Linear + Cursor Development Workflow
ultima_atualizacao: 2026-10-19
versao: "2.0"
tags: [meta, linear, cursor, workflow, agentes]
---

# Linear + Cursor Development Workflow

## 1. Propósito

Este documento define como os agentes de IA do Cursor devem atuar dentro do fluxo de desenvolvimento integrado com Linear.

O objetivo do workflow é garantir que:

- O Linear seja a fonte de verdade para o ciclo de vida das demandas.
- O Cursor execute as etapas usando agentes especializados **de ponta a ponta, sem interrupções** entre papéis até `Done`.
- O histórico da demanda permaneça centralizado na própria Issue do Linear.
- O **chat da IDE** seja o canal para **iniciar** a Issue, **decisões bloqueantes** (Gate de Decisão) e o **fechamento em `Done`** (resumo + PR + merge/validação).
- A base de conhecimento do repositório seja usada como contexto, não como local de registros temporários.
- Atualizações permanentes de documentação sejam feitas apenas quando houver mudança relevante no produto, arquitetura, módulos, integrações ou padrões.

---

## 2. Princípio Central

**Linear é o sistema de registro operacional.**

Toda análise específica de uma demanda deve ser registrada diretamente na Issue do Linear, usando MCP.

Isso inclui:

- Refinamento de produto
- Classificação de impacto visual (UX/UI) e especificação de experiência, quando aplicável
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

- **Iniciar** a execução da Issue (um comando; o pipeline segue até `Done`)
- Responder dúvidas bloqueantes (Gate de Decisão, §15.1) — única pausa intermediária permitida
- Receber o **resumo final em `Done`** (o que foi feito + URL do PR + opções de validação manual ou merge)
- Confirmar merge do PR e, separadamente, autorizar deploy

Entre etapas do pipeline, o agente **não** para para pedir “ok” ou comando de avanço. Progresso intermediário fica no Linear; o usuário é acionado no chat só em bloqueio (§15.1) ou no fechamento (§15.2 / §15.3).

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
- O refinamento ocorre com a Issue em `Backlog`: Product Analyst, depois **UX/UI Designer só se houver impacto visual** (§8.3), depois Software Architect. Ao concluir o trio aplicável sem bloqueios, o agente **move para `Todo` e segue imediatamente** para execução (§15.2) — sem parar no chat.
- `Todo` é estado **transitório** no pipeline contínuo: Issue refinada; o orquestrador avança sozinho para `In Progress`.
- Em `Review`, atuam **Tech Lead** (code review) e **QA Analyst** (validação funcional), nesta ordem. Com correções **obrigatórias**, o orquestrador **volta automaticamente** aos Engineers e revalida (§10.3) — sem pedir comando no chat.
- `Document` vem **antes** de `Done`. Writers entram automaticamente após Review aprovado (ou após loop de correções concluído).
- O PR da Issue abre em `In Progress` (§15.6). A integração GitHub do Linear, ao vincular um PR, tende a mover a Issue para `In Progress`; por isso o primeiro PR **não** se abre em `Review`, `Document` ou `Done`.
- Não existe status `Released`. Publicação em produção é processo manual; se a Issue já está publicada, observar a **marcação** na própria Issue.

Quem move o status: o **orquestrador/agente**, conforme o pipeline contínuo (§15.2). O usuário **inicia** a Issue no chat; não se espera que ele mova o status no Linear nem comande cada transição.

---

## 5. Responsabilidade dos Agentes por Etapa

| Etapa Linear | Agente Cursor | Responsabilidade |
| --- | --- | --- |
| Backlog | Product Analyst | Refinar valor de produto, escopo, critérios de aceite, regras de negócio, impactos e **classificar impacto visual (UX/UI)** |
| Backlog | UX/UI Designer | **Condicional** (§8.3): especificar experiência/interface WEB quando houver mudança visual que o usuário vê; rigor `menor` ou `maior` |
| Backlog | Software Architect | Refinar análise técnica, riscos, arquitetura, dependências e abordagem — **depois** do PA e do UX/UI quando este tiver atuado; move para `Todo` e **handoff ao pipeline de execução** |
| Todo | — | Estado transitório; orquestrador avança para `In Progress` na mesma sessão |
| In Progress | Backend Engineer | Implementar APIs, regras de negócio, integrações e lógica backend (commit + push; abrir PR se ainda não houver — §15.6) |
| In Progress | Frontend Engineer | Implementar interface, UX/UI e integrações com APIs (commit + push; abrir PR se ainda não houver — §15.6) |
| Review (Code Review) | Tech Lead | Revisar código, arquitetura, padrões, segurança e performance |
| Review (QA) | QA Analyst | Validar requisitos, fluxos, edge cases e regressões; com obrigatórios → loop automático; sem obrigatórios → Document |
| Document | Technical Writer | Atualizar documentação técnica interna quando necessário (commit se alterar `docs/`) |
| Document | Documentation Writer | Atualizar documentação de usabilidade no Mintlify quando necessário |
| Done | Orquestrador | Move para `Done`; entrega resumo + PR no chat; Gate de merge (§15.3) |

### 5.1 Orquestração no chat (pipeline contínuo)

Quando o usuário pedir para desenvolver / atuar em uma Issue **sem nomear o papel**, o agente sempre ativo deve:

1. Ler a Issue no Linear (status, comentários, labels, milestone).
2. **Retomar do status atual** e executar o restante do pipeline **até `Done`**, sem parar entre etapas (exceto Gate de Decisão §15.1).

| Status Linear | Comando típico no chat | Ação (continua até Done) |
| --- | --- | --- |
| `Backlog` | Iniciar desenvolvimento / refinar / desenvolver | PA → UX/UI **se** §8.3 → SA → `Todo` → `In Progress` → Engineers → `Review` → (loop se obrigatórios) → `Document` → Writers → `Done` + resumo/PR |
| `Todo` | Iniciar desenvolvimento / execução / desenvolver | `In Progress` → Engineers → … → `Done` |
| `In Progress` | Continuar / desenvolver / voltar à Issue | Engineers (pendente) → `Review` → … → `Done` |
| `Review` | Continuar / revalidar / desenvolver | TL → QA → loop automático se obrigatórios → `Document` → … → `Done` |
| `Document` | Continuar / desenvolver | Writers (pendente) → `Done` + resumo/PR |
| `Done` | (pós-fluxo) | Só merge (se pedido) ou deploy (se pedido explícito); não reabrir pipeline |
| Qualquer | Deploy | Só se o pedido for **explícito** e separado |

**Pedido com papel explícito** (“atuar como Backend Engineer”): executar esse papel e, salvo o usuário pedir para parar ali, **continuar o pipeline** a partir do próximo passo até `Done`.

**Eficiência (obrigatória na orquestração):**

- Pular papéis sem escopo (ex.: só API → sem FE; `Impacto visual: nenhum` → sem UX/UI).
- Manter histórico só no Linear entre etapas; **não** emitir aviso de “etapa concluída / aguarde comando” no chat.
- Após Engineers: abrir/atualizar PR e seguir para Review na mesma sessão.
- Review: correções **obrigatórias** → loop automático (§10.3); sugestões **opcionais** → registrar e seguir.
- Após Writers: mover para `Done` e só então falar com o usuário (§15.2 / §15.3).

Pares na mesma etapa rodam sem gate interno: PA → UX/UI (se §8.3) → SA; BE e/ou FE; Tech Lead → QA; Technical Writer → Documentation Writer.

---

## 6. Uso Obrigatório do MCP Linear

Sempre que um agente estiver atuando sobre uma Issue, ele deve usar o MCP do Linear para:

1. Ler a Issue atual.
2. Ler título, descrição, comentários, labels, status e links relacionados.
3. Atualizar a Issue com sua análise ou resultado.
4. Adicionar comentários estruturados quando apropriado.
5. Mover status **conforme o pipeline contínuo** (§15.2) e os critérios do §16 — sem esperar comando de avanço entre etapas.
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
[Indicação clara do próximo agente / próxima etapa do pipeline — sem “aguardar comando no chat”, exceto Gate de Decisão]
```

Cada agente deve assinar sua seção com o nome do papel, não com nome pessoal.

Exemplos:

- `## Product Analyst — Refinamento de Produto`
- `## UX/UI Designer — Especificação de Experiência` (ou `— Skip`)
- `## Software Architect — Análise Técnica`
- `## Tech Lead — Code Review`
- `## QA Analyst — Validação Funcional`

---

## 8. Fluxo de Refinamento

### 8.1 Entrada

A demanda nasce no Linear em `Backlog`, normalmente como uma ideia, bug, melhoria ou refatoração.

Quando o usuário iniciar o desenvolvimento pelo chat da IDE (Issue provavelmente em `Backlog`), o orquestrador aciona Product Analyst; em seguida o **UX/UI Designer somente se o Gate §8.3 mandar**; em seguida Software Architect; e **continua o pipeline até `Done`** (§15.2) — mesmo que o pedido seja genérico (“desenvolver esta Issue”).

Pedidos equivalentes (disparam o pipeline completo):

> Refinar esta Issue.  
> Iniciar o desenvolvimento da Issue [ID].  
> Desenvolver esta Issue.

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
4. **Classificar impacto visual (UX/UI)** como `nenhum`, `menor` ou `maior`, com justificativa de uma linha (§8.3).
5. Atualizar a própria Issue no Linear.
6. Não criar arquivo de refinamento no repositório.
7. Fazer handoff (mesma etapa; sem gate de chat):
   - `menor` ou `maior` → **UX/UI Designer**
   - `nenhum` → **Software Architect**

O Product Analyst **não** escreve spec de layout, componentes ou a11y — isso é papel do UX/UI quando o Gate mandar.

### 8.3 Gate de UX/UI (condicional)

O UX/UI Designer **não** atua em toda Issue. Entra só quando a demanda envolve **implementação ou mudança de elementos visuais no frontend que o usuário vê** (Painel, landing, `/public/*`, funil `(auth)`, Admin OPS).

Ordem na mesma sessão:

```txt
Product Analyst
  → classifica Impacto visual: nenhum | menor | maior
  → se nenhum: Software Architect
  → se menor ou maior: UX/UI Designer (rigor correspondente) → Software Architect
```

O Software Architect **só começa** depois do Product Analyst e, quando o impacto for `menor` ou `maior`, depois do UX/UI (ou de um skip justificado na Issue).

#### 8.3.1 Quem classifica

1. **Product Analyst (obrigatório):** toda Issue refinada inclui `Impacto visual (UX/UI)` + justificativa curta.
2. **Orquestrador:** se o PA omitiu a classificação, aplicar as heurísticas abaixo **antes** de pular o UX/UI. Na dúvida, acionar o UX/UI em modo `menor`.
3. **UX/UI Designer:** no início, **confirma ou corrige** a classificação (upgrade, downgrade ou skip). Correção exige justificativa na Issue. Não inflar rigor; não pular tela/seção nova.

Pedido explícito no chat (“atuar como UX/UI Designer”) prevalece sobre `nenhum`.

#### 8.3.2 Quando NÃO entra (`nenhum`)

Use `nenhum` quando **nada** do que o usuário vê muda:

- só backend (API, job, migration, webhook, RLS) sem alteração de tela;
- infra, env, CI, Railway, secrets;
- docs / Mintlify sem mudança de UI;
- testes sem mudança de UI;
- refatoração sem mudança visível ao usuário;
- bugfix que **restaura** comportamento já especificado, sem alterar layout, hierarquia, copy visível, estados de tela ou controles.

Ligar um endpoint novo a um formulário **já existente**, sem campo, estado ou controle novo → `nenhum`.

#### 8.3.3 Quando entra e com que rigor

Entra se houver implementação ou mudança de elemento visual que impacta o usuário.

**`menor` (modo objetivo)** — partes de componentes e alterações visuais pequenas em superfície existente:

- campo, botão, badge, label ou ação em toolbar/modal já existente;
- microcopy de controle existente;
- ajuste pontual de a11y/touch (`min-h-11`, label) sem redesenhar o bloco;
- empty/error em superfície existente sem layout novo;
- mostrar/ocultar controle já previsto por permissão, sem novo padrão de UI.

**`maior` (modo rigoroso)** — telas, seções e componentes grandes:

- nova rota, página ou tela;
- nova seção relevante em tela existente;
- componente grande novo ou redesenho de bloco substancial;
- mudança de IA/navegação (nav, abas, shell);
- jornada nova ou funil público/auth/landing redesenhado;
- formulário ou fluxo substancialmente reestruturado;
- nova superfície (ex.: tela pública, OPS) ou padrão de UI novo no kit.

Na fronteira (ex.: “mais um campo” vs. “form reestruturado”): `menor` se a IA e o layout do bloco permanecem; `maior` se o usuário passa a cumprir a tarefa de outro jeito.

#### 8.3.4 Rigor da spec na Issue

| Classificação | Profundidade | Output |
| --- | --- | --- |
| `nenhum` | Não atua | PA justifica o skip; SA segue |
| `menor` | Objetivo: o que muda, componente, estados afetados, copy, 1–3 critérios de UX | Seção compacta |
| `maior` | Completo: IA/fluxo, layout mobile+desktop por tela, componentes, estados, a11y/touch, copy, critérios de UX | Spec completa (`template-ux-ui.md`) |

Skip pelo UX/UI (PA marcou `menor`/`maior` mas não há impacto visual): registrar `## UX/UI Designer — Skip` com motivo e handoff ao SA. Não inventar spec.

#### 8.3.5 Como SA e FE usam a spec

- O Software Architect lê a spec (ou o skip) e reflete no plano técnico de frontend (rotas, componentes, estados) **sem contradizer** a direção de UX, salvo risco técnico explícito na análise.
- O Frontend Engineer implementa alinhado à spec quando ela existir.

### 8.4 Software Architect

O Software Architect deve:

1. Ler a Issue já refinada pelo Product Analyst e, se houver, a spec ou o skip do UX/UI Designer.
2. Se o PA classificou `menor` ou `maior` e ainda **não** houver seção de UX/UI nem skip justificado, **não** analisar: o orquestrador deve acionar o UX/UI antes.
3. Consultar a base de conhecimento:
   - `docs/03_arquitetura/`
   - `docs/04_modulos/`
   - `docs/05_padroes/`
   - `docs/06_integracoes/`
4. Refinar:
   - Abordagem técnica
   - Impacto arquitetural
   - Módulos afetados
   - Dependências técnicas
   - Riscos técnicos
   - Estratégia de implementação
   - Requisitos de banco/API/infra se aplicável
   - Plano técnico de alto nível (frontend alinhado à spec de UX, se houver)
5. Atualizar a própria Issue no Linear.
6. Não criar arquivo de análise técnica no repositório.

### 8.5 Saída do Refinamento

Após Product Analyst, UX/UI Designer **quando o Gate §8.3 exigir**, e Software Architect concluírem, sem perguntas bloqueantes:

1. Mover a Issue para `Todo`.
2. Registrar a movimentação na Issue.
3. **Na mesma sessão**, avançar para execução: `Todo` → `In Progress` → Engineers (§9). Não parar no chat.

Caso existam perguntas bloqueantes (de qualquer um dos papéis do Backlog), aplicar o **Gate de Decisão** (§15.1). A Issue permanece em `Backlog` até isso.

---

## 9. Fluxo de Execução

### 9.1 Entrada

No pipeline contínuo, a execução começa **automaticamente** após o refinamento (ou ao retomar uma Issue já em `Todo` / `In Progress`).

Pedidos que disparam o pipeline (ou o retomam):

> Iniciar o desenvolvimento da Issue [ID].  
> Desenvolver esta Issue.  
> Continuar esta Issue.

Ao entrar na execução:

1. Se a Issue estiver em `Todo` (ou refinada sem ter sido movida), mover para `In Progress`.
2. Acionar Backend Engineer e/ou Frontend Engineer, conforme o escopo da Issue (pular o papel sem escopo).
3. Ao terminar os Engineers aplicáveis: garantir PR (§15.6) e **seguir para Review** na mesma sessão (§10) — sem aviso de “verifique e diga para iniciar review”.

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
5. **Commitar** as alterações deste passo (§15.4) e **push** na feature branch.
6. Garantir o PR da Issue (§15.6): abrir se ainda não existir; se existir, o push já atualiza.
7. Relê o status no Linear; se a automação GitHub tiver alterado, restaurar `In Progress`.
8. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Arquivos principais alterados
   - Testes adicionados ou atualizados
   - URL do PR
   - Pontos pendentes ou decisões tomadas

Se ainda houver frontend no escopo, fazer handoff para o Frontend Engineer na mesma sessão. Se não houver FE, handoff ao orquestrador para Review.

### 9.3 Frontend Engineer

O Frontend Engineer deve:

1. Ler a Issue no Linear via MCP.
2. Identificar critérios de aceite, fluxos esperados e a **spec de UX/UI** (se o Gate §8.3 tiver acionado o designer).
3. Consultar a base de conhecimento relevante:
   - Produto
   - Jornadas
   - Módulos
   - Padrões de código
   - Padrões de API
4. Implementar a interface necessária, alinhada à spec de UX quando ela existir.
5. **Commitar** as alterações deste passo (§15.4) e **push** na feature branch.
6. Garantir o PR da Issue (§15.6): abrir se ainda não existir; se existir, o push já atualiza.
7. Relê o status no Linear; se a automação GitHub tiver alterado, restaurar `In Progress`.
8. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Telas/componentes alterados
   - Integrações feitas
   - Estados tratados
   - URL do PR
   - Pontos pendentes ou decisões tomadas

### 9.4 Saída da execução

Após os Engineers concluírem (ou o único papel aplicável):

1. Feature branch no remoto e **um PR aberto** da Issue (§15.6). URL registrada no Linear.
2. Mover para `Review` e acionar Tech Lead → QA **na mesma sessão**.
3. **Não** parar no chat para verificação manual intermediária. A validação manual do usuário ocorre no fechamento em `Done` (§15.3).
4. **Não** mergear o PR nesta etapa.

---

## 10. Fluxo de Review

O review começa **automaticamente** após os Engineers (pipeline contínuo), ou ao retomar uma Issue já em `Review`.

1. Se a Issue estiver em `In Progress` com implementação concluída, mover para `Review`.
2. Acionar Tech Lead e, em seguida, QA Analyst na mesma sessão.
3. Decidir o próximo passo pelo resultado (§10.3): loop de correções **ou** avançar para `Document` — sem pedir comando no chat.

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
6. Fazer handoff para o QA Analyst (mesma etapa), mesmo se houver correções — o QA completa a validação funcional; o orquestrador aplica §10.3.

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
   - Lista explícita de **correções obrigatórias** vs. **opcionais** (próprias + do Tech Lead)

### 10.3 Saída do Review (loop automático)

Após Tech Lead e QA, o orquestrador **não para no chat**. Registra o resultado no Linear e:

| Resultado | Ação automática |
| --- | --- |
| Aprovado (sem correções obrigatórias) | Mover para `Document` → Writers na mesma sessão. Opcionais ficam só no Linear. |
| Requer ajustes **obrigatórios** | Mover para `In Progress` → Engineers corrigem (commit + push no **mesmo** PR) → voltar a `Review` → TL + QA revalidam. |
| Bloqueado por decisão (§15.1) | Pausar e perguntar no chat; não avançar. |

**Limite de loop:** no máximo **2 ciclos** automáticos de correção (Review → Engineers → Review). Se após o 2º ciclo ainda houver obrigatórios, aplicar Gate de Decisão (§15.1): resumir o que falhou, opções (mais um ciclo / aceitar risco / reduzir escopo) e aguardar o usuário.

Sugestões opcionais **nunca** bloqueiam o avanço para `Document`.

---

## 11. Fluxo de Documentação e Done

### 11.1 Document

A documentação começa **automaticamente** após Review sem obrigatórios pendentes (ou após loop de correções aprovado).

1. Mover de `Review` para `Document`.
2. Acionar Technical Writer e, em seguida, Documentation Writer na mesma sessão.
3. Ao terminar os Writers (critérios §16), **mover para `Done`** e aplicar o fechamento no chat (§11.3 / §15.3).

Neste estado, a implementação já passou por review; falta avaliar (e atualizar, se necessário) a documentação permanente.

#### Regra absoluta de status em Document

Enquanto a Issue estiver na etapa `Document` (Writers atuando):

- O status Linear **deve permanecer `Document`**.
- É **proibido** regredir para `In Progress`, `Review`, `Todo` ou `Backlog`.
- Atualizar a Issue (descrição, comentário, anexos) **não** autoriza mudar o status para trás.
- No MCP `save_issue`: **omitir** o campo `state`, salvo correção explícita de regressão (voltar para `Document`) ou conclusão do pipeline para `Done`.
- **Nunca** passar `state` pelo tipo genérico (`started`, `unstarted`, etc.) — o Linear pode resolver para o status padrão da categoria (em geral `In Progress`). Sempre usar o **nome exato**: `Document`, `Done`, etc.
- Se ao ler a Issue o status tiver regredido para `In Progress` (ex.: automação Git/PR) **durante** Document, o agente deve **restaurar para `Document`** imediatamente e registrar o fato no comentário/handoff. Ver também §15.6.
- **Não** abrir o primeiro PR da Issue nesta etapa. Se o Technical Writer commitar, fazer **push no PR já aberto**.

Única transição válida a partir de `Document` (após Writers): `Document` → `Done` (critérios do §16).

### 11.2 Saída de Document

Após Technical Writer e Documentation Writer:

1. Critérios do §16 para `Done` cumpridos (ou justificado “nenhuma alteração documental”).
2. Mover para `Done` na mesma sessão.
3. Aplicar o fechamento no chat (§11.3 / §15.3). **Não** mergear nem fazer deploy automaticamente.

### 11.3 Done (único retorno obrigatório ao usuário)

Ao concluir o pipeline (critérios do §16):

1. Mover a Issue para `Done`.
2. Relê o status; se a automação GitHub tiver saído de `Done`, restaurar `Done` (§15.6).
3. Emitir no chat o **resumo final** + URL do PR + opções de validação/merge (§15.3).
4. Só mergear se a resposta for um “sim” inequívoco.
5. Deploy continua **separado** e só ocorre com pedido explícito (§14).

Não abrir o primeiro PR da Issue em `Done` (a automação GitHub regressaria para `In Progress`), salvo pedido explícito no chat — e aí restaurar `Done` na hora.

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
5. **Commitar** se houver alteração em `docs/` (§15.4) e **push** no PR já aberto da Issue (§15.6). Não abrir PR novo.
6. Atualizar a Issue no Linear com:
   - Resultado (atualizado / nenhuma alteração)
   - Justificativa curta
   - Lista de arquivos **alterados** (não inventariar cada ajuste fino de UI)
7. Fazer handoff para o Documentation Writer (mesma etapa).

O Technical Writer não deve criar documentação temporária por issue. A etapa `Document` é obrigatória; **escrever** em `docs/` não é.

O Technical Writer **não altera** o status da Issue para `In Progress`. Preserva `Document` enquanto atua (§11.1). Quem move para `Done` é o orquestrador após o Documentation Writer.

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
6. Handoff ao orquestrador para fechar em `Done` (§11.3).

O Documentation Writer **não altera** o status da Issue para `In Progress` (abrir PR Mintlify também não justifica). Preserva `Document` enquanto atua (§11.1). O orquestrador move para `Done` em seguida.

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
- Respeitar o papel do agente invocado e a **Execução Contínua** (§15.2): ao concluir o papel, handoff ao próximo do pipeline (não pedir comando de avanço).
- Manter o histórico centralizado no Linear.
- Ser explícito sobre riscos, dúvidas e bloqueios.
- Diferenciar correção obrigatória de sugestão opcional.
- Seguir o **Gate de Decisão** (§15.1) quando houver dúvida bloqueante.
- **Commitar** ao final de cada passo que alterar código ou `docs/` permanentes (§15.4).
- Só retornar ao usuário no chat em: Gate de Decisão, ou fechamento em `Done` (resumo + PR + merge).

### Nunca fazer

- Criar arquivos temporários por Issue no repositório.
- Duplicar histórico do Linear em arquivos `.md`.
- **Parar entre etapas** pedindo “ok”, “iniciar review”, “seguir para documentação” ou “concluir” — isso é proibido no pipeline contínuo.
- Pular etapa do pipeline quando o escopo exigir o papel (pular só papéis **sem escopo**, ex.: FE em Issue só-API).
- **Regredir** Issue de `Document` ou `Done` para `In Progress` por engano — nem ao atualizar descrição/comentário, nem por efeito colateral de PR/docs (restaurar na hora — §15.6). Regressão `Review` → `In Progress` **só** no loop automático de correções obrigatórias (§10.3).
- Passar `state` no MCP com tipo genérico (`started`) em vez do nome exato do status.
- Ignorar refinamentos já feitos por agentes anteriores.
- Implementar fora do escopo refinado sem sinalizar.
- Atualizar documentação permanente sem necessidade real (incluindo ajustes visuais finos — §15.5).
- Fazer deploy automaticamente.
- Mergear PR automaticamente ao mover para `Done`.
- Inventar decisão de produto, arquitetura, aceite, merge ou release no lugar do usuário.
- Concluir a atuação com perguntas bloqueantes só registradas no Linear, sem perguntar no chat.

---

## 15.1 Gate de Decisão (dúvidas bloqueantes)

Quando uma **decisão importante** for necessária para avançar a etapa, o agente **não inventa** e **não conclui** a atuação. O canal para obter a resposta é o **chat do Cursor**; o Linear registra o bloqueio e, depois, a decisão tomada.

### O que é bloqueante

É bloqueante qualquer dúvida sem a qual a etapa atual não pode ser fechada com qualidade, por exemplo:

| Etapa | Exemplos de decisão bloqueante |
| --- | --- |
| Backlog (Product Analyst) | Escopo, problema, comportamento esperado, personas, regras de negócio, critérios de aceite, classificação de impacto visual |
| Backlog (UX/UI Designer) | Direção de jornada/layout que muda o aceite, padrão visual novo (nav, shell, tokens), conflito a11y vs. estética |
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
- Após a resposta no chat: atualizar o Linear e **retomar o pipeline contínuo** até `Done` (não pedir novo “iniciar”).

---

## 15.2 Execução Contínua (pipeline até Done)

Substitui o antigo “Gate de Avanço”. Decisão bloqueante (§15.1) continua sendo a **única** pausa intermediária no chat.

### Princípio

Com um comando de início (ou retomada) no chat, o orquestrador executa **todas** as etapas aplicáveis até `Done`, na mesma sessão (ou na sequência de turnos após desbloqueio), **sem** pedir confirmação entre papéis/etapas.

```txt
PA → UX/UI (se §8.3) → SA → Todo → In Progress → BE/FE (escopo)
  → Review (TL → QA)
  → [se obrigatórios: In Progress → Engineers → Review]×≤2
  → Document (TW → DW) → Done → resumo + PR no chat
```

Progresso intermediário: **só Linear** (seções + handoffs). Chat intermediário: **apenas** Gate de Decisão.

### Transições (automáticas no pipeline)

| Transição | Quando o agente move |
| --- | --- |
| `Backlog` → `Todo` | Após PA + UX/UI (se §8.3) + SA, sem bloqueios |
| `Todo` → `In Progress` | Imediatamente após `Todo` no pipeline |
| `In Progress` → `Review` | Após Engineers aplicáveis concluírem + PR garantido |
| `Review` → `In Progress` | Automaticamente se houver correções **obrigatórias** (§10.3) |
| `Review` → `Document` | Automaticamente se não houver obrigatórios pendentes |
| `Document` → `Done` | Após TW + DW avaliarem (§15.5 / §16) |
| Merge do PR | Nunca automático; pergunta no fechamento `Done` (§15.3) |
| Deploy | Nunca sem pedido explícito |

### Template de fechamento no chat (somente em Done)

```markdown
## Issue [ID] — Done

### Resumo
- [o que foi entregue — 3–8 bullets]
- Papéis executados: …
- Docs: atualizado / nenhuma alteração necessária

### PR
[url]

### Próximo passo (você)
1. **Validação manual** — revisar o PR / ambiente e apontar o que quiser
2. **Merge** — responda “sim” para eu mergear agora
3. **Manter PR aberto** — responda “não” (ou ignore o merge)

Deploy continua separado e só ocorre se você pedir explicitamente.
```

Handoff no Linear entre papéis: **Próximo agente recomendado** = próximo do pipeline (nunca “usuário no chat”), exceto Gate de Decisão (`bloqueado`) ou pós-`Done` (merge/deploy).

### Retomada inteligente

Se a Issue já estiver no meio do fluxo, **não** recomeçar do zero: ler Linear, detectar o que falta e continuar até `Done`.

---

## 15.3 Gate de merge e validação ao chegar em `Done`

Ao mover para `Done` pelo pipeline, o agente **não mergeia sozinho**. Entrega o resumo (§15.2) e aguarda.

1. Mover a Issue para `Done` (critérios do §16). Restaurar `Done` se a automação GitHub tiver regressado o status.
2. O PR **já deve estar aberto** desde `In Progress` (§15.6). Incluir a URL no resumo final.
3. Oferecer no chat: validação manual **ou** confirmação de merge (template §15.2).
4. Só mergear com “sim” (ou equivalente inequívoco).
5. “Não”, silêncio ou resposta ambígua: Issue em `Done`, PR permanece aberto para o usuário validar/mergear quando quiser.
6. Se não houver PR: informar o **desvio** (Engineers deveriam ter aberto em `In Progress`) e **não** perguntar merge. **Não** abrir o PR nesta etapa, salvo pedido explícito no chat — e então abrir, reler e restaurar `Done` (§15.6).
7. Registrar no Linear a resposta (sim / não / sem PR / validação manual).

Chegar em `Done` e recusar o merge é válido. Confirmar merge também é válido. Nenhum dos dois autoriza deploy.

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
- Push da feature branch após cada commit de código/`docs/`.
- Abrir o **primeiro** PR da Issue ao final da atuação dos Engineers em `In Progress` (§15.6).
- **Merge** e **deploy** exigem confirmação/pedido no chat. `Done` é automático ao fim do pipeline (§15.2).

---

## 15.5 Proporcionalidade documental (ajustes finos)

A etapa `Document` é **obrigatória** no pipeline: Technical Writer e Documentation Writer **avaliam**. **Escrever** em `docs/` ou no Mintlify **não** é automático.

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

## 15.6 PR da Issue (abrir em `In Progress`)

A integração GitHub do Linear, ao **abrir ou vincular** um PR à Issue, move o status para o *started* padrão do time — no Flock, `In Progress`. Push em um PR **já vinculado** em geral não dispara de novo. Abrir o **primeiro** PR em `Review`, `Document` ou `Done` **regressa** indevidamente para `In Progress`.

Abrir PR **não** é merge e **não** é deploy. Não autoriza mudar a etapa Linear.

### Quando abrir e quando só atualizar

- **Abrir** o PR (`gh pr create` com `--base` conforme §15.7) ao final da atuação dos Engineers em `In Progress`, depois de commit + push. **Um PR por Issue.**
- **Atualizar** = `git push` na mesma branch. Não criar segundo PR.
- “Voltar ajustes” (Engineers de novo em `In Progress`): commit + push no PR existente; abrir só se ainda não houver PR (desvio).
- Technical Writer, se commitar em `Document`: **push no PR já aberto**. Não abrir PR novo nesta etapa.
- **Não** abrir o primeiro PR da Issue em `Review`, `Document` ou `Done`.

### Depois de `git push` ou `gh pr create`

1. Relê a Issue no Linear (`get_issue`).
2. Se o status saiu do esperado da etapa, restaurar o **nome exato** e registrar no Linear:
   - execução → `In Progress`
   - review → `Review`
   - documentação → `Document`
   - já concluída → `Done`
3. Nunca passar `state: "started"` (nem outro tipo genérico).

### Em `Done`

O PR já está aberto e atualizado. O Gate §15.3 pergunta só o **merge** (na base correta: `main` ou `major-v1` — §15.7).

---

## 15.7 Release tracks / base do PR (MVP vs v1)

Milestone Linear define a **base** da feature branch e do PR. Padrão prescritivo: [[05_padroes/padroes-de-git]] GIT-025.

| Milestone / vínculo | Base da feature | Base do PR (`gh pr create --base`) | Done da issue |
| --- | --- | --- | --- |
| `MVP` (e demais ≠ `v1`) | `main` | `main` | merge em `main` |
| `v1` ou filha de DEV-108 | `major-v1` | `major-v1` (**nunca** `main`) | merge em `major-v1` (não é produção) |
| Épica DEV-108 | — | cutover `major-v1` → `main` | só com liberação explícita de release |

Ao **iniciar** uma Issue do milestone `v1` (ou filha de DEV-108): atualizar/rebasear `major-v1` com `main` antes de criar a feature branch, para não divergir durante o MVP.

Done em `major-v1` **não** autoriza deploy. Cutover para produção = Done da épica DEV-108 + PR `major-v1` → `main` liberado pelo fundador.

---

## 16. Critérios para Mudar Status no Linear

As transições abaixo são feitas pelo orquestrador **no pipeline contínuo** (§15.2), sem comando de avanço entre etapas. Únicas pausas no chat: Gate de Decisão (§15.1) e confirmação de merge após `Done` (§15.3).

### Para mover para `Todo`

Permitido quando:

- Product Analyst concluiu refinamento, **incluindo classificação de impacto visual** (§8.3).
- UX/UI Designer concluiu spec ou skip justificado, **se** o impacto for `menor` ou `maior` (omitido se `nenhum`).
- Software Architect concluiu análise técnica.
- Não há perguntas bloqueantes (se houve, foram resolvidas via Gate de Decisão §15.1 e registradas no Linear).
- Critérios de aceite estão claros.
- Escopo e fora de escopo estão definidos.
- Riscos principais estão registrados.

Em seguida o pipeline avança para `In Progress` na mesma sessão.

### Para mover para `In Progress`

Permitido quando:

- Issue está refinada (em `Todo`, ou equivalente) **ou** há loop de correções obrigatórias a partir de `Review` (§10.3).
- O pipeline contínuo está em andamento (comando inicial/retomada já ocorreu, ou retorno automático do Review).
- O agente executor entendeu escopo, critérios e abordagem.

### Para aprovar Code Review (ainda em `Review`)

Permitido quando:

- Não há problemas obrigatórios pendentes.
- Código segue padrões do projeto.
- Segurança e performance foram consideradas.
- Testes relevantes existem ou a ausência foi justificada.

Aprovar o code review sozinho **não** move a Issue; o QA completa a etapa. Sem obrigatórios após TL+QA → orquestrador move para `Document`.

### Para aprovar QA (ainda em `Review`)

Permitido quando:

- Critérios de aceite foram validados.
- Fluxos principais passaram.
- Edge cases relevantes foram testados.
- Regressões críticas foram consideradas.
- Bugs bloqueantes foram resolvidos.

Aprovar QA **sem obrigatórios** → orquestrador move para `Document`. Com obrigatórios → loop §10.3.

### Para mover para `Document`

Permitido quando:

- Code Review e QA da etapa `Review` foram concluídos sem correções obrigatórias pendentes (ou o usuário decidiu avançar via Gate de Decisão — registrar).
- Não há bugs bloqueantes abertos, salvo decisão explícita do usuário no chat (§15.1).

### Para permanecer em `Document` (enquanto Writers atuam)

Enquanto Technical Writer e/ou Documentation Writer estiverem atuando:

- Status permanece `Document`.
- Não mover para `In Progress` ao “iniciar” documentação, editar `docs/`, abrir PR Mintlify ou atualizar a Issue.
- Se detectar regressão indevida para `In Progress`, restaurar `Document` (§11.1).

### Para concluir Document e mover para `Done`

Permitido quando:

- Technical Writer avaliou documentação interna.
- Documentation Writer avaliou documentação de usabilidade, se aplicável.
- Alterações necessárias foram feitas **ou** a avaliação registrou que nenhuma atualização permanente era necessária (§15.5).
- Caso nada tenha sido alterado, a justificativa foi registrada no Linear.
- A Issue ainda está (ou foi restaurada) em `Document` antes da transição para `Done`.

Após mover para `Done`, emitir resumo + pergunta de merge/validação (§15.3) no chat.

---

## 17. Handoff entre Agentes

Cada agente deve finalizar sua atuação indicando claramente o próximo passo do **pipeline**.

Formato recomendado:

```markdown
## Handoff

**Status:** [concluído / requer ajustes / bloqueado]

**Próximo agente recomendado:** [próximo papel do pipeline]

**Motivo:** [por que este é o próximo passo]

**Pontos de atenção:**
- [item 1]
- [item 2]
```

Cadeia típica: UX/UI Designer após Product Analyst **se** §8.3; Software Architect após PA (e UX/UI quando atuou); Engineers após SA/`Todo`; Frontend após Backend (se houver UI); Tech Lead após Engineers; QA após Tech Lead; Engineers de novo se obrigatórios; Technical Writer após Review limpo; Documentation Writer após TW; orquestrador → `Done` após DW.

Quando o status for `bloqueado`, o próximo passo é **aguardar resposta do usuário no chat** (Gate de Decisão §15.1); após a resposta, retomar o pipeline.

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
[comando único: iniciar desenvolvimento / desenvolver / continuar Issue]

Backlog
→ Product Analyst (classifica impacto visual)
→ UX/UI Designer, **somente se** `menor` ou `maior` (§8.3)
→ Software Architect
→ Todo → In Progress (sem parar no chat)

In Progress
→ Backend Engineer / Frontend Engineer (só os aplicáveis)
→ commit + push por passo; abrir PR se ainda não houver (§15.6)
→ Review (mesma sessão)

Review
→ Tech Lead → QA Analyst
→ se obrigatórios: In Progress → Engineers → Review (≤2 ciclos)
→ se limpo: Document

Document
→ Technical Writer (docs/ se necessário) → Documentation Writer (Mintlify se necessário)
→ Done (mesma sessão)

Done
→ resumo no chat + URL do PR
→ usuário: validação manual OU confirmar merge (sim/não)
→ merge só com confirmação

Única pausa intermediária: Gate de Decisão (§15.1)

Deploy (manual, fora do status)
→ só com pedido explícito; Railway; marcação na Issue indica se já está publicado
```

---

## 19.1 Templates no repositório

Os arquivos em `docs/00_meta/templates/` são **estruturas de texto**, não destinos de arquivo por demanda:

| Template | Destino do conteúdo |
| --- | --- |
| `template-refinamento.md` | Issue Linear (Product Analyst) |
| `template-ux-ui.md` | Issue Linear (UX/UI Designer) |
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
- Próximo passo do pipeline (próximo agente)
```

### 20.5 Handoff vira parte obrigatória dos MDCs

Todo agente deve finalizar com:

```md
## Handoff
Status:
Próximo agente recomendado: [próximo do pipeline]
Pontos de atenção:
```

Não usar “usuário no chat” como próximo passo, exceto Gate de Decisão ou pós-`Done`.

### 20.6 Gate de Decisão nos MDCs

Todo MDC deve instruir o agente a:

```md
Se surgir decisão bloqueante:
1. Não concluir a etapa.
2. Registrar bloqueio + perguntas no Linear.
3. Perguntar no chat do Cursor e aguardar resposta do usuário.
4. Atualizar o Linear com a decisão.
5. Só então concluir, fazer handoff e retomar o pipeline até Done.
```

Detalhe: workflow §15.1.

### 20.7 Execução Contínua, commit e merge nos MDCs

Todo MDC deve instruir o agente a:

```md
- Ao concluir o papel: handoff ao próximo do pipeline — não parar pedindo comando de avanço.
- Orquestrador move status conforme §15.2 / §16.
- Commitar cada passo que alterar código ou docs/.
- Push após o commit. Engineers: abrir o PR em In Progress se ainda não houver (um por Issue). Writers: só push no PR existente.
- Depois de push/PR: reler o Linear; restaurar o status da etapa se a automação GitHub tiver regressado.
- Review com obrigatórios: loop automático (§10.3), sem pedir “voltar ajustes” no chat.
- Em Done: resumo + PR no chat; perguntar merge; só mergear com sim. Não abrir o primeiro PR em Done.
```

Detalhe: workflow §§15.2–15.4 e §15.6.

### 20.8 Proporcionalidade documental nos MDCs de Writers

Os MDCs de Technical Writer e Documentation Writer devem instruir:

```md
- Avaliar na etapa Document é obrigatório; escrever em docs/ ou Mintlify não é.
- Atualizar só se a docs existente ficar incorreta, o usuário precisar fazer algo diferente, ou houver padrão/ADR permanente.
- Não documentar ajuste visual fino, polimento de CSS nem rearranjo de elementos já descritos.
- No Linear e no chat: resultado + justificativa curta; não inventariar polimento.
```

Detalhe: workflow §15.5.

### 20.9 Gate de UX/UI e rigor nos MDCs

Os MDCs de Product Analyst, UX/UI Designer, Software Architect e Frontend Engineer devem instruir:

```md
- UX/UI Designer não é obrigatório em toda Issue. Entra só com impacto visual no frontend que o usuário vê (workflow §8.3).
- Product Analyst classifica nenhum | menor | maior. Orquestrador e UX/UI podem corrigir com justificativa.
- menor = spec objetiva; maior = spec completa. Skip justificado vai ao SA sem inventar layout.
- Software Architect só começa depois do UX/UI quando o impacto for menor ou maior.
- Frontend Engineer segue a spec de UX quando ela existir.
```

Detalhe: workflow §8.3.
