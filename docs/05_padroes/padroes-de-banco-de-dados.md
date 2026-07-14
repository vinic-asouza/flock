---
type: padroes-banco-de-dados
ultima_atualizacao: 2026-07-14
versao: "1.0"
banco: PostgreSQL 17 (Supabase)
orm: nenhum (@supabase/supabase-js PostgREST)
tags: [padrões, banco-de-dados, migrations]
---

# Padrões de Banco de Dados — Flock

> Regras **prescritivas** para evoluir o schema.  
> Schema atual: [[03_arquitetura/banco-de-dados]] · Segurança/RLS: [[03_arquitetura/seguranca]].

**Realidade:** sem ORM; acesso backend via `supabaseAdmin` (service_role). Migrations aplicadas no projeto Supabase (não há pasta `migrations/` no monorepo atualmente).

---

## 1. 📛 Nomenclatura

### DB-001: Tabelas plural snake_case inglês
- **Nível:** 🔴
- ✅ `members`, `church_users`, `calendar_items`, `member_groups`
- ❌ `Member`, `membro`, `calendarItems`

### DB-002: Colunas snake_case inglês
- **Nível:** 🔴
- ✅ `church_id`, `marital_status`, `subscription_end_date`
- ❌ `churchId` no Postgres

### DB-003: PK `id` UUID
> Preferir `gen_random_uuid()` (já dominante). Evitar misturar com `uuid_generate_v4()` em tabelas novas sem necessidade.
- **Nível:** 🔴
- ✅ `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- ❌ serial/bigserial como PK de domínio

### DB-004: FK `{tabela_singular}_id`
- **Nível:** 🔴
- ✅ `congregation_id`, `group_id`, `member_id`
- ❌ `congregationId`, `fk_congregation`

### DB-005: Junção M:N `{a}_{b}` plural ou descritivo
- **Nível:** 🔴
- ✅ `member_groups`, `calendar_participants`
- ❌ entity única sem pivot quando N:N real

### DB-006: Índices `idx_{tabela}_{colunas}`
> Padrão visto na doc live; uniques parciais `WHERE col IS NOT NULL`.
- **Nível:** 🟡
- ✅ `idx_members_church_id`, unique parcial Stripe
- ❌ Nomes aleatórios `index1`

### DB-007: Enums — PG enum **ou** CHECK text; documentar labels
> Mistura atual PT/EN e Title Case vs lowercase (members vs integration) — **não criar terceira variante**.
- **Nível:** 🔴 para novos campos
- ✅ Reutilizar enum existente do domínio próximo · documentar em `banco-de-dados.md`
- ❌ Novo CHECK com casing diferente do irmão lógico

---

## 2. 🕐 Campos obrigatórios / ciclo de vida

### DB-008: `created_at timestamptz` NOT NULL DEFAULT now()
- **Nível:** 🔴

### DB-009: `updated_at` quando a linha é editável
> Nem toda tabela tem (ex. `members` no schema doc). **Novas tabelas mutáveis devem ter `updated_at`**.
- **Nível:** 🔴 em tabelas novas mutáveis
- ✅ trigger ou update explícito no app
- ❌ Campo referenciado em sort sem existir na tabela

### DB-010: Soft delete — **não usar `deleted_at`** sem RFC
> Projeto usa flags (`active`, `is_active`, `status`) ou hard delete.
- **Nível:** 🔴
- ✅ Flag de negócio documentada + políticas de hard delete
- ❌ Introduzir `deleted_at` em uma tabela isolada quebrando o padrão

### DB-011: `created_by` só onde já há precedente (calendar/links)
- **Nível:** 🟢 Sob demanda
- ✅ FK `auth.users` quando auditoria de autor importa
- ❌ Exigir em toda tabela

**Campos base sugeridos (tabela mutável nova):**

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
church_id uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
-- + status/active se ciclo de vida exigir
```

---

## 3. 🔄 Migrations

### DB-012: Nome `YYYYMMDDHHMMSS_descricao_snake`
> Estilo Supabase já usado (`dbNN_*`, `obNN_*`, descritivo).
- **Nível:** 🔴

### DB-013: Uma migration = um concern
- **Nível:** 🔴
- ✅ Só adicionar coluna X + índice
- ❌ Misturar Stripe + reformatação members no mesmo script

### DB-014: Sem down automático — planejar forward-fix
- **Nível:** 🔴
- ✅ Migration de compensação nova se precisar reverter
- ❌ Editar migration já aplicada

