---
type: convencoes-codigo
ultima_atualizacao: 2026-07-14
versao: "1.0"
linguagem: TypeScript
formatter: ESLint (frontend next/core-web-vitals) | nenhum Prettier no repo | backend sem ESLint config
tags: [padrões, código, convenções]
---

# Convenções de Código — Flock

> Regras prescritivas extraídas do código real (backend Express + frontend Next 15 + landing).  
> Complementa [[03_arquitetura/visao-geral]]. Agentes e engenheiros **devem** seguir isto ao escrever/revisar código.

---

## 1. 📝 Nomenclatura

### CONV-001: camelCase em código TypeScript
> Alinha com o ecossistema JS/TS e com a maioria dos arquivos existentes.
- **Nível:** 🔴 Obrigatório
- **Enforcement:** 👁️ Code review
- ✅ **Correto:** `churchId`, `listMembers`, `createCongregation`
- ❌ **Incorreto:** `church_id` como variável local (snake_case só em campos de domínio/DB)

### CONV-002: Funções com verbo + substantivo
> Handlers e services descrevem ação + recurso — facilita grep e rotas.
- **Nível:** 🔴 Obrigatório
- **Enforcement:** 👁️
- ✅ `export const createMember = async ...`, `validateGroupCongregation`
- ❌ `export const member = ...`, `doStuff`

### CONV-003: Booleanos com prefixo is/has/can/should
> Já usado em Auth (`canEdit`, `isAuthenticated`, `hasActiveSubscription`).
- **Nível:** 🟡 Recomendado
- **Enforcement:** 👁️
- ✅ `canAdd`, `isPastDue`, `hasActiveSubscription`
- ❌ `activeFlag`, `pastDue` (ambíguo se é bool)

### CONV-004: Constantes SCREAMING_SNAKE
> Sets/allowlists e maps de plano usam isso.
- **Nível:** 🟡 Recomendado
- **Enforcement:** 👁️
- ✅ `ALLOWED_SORT_FIELDS`, `PLAN_CONFIG`, `STRIPE_PRICE_IDS`
- ❌ `allowedSortFields` para mapa estático de regras

### CONV-005: Sem classes de domínio no backend
> O backend é procedural (handlers + utils); não há camada `class MemberService`.
- **Nível:** 🟡 Recomendado (manter estilo atual)
- **Enforcement:** 👁️
- ✅ `export const createGroup = async (req, res) => { ... }`
- ❌ Introduzir Nest-style `Injectable` classes sem decisão arquitetural

### CONV-006: interface para entidades; type para unions
> Espelha `backend/src/types/index.ts` e `frontend/src/types`.
- **Nível:** 🔴 Obrigatório para novos tipos
- **Enforcement:** 👁️
- ✅ `export interface Member { ... }` · `export type ChurchUserRole = 'owner' | ...`
- ❌ `export type Member = { ... }` para entidades grandes (exceto objeto literal tipado pontual, ex. tutorials)

### CONV-007: Genéricos descritivos quando necessário
> Pouco uso de genéricos; quando houver, preferir nome claro.
- **Nível:** 🟢 Opcional
- **Enforcement:** 👁️
- ✅ `ApiResponse<T>`, `Partial<Group>`
- ❌ `Foo<T, U, V, W>` sem necessidade

### CONV-008: Arquivos — camelCase (backend) / PascalCase (components front)
> Dualidade documentada; não misturar.
- **Nível:** 🔴 Obrigatório
- **Enforcement:** 👁️
- ✅ Backend: `memberController.ts` · Front: `MemberForm.tsx`, `useChurch.ts`
- ❌ `Member-Controller.ts`, `memberform.tsx`

### CONV-009: Sufixos por camada no backend
> Comunicação da responsabilidade no nome do arquivo.
- **Nível:** 🔴 Obrigatório
- **Enforcement:** 👁️
- ✅ `*Controller.ts`, `*Validator.ts`, `routes/{recurso}.ts`, `*Schema.ts` (Joi/CNPJ)
- ❌ `memberStuff.ts` na pasta controllers

### CONV-010: Pastas por domínio (plural EN no backend; domínio no front)
> Rotas/API em inglês; UI agrupa por feature.
- **Nível:** 🔴 Obrigatório
- **Enforcement:** 👁️
- ✅ `routes/members.ts`, `components/members/`, `lib/tutorials/guides/`
- ❌ `routes/membros.ts` (API permanece EN)

---

## 2. 🏗️ Estrutura de Arquivos

