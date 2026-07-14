---
type: padroes-testes
ultima_atualizacao: 2026-07-14
versao: "1.0"
framework: Jest (declarado no backend) | inexistente no frontend | adoção pendente
tags: [padrões, testes, qualidade]
---

# Padrões de Testes — Flock

> Estado atual: **quase zero testes de aplicação** no monorepo.  
> `backend/package.json` declara `"test": "jest"` + `ts-jest`/`supertest`, mas **não há** `jest.config.*` versionado nem `*.spec.ts`/`*.test.ts` em `backend/src` ou `frontend/src`.  
> Este documento define a **direção obrigatória** a adotar ao escrever os primeiros testes — não descreve uma suíte madura.

Complementa módulos em [[04_modulos/index]] (cada um lista gaps).

---

## 1. 🏗️ Estratégia de Testes

```text
        /\
       /E2E\          → Futuro: poucos fluxos (login, checkout, create member)
      /------\
     /Integração\     → API + Supabase test project / mocks PostgREST
    /------------\
   /  Unit Tests  \   → utils, validators Joi, expanders, planLimits
  /________________\
```

| Tipo | Ferramenta alvo | Volume | Quando |
| --- | --- | --- | --- |
| Unit | Jest + ts-jest | Alto | A cada commit / PR |
| Integration | Jest + supertest | Médio | PR |
| E2E | A definir (Playwright recomendado) | Baixo | Pré-release |

**Nível 🔴:** novos comportamentos de regra de negócio **não** entram em `main` sem pelo menos unit do happy path + 1 erro.  
Exceção temporária: docs-only / copy tutorials.

---

## 2. 📁 Estrutura e Localização

### TEST-001: Co-located sob `__tests__` ou `*.test.ts` ao lado do módulo
- **Nível:** 🔴 (direção)
- ✅ `backend/src/utils/__tests__/planLimits.test.ts` · `validators/__tests__/groupValidator.test.ts`
- ❌ Única pasta monolítica `tests/` misturando e2e e unit sem critério

### TEST-002: Sufixo `.test.ts` (Jest default)
- **Nível:** 🔴
- ✅ `recurrenceExpander.test.ts`
- ❌ `.spec.ts` misturado sem padrão (escolher um — **test**)

### TEST-003: Fixtures em `backend/src/test/fixtures/` (criar quando necessário)
- **Nível:** 🟡
- ✅ factories tipadas com overrides
- ❌ Copiar JSON gigante de produção com PII

**Estrutura alvo:**

```text
backend/src/
  utils/__tests__/planLimits.test.ts
  validators/__tests__/memberValidator.test.ts
  test/
    fixtures/memberFactory.ts
    setup.ts
jest.config.ts   # a adicionar
```

---

## 3. 📝 Nomenclatura e Estrutura

### TEST-004/005: describe em inglês ou PT consistente; `it('should ... when ...')`
> Commits/docs misturam PT/EN — **testes novos: inglês** (como nomes de funções).
- **Nível:** 🟡
- ✅ `describe('checkMemberLimit', () => { it('should block add when past_due', ...) })`
- ❌ `it('teste 1')`

### TEST-006: Preferir asserts focados; múltiplos ok no mesmo AAA se atomicos
- **Nível:** 🟢

### TEST-007: Arrange–Act–Assert obrigatório
- **Nível:** 🔴

```typescript
describe('validateWaitlist', () => {
  it('should reject email without domain', () => {
    // Arrange
    const body = { name: 'Ana', email: 'x', phone: '11999999999', /* ... */ };

    // Act
    const { error } = validateWaitlist(body);

    // Assert
    expect(error).toBeDefined();
  });
});
```

---

## 4. 🎭 Mocks, Stubs e Fixtures

### TEST-008: Mock Supabase client em unit; integration usa projeto/branch de teste
- **Nível:** 🔴
- ✅ Mock `from().select()` chain
- ❌ Hit produção `flock-app-01` em CI

### TEST-009: Não mockar o subject under test
- **Nível:** 🔴

### TEST-010/011: Factories com overrides > faker obrigatório
> Sem faker no repo hoje — `overrides` plain objects bastam no início.
- **Nível:** 🟡

```typescript
const memberFactory = (overrides: Partial<Member> = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  church_id: '00000000-0000-4000-8000-000000000099',
  name: 'Test Member',
  active: true,
  ...overrides,
});
```

### TEST-012: Isolation — sem estado compartilhado mutável entre tests
> Cuidado com caches in-memory (`limitWarningCache`, expiration cache).
- **Nível:** 🔴
- ✅ Reset maps em `beforeEach` ou injetar clock/cache
- ❌ Depender de ordem dos `it`

---

## 5. 📊 Cobertura

### TEST-013: Threshold — **não configurado** hoje
> Ao adicionar Jest config, começar com thresholds baixos e subir:
> sugerido inicial: statements 20% → meta módulos críticos 60%+.
- **Nível:** 🟡 configurar no primeiro PR de testes

### TEST-014: Módulos críticos primeiro
> Ordem sugerida: `planLimits`, `stripeWebhookService` (claim/stale), validators Joi, `recurrenceExpander`, auth middleware roles.
- **Nível:** 🔴 priorização

### TEST-015: Não precisa: types-only, templates HTML estáticos, docs
- **Nível:** 🟢

### TEST-016: Sempre testar
- Regras BR-* com branch (past_due, unicidade, XOR participante)
- Validators (happy + inválido)
- Webhook idempotência / signature fail (unit com stub)
- Export/controllers: smoke integration quando possível

---

## 6. 🧪 Por tipo de código

| Camada | Como testar |
| --- | --- |
| `utils/*`, expanders | Unit puro, sem HTTP |
| `validators/*` | Unit Joi |
| Controllers | Integration supertest + app parcial **ou** unit com mock supabase/res |
| Jobs cron | Unit da função exportada (`downgradeExpiredSubscriptions`) |
| Frontend | Vitest/RTL **a adotar**; priorizar schemas Zod e `searchGuides` |
| Tutoriais | Unit `searchGuides` / registry (rápido, barato) |

---

## 7. ✅ Checklist por PR

- [ ] Novo comportamento BR tem teste (ou justificativa docs-only)
- [ ] Caso de erro coberto
- [ ] `npm test` (backend) passa localmente quando suíte existir
- [ ] Coverage não regrediu no módulo tocado
- [ ] Bugfix inclui teste de regressão
- [ ] Mocks não escondem contrato `{ error, details }`

---

## 8. 🚫 Anti-Patterns

| ID | Evitar |
| --- | --- |
| TEST-017 | Assertar implementação interna privada em vez do resultado |
| TEST-018 | Ordem dependente entre arquivos |
| TEST-019 | DB/global singleton sujo entre tests |
| TEST-020 | Mock de tudo até o teste não validar nada |
| TEST-021 | `it.skip` / `xit` sem issue |
| TEST-022 | Teste sem `expect` |

---

## Roadmap mínimo (primeiro PR de testes)

1. Adicionar `jest.config.ts` (ts-jest, `roots: ['<rootDir>/src']`)
2. `planLimits.test.ts` — past_due, teto 100, Infinity custom
3. `groupValidator.test.ts` — type inválido / monthly XOR se aplicável a calendar
4. Documentar comando CI quando `.github/workflows` existir

---

## Confirmação

Regras **TEST-001…022** · framework declarado Jest · **cobertura efetiva atual ≈ 0%** · documento de adoção.
