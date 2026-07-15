---
type: padroes-api
ultima_atualizacao: 2026-07-14
versao: "1.0"
tipo_api: REST
tags: [padrões, API, endpoints]
---

# Padrões de API — Flock

> Regras **prescritivas** para novos endpoints.  
> O que já existe: [[03_arquitetura/api-design]] · Segurança: [[03_arquitetura/seguranca]] · Módulos: [[04_modulos/index]].

---

## Referência rápida (criação)

| Operação | Método | Rota | Response |
| --- | --- | --- | --- |
| Listar | GET | `/api/{recursos}` | 200 + paginado **ou** array (legado) |
| Criar | POST | `/api/{recursos}` | **201** + objeto |
| Buscar | GET | `/api/{recursos}/:id` | 200 + objeto |
| Atualizar | PUT ou PATCH | `/api/{recursos}/:id` | 200 + objeto |
| Status parcial | PATCH | `/api/{recursos}/:id/status` | 200 |
| Deletar | DELETE | `/api/{recursos}/:id` | **204** sem body (preferir) |
| Sub-recurso | POST/DELETE | `/api/{recursos}/:id/{filhos}` | 201 / 204 |
| Ação domínio | POST | `/api/{recursos}/:id/{acao}` | 200 |
| Público | * | `/api/public/...` | documentar razão |

---

## 1. 🔗 Design de Rotas

### API-001: Recursos no plural, inglês, kebab-case em paths compostos
> Consistência com `members`, `church-users`, `registration-links`.
- **Nível:** 🔴
- ✅ `/api/groups`, `/api/church-users`
- ❌ `/api/grupo`, `/api/ChurchUser`

### API-002: Nested só para posse clara; ações com verbo no final
> Groups members / calendar participants / convert.
- **Nível:** 🔴
- ✅ `POST /api/groups/:id/members` · `POST /api/integration/:id/convert`
- ❌ `POST /api/members/add-to-group` quando nested é óbvio

### API-003: Path = identidade; query = filtro/paginação/busca
- **Nível:** 🔴
- ✅ `GET /members?page=1&limit=20&congregation_id=<uuid>`
- ❌ `GET /members?congregation_id=sede` (sentinel removido)
- ❌ `GET /members/filter/active` para filtros dinâmicos

### API-004: Sem versionamento de path por enquanto
> Não inventar `/v1` sem plano de breaking change.
- **Nível:** 🟡
- ✅ `/api/...` atual
- ❌ `/api/v2/...` pontual sem estratégia

---

## 2. ✅ Validação de Input

### API-005: Body mutável exige schema Joi no backend
> Front: Zod no formulário **não substitui** Joi na API.
- **Nível:** 🔴
- ✅ `createGroupSchema.validate(req.body)` no início do handler
- ❌ Confiar só no frontend

### API-006: Mensagens Joi em português
> Padrão dos validators (`congregationValidator`, `groupValidator`).
- **Nível:** 🔴
- ✅ `.messages({ 'any.required': 'O nome do grupo é obrigatório' })`
- ❌ Mensagens default inglês para usuário final

### API-007: Validar query/params críticos
> Ex.: `listCalendarItemsSchema`, month 1–12 em birthdays, UUIDs.
- **Nível:** 🔴
- ✅ Schema Joi para list query ou parse + range check
- ❌ `parseInt` sem validar NaN/limites

### API-008: Normalizar antes de persistir
> trim, UF uppercase, telefone só dígitos, email lower — padrão congregações/waitlist/auth.
- **Nível:** 🔴
- ✅ `state.trim().toUpperCase()` · `email.trim().toLowerCase()`
- ❌ Salvar telefone formatado divergente

### API-009: Campos extras — strip no report; unknown no calendar é exceção
> `reportFiltersSchema` usa `stripUnknown`. Novos schemas: **decidir explicitamente** `allowUnknown`/`stripUnknown`.
- **Nível:** 🟡 Preferir stripUnknown em filtros
- ✅ `validate(query, { stripUnknown: true })`
- ❌ Aceitar payload billing (`church_id` no checkout authed já é rejeitado) sem checar

---

## 3. 📤 Formato de Resposta

### API-010: Sucesso — objeto direto ou `{ data, pagination }`
> Não criar terceiro envelope novo.
- **Nível:** 🔴
- ✅ Create: `res.status(201).json(entity)` · List paginada: `{ data, pagination }`
- ❌ `{ success: true, result: { data: ... } }` inventado

### API-011: Create = 201; Delete preferir 204
> Congregações/grupos/calendário usam 204.
- **Nível:** 🔴 em endpoints novos
- ✅ `return res.status(204).send()`
- ❌ 200 com `{ deleted: true }` em delete novo

### API-012: Datas ISO / timestamptz do Postgres
- **Nível:** 🔴
- ✅ Serialização natural JSON Date ISO
- ❌ Timestamps custom “dd/mm/yyyy” no JSON de API (UI formata)

### API-013: IDs como string UUID
- **Nível:** 🔴
- ✅ `"id": "uuid-..."`
- ❌ IDs numéricos autoincrement

