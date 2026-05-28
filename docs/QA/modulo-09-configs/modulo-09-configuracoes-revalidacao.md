# QA Revalidação — Módulo 09: Configurações e Administração

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Base:** `docs/QA/modulo-09-configs/modulo-09-configuracoes.md`, `docs/QA/modulo-09-configs/modulo-09-configuracoes-dev-report.md`  
> **Método:** revisão estática ponta a ponta (FE/BE/contratos/UX); sem execução manual em ambiente com Stripe/Supabase simulados

---

## 1. Resumo executivo

O pacote do DEV **entrega de forma verificável as correções dos 13 achados** da auditoria inicial, com evidência clara em `settings/page.tsx`, componentes de settings, `api.ts` e controllers do backend. Os itens de prioridade alta (deep link, `GET /church`, Stripe no `apiService`, paginação de logs de ativação) estão implementados.

**Placar desta revalidação:**

| Classificação | Ciclo 1 | Ciclo 2 |
|---|---|---|
| Resolvido | 12/13 | **13/13** |
| Parcialmente resolvido | 1 (11) | 0 |
| Novo ticket aberto | NG-01, NG-02 | 0 |

**Parecer:** módulo **aprovado para fechamento de QA** (13/13 achados + NG-01/NG-02 encerrados no ciclo 2).

---

## 2. Status de cada achado original

### ACHADO 01 — Query `?tab=` não sincroniza ao trocar aba
**Status:** ✅ resolvido

**Evidência:** `handleSectionChange` chama `router.replace(\`/settings?tab=${sectionId}\`)` (L65–68); leitura de `tabFromUrl` no `useEffect` (L46–49).

```65:68:frontend/src/app/(main)/settings/page.tsx
    const handleSectionChange = (sectionId: string) => {
        setActiveSection(sectionId);
        router.replace(`/settings?tab=${sectionId}`, { scroll: false });
    };
```

---

### ACHADO 02 — Dados da igreja só do `AuthContext`
**Status:** ✅ resolvido

**Evidência:** `ChurchManagement` monta com `apiService.getChurchData()` (L142–150), `churchBaseline` para diff (L125, L194–198), recarga após salvar (L210–211), fallback para `user` só em erro (L156–158).

**Observação:** outro admin alterando a igreja **na mesma aba aberta** sem remontar o componente ainda exige sair/voltar na tab ou F5 — cenário raro; não reabre o achado.

---

### ACHADO 03 — Aba Plano visível para reader/editor
**Status:** ✅ resolvido

**Evidência:** `payment` só entra em `settingsSections` quando `canManagePlan` (L31); render condicionado `canManagePlan && <PaymentManagement />` (L98).

---

### ACHADO 04 — Stripe/conta com `axios` cru
**Status:** ✅ resolvido

**Evidência:** `api.ts` expõe `syncSubscription`, `createPortalSession`, `changePlan` (L167–179); `PaymentManagement` e fluxos Stripe da conta usam `apiService` + `formatApiError`; sem `axios`/`API_URL` nos componentes de settings de plano.

---

### ACHADO 05 — Sync automática engole falhas
**Status:** ✅ resolvido

**Evidência:** `autoSyncFailed` + banner âmbar com “Sincronizar agora” (`handleSyncSubscription(true)`) (L102, L229–230, L440–461).

---

### ACHADO 06 — Filtro Ativação/Inativação quebra paginação
**Status:** ✅ resolvido

**Evidência:**
- BE: `member_status_change` com filtros JSON em `getAuditLogs` (L557–590) + `.range` antes do count.
- FE: repassa `member_status_change`; usa `pagination` da API sem sobrescrever `total` (L99–123).

```102:110:frontend/src/components/settings/AuditLogs.tsx
      const response = await apiService.getAuditLogs({
        page,
        limit: pagination.limit,
        entity: filters.entity || undefined,
        action: isStatusChangeFilter ? undefined : filters.action || undefined,
        member_status_change: isStatusChangeFilter
          ? (filters.action as 'activate' | 'deactivate')
          : undefined,
      });
```

**Risco residual:** updates que mudam `active` junto com outros campos não entram no filtro (regra de negócio intencional, alinhada à auditoria original).

---

### ACHADO 07 — Logs restritos a `entity=member`
**Status:** ✅ resolvido

**Evidência:** filtro de entidade com “Todas” + igreja, conta, congregação, etc. (L496–505); `ENTITY_LABELS` ampliado (L68–76); `getMemberName` trata `church` e `account` (L213–219).

---

### ACHADO 08 — Email alterado, UI mantém email antigo
**Status:** ✅ resolvido

**Evidência:** após `changeEmail`, `getAccountData()` + `setAccountData` com `email: emailData.newEmail` (L233–239).

---

### ACHADO 09 — Texto de exclusão superestima impacto
**Status:** ✅ resolvido

**Evidência:** copy condicional `isOwner` vs convidado (L682–693); lista de impacto na igreja só para owner.

---

### ACHADO 10 — CNPJ exibido como obrigatório
**Status:** ✅ resolvido

**Evidência:** label `CNPJ (opcional)` no modo edição (L475).

---

### ACHADO 11 — Erros sem `formatApiError`
**Status:** ✅ resolvido *(ciclo 2 — ver seção 7)*

