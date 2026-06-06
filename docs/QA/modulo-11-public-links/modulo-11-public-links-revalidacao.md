# QA Revalidação — Módulo 11: Links Públicos

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-11-public-links/modulo-11-public-links.md`, `docs/QA/modulo-11-public-links/modulo-11-public-links-dev-report.md`  
> **Método:** revisão estática ponta a ponta (FE/BE/contratos/UX); lint/tsc citados no dev-report não reexecutados nesta sessão

---

## 1. Resumo executivo

O pacote do DEV **entrega de forma verificável as correções dos 13 achados** da auditoria inicial. O autocadastro público alcançou **paridade com integração** (congregações e grupos via token, `formatApiError`, IBGE com fallback). Bugs críticos de concorrência (integração ilimitada) e efeito colateral destrutivo no GET (desativação por limite de plano) foram eliminados no código.

**Placar desta revalidação:**

| Classificação | Qtd | IDs |
|---|---:|---|
| ✅ Resolvido | 13 | 01–13 |
| ⚠️ Parcialmente resolvido | 0 | — |
| ❌ Não resolvido | 0 | — |
| Novo ticket (melhoria UX) | 1 | **NG-01** |

**Parecer:** módulo **aprovado para fechamento de QA** (13/13). NG-01 é melhoria de copy (não bloqueia release). Smoke manual da seção 4 do dev-report recomendado antes de produção.

---

## 2. Status de cada achado original

### ACHADO 01 — Autocadastro não carrega congregações
**Status:** ✅ resolvido

**Evidência:**
- BE: `validateRegistrationLink` retorna `congregations[]` (L45–61 em `publicRegistrationController.ts`);
- FE: `PublicMemberForm` recebe `congregations` prop; **sem** `useFiltersData` (grep confirma remoção);
- Página: `congregations={linkInfo?.congregations ?? []}` (`register/[token]/page.tsx` L281).

**Fluxo ponta a ponta:** GET público → props → select com sede + filiais.

---

### ACHADO 02 — Link integração ilimitado apaga cadastro sob concorrência
**Status:** ✅ resolvido

**Evidência:** branch explícito em `publicIntegrationController.ts`:

```155:178:backend/src/controllers/publicIntegrationController.ts
    if (integrationLink.max_uses !== null && integrationLink.max_uses !== undefined) {
      // optimistic lock + rollback + 409
      ...
    } else {
      const { error: updateError } = await supabase
        .from('public_integration_links')
        .update({ current_uses: integrationLink.current_uses + 1 })
        .eq('id', integrationLink.id);
      // sem delete do integrante
    }
```

**Regressão no funil limitado:** ramo `max_uses` definido mantém `.lt('current_uses', max_uses)` + rollback — correto.

---

### ACHADO 03 — GET desativa link quando plano cheio
**Status:** ✅ resolvido

**Evidência:** GET retorna 403 **sem** UPDATE:

```34:42:backend/src/controllers/publicRegistrationController.ts
    if (!limitCheck.canAdd) {
      return res.status(403).json({
        valid: false,
        error: 'Limite de membros atingido',
        ...
        blocked_reason: 'plan_limit',
      });
    }
