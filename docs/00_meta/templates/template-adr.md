---
type: adr
id: ADR-NNN # sequencial, ex: ADR-001
titulo:
status: Proposto # Proposto | Aceito | Rejeitado | Depreciado | Substituído por ADR-NNN
data:
autor:
decisores: [] # ex.: [Nome1, Nome2]
tags: [] # ex.: [backend, banco-de-dados, segurança, frontend, infra, performance]
supersede: # ADR-NNN — preencha se esta ADR substitui outra
supersedido_por: # preenchido apenas se esta ADR for futuramente substituída
---

# ADR-NNN — {{titulo}}

> ⚠️ **IMPORTANTE:** ADRs **nunca** devem ser deletadas. Se uma decisão mudar, atualize o status para **Depreciado** ou **Substituído por ADR-NNN** e crie uma **nova** ADR. O histórico de decisões é parte do conhecimento do time.

> 📄 **Tamanho:** ao preencher, mantenha este documento em no máximo ~2 páginas. Foque no essencial — contexto, decisão e consequências.

---

## 📌 Contexto e Problema

<!-- Seja específico. Evite linguagem vaga. -->

**Problema técnico:**



**Por que decidir agora?** _(pressão, risco, deadline, incidente, bloqueio)_



---

## ⚖️ Forças em Jogo

<!-- Estas são as 'regras do jogo' que a decisão deve respeitar -->

Restrições que a decisão precisa respeitar (técnicas, negócio, prazo, equipe, custo, segurança, conformidade):

-
-
-

---

## ✅ Decisão

<!-- Comece com 'Decidimos usar / adotar / migrar / remover...' -->

**Decidimos** …



---

## 🔍 Opções Consideradas

Avalie **no mínimo 2 opções**, incluindo a escolhida.

### Opção 1: [Nome]

**Descrição:**

**✅ Prós:**

-
-

**❌ Contras:**

-
-

### Opção 2: [Nome] _(escolhida / descartada)_

**Descrição:**

**✅ Prós:**

-
-

**❌ Contras:**

-
-

### Opção 3: [Nome] _(opcional)_

**Descrição:**

**✅ Prós:**

-
-

**❌ Contras:**

-
-

---

## 💡 Justificativa

<!-- Conecte a decisão às Forças em Jogo da seção 2 -->

Por que esta opção venceu as demais:



---

## 🔄 Consequências

### ✅ Positivas

-
-

### ❌ Negativas _(trade-offs e dívida técnica assumida)_

-
-

### 📋 Ações de Follow-up

-
-

---

## 📏 Conformidade

<!-- Se não der para verificar, a decisão provavelmente é vaga -->

Como verificar se a decisão está sendo seguida:

| Mecanismo | Descrição |
| --- | --- |
| _(ex.: lint / checklist de PR / teste / doc)_ | |

---

## 🗒️ Notas _(opcional)_

Links externos, experimentos, PRs, issues ou contexto adicional:

-
-

---

> 📚 Índice: [[07_decisoes-tecnicas/index]]  
> Destino ao publicar: `docs/07_decisoes-tecnicas/ADR-NNN-titulo-curto.md`  
> ADRs são conhecimento permanente — o histórico operacional da decisão na demanda fica no Linear.
