---
type: meta-workflow
titulo: Linear + Cursor Development Workflow
ultima_atualizacao: 2026-07-14
versao: "1.1"
tags: [meta, linear, cursor, workflow, agentes]
---

# Linear + Cursor Development Workflow

## 1. Propósito

Este documento define como os agentes de IA do Cursor devem atuar dentro do fluxo de desenvolvimento integrado com Linear.

O objetivo do workflow é garantir que:

- O Linear seja a fonte de verdade para o ciclo de vida das demandas.
- O Cursor execute as etapas usando agentes especializados.
- O histórico da demanda permaneça centralizado na própria Issue do Linear.
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

O workflow considera os seguintes estados principais no Linear:

```
Backlog
└── Idea
└── Refinement

To-Do
└── Todo

In Progress
└── In Progress

In Review
└── Code Review
└── QA

Done
└── Done
└── Document

Released
└── Released
```

Os nomes exatos dos estados podem variar conforme a configuração do workspace, mas os agentes devem respeitar a intenção de cada etapa.

---

## 5. Responsabilidade dos Agentes por Etapa

| Etapa Linear | Agente Cursor | Responsabilidade |
| --- | --- | --- |
| Backlog / Refinement | Product Analyst | Refinar valor de produto, escopo, critérios de aceite, regras de negócio e impactos |
| Backlog / Refinement | Software Architect | Refinar análise técnica, riscos, arquitetura, dependências e abordagem |
| To-Do | — | Issue pronta para desenvolvimento |
| In Progress | Backend Engineer | Implementar APIs, regras de negócio, integrações e lógica backend |
| In Progress | Frontend Engineer | Implementar interface, UX/UI e integrações com APIs |
| In Review / Code Review | Tech Lead | Revisar código, arquitetura, padrões, segurança e performance |
| In Review / QA | QA Analyst | Validar requisitos, fluxos, edge cases e regressões |
| Done | — | Issue aprovada |
| Document | Technical Writer | Atualizar documentação técnica interna quando necessário |
| Document | Documentation Writer | Atualizar documentação de usabilidade no Mintlify quando necessário |
| Released | — | Item em produção após deploy manual |

---

## 6. Uso Obrigatório do MCP Linear

Sempre que um agente estiver atuando sobre uma Issue, ele deve usar o MCP do Linear para:

1. Ler a Issue atual.
2. Ler título, descrição, comentários, labels, status e links relacionados.
3. Atualizar a Issue com sua análise ou resultado.
4. Adicionar comentários estruturados quando apropriado.
5. Sugerir ou executar mudança de status quando a etapa estiver concluída.
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
[Indicação clara do próximo agente ou etapa]
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

Quando o usuário decidir executar a demanda, ele solicitará ao Cursor:

> Refinar esta Issue usando Product Analyst e Software Architect.

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

Após Product Analyst e Software Architect concluírem suas análises:

- A Issue deve conter refinamento suficiente para desenvolvimento.
- O agente deve mover a Issue para `To-Do`, se autorizado pelo usuário e se não houver perguntas bloqueantes.
- Caso existam perguntas bloqueantes, a Issue deve permanecer em `Refinement` ou equivalente.

---

## 9. Fluxo de Execução

### 9.1 Entrada

Quando o usuário mover a Issue para `In Progress`, ele poderá solicitar ao Cursor:

- Atuar como Backend Engineer
- Atuar como Frontend Engineer
- Ou ambos, dependendo da demanda

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
5. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Arquivos principais alterados
   - Testes adicionados ou atualizados
   - Pontos pendentes ou decisões tomadas

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
5. Atualizar a Issue no Linear com:
   - O que foi implementado
   - Telas/componentes alterados
   - Integrações feitas
   - Estados tratados
   - Pontos pendentes ou decisões tomadas

---

## 10. Fluxo de Review

### 10.1 Code Review — Tech Lead

Quando a Issue estiver em `In Review`, o usuário solicitará atuação como Tech Lead.

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

Se houver correções obrigatórias, a Issue deve voltar para execução pelos Engineers.

### 10.2 QA — QA Analyst

Após code review aprovado, o usuário solicitará atuação como QA Analyst.

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

Se houver falhas, a Issue deve voltar para execução pelos Engineers.

---

## 11. Fluxo de Done e Documentação

### 11.1 Done

Após aprovação de Code Review e QA, a Issue pode ser movida para `Done`.

Neste estado, a tarefa está aprovada funcionalmente e tecnicamente.

### 11.2 Document

Quando possível, o usuário moverá a Issue para `Document`.

Nesta etapa podem atuar dois agentes:

1. Technical Writer
2. Documentation Writer

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
4. Atualizar os arquivos `.md` relevantes no repositório quando necessário.
5. Atualizar a Issue no Linear com:
   - Documentações revisadas
   - Documentações alteradas
   - Justificativa caso nenhuma alteração seja necessária

O Technical Writer não deve criar documentação temporária por issue.

---

## 13. Documentation Writer

O Documentation Writer é responsável pela documentação de usabilidade hospedada no Mintlify.