```

**Nota intencional:** POST ainda desativa link ao confirmar limite na submissão (L145–148) — alinhado à recomendação original (“desativar só no POST”).

---

### ACHADO 04 — Registro público sem `formatApiError`
**Status:** ✅ resolvido

**Evidência:** `register/[token]/page.tsx` importa e usa `formatApiError` em validate (via `refreshLinkInfo` L52), submit (L85) e helper `isLimitError` (L25).

---

### ACHADO 05 — Grupos indisponíveis no autocadastro
**Status:** ✅ resolvido

**Evidência:**
- Endpoint `GET /api/public/registration/:token/groups` (`public.ts` L14);
- Controller `listPublicRegistrationGroups` com filtro por congregação + validação igreja (L76–122);
- FE: `apiService.listPublicRegistrationGroups` + `PublicMemberForm` L207–235;
- Aviso âmbar quando `groupsLoadFailed` (L908–911).

---

### ACHADO 06 — `congregation_id` não validado contra igreja
**Status:** ✅ resolvido

**Evidência:** `congregationValidation.ts` + uso em:
- registro POST (L185–192);
- integração POST (L116–126);
- listagem pública de grupos (L103–108).

---

### ACHADO 07 — POST público sem rate limit dedicado
**Status:** ✅ resolvido

**Evidência:** `publicPostLimiter` (15 req/15min/IP) aplicado em POST registro e integração (`public.ts` L16, L19).

**Ressalva menor (não reabre achado):** limiter é por IP, não IP+token como sugerido opcionalmente no QA original — suficiente para MVP.

---

### ACHADO 08 — Falhas IBGE silenciosas
**Status:** ✅ resolvido

**Evidência:**
- `FALLBACK_UF_STATES` em `useIbgeData.ts` (L78);
- alertas em `PublicMemberForm` (L751–754 estados, L779–782 cidades).

---

### ACHADO 09 — Contador “cadastros restantes” desatualizado
**Status:** ✅ resolvido

**Evidência (registro + integração):**
- `refreshLinkInfo()` após sucesso e em erros de limite (`isLimitError` → refresh);
- `linkExhausted` + `submitDisabled={linkExhausted}` no form;
- banner usa `max_uses != null` (L262 registro, L264 integração);
- botão “Realizar Novo Cadastro” desabilitado quando esgotado (L213–221).

---

### ACHADO 10 — Reader bloqueado na UI de links
**Status:** ✅ resolvido

**Evidência:**
- `members/page.tsx` L454–459: botão “Links de Autocadastro” **sem** `disabled={canEdit === false}`; title read-only;
- `integration/page.tsx` L184–191: idem;
- modais mantêm `readOnly={canEdit === false}` para ocultar criar/editar.

---

### ACHADO 11 — RegistrationLinksModal sem formatApiError
**Status:** ✅ resolvido

**Evidência:** import + uso em todos handlers (`RegistrationLinksModal.tsx` L21, L75, L128, L140, L164, L176).

---

### ACHADO 12 — Criação de link registro sem auditoria
**Status:** ✅ resolvido

**Evidência:** `logAudit` em `createRegistrationLink` (L238–243) e `updateRegistrationLink` (L368+).

---

### ACHADO 13 — Paridade UX registro vs integração
**Status:** ✅ resolvido

**Evidência:**
- `PublicIntegrationForm`: `isLoading` no submit (L236), `submitDisabled` prop;
- registro: congregações/grupos via props, `formatApiError`, `submitDisabled`;
- ambas páginas com `refreshLinkInfo` e `linkExhausted`.

---

## 3. Regressões / efeitos colaterais

### NG-01 — Limite de plano exibido como “Link Inválido ou Expirado” 🟡 BAIXA (novo ticket)
**Contexto:** GET com `blocked_reason: 'plan_limit'` cai em tela genérica de link inválido.

**Evidência:** `register/[token]/page.tsx` L151 — título fixo “Link Inválido ou Expirado”; corpo usa `formatApiError` e pode mostrar “Limite de membros atingido”, mas H2 induz que token expirou.

**Impacto:** visitante/admin interpreta mal a causa; mensagem de erro no body está correta.

**Correção sugerida:** se `blocked_reason === 'plan_limit'` ou mensagem contém “limite de membros”, título/copy dedicados (“Cadastro temporariamente indisponível”).

---

### Efeitos colaterais positivos (sem regressão)

- Integração limitada ganhou guard `.lt('current_uses', max_uses)` no incremento — mais rigoroso que antes.
- Rota `GET .../groups` registrada **antes** de `GET .../:token` — ordem correta no router.
- Reader pode copiar links sem expor ações destrutivas — melhora operacional.

### Fluxos dependentes verificados

| Fluxo | Status |
|-------|--------|
| M03 — Membros via link público | Congregações/grupos OK; limite plano no POST |
| M04 — Integração via link | Concorrência ilimitada corrigida |
| M10 — Billing / limite plano | GET não muta link; POST desativa se necessário |
| M09 — Audit logs | Create/update link registro auditados |

**Nenhuma regressão bloqueante** identificada nos fluxos dependentes.

---

## 4. Avaliação de UX após correção

| Área | Antes | Depois |
|------|-------|--------|
| Congregações no registro | Só “Sede” | Filiais via GET público ✅ |
| Grupos no registro | Sempre vazio | Endpoint token + aviso falha ✅ |
| Erros submit registro | Mensagem curta | `formatApiError` ✅ |
| IBGE | Silencioso | Fallback UF + alertas ✅ |
| Limite usos link | Contador stale | Refresh + submit disabled ✅ |
| Integração concorrente | Perda de dados | Branch ilimitado seguro ✅ |
| Reader admin | Modal bloqueado | Read-only + copiar ✅ |
| Limite plano (GET) | Desativava link | 403 sem mutar ✅ |
| Copy limite plano | — | Título genérico ⚠️ NG-01 |

**Experiência geral:** fluxo público utilizável de ponta a ponta para igrejas multi-congregação; mensagens de erro acionáveis; estados de limite tratados. Único gap perceptível é copy do cenário limite de plano (NG-01).

---

## 5. Itens encerrados

Todos os **13 achados originais (01–13)** podem ser **fechados** neste ciclo de QA.

---

## 6. Itens reabertos

**Nenhum** achado original reaberto.

### Backlog opcional (não bloqueia fechamento)

| ID | Descrição | Prioridade |
|----|-----------|------------|
| **NG-01** | Título/copy dedicado para `blocked_reason: plan_limit` | Baixa |
| — | Rate limit por IP+token (refino de ACHADO 07) | Muito baixa |
| — | E2E automatizado fluxos públicos | Média (cobertura) |

---

## Parecer final (atualizado)

| Decisão | Itens |
|---|---|
| **Encerrados** | ACHADOS 01–13 |
| **Reabertos** | — |
| **Novos tickets** | NG-01 (copy limite plano) |

**Módulo 11 aprovado para fechamento de QA** — 13/13 achados confirmados na revisão estática.

### Smoke manual recomendado (não substituído por revisão estática)

1. Igreja multi-congregação → link registro → select mostra filiais.  
2. Selecionar grupos → POST → vínculo em `member_groups`.  
3. Link integração ilimitado → 2 POST simultâneos → ambos persistem.  
4. Plano no limite → GET registro → link **permanece ativo** no banco; mensagem clara (validar NG-01).  
5. `max_uses=1` → segundo cadastro → form desabilitado + contador atualizado.  
6. DevTools: `congregation_id` de outra igreja → 400.  
7. IBGE offline → UFs fallback.  
8. Reader → abre modal → copia URL; sem botão criar.
