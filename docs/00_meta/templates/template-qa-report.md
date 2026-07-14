<!--
================================================================================
ANÁLISE DO PROJETO — stack de testes (jul/2026)
================================================================================
Tipo de aplicação:
- SaaS Web multi-tenant (igrejas): frontend Next.js 15 + API REST Express
- Landing Next.js (institucional)
- Roles: owner | admin | editor | reader; header X-Church-Id

Ferramentas identificadas:
- Backend: Jest + ts-jest + Supertest declarados em `backend/package.json`
  (`npm test` → jest). Não há `jest.config.*` nem arquivos `*.test.ts` /
  `*.spec.ts` commitados no momento.
- API manual: coleção Insomnia em `backend/tests/insomnia_collection.json`
- Dados de teste: gerador em `backend/tests/scriptMembers.js`
- Frontend / landing: sem Jest, Vitest, Playwright ou Cypress; qualidade via
  lint (`next lint`) e validação manual na UI
- E2E automatizado: não identificado no repositório
- Cobertura atual: predominantemente testes manuais (UI + Insomnia);
  unit/integration via Jest/Supertest são o padrão esperado a evoluir

Adaptações neste template:
- Checklist cobre API REST + frontend web (responsividade, acessibilidade,
  HTTP status, roles, multi-tenant)
- Seção de automação orientada a Jest/Supertest e, se aplicável, Insomnia
- Edge cases incluem permissões por role e isolamento por igreja
================================================================================
-->

---
type: qa-report
issue_id:
titulo:
status: Em Progresso # Em Progresso | Aprovado | Aprovado com Ressalvas | Reprovado
data_inicio:
data_conclusao:
analista_qa:
ambiente: # development | staging
versao_testada:
branch_testada:
---

# Relatório de QA — {{titulo}}

> Validação funcional da issue **antes** da aprovação. Baseie os casos de teste nos critérios de aceite do Refinement.

---

## 🎯 Escopo do Teste