**Evidência (ciclo 2):** todos os catches de `AccountManagement` usam `formatApiError`, incluindo `loadAccountData` (L201), `handleChangeEmail` (L244), `handleChangePassword` (L281), `handleChangePhone` (L346), `handleDeleteAccount` (L384). Sem ocorrências de `errorObj.response` no arquivo.

---

### ACHADO 12 — `?tab=` inválido ou sem permissão
**Status:** ✅ resolvido

**Evidência:** tab inválida → fallback + `router.replace` + toast (L52–57); integrado ao mesmo `page.tsx` do ACHADO 01.

---

### ACHADO 13 — Convite: `listUsers` limitado a 1000
**Status:** ✅ resolvido

**Evidência:** loop paginado `page`/`perPage: 1000` até encontrar email ou esgotar (L106–133 em `churchUserController.ts`).

---

## 3. Regressões / efeitos colaterais

### Residual documentado (não bloqueia fechamento)
- `window.confirm` duplicado na troca de plano (`PaymentManagement.tsx` L369) — dev-report já listou como opcional.
- `console.log` em `getAccount` do `accountController` (L60) — fora do escopo dos 13 achados; limpeza opcional.
- Reenviar confirmação de email — endpoint existe, UI não expõe (lacuna original de cobertura).

**NG-01 e NG-02 encerrados no ciclo 2** (ver seção 7).

**Não identificadas regressões críticas** nos fluxos de tabs, church refresh, Stripe interceptor ou paginação de logs.

---

## 4. Avaliação de UX após correção

| Área | Antes | Depois |
|------|-------|--------|
| Navegação por abas / deep link | URL desatualizada | Consistente com `?tab=` |
| Dados da igreja | Contexto possivelmente stale | API na montagem e após salvar |
| Permissões na UI | Plano visível para reader | Tab oculta; menos fricção |
| Billing / sessão | Stripe fora do interceptor | Unificado; 401 alinhado ao app |
| Falha de sync | Silenciosa | Banner âmbar acionável |
| Logs | Totais errados; só membros | Filtros e paginação server-side; multi-entidade |
| Conta | Email desatualizado; copy de exclusão genérica | Card atualizado; copy por papel |
| Mensagens de erro | Inconsistentes | Quase padronizadas (`formatApiError`) |

**Conclusão UX:** melhora substancial e alinhada ao levantamento de fluxos; pendência menor em mensagens de erro da aba Conta (NG-01).

---

## 5. Itens encerrados

Encerrar neste ciclo:

- **ACHADO 01** — deep link de tabs  
- **ACHADO 02** — `GET /api/church` na aba Igreja  
- **ACHADO 03** — aba Plano restrita a admin/owner  
- **ACHADO 04** — Stripe no `apiService`  
- **ACHADO 05** — feedback de sync automática  
- **ACHADO 06** — paginação de ativação/inativação  
- **ACHADO 07** — filtro multi-entidade nos logs  
- **ACHADO 08** — refresh de email na UI  
- **ACHADO 09** — copy de exclusão por papel  
- **ACHADO 10** — CNPJ opcional na label  
- **ACHADO 11** — `formatApiError` padronizado (completo no ciclo 2)  
- **ACHADO 12** — fallback de tab inválida  
- **ACHADO 13** — busca paginada de usuário por email  

---

## 6. Itens reabertos

Nenhum *(ciclo 2 encerrou ACHADO 11, NG-01 e NG-02)*.

---

## 7. Revalidação ciclo 2 — ACHADO 11 / NG-01 / NG-02

> **Referência DEV:** `modulo-09-configuracoes-dev-report.md` (seção “Pós-revalidação — ciclo NG-01 / NG-02 / ACHADO 11”)  
> **Data:** Maio/2026

### NG-01 / ACHADO 11 — `formatApiError` completo na aba Conta
**Status:** ✅ resolvido

**Evidência:** `AccountManagement.tsx` — `formatApiError` em `loadAccountData`, `handleChangePassword`, `handleChangePhone`, `handleDeleteAccount` (grep confirma 7 usos; zero `errorObj.response`).

### NG-02 — Rótulo dinâmico nos logs
**Status:** ✅ resolvido

**Evidência:** `AuditLogs.tsx` — `getEntityRecordLabel(log.entity)` (L275–276); resumo colapsado usa `{entityLabel}: {memberName}` (L289), ex.: “Igreja:”, “Conta:”.

### Itens encerrados neste ciclo

- **ACHADO 11** (parcial → resolvido)
- **NG-01**
- **NG-02**

---

## Parecer final (atualizado — ciclo 2)

| Decisão | Itens |
|---|---|
| **Encerrados** | ACHADOS 01–13, NG-01, NG-02 |
| **Reabertos** | — |
| **Novos tickets** | — |

**Módulo 09 aprovado para fechamento de QA** — 13/13 achados confirmados na revisão estática.

Smoke manual recomendado (não substituído por revisão estática):

1. Rate limit / validação Joi na aba Conta → toast com `details` via `formatApiError`.  
2. Log de entidade `church` → resumo exibe “Igreja:” (não “Membro:”).  
3. Demais cenários do ciclo 1 (tabs, papéis, sync, email, exclusão).
