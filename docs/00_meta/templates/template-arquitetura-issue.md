---
type: template-linear
agente: Software Architect
destino: Issue Linear via MCP
ultima_atualizacao: 2026-07-14
---

# Template — Análise Técnica / Arquitetura da Issue (Linear)

> **Não salve este conteúdo como arquivo no repositório.**  
> Publique na **Issue do Linear** após o refinamento do Product Analyst.  
> Stack de referência: Express REST + Supabase + Next.js (ver `docs/03_arquitetura/`).

```markdown
## Software Architect — Análise Técnica

### Resumo
_2–3 frases: abordagem escolhida e por que é adequada._

### Análise de Impacto
| Componente / Módulo | Tipo de Mudança | Nível de Risco |
| --- | --- | --- |
| | Novo / Alterado / Removido | Baixo / Médio / Alto |

### Abordagem Técnica
**Fluxo de dados (alto nível):**
1. 

**Camadas tocadas:** routes / controllers / services / validators / jobs / frontend / landing

### Banco de Dados (se aplicável)
- Tabelas / colunas / índices / RLS:
- Atualizar `backend/bd-structure.sql`? Sim / Não

### API (se aplicável)
| Method | Path | Auth / Roles | Observação |
| --- | --- | --- | --- |
| | | | |

### Frontend / UX (se aplicável)
- Rotas / telas / estados:

### Integrações (se aplicável)
- Stripe / Resend / Supabase / Sentry / outras:

### Complexidade e Estimativa
- Complexidade: P1–P5
- Estimativa (dias):
- Stack impactado: [backend, frontend, supabase, …]

### Riscos Técnicos
| Risco | Mitigação |
| --- | --- |
| | |

### Plano Técnico de Alto Nível
1. 
2. 
3. 

### Critérios para To-Do
- [ ] Abordagem clara
- [ ] Escopo técnico alinhado ao de produto
- [ ] Sem perguntas bloqueantes
- [ ] Dependências registradas

### Próximo Passo
Mover para To-Do (se autorizado) · Backend/Frontend Engineer

## Handoff
**Status:** concluído | requer ajustes | bloqueado
**Próximo agente recomendado:** Backend Engineer / Frontend Engineer
**Motivo:**
**Pontos de atenção:**
- 
```

---

## Notas de stack (referência rápida)

- Backend: `routes` → `controllers` → `services` (+ validators, middlewares, jobs)
- Multi-tenant: header `X-Church-Id`; roles `owner | admin | editor | reader`
- Dados: `@supabase/supabase-js` (`db` / `supabaseAdmin`); sem Prisma
- Jobs: `node-cron` em `backend/src/jobs/`