Ele deve:

1. Ler a Issue no Linear.
2. Avaliar se houve mudança que afeta o usuário final:
   - Novo fluxo
   - Nova tela
   - Mudança de comportamento
   - Nova configuração
   - Alteração em limites ou planos
   - Mudança de mensagens ou navegação
3. Consultar a documentação atual no Mintlify via MCP, quando disponível.
4. Atualizar a documentação de usabilidade no Mintlify, se necessário.
5. Atualizar a Issue no Linear com:
   - Páginas revisadas
   - Páginas alteradas
   - Links da documentação atualizada
   - Justificativa caso nenhuma atualização seja necessária

---

## 14. Deploy

O deploy é um processo manual.

Após documentação concluída:

1. A Issue pode seguir para `Released`.
2. O deploy é feito manualmente conforme processo definido pelo projeto.
3. Os agentes não devem executar deploy automaticamente sem instrução explícita do usuário.

---

## 15. Regras Gerais para Todos os Agentes

### Sempre fazer

- Usar Linear MCP para ler a Issue quando houver Issue associada.
- Registrar análises e decisões na própria Issue do Linear.
- Consultar a base de conhecimento antes de decidir.
- Respeitar o papel do agente invocado.
- Manter o histórico centralizado no Linear.
- Ser explícito sobre riscos, dúvidas e bloqueios.
- Diferenciar correção obrigatória de sugestão opcional.

### Nunca fazer

- Criar arquivos temporários por Issue no repositório.
- Duplicar histórico do Linear em arquivos `.md`.
- Mover uma Issue de etapa sem estar autorizado ou sem cumprir os critérios.
- Ignorar refinamentos já feitos por agentes anteriores.
- Implementar fora do escopo refinado sem sinalizar.
- Atualizar documentação permanente sem necessidade real.
- Fazer deploy automaticamente.

---

## 16. Critérios para Mudar Status no Linear

### Para mover para `To-Do`

Permitido quando:

- Product Analyst concluiu refinamento.
- Software Architect concluiu análise técnica.
- Não há perguntas bloqueantes.
- Critérios de aceite estão claros.
- Escopo e fora de escopo estão definidos.
- Riscos principais estão registrados.

### Para seguir em `In Progress`

Permitido quando:

- Issue está refinada.
- O usuário moveu ou autorizou mover para execução.
- O agente executor entendeu escopo, critérios e abordagem.

### Para aprovar Code Review

Permitido quando:

- Não há problemas obrigatórios pendentes.
- Código segue padrões do projeto.
- Segurança e performance foram consideradas.
- Testes relevantes existem ou a ausência foi justificada.

### Para aprovar QA

Permitido quando:

- Critérios de aceite foram validados.
- Fluxos principais passaram.
- Edge cases relevantes foram testados.
- Regressões críticas foram consideradas.
- Bugs bloqueantes foram resolvidos.

### Para concluir Document

Permitido quando:

- Technical Writer avaliou documentação interna.
- Documentation Writer avaliou documentação de usabilidade, se aplicável.
- Alterações necessárias foram feitas.
- Caso nada tenha sido alterado, a justificativa foi registrada no Linear.

---

## 17. Handoff entre Agentes

Cada agente deve finalizar sua atuação indicando claramente o próximo passo.

Formato recomendado:

```markdown
## Handoff

**Status:** [concluído / requer ajustes / bloqueado]

**Próximo agente recomendado:** [Software Architect / Backend Engineer / Frontend Engineer / Tech Lead / QA Analyst / Technical Writer / Documentation Writer]

**Motivo:** [por que este é o próximo passo]

**Pontos de atenção:**
- [item 1]
- [item 2]
```

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
Backlog / Refinement
→ Product Analyst atualiza Issue no Linear
→ Software Architect atualiza Issue no Linear
→ Issue vai para To-Do

To-Do
→ Issue pronta para execução

In Progress
→ Backend Engineer / Frontend Engineer implementam
→ Agentes atualizam Issue no Linear com resumo da execução

In Review
→ Tech Lead faz code review
→ QA Analyst faz validação
→ Correções voltam para Engineers se necessário

Done
→ Issue aprovada

Document
→ Technical Writer atualiza docs internas se necessário
→ Documentation Writer atualiza Mintlify se necessário

Released
→ Deploy manual concluído
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

Documentações permanentes só entram no repositório quando:

- Atualizam base de conhecimento
- Atualizam módulos
- Atualizam regras permanentes
- Atualizam arquitetura
- Atualizam padrões
- Atualizam integrações

### 20.4 Cada agente deve ter um bloco de “Atualização no Linear”

Exemplo:

```md
Ao concluir sua atuação, atualize a Issue no Linear com:
- Resumo do que foi analisado ou implementado
- Decisões tomadas
- Riscos ou problemas encontrados
- Próximo passo recomendado
- Status sugerido
```

### 20.5 Handoff vira parte obrigatória dos MDCs

Todo agente deve finalizar com:

```md
## Handoff
Status:
Próximo agente recomendado:
Pontos de atenção:
```
