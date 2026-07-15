---
type: regras-modulo
modulo: tutoriais
ultima_atualizacao: 2026-07-13
versao: "1.0"
total_regras: 4
tags: [regras, modulo:tutoriais]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/tutoriais/overview]]"
---

# Regras de Negócio — Tutoriais

## Responsabilidade do Módulo
Orientar o usuário in-app com guias por módulo e papel sugerido.

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-TUT-001 | Audiência tipada | Fato | Ativo |
| BR-TUT-002 | Hub não filtra por role | Fato | Ativo |
| BR-TUT-003 | Aviso leitor em guia editor | Gatilho | Ativo |
| BR-TUT-004 | Sem API backend | Fato | Ativo |

---

## Regras por Categoria

### 🔐 Regras de Acesso Específicas do Módulo

### BR-TUT-001: Audiência tipada
- **Declaração:** Guias declaram role reader|editor como metadado de audiência.
- **Tipo:** Fato
- **Gatilho:** Definição de guide
- **Comportamento esperado:** Metadado
- **Comportamento em violação:** —
- **Implementado em:** `frontend/src/lib/tutorials/types.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-TUT-002: Hub não filtra por role
- **Declaração:** Todos os usuários autenticados veem todos os guias.
- **Tipo:** Fato
- **Gatilho:** /tutorials
- **Comportamento esperado:** Lista completa
- **Comportamento em violação:** —
- **Implementado em:** `TutorialsPageContent.tsx`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-TUT-003: Aviso leitor em guia editor
- **Declaração:** Se guia.role=editor e canEdit=false, exibir aviso de somente leitura (sem bloquear).
- **Tipo:** Gatilho
- **Gatilho:** Abrir guia
- **Comportamento esperado:** Alerta UX
- **Comportamento em violação:** —
- **Implementado em:** `TutorialGuideView.tsx`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-TUT-004: Sem API backend
- **Declaração:** Tutoriais são conteúdo estático no frontend (sem regras de persistência).
- **Tipo:** Fato
- **Gatilho:** N/A
- **Comportamento esperado:** —
- **Comportamento em violação:** —
- **Implementado em:** `frontend/src/lib/tutorials/**`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Sem tracking de progresso/conclusão no backend.

---

*Gerado em 2026-07-13.*
