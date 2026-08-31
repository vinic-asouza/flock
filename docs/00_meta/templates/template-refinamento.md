---
type: template-linear
agente: Product Analyst
destino: Issue Linear via MCP
ultima_atualizacao: 2026-08-31
---

# Template — Refinamento de Produto (Linear)

> **Não salve este conteúdo como arquivo no repositório.**  
> Cole / publique na **própria Issue do Linear** via MCP.  
> Workflow: `docs/00_meta/linear-cursor-workflow.md` (§8.3 Gate de UX/UI)

Use como estrutura da seção:

```markdown
## Product Analyst — Refinamento de Produto

### Resumo
_Uma ou duas frases: o que será feito e por quê._

### Contexto de Negócio
**Motivação:**
**Problema que resolve:**
**Oportunidade:**

### Escopo
#### Inclui
- 

#### Não inclui
- 

### Critérios de Aceite
- [ ] **CA-01:** Given … / When … / Then …
- [ ] **CA-02:** Given … / When … / Then …

### Regras de Negócio Afetadas
| Regra | Módulo | Tipo | Observação |
| --- | --- | --- | --- |
| | | Novo / Alterado / Removido | |

Consulte: `docs/02_regras-de-negocio/`

### Impacto nos Usuários
| Persona | Como é afetada | Benefício |
| --- | --- | --- |
| | | |

Consulte: `docs/01_produto/personas-e-usuarios.md`

### Impacto visual (UX/UI)
**Classificação:** nenhum | menor | maior
**Justificativa:** _O que o usuário vê mudar, ou por que nada visível muda._
**Próximo:** UX/UI Designer | Software Architect

Heurística: workflow §8.3. `nenhum` = API/job/infra/docs/refactor/bugfix que só restaura. `menor` = parte de componente, campo/botão/copy em tela existente. `maior` = tela, seção ou componente grande, IA, jornada.

### Dependências de Produto
- Issues Linear relacionadas:
- 

### Riscos de Produto
| Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- |
| | Alta / Média / Baixa | | |

### Perguntas em Aberto
- [ ] 
_(Bloqueantes devem estar resolvidas antes de Todo.)_

### Próximo Passo
UX/UI Designer (se menor/maior) · Software Architect (se nenhum)

## Handoff
**Status:** concluído | requer ajustes | bloqueado
**Próximo agente recomendado:** UX/UI Designer | Software Architect
**Motivo:**
**Pontos de atenção:**
- 
```