### CONV-011: Ordem de imports
> Backend: externos → services → types → validators → utils. Front: react/libs → `@/components` → hooks → services → types → utils → relativo.
- **Nível:** 🟡 Recomendado
- **Enforcement:** 👁️ (sem eslint-plugin-import configurado)
- ✅ Seguir a ordem observada em `memberController.ts` / `MemberForm.tsx`
- ❌ Imports aleatórios ou paths relativos profundos `../../../` se `@/` existir

### CONV-012: Exports nomeados preferidos
> Controllers exportam named consts; components front também (pages Next: default).
- **Nível:** 🟡 Recomendado
- **Enforcement:** 👁️
- ✅ `export const listGroups = ...` · `export function Button`
- ❌ Default export de handlers (exceto `export default router` e pages Next)

### CONV-013: Tamanho máximo de arquivo — migrar para <800 linhas
> Hoje `exportController.ts` (~3.3k) e `memberController.ts` (~2k) são outliers.
- **Nível:** 🟡 Recomendado (direção de migração)
- **Enforcement:** 👁️
- ✅ Extrair PDF/helpers para `services/` ou `utils/export/`
- ❌ Continuar inchando o mesmo controller monolítico

### CONV-014: Funções focadas; extrair helpers de validação
> Já existe `groupValidations.ts`, `calendarValidations.ts`.
- **Nível:** 🟡 Recomendado
- **Enforcement:** 👁️
- ✅ Validação de FK/tenant em `utils/*Validations.ts`
- ❌ 200 linhas de regras misturadas no handler HTTP

### CONV-015: Organização de handler Express
> validate → auth context → regras → DB → audit → response.
- **Nível:** 🔴 Obrigatório em endpoints novos
- **Enforcement:** 👁️
- ✅ Joi primeiro; depois `req.church!.churchId`; depois insert; `logAudit`
- ❌ DB antes de validar input; esquecer `church_id` no filtro

---

## 3. 💎 TypeScript

### CONV-016: type vs interface (ver CONV-006)
- **Nível:** 🔴 · **Enforcement:** 👁️

### CONV-017: `any` — proibido no frontend; limitado no backend
> Front: 0 ocorrências em `src`. Backend: concentrado em exports/Stripe/casts.
- **Nível:** 🔴 Front | 🟡 Backend (reduzir)
- **Enforcement:** 🤖 Front (strict + lint) · 👁️ Backend
- ✅ Front: `unknown` + narrowing · Backend: tipar payloads; `as any` só com comentário `// ACHADO`/`TODO`
- ❌ Novo `any` em formulários React ou em tipos `Member`

### CONV-018: Type assertion `as`
> Usado em AuthRequest casts e joins Supabase.
- **Nível:** 🟡 Restrito
- **Enforcement:** 👁️
- ✅ `req as AuthRequest` após middleware · narrowing de joins
- ❌ `as Member` sem validar shape

### CONV-019: Non-null `!` após middleware de auth
> Padrão: `req.church!.churchId`, `req.user!`.
- **Nível:** 🟡 Aceitável pós-guard
- **Enforcement:** 👁️
- ✅ Após `authMiddleware` / `requireRole` garantirem contexto
- ❌ `data!` em resultado de query sem checar erro

### CONV-020: Union string types > enum TS
> `ChurchUserRole`, `GroupType`, `CalendarStatus` são unions; enums PG onde faz sentido no schema.
- **Nível:** 🔴 Obrigatório para novos códigos TS
- **Enforcement:** 👁️
- ✅ `export type RecurrencePattern = 'weekly' | 'monthly'`
- ❌ `enum RecurrencePattern { Weekly = 'weekly' }` sem necessidade

### CONV-021: Optional chaining e nullish coalescing
> Amplamente usados (`leader?.trim() || null`, `error?.message`).
- **Nível:** 🔴 Preferir
- **Enforcement:** 👁️
- ✅ `member.congregations?.name || '—'`
- ❌ `member.congregations && member.congregations.name`

### CONV-022: Generics sob demanda
> Preferir types concretos; `ApiResponse<T>` ok no front.
- **Nível:** 🟢 · **Enforcement:** 👁️

---

## 4. ⚡ Async e Tratamento de Erros

### CONV-023: async/await obrigatório
> Zero `.then(` em `backend/src`.
- **Nível:** 🔴 · **Enforcement:** 👁️
- ✅ `const { data, error } = await supabase.from(...)`
- ❌ `.then(...).catch(...)` em código novo