### DB-015: Data migration explícita e separada quando pesada
- **Nível:** 🟡

### DB-016: Nunca alterar migration aplicada em produção
- **Nível:** 🔴

### DB-017: Validar em staging/branch Supabase antes de prod
- **Nível:** 🔴
- ✅ Branch preview / MCP / SQL revisado
- ❌ Aplicar SQL experimental direto em live sem review

### DB-018: Coluna NOT NULL em tabela populada = nullable → backfill → SET NOT NULL
- **Nível:** 🔴

```sql
ALTER TABLE exemplo ADD COLUMN status text;
UPDATE exemplo SET status = 'active' WHERE status IS NULL;
ALTER TABLE exemplo ALTER COLUMN status SET NOT NULL;
```

---

## 4. 📈 Índices

### DB-019–024: Checklist obrigatório ao criar tabela

- [ ] **DB-020** Toda FK indexada (`church_id`, etc.)
- [ ] **DB-019** Campos de filtro/list frequentes
- [ ] **DB-022** UNIQUE de negócio (email waitlist, token links, `(member_id, group_id)`)
- [ ] **DB-021** Compostos `(church_id, …)` para listagens tenant
- [ ] **DB-023** Parcial quando NULL sparse (Stripe IDs, end_date)
- [ ] **DB-024** Evitar índice em coluna que muda a cada request sem necessidade

Não duplicar índices (há histórico de duplicatas em congregations/audit_logs — não repetir).

---

## 5. 🔗 Relacionamentos

### DB-025: FK com constraint explícita sempre
- **Nível:** 🔴

### DB-026: ON DELETE CASCADE no ownership de tenant
> `church_id` → churches; filhos N:N do grupo/calendário.
- **Nível:** 🔴 quando o filho não faz sentido órfão
- ✅ CASCADE member_groups ao deletar group
- ❌ CASCADE destrutivo em refs “nice to have” — usar SET NULL

### DB-027: ON DELETE SET NULL para refs opcionais
> congregation, responsible, mentor, group em calendar.
- **Nível:** 🔴

### DB-028: M:N sempre via pivot
- **Nível:** 🔴
- ✅ `member_groups`
- ❌ arrays UUID na tabela pai

### DB-029: Hierarquia — preferir FK nullable (pai) a closure tables até haver requisito
- **Nível:** 🟢

---

## 6. 🔍 Acesso a Dados (aplicação)

### DB-030: Preferir select explícito em dados sensíveis/billing
> `*` ainda é comum em CRUD — em código **novo** de billing/PII, projetar campos.
- **Nível:** 🟡 → 🔴 em billing/account

### DB-031: Listas com LIMIT/range
> Ver [[05_padroes/padroes-de-api]] API-015.
- **Nível:** 🔴 tabelas grandes

### DB-032: Evitar N+1 — `.in('id', ids)` / join embutido PostgREST
- **Nível:** 🔴

### DB-033: “Transação” lógica — compensação explícita
> Sem transaction SQL fácil via PostgREST; padrão create+participants faz rollback delete.
- **Nível:** 🔴 quando multi-write
- ✅ Compensating delete/update documentado
- ❌ Assumir atomicidade multi-request

### DB-034: SQL raw / RPC só para ops (cleanup, integrity)
> Já existem RPCs billing. Parameterized; sem concatenar input.
- **Nível:** 🟡

### DB-035: Filtrar flags de lifecycle explicitamente
> Sem `deleted_at`. Em members reports: `active=true` quando demografia.
- **Nível:** 🔴
- ✅ `.eq('active', true)` onde regra exige
- ❌ Assumir soft delete universal

### Extra: tenant
- **Todo** acesso domínio: `.eq('church_id', churchId)` no backend.

---

## 7. 🌱 Seeds e referência

### DB-036–038: Sem seed framework no repo
> Dados de referência: `PLAN_CONFIG` no código; enums no schema.
- **Nível:** 🟡
- ✅ Manter catálogo de planos em `config/plans.ts` sincronizado com CHECKs DB
- ❌ Seeds com IDs que colidem com prod sem namespace

Atualizar [[03_arquitetura/banco-de-dados]] em toda migration relevante.

---

## Confirmação

Regras **DB-001…038** (checklist índices cobre 019–024) alinhadas ao Postgres/Supabase do Flock.