**Critérios de aceite de referência:** [[issue-refinamento#criterios-de-aceite]]

### Incluído no escopo

-
-

### Fora do escopo

-
-

---

## 🖥️ Ambiente e Configuração

<!-- Inclua qualquer configuração especial necessária para reproduzir -->

| Item | Valor |
| --- | --- |
| Ambiente | development / staging |
| Versão / build testada | |
| Branch | |
| Backend URL | _(ex.: http://localhost:4000)_ |
| Frontend URL | _(ex.: http://localhost:3001)_ |
| Conta(s) / roles usadas | owner / admin / editor / reader |
| Igreja / tenant (`X-Church-Id`) | |
| Dados de teste | _(seed, scriptMembers, fixtures manuais)_ |
| Configuração especial | _(feature flags, Stripe test mode, cron off, etc.)_ |

---

## 📋 Casos de Teste

<!-- IDs no formato TC-001, TC-002... -->

| ID | Cenário | Pré-condição | Passos | Resultado Esperado | Resultado Obtido | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | | | 1. … | | | ✅ Passou / ❌ Falhou / ⚠️ Parcial / ⏭️ Pulado |
| TC-002 | | | | | | |
| TC-003 | | | | | | |

**Legenda de status:** ✅ Passou · ❌ Falhou · ⚠️ Parcial · ⏭️ Pulado

---

## 🔬 Edge Cases Testados

<!-- Inclua: valores nulos, limites de caracteres, usuários sem permissão, dados inválidos, concorrência -->

| Edge case | Resultado | Observação |
| --- | --- | --- |
| Campos nulos / vazios | | |
| Limites de caracteres / valores extremos | | |
| Usuário sem permissão (role inadequada) | | |
| Acesso cross-tenant (outra `church_id`) | | |
| Payload / dados inválidos (API e formulários) | | |
| Concorrência / ações duplicadas _(opcional)_ | | |
| Outro: | | |

---

## 🔄 Testes de Regressão

Funcionalidades adjacentes verificadas para garantir que não foram quebradas:

| Área Testada | Resultado | Observação |
| --- | --- | --- |
| Auth / sessão | ✅ / ❌ / ⏭️ | |
| Membros / listagens | | |
| Billing / Stripe _(se tocado)_ | | |
| Outra área adjacente | | |

---

## 🐛 Bugs Encontrados

| ID | Descrição | Severidade | Steps para Reproduzir | Status |
| --- | --- | --- | --- | --- |
| BUG-001 | | 🔴 / 🟠 / 🟡 / 🟢 | 1. … | Aberto / Corrigido |

**Severidade:**

| Nível | Significado |
| --- | --- |
| 🔴 Crítico | Bloqueia funcionalidade principal |
| 🟠 Alto | Funcionalidade importante com workaround difícil |
| 🟡 Médio | Funcionalidade secundária ou com workaround |
| 🟢 Baixo | Cosmético ou melhoria menor |

_Se nenhum bug: "Nenhum bug encontrado nesta rodada."_

---

## ☑️ Checklist de Qualidade

Adaptado para o Flock: **API REST (Express)** + **Web (Next.js)** multi-tenant.

### Geral / produto

- [ ] Funcionalidade atende aos critérios de aceite
- [ ] Fluxos alternativos funcionam corretamente
- [ ] Mensagens de erro são claras e úteis
- [ ] Performance aceitável (tempo de resposta crítico &lt; 2000 ms; ideal &lt; 500 ms em leitura simples)
- [ ] Segurança: acesso não autorizado bloqueado
- [ ] Permissões por role (`owner` \| `admin` \| `editor` \| `reader`) funcionando corretamente
- [ ] Isolamento multi-tenant (`church_id` / `X-Church-Id`) respeitado

### Frontend (Web)

- [ ] Responsividade (desktop e mobile)
- [ ] Acessibilidade básica (WCAG AA: contraste, foco, labels)
- [ ] Feedback visual (loading, sucesso, erro) coerente
- [ ] Formulários: validação client-side alinhada ao backend

### API REST

- [ ] Códigos HTTP corretos (2xx / 4xx / 5xx)
- [ ] Formato de resposta consistente com o padrão da API
- [ ] Validação de input rejeita payloads inválidos
- [ ] Rotas autenticadas exigem JWT/cookie válido
- [ ] Rate limit / limites públicos considerados _(quando aplicável)_

### Automação _(quando existir cobertura)_

- [ ] `npm test` no backend passou (Jest)
- [ ] Cenários críticos cobertos ou atualizados com Supertest _(se aplicável)_
- [ ] Lint sem erros novos nos pacotes tocados (`tsc` / `next lint`)

---

## 🧪 Cobertura de Testes Automatizados

<!-- Liste os arquivos de teste criados/modificados -->

_Padrão esperado no Flock: **Jest + ts-jest + Supertest** no backend (`backend/`, `npm test`). Frontend ainda sem runner e2e/unit automatizado; validação UI é manual. Coleção Insomnia em `backend/tests/` pode complementar testes de API manuais._

| Tipo | Ferramenta | Arquivos criados/modificados | Resultado |
| --- | --- | --- | --- |
| Unitário | Jest | | Passou / Falhou / N/A |
| Integração (API) | Jest + Supertest | | Passou / Falhou / N/A |
| Manual API | Insomnia | | Executado / N/A |
| E2E | _(não padronizado no repo)_ | | N/A |

**Comandos executados:**

```bash
# Ex.:
# cd backend && npm test
# cd frontend && npm run lint
```

**Observações sobre gaps de automação:**



---

## 📊 Conclusão e Recomendação

**Status final:** Em Progresso / Aprovado / Aprovado com Ressalvas / Reprovado

**Justificativa:**



### Se Aprovado com Ressalvas

Itens aceitáveis para follow-up (não bloqueantes):

- [ ]
- [ ]

### Se Reprovado

Blockers obrigatórios a corrigir antes de nova rodada de QA:

- [ ]
- [ ]

---

## 🖼️ Evidências

Links para screenshots, vídeos, logs, exports Insomnia ou dados relevantes:

-
-
-

---

## Histórico de Revisões

| Data | Autor | Descrição da Alteração |
| --- | --- | --- |
| | | Versão inicial (Em Progresso) |