### API-014: Nunca vazar secrets / sanitize por role
> `sanitizeChurchForRole` remove Stripe fields para editor/reader.
- **Nível:** 🔴
- ✅ Omitir `stripe_*`, senhas, service keys
- ❌ Retornar `stripe_customer_id` para reader

### API-015: Listas grandes DEVEM paginar; exceções documentadas
> Members/integration/calendar expandido paginam. Congregations/groups ainda retornam full set — **não copiar** esse padrão para novos recursos volumosos.
- **Nível:** 🔴 para entidades com crescimento esperado
- ✅ `page` default 1, `limit` default ≤50, max declarado (ex. 100 ou 2000 calendário)
- ❌ `SELECT` sem limite em tabela que pode ter milhares de linhas

---

## 4. ❌ Tratamento de Erros

### API-016: Envelope `{ error, details?, code? }`
- **Nível:** 🔴
- ✅ `{ error: 'Congregação não encontrada', details: '...' }`
- ❌ Só string no body · HTML

### API-017: Mapa HTTP
| Situação | Status |
| --- | --- |
| Validação | 400 |
| Auth | 401 |
| Role / membership | 403 |
| Não encontrado no tenant | 404 |
| Conflito (assinatura ativa, etc.) | 409 |
| Rate limit | 429 |
| Erro interno / integração | 500 |
| Dependency down | 503 |

### API-018: `error` curto PT; `details` explicativo
- **Nível:** 🔴
- ✅ Separar título e detalhe
- ❌ Stack trace em produção no `details`

### API-019: Validação — details string ou array de mensagens Joi
> Ambos existem; em endpoints novos preferir **array** se múltiplos erros, string se single.
- **Nível:** 🟡

### API-020: Regra de negócio = 400 (não 422) no padrão atual
> Projeto usa 400 para violações BR; não introduzir 422 sem migrar front.
- **Nível:** 🔴 manter consistência
- ✅ 400 `Grupo já existe` / `Limite de membros`
- ❌ 422 isolado

---

## 5. 📄 Paginação

### API-021–025: Padrão page/limit offset
> Referência: members list / calendar list.
- **Nível:** 🔴 em listas novas de volume
- ✅ Query: `page`, `limit`; Response:

```typescript
pagination: {
  page, limit, total, totalPages,
  hasNextPage?, hasPrevPage?, nextPage?, prevPage? // preferir incluir
}
```

- ✅ Ordenação explícita (`sort_by` allowlist) quando aplicável
- ❌ Cursor pagination sem decisão; `limit` ilimitado

---

## 6. 🔐 Autenticação e Autorização

### API-026: Autenticado por default
> `router.use(authMiddleware)` + `requireRole('reader')` no topo.
- **Nível:** 🔴
- ✅ Montar middleware no router do recurso
- ❌ Endpoint de escrita “esquecido” público

### API-027: Declaração de role por rota
> Mutações tipicamente `requireRole('editor')` ou `admin`.
- **Nível:** 🔴
- ✅ `router.post('/', requireRole('editor'), createX)`
- ❌ Checar role só no frontend

### API-028: Sempre filtrar `church_id` do contexto
> Isolamento aplicacional (service_role bypassa RLS).
- **Nível:** 🔴
- ✅ `.eq('church_id', req.church!.churchId)` em toda query
- ❌ Confiar só no `id` do path

### API-029: Públicos explícitos + rate limit
> `/api/public/*`, waitlist, checkout público, webhook Stripe.
- **Nível:** 🔴
- ✅ Limiter dedicado + documentar em módulo
- ❌ Novo POST público sem RL

---

## 7. 📚 Documentação de Endpoints

### API-030: JSDoc `@remarks` no handler + atualizar `docs/04_modulos/[modulo].md`
> Sem Swagger/OpenAPI no projeto.
- **Nível:** 🔴 para features novas
- ✅ Documentar contrato no markdown do módulo
- ❌ Só PR sem doc de módulo quando muda API

### API-031: Sem decorators Nest/Swagger
- **Nível:** 🔴 não adicionar framework paralelo

### API-032: Exemplos de body em endpoints complexos (export, checkout)
- **Nível:** 🟡 na doc do módulo

---

## 8. ⚡ Performance

### API-033: PDF/CSV e reports pesados — síncronos hoje; novos async só com fila/proposta
> Não fingir fila inexistente. Rate limit em `/members/reports`.
- **Nível:** 🟡
- ✅ RL + chunks (reports >5000) como referência
- ❌ Export sem timeout awareness

### API-034: Evitar N+1 — preferir `.in()` batch (congregation list count)
- **Nível:** 🔴
- ✅ Contagem em lote por IDs
- ❌ Loop await por item na listagem

### API-035: Cache HTTP raro; não inventar Redis
> Projeto sem Redis. Não adicionar Cache-Control agressivo em dados tenant sem análise.
- **Nível:** 🟢

---

## Confirmação

Regras **API-001…035** alinhadas ao Express+Joi real do Flock (2026-07-14).