### CONV-024: try/catch por handler + early return
> Padrão dos controllers; erros DB viram 400/500 inline.
- **Nível:** 🔴 · **Enforcement:** 👁️
- ✅ `if (error) { logError(...); return res.status(...).json({ error, details }) }`
- ❌ Throw genérico sem status HTTP mapeado

### CONV-025: Shape de erro `{ error, details }`
> Contrato estável API ↔ front (`ApiError`).
- **Nível:** 🔴 · **Enforcement:** 👁️
- ✅ `{ error: 'Dados inválidos', details: validationError.details[0].message }`
- ❌ `{ message: 'fail' }` sem `error` · envelope Nest `{statusCode,message}` inconsistente

### CONV-026: Logging via `logError` / `billingLog`
> Evitar só `console.error` em fluxos críticos (ainda há console em waitlist/export).
- **Nível:** 🟡 Migrar para logger tipado
- **Enforcement:** 👁️
- ✅ `logError('Erro ao criar congregação:', createError)`
- ❌ Silenciar erros de e-mail sem log

### CONV-027: Promise.all para leituras independentes
> Usado em `billingStatsController`; default é sequencial em CRUD.
- **Nível:** 🟡 · **Enforcement:** 👁️
- ✅ Reads paralelos sem dependência
- ❌ `Promise.all` em writes que precisam de ordem/transaction lógica

---

## 5. 🧹 Qualidade de Código

### CONV-028: Separar efeitos (HTTP) de regras (utils)
> Validadores Joi e `*Validations.ts` vs handlers.
- **Nível:** 🟡 · **Enforcement:** 👁️

### CONV-029: Preferir `const`; mutação controlada em maps de update
- **Nível:** 🟡 · **Enforcement:** 🤖 (prefer-const se ativado) / 👁️

### CONV-030: Early returns
> Dominant pattern nos controllers (auth → validate → not found → ok).
- **Nível:** 🔴 · **Enforcement:** 👁️

### CONV-031: Comentários para intenção / ACHADOS
> Comentários `ACHADO NN`, `SL0N`, `@remarks` JSDoc em handlers grandes são o padrão útil.
- **Nível:** 🟡 · **Enforcement:** 👁️
- ✅ `// ACHADO 05: endpoint atômico para status`
- ❌ Comentários que só repetem o nome da função

### CONV-032: Constantes para magic numbers/strings
> Planos, rate limits, status Stripe, GroupType lists.
- **Nível:** 🔴 em regras de negócio · **Enforcement:** 👁️
- ✅ `PLAN_LIMITS`, `activeStatuses = ['active','trialing','past_due']`
- ❌ `if (plan === '200')` espalhado sem `PLAN_CONFIG`

### CONV-033: Extrair quando logic se replica em 2+ módulos
> Ex.: alinhamento mentor/responsável/membro à congregação em group/calendar/integrations; `resolveCongregationFilter` (rejeita `sede`).
- **Nível:** 🟡 · **Enforcement:** 👁️

---

## 6. 🔧 Configurações de Tooling

**Linter (frontend):** `frontend/eslint.config.mjs` — `next/core-web-vitals` + `next/typescript`.  
**Linter (backend):** sem `.eslintrc` / flat config versionado.  
**Formatter:** Prettier **não** está configurado no monorepo (apenas em deps transitivas).  
**Validação:** Backend Joi · Frontend Zod + RHF.  
**TypeScript:** `strict: true` em backend e frontend; path `@/*` → `src/*`.

```json
// backend/tsconfig.json (trecho)
{ "compilerOptions": { "strict": true, "paths": { "@/*": ["src/*"] } } }
```

```json
// frontend — Next lint via package script "lint": "next lint"
```

---

## 7. ⚠️ Inconsistências Identificadas

| Inconsistência | Direção adotada | Notas |
| --- | --- | --- |
| Controllers monolíticos (export/members) | Extrair services/helpers | Novos features não aumentam >800 linhas |
| `console.log/error` vs `logError` | Preferir logger utils | Especialmente Stripe/waitlist |
| Comentário “soft delete” vs hard delete members | Corrigir docs/código; hard delete atual | Não introduzir `deleted_at` sem RFC |
| Update `PUT` dominante vs `PATCH` parcial | Novos updates parciais → PATCH | Manter PUT legado até migrar |
| Scopes Conventional Commits irregulares | Adotar scopes de módulo (ver [[05_padroes/padroes-de-git]]) | |
| Backend sem ESLint | Adicionar eslint flat alinhado a strict | |
| `any` em export/calendar | Eliminar gradualmente | Front permanece zero-any |

---

## Confirmação

Documento prescritivo com **CONV-001…033**, baseado no código Flock (2026-07-14).
