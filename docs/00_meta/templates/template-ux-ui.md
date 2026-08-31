---
type: template-linear
agente: UX/UI Designer
destino: Issue Linear via MCP
ultima_atualizacao: 2026-08-31
---

# Template — Especificação de UX/UI (Linear)

> **Não salve este conteúdo como arquivo no repositório.**  
> Publique na **própria Issue do Linear** via MCP, **depois** do Product Analyst e **antes** do Software Architect.  
> Workflow: `docs/00_meta/linear-cursor-workflow.md` §8.3  
> MDC: `.cursor/rules/ux-ui-designer.mdc`

Escolha **um** dos três blocos conforme a classificação aplicada.

---

## A) Skip (sem impacto visual)

```markdown
## UX/UI Designer — Skip

**Classificação recebida (PA):** nenhum | menor | maior | omitida
**Classificação aplicada:** nenhum
**Motivo:** _Nada do que o usuário vê muda. Ser específico._

## Handoff
**Status:** concluído
**Próximo agente recomendado:** Software Architect
**Motivo:** Sem spec de UI; análise técnica pode seguir.
```

---

## B) Modo `menor` (objetivo)

Use para partes de componentes e alterações visuais pequenas. Não inflar.

```markdown
## UX/UI Designer — Especificação de Experiência (menor)

**Classificação recebida (PA):**
**Classificação aplicada:** menor
**Motivo da correção:** _se houver_

### Resumo
_O que muda na UI, 3–8 linhas._

### O que muda
- Superfície / rota:
- Componente ou região:
- Estados afetados:
- Copy: inalterada / …

### Critérios de UX
- [ ] **UX-01:**
- [ ] **UX-02:**

### Fora de escopo visual
- 

## Handoff
**Status:** concluído | bloqueado
**Próximo agente recomendado:** Software Architect
**Motivo:** Apontamentos de UX objetivos para o plano técnico.
**Pontos de atenção:**
- 
```

---

## C) Modo `maior` (completo)

Use para telas, seções e componentes grandes.

```markdown
## UX/UI Designer — Especificação de Experiência (maior)

**Classificação recebida (PA):**
**Classificação aplicada:** maior
**Motivo da correção:** _se houver_

### Tipo de Trabalho
[Nova tela | Nova seção | Componente grande | IA / jornada | Form reestruturado]

### Resumo
_Problema de uso + direção da solução, 2–4 frases._

### Superfícies e Personas
- Superfície: Painel / landing / público / auth / Admin OPS
- Personas/roles:
- Jornada: J# —

Consulte: `docs/01_produto/personas-e-usuarios.md`, `docs/01_produto/jornadas-de-usuario.md`

### Diagnóstico
**Problema atual:**
**Causa de fricção:**
**Reutilizar (kit / padrão do módulo):**
- `frontend/src/components/ui/` …

### Arquitetura de Informação / Fluxo
1. 
2. 
3. 

### Spec por Tela

#### [Nome da tela / rota]
- **Mobile (~375 / < md):**
- **Desktop (md+):**
- **Componentes:** PageHeader / Button / Input / Modal / …
- **Estados:** loading / empty / error / success / permissão / limite
- **Copy (PT-BR / glossário):**

### Acessibilidade e Touch
- [ ] Contraste e foco visível
- [ ] Labels / teclado / Modal (Esc, foco)
- [ ] Alvos `min-h-11`
- [ ] Input ≥16px no mobile

### Critérios de UX
- [ ] **UX-01:** …
- [ ] **UX-02:** …

### Fora de Escopo Visual
- 

### Decisões / Recomendações
- 

### Riscos / Pontos de Atenção
| Risco | Impacto | Mitigação |
| --- | --- | --- |
| | | |

## Handoff
**Status:** concluído | requer esclarecimento | bloqueado
**Próximo agente recomendado:** Software Architect
**Motivo:** Spec completa para o plano técnico de frontend.
**Pontos de atenção:**
- 
```
