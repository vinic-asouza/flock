# Relatório de Execução — Módulo 11: Links Públicos

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Maio 2026  
> **Referência QA:** `docs/QA/modulo-11-public-links/modulo-11-public-links.md`  
> **Status geral:** ✅ 13/13 achados implementados

---

## Resumo executivo

O pacote corrige o autocadastro público de membros (paridade com integração), elimina perda de dados em links ilimitados, remove efeito colateral destrutivo no GET de validação, fortalece validações BE/FE e alinha UX de erros, IBGE, limites de uso e gestão admin.

Mudanças em **backend** (controllers públicos, rate limit, audit) e **frontend** (forms/páginas públicas, modais admin).

---

## Achados e implementações

### ACHADO 01 — Autocadastro não carrega congregações ✅ RESOLVIDO

**Arquivos:**  
`backend/src/controllers/publicRegistrationController.ts`  
`frontend/src/components/public/PublicMemberForm.tsx`  
`frontend/src/app/public/register/[token]/page.tsx`

**Solução aplicada:**
- `validateRegistrationLink` retorna `congregations[]` (mesmo padrão da integração);
- `PublicMemberForm` recebe `congregations` via prop; removido `useFiltersData`;
- página pública repassa congregações do GET.

**Resultado:** visitante vê sede + filiais reais no select.

---

### ACHADO 02 — Link integração ilimitado apaga cadastro sob concorrência ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/publicIntegrationController.ts`

**Solução aplicada:**
- links com `max_uses == null`: incremento simples, **sem** rollback/delete;
- optimistic lock + rollback **somente** quando `max_uses` definido.

**Resultado:** POSTs concorrentes em link ilimitado não apagam integrantes válidos.

---

### ACHADO 03 — GET desativa link quando plano cheio ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/publicRegistrationController.ts`

**Solução aplicada:**
- GET retorna 403 com `blocked_reason: 'plan_limit'` **sem** `UPDATE is_active`;
- desativação permanece no POST quando limite confirmado na submissão.

**Resultado:** abrir link não destrói token válido; admin não precisa recriar link após plano liberar vagas.

---

### ACHADO 04 — Registro público sem `formatApiError` ✅ RESOLVIDO

**Arquivo:** `frontend/src/app/public/register/[token]/page.tsx`

**Solução aplicada:** `formatApiError` em validação e submit (paridade com integração).

---

### ACHADO 05 — Grupos indisponíveis no autocadastro ✅ RESOLVIDO

**Arquivos:**  
`backend/src/controllers/publicRegistrationController.ts` (`listPublicRegistrationGroups`)  
`backend/src/routes/public.ts`  
`frontend/src/services/api.ts`  
`frontend/src/components/public/PublicMemberForm.tsx`

**Solução aplicada:**
- novo endpoint `GET /api/public/registration/:token/groups?congregation_id=`;
- form carrega grupos via token público; aviso quando falha vs lista vazia.

---

### ACHADO 06 — `congregation_id` não validado contra igreja ✅ RESOLVIDO

**Arquivos:**  
`backend/src/utils/congregationValidation.ts`  
`publicRegistrationController.ts`  
`publicIntegrationController.ts`

**Solução aplicada:** helper `validateCongregationBelongsToChurch` antes do insert (registro + integração).

---

### ACHADO 07 — POST público sem rate limit dedicado ✅ RESOLVIDO

**Arquivos:** `backend/src/middlewares/publicPostLimiter.ts`, `backend/src/routes/public.ts`

**Solução aplicada:** limiter 15 req/15min por IP em POST registro e integração.

---

### ACHADO 08 — Falhas IBGE silenciosas no PublicMemberForm ✅ RESOLVIDO

**Arquivos:** `frontend/src/hooks/useIbgeData.ts`, `PublicMemberForm.tsx`

**Solução aplicada:**
- `FALLBACK_UF_STATES` quando API IBGE falha;
- alertas inline para `errorStates` / `errorCities`.

---

### ACHADO 09 — Contador “cadastros restantes” desatualizado ✅ RESOLVIDO

**Arquivos:**  
`frontend/src/app/public/register/[token]/page.tsx`  
`frontend/src/app/public/integration/[token]/page.tsx`

**Solução aplicada:**
- `refreshLinkInfo()` após sucesso e erros 403/409 de limite;
- `submitDisabled` quando `remaining_uses === 0`;
- banner usa `max_uses != null` (inclui limite 0).

---

### ACHADO 10 — Reader bloqueado na UI de links ✅ RESOLVIDO

**Arquivos:** `members/page.tsx`, `integration/page.tsx`, modais (já tinham `readOnly`)

**Solução aplicada:** botão “Links de Autocadastro” habilitado para reader; modal em modo read-only (copiar URL, ver status).

---

### ACHADO 11 — RegistrationLinksModal sem formatApiError ✅ RESOLVIDO

**Arquivo:** `frontend/src/components/members/RegistrationLinksModal.tsx`

**Solução aplicada:** todos os handlers usam `formatApiError`.

---

### ACHADO 12 — Criação de link registro sem auditoria ✅ RESOLVIDO

**Arquivo:** `backend/src/controllers/registrationLinkController.ts`

**Solução aplicada:** `logAudit` em `createRegistrationLink` e `updateRegistrationLink` (paridade com integração).

---

### ACHADO 13 — Paridade UX registro vs integração ✅ RESOLVIDO

**Arquivos:** `PublicIntegrationForm.tsx`, páginas públicas

**Solução aplicada:**
- botão integração com `isLoading` spinner;
- ambos forms com `submitDisabled` por limite esgotado;
- registro usa `formatApiError` e props de congregações/grupos.

---

## Arquivos novos

| Arquivo | Propósito |
|---------|-----------|
| `backend/src/utils/congregationValidation.ts` | Valida congregação ∈ church |
| `backend/src/middlewares/publicPostLimiter.ts` | Rate limit POST público |

---

## Validação

```bash
cd frontend && npm run lint   # ✔ sem warnings/erros
cd backend && npx tsc --noEmit # ✔ OK
```

### Cenários manuais recomendados

1. Igreja multi-congregação → link registro → select mostra filiais.  
2. Link integração ilimitado → 2 POST simultâneos → ambos persistem.  
3. Plano no limite → GET registro → 403 **sem** desativar link no banco.  
4. Selecionar grupos no registro público → vínculo em `member_groups`.  
5. DevTools: `congregation_id` de outra igreja → 400.  
6. IBGE offline → UFs fallback + mensagem âmbar.  
7. Reader abre modal → copia link; não vê criar/editar.  
8. `max_uses=1` → segundo cadastro → contador atualizado + form desabilitado.

---

## Parecer

Módulo 11 **pronto para revalidação QA** nos fluxos de autocadastro (registro + integração), concorrência, limites de plano/usos e gestão admin.
