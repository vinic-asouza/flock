# QA — Módulo 11: Links Públicos

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria inicial (fluxo ponta a ponta FE/BE)  
> **Escopo:** Links de autocadastro (`/public/register/[token]`) e autointegração (`/public/integration/[token]`), gestão admin (`RegistrationLinksModal`, `IntegrationLinksModal`), APIs públicas e autenticadas  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 11, L890–961), `docs/prompts/QA/qa-usability-master.mdc`, achados correlatos M03/M04

---

## 1. Resumo executivo

O Módulo 11 expõe superfície **externa sem login**, autenticada por token no path — criticidade alta por definição. O **fluxo de integração pública** foi significativamente endurecido nos ciclos QA dos Módulos 03/04 (congregações via GET público, optimistic locking, `formatApiError` na página). O **fluxo de registro público de membros**, porém, **repete o bug de congregações** já corrigido na integração: `PublicMemberForm` ainda depende de APIs autenticadas para montar selects, deixando visitantes sem filiais reais e sem grupos.

Há ainda um **bug silencioso grave** no incremento de links de integração **sem limite de usos** (`max_uses` null): concorrência legítima pode **apagar integrante recém-criado** com mensagem de “limite atingido”. No registro, GET de validação **desativa o link** quando o plano da igreja está cheio — efeito colateral destrutivo em operação de leitura.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 3 | 01, 02, 03 |
| Média | 6 | 04, 05, 06, 07, 08, 09 |
| Baixa | 4 | 10, 11, 12, 13 |

### Riscos centrais

- visitante de autocadastro não escolhe congregação filial (só “Sede”);
- cadastros válidos apagados em links de integração ilimitados sob concorrência;
- link de registro desativado por simples abertura quando plano está no limite;
- erros Joi/`details` pouco acionáveis no fluxo de registro público;
- ausência de rate limit dedicado em POST público.

**Parecer:** módulo **não recomendado para fechamento de QA** sem correções de prioridade alta. Subfluxo de **integração pública** está mais maduro; **registro público** exige paridade com o padrão já aplicado na integração.

---

## 2. Mapa ponta a ponta validado

### Fluxo A — Link de cadastro de membro (admin → público)

1. Admin/editor abre `/members` → `RegistrationLinksModal`  
2. `POST /api/registration-links` (auth + `requireRole('editor')`)  
3. URL compartilhada: `[frontend]/public/register/[token]`  
4. Página pública: `GET /api/public/registration/:token` → `publicRegistrationAuth` + `validateRegistrationLink`  
5. `PublicMemberForm` → `POST /api/public/registration/:token`  
6. BE: `validateMember`, dedupe nome (`ilike`), `checkMemberLimit`, insert membro, vínculo grupos, incremento atômico `current_uses` (se `max_uses` definido)

### Fluxo B — Link de integração (admin → público)

1. Admin/editor abre `/integration` → `IntegrationLinksModal`  
2. `POST /api/integration-links` (auth + editor)  
3. URL: `[frontend]/public/integration/[token]`  
4. `GET /api/public/integration/:token` → retorna `congregations[]` ✅  
5. `PublicIntegrationForm` → `POST /api/public/integration/:token`  
6. BE: validação, insert integrante, incremento com optimistic locking

### Fluxo C — Gestão de links (autenticado)

| Ação | Registro | Integração |
|------|----------|------------|
| Listar | `GET /registration-links` (reader+) | `GET /integration-links` (reader+) |
| Criar | `POST` (editor+) | `POST` (editor+) |
| Desativar/excluir | editor+ | editor+ |

**UI:** botões de modal desabilitados para `canEdit === false` (reader) — BE ainda permite listagem.

### Autenticação / sessão neste módulo

- Rotas `/public/*` **não** exigem cookie; token no path é a credencial.  
- Interceptor `api.ts` **não** redireciona 401 para `/login` quando pathname começa com `/public/register/` ou `/public/integration/` (L93–96) ✅  
- Chamadas **autenticadas** feitas de dentro do formulário público (`listCongregations`, `listGroups`) retornam 401 **sem redirect**, mas falham silenciosamente.

### Arquivos auditados

**Frontend:**  
`frontend/src/app/public/register/[token]/page.tsx`  
`frontend/src/app/public/integration/[token]/page.tsx`  
`frontend/src/components/public/PublicMemberForm.tsx`  
`frontend/src/components/public/PublicIntegrationForm.tsx`  
`frontend/src/components/members/RegistrationLinksModal.tsx`  
`frontend/src/components/integration/IntegrationLinksModal.tsx`  
`frontend/src/hooks/useFiltersData.ts`  
`frontend/src/hooks/useIbgeData.ts`  
`frontend/src/services/api.ts`  
`frontend/src/app/(main)/members/page.tsx`  
`frontend/src/app/(main)/integration/page.tsx`

**Backend:**  
`backend/src/routes/public.ts`  
`backend/src/routes/registrationLinks.ts`  
`backend/src/routes/integrationLinks.ts`  
`backend/src/middlewares/publicRegistrationAuth.ts`  
`backend/src/middlewares/publicIntegrationAuth.ts`  
`backend/src/controllers/publicRegistrationController.ts`  
`backend/src/controllers/publicIntegrationController.ts`  
`backend/src/controllers/registrationLinkController.ts`  
`backend/src/controllers/integrationLinkController.ts`  
`backend/src/validators/memberValidator.ts`  
`backend/src/validators/integrationMemberValidator.ts`

---

## 3. Achados

### ACHADO 01 — Autocadastro público não carrega congregações (reuse de API autenticada)
- **Gravidade:** alta  
- **Tipo:** bug silencioso / contrato API  
- **Impacto no usuário:** visitante em `/public/register/[token]` vê select de congregação **apenas com “Sede”**; filiais da igreja não aparecem. Quem deveria se cadastrar em congregação satélite **não consegue** — ou acredita que só existe a sede.
- **Onde ocorre:** montagem de `PublicMemberForm`  
- **Arquivos relacionados:**  
  `frontend/src/components/public/PublicMemberForm.tsx` (L148: `useFiltersData()`)  
  `frontend/src/hooks/useFiltersData.ts` (L17: `apiService.listCongregations()`)  
  `backend/src/routes/congregations.ts` (auth obrigatório)  
  `backend/src/controllers/publicRegistrationController.ts` (`validateRegistrationLink` **não** retorna congregações)  
  Contraste corrigido: `publicIntegrationController.ts` (L41–58 retorna `congregations`)
- **Evidência:** integração pública foi corrigida no M04 (ACHADO 01) estendendo GET público; registro **não** recebeu o mesmo tratamento.
- **Como reproduzir:** igreja com 2+ congregações → abrir link público de registro sem login → campo Congregação só mostra “Sede”.
- **Causa provável:** copy do `MemberForm` interno com `useFiltersData` no contexto anônimo.
- **Ajuste recomendado:** espelhar integração — incluir `congregations` em `GET /api/public/registration/:token`; passar prop ao `PublicMemberForm`; remover `useFiltersData` do fluxo público.

---

### ACHADO 02 — Link de integração sem `max_uses`: concorrência apaga cadastro válido
- **Gravidade:** alta  
- **Tipo:** bug silencioso / race condition  
- **Impacto no usuário:** link “ilimitado” com dois envios simultâneos (família, rede lenta, duplo clique): um recebe **201** e o outro **409** “Limite de usos atingido” — integrante do segundo request é **deletado** do banco mesmo sem limite configurado.
- **Onde ocorre:** pós-insert em `createIntegrationMemberViaPublicLink`  
- **Arquivos relacionados:** `backend/src/controllers/publicIntegrationController.ts` (L141–155)
- **Evidência:**
```typescript
// Sempre aplica optimistic lock — inclusive quando max_uses é null
.update({ current_uses: integrationLink.current_uses + 1 }, { count: 'exact' })
.eq('current_uses', integrationLink.current_uses);

if (updateError || updatedCount === 0) {
  await supabase.from('integration_members').delete().eq('id', integrationMember.id);
  return res.status(409).json({ error: 'Limite de usos atingido', ... });
}
```
  Registro público trata ramo ilimitado com incremento simples (L222–231) — **sem** rollback indevido.
- **Como reproduzir:** link integração `max_uses=null` → dois POST concorrentes com token válido → um cadastro some; usuário vê erro de limite inexistente.
- **Causa provável:** optimistic locking copiado do cenário limitado sem branch para ilimitado.
- **Ajuste recomendado:** se `max_uses == null`, incremento simples (como registro); reservar rollback + 409 **somente** quando `max_uses` definido.

---

### ACHADO 03 — GET de validação desativa link de registro quando plano está cheio
- **Gravidade:** alta  
- **Tipo:** bug silencioso / efeito colateral  
- **Impacto no usuário:** primeiro visitante (ou bot/scanner) que abre link válido com igreja no limite de membros **desativa permanentemente** o link (`is_active=false`). Admin acredita link ativo; demais visitantes veem “Link inválido”. Plano liberado depois exige recriar link.
- **Onde ocorre:** `validateRegistrationLink` (GET)  
- **Arquivos relacionados:** `backend/src/controllers/publicRegistrationController.ts` (L35–49)
- **Evidência:**
```typescript
if (!limitCheck.canAdd) {
  await supabase.from('public_registration_links')
    .update({ is_active: false })
    .eq('id', registrationLink.id);
  return res.status(403).json({ error: 'Limite de membros atingido', ... });
}
```
  POST repete checagem sem desativar na mesma linha (L85–97) — GET é o único que muta estado.
- **Como reproduzir:** igreja no limite do plano → abrir URL pública de registro → link desativado no banco; admin vê link “ativo” até refresh da lista.
- **Causa provável:** tentativa de “fechar” link automaticamente; implementado no GET (idempotente esperado).
- **Ajuste recomendado:** GET retorna 403 **sem** UPDATE; desativar só no POST falho ou job admin; opcional flag `blocked_reason: 'plan_limit'` na resposta.

---

### ACHADO 04 — Erros da API no registro público não usam `formatApiError`
- **Gravidade:** média  
- **Tipo:** contrato API / UX  
- **Impacto no usuário:** validações Joi (`details[]`) e erros como “Membro já cadastrado” exibem só `err.message` — array `details` do interceptor **não** é concatenado. Mensagens genéricas ou incompletas vs integração pública.
- **Onde ocorre:** `/public/register/[token]/page.tsx`  
- **Arquivos relacionados:**  
  `frontend/src/app/public/register/[token]/page.tsx` (L41, L71: `err instanceof Error ? err.message`)  
  `frontend/src/app/public/integration/[token]/page.tsx` (L43, L67: `formatApiError(err)`) ✅  
  `frontend/src/services/api.ts` (`formatApiError` L1145–1156)
- **Como reproduzir:** POST com dados inválidos (DevTools) → toast/inline sem detalhes de campo.
- **Ajuste recomendado:** usar `formatApiError` em validate e submit do registro público; alinhar modais admin (`RegistrationLinksModal`).

---

### ACHADO 05 — Grupos/ministérios indisponíveis no autocadastro público
- **Gravidade:** média  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** seção “Grupos / Ministérios” sempre vazia para visitante anônimo; seleções feitas internamente nunca chegam. Cadastro completa, mas vínculos a grupos são perdidos silenciosamente.
- **Onde ocorre:** `PublicMemberForm` loadGroups  
- **Arquivos relacionados:**  
  `frontend/src/components/public/PublicMemberForm.tsx` (L203–223: `apiService.listGroups`)  
  `backend/src/routes/groups.ts` (auth + reader)
- **Evidência:** catch silencioso `setAvailableGroups([])` (L212–214).
- **Ajuste recomendado:** endpoint público `GET /api/public/registration/:token/groups?congregation_id=` **ou** incluir grupos mínimos na resposta de validação; exibir aviso se lista vazia por falha vs igreja sem grupos.

---

### ACHADO 06 — `congregation_id` não validado contra `church_id` do link (ambos fluxos)
- **Gravidade:** média  
- **Tipo:** validação / integridade de dados  
- **Impacto no usuário:** via DevTools, UUID de congregação de **outra igreja** pode ser enviado; FK PostgreSQL aceita se congregação existir — membro/integrante fica com `church_id` do link e congregação de outra igreja (inconsistência silenciosa nos relatórios).
- **Arquivos relacionados:**  
  `backend/src/controllers/publicRegistrationController.ts` (L130–137)  
  `backend/src/controllers/publicIntegrationController.ts` (L116–124)  
  `backend/src/validators/memberValidator.ts` (uuid only)  
  `backend/src/validators/integrationMemberValidator.ts` (L109–115)
- **Ajuste recomendado:** antes do insert, `SELECT id FROM congregations WHERE id=? AND church_id=req.churchId`; 400 se inválido. Integração pública mitiga via lista fechada no FE — BE ainda deve validar.

---

### ACHADO 07 — POST público sem rate limit dedicado
- **Gravidade:** média  
- **Tipo:** segurança funcional / abuso  
- **Impacto no usuário:** flood de cadastros via token vazado ou força bruta; pressiona limite do plano, DB e fila de e-mail. Só limiter geral (`1000/15min` IP em `app.ts`).
- **Arquivos relacionados:** `backend/src/routes/public.ts`, `backend/src/app.ts` (L78–94)
- **Ajuste recomendado:** limiter específico em `POST /public/registration/:token` e `POST /public/integration/:token` (ex.: 10–20/15min por IP + token).

---

### ACHADO 08 — Falhas IBGE silenciosas no `PublicMemberForm`
- **Gravidade:** média  
- **Tipo:** UX  
- **Impacto no usuário:** endereço obrigatório; se IBGE falhar, selects de estado/cidade ficam vazios **sem mensagem** (`errorStates`/`errorCities` expostos pelo hook mas não usados no form — L149).
- **Arquivos relacionados:**  
  `frontend/src/hooks/useIbgeData.ts` (L47–49: seta erro, `states=[]`)  
  `frontend/src/components/public/PublicMemberForm.tsx` (não renderiza erros IBGE)
- **Ajuste recomendado:** alertas inline + fallback UF estático (padrão landing M12 ACHADO 06).

---

### ACHADO 09 — Contador “cadastros restantes” desatualizado na UI (TOCTOU)
- **Gravidade:** média  
- **Tipo:** estado inconsistente  
- **Impacto no usuário:** banner “N cadastros restantes” reflete snapshot do GET inicial; outro visitante consome vagas → submit falha com erro genérico; contador na tela mente até F5.
- **Arquivos relacionados:**  
  `frontend/src/app/public/register/[token]/page.tsx` (L232–241)  
  `frontend/src/app/public/integration/[token]/page.tsx` (L228–237)
- **Ajuste recomendado:** após erro 409/403 de limite, revalidar link ou atualizar `linkInfo`; desabilitar submit quando `remaining_uses === 0`.

---

### ACHADO 10 — Reader bloqueado na UI mas BE permite listar links
- **Gravidade:** baixa  
- **Tipo:** UX / permissão  
- **Impacto no usuário:** papel reader não abre modal (`disabled={canEdit === false}` em `members/page.tsx` L456); BE permite `GET /registration-links` com reader — secretaria read-only não copia links pela UI.
- **Arquivos relacionados:** `members/page.tsx`, `integration/page.tsx`, `registrationLinks.ts` L16–18
- **Ajuste recomendado:** permitir modal read-only para reader (copiar URL, ver status) mantendo create/edit só editor+.

---

### ACHADO 11 — `RegistrationLinksModal` sem `formatApiError`
- **Gravidade:** baixa  
- **Tipo:** UX admin  
- **Impacto no usuário:** erros 400 com `details[]` na gestão de links de registro mostram mensagem curta; `IntegrationLinksModal` já usa `formatApiError`.
- **Arquivos relacionados:** `RegistrationLinksModal.tsx` (L75, L128, etc.) vs `IntegrationLinksModal.tsx` (L74, L127)
- **Ajuste recomendado:** padronizar `formatApiError` nos handlers do modal de registro.

---

### ACHADO 12 — Criação de link de registro sem auditoria (integração audita)
- **Gravidade:** baixa  
- **Tipo:** observabilidade  
- **Impacto no usuário:** admin não vê no log de auditoria criação de link de autocadastro; integração registra `logAudit` em create/update/delete.
- **Arquivos relacionados:**  
  `registrationLinkController.ts` (`createRegistrationLink` sem audit)  
  `integrationLinkController.ts` (L260–265 audit em create)
- **Ajuste recomendado:** `logAudit` em create/update registro para paridade.

---

### ACHADO 13 — Paridade UX registro vs integração incompleta
- **Gravidade:** baixa  
- **Tipo:** inconsistência  
- **Impacto no usuário:** integração pública trata erros de submit **fora** do form (bloco vermelho L250–262); registro passa `error` prop ao form ✅, mas validação inicial não usa `formatApiError`. Botão integração `disabled={isLoading}` sem spinner (`PublicIntegrationForm` L234) vs registro com `isLoading` no Button (L980).
- **Ajuste recomendado:** alinhar componentes públicos (loading, erros, props de congregações).

---

## 4. Cenários extras a testar

- Link expirado / desativado / token inexistente → telas de erro com copy clara (ambos fluxos).  
- `max_uses=1` → primeiro cadastro OK; segundo visitante → 403 no GET ou 409 no POST.  
- Link ilimitado integração → 2 POST simultâneos (ACHADO 02).  
- Igreja no limite do plano → GET registro desativa link? (ACHADO 03).  
- Congregação filial → registro público mostra opções? (ACHADO 01).  
- Seleção de grupos no registro público → vínculo em `member_groups` após POST.  
- Duplo clique “Enviar Cadastro” com rede lenta.  
- DevTools: `congregation_id` de outra igreja → insert e relatórios.  
- IBGE offline no endereço do membro público.  
- Reader vs editor: copiar link, criar link, desativar.  
- “Realizar Novo Cadastro” após sucesso com último uso do link → tela de link inválido.  
- Token vazado + flood POST (rate limit).  
- Email duplicado por nome (`ilike`) no registro público → 400 claro.

---

## 5. Lacunas de cobertura

- E2E anônimo: registro + integração com assert de congregações/grupos.  
- Teste de carga concorrente em link integração `max_uses=null`.  
- Teste contrato GET registro retornando congregações (após fix).  
- Teste: GET validação **não** muta `is_active`.  
- Teste rate limit POST `/api/public/*`.  
- Validação BE congregação ∈ church em ambos controllers.  
- Teste visual estados loading/erro/sucesso/esgotado em mobile.

---

## 6. Checklist transversal (Módulo 11)

| Item | Registro público | Integração pública |
|------|------------------|---------------------|
| Validação FE | ✅ Zod extenso | ✅ Zod adequado |
| Validação BE | ✅ Joi member | ✅ Joi integration |
| Loading / disabled | ✅ | ⚠️ spinner submit |
| Envio duplicado | ⚠️ isLoading | ⚠️ isLoading |
| Erro link inválido | ✅ tela dedicada | ✅ + formatApiError |
| Erro submit | ⚠️ sem formatApiError | ✅ formatApiError |
| Congregações | ❌ ACHADO 01 | ✅ via GET público |
| Grupos | ❌ ACHADO 05 | N/A |
| Limite plano | ⚠️ GET desativa link | N/A integração |
| Limite usos link | ✅ middleware + atomic | ⚠️ ACHADO 02 ilimitado |
| Sessão/login | N/A | N/A |
| Rate limit | ⚠️ só geral | ⚠️ só geral |

---

## 7. O que desenvolvimento deve ajustar (priorizado)

### Prioridade alta

1. **ACHADO 01** — Estender `validateRegistrationLink` com `congregations[]`; refatorar `PublicMemberForm` para props (remover `useFiltersData`); paridade com integração M04.  
2. **ACHADO 02** — Branch `max_uses == null` em `createIntegrationMemberViaPublicLink`: incremento simples, sem delete rollback.  
3. **ACHADO 03** — Remover `UPDATE is_active=false` do GET; retornar 403 informativo; desativar link apenas em POST ou ação admin explícita.

### Prioridade média

4. **ACHADO 04** — `formatApiError` em `public/register/[token]/page.tsx` e `RegistrationLinksModal`.  
5. **ACHADO 05** — Grupos via endpoint público ou payload de validação; feedback quando indisponível.  
6. **ACHADO 06** — Validar `congregation_id` / `expected_congregation_id` pertence à `church_id` do token.  
7. **ACHADO 07** — Rate limit dedicado POST público.  
8. **ACHADO 08** — Surfacear erros IBGE + fallback UF no `PublicMemberForm`.  
9. **ACHADO 09** — Revalidar link após erro de limite; desabilitar form se `remaining_uses === 0`.

### Prioridade baixa

10. **ACHADO 10** — Modal read-only para reader (copiar links).  
11. **ACHADO 11** — formatApiError no modal registro.  
12. **ACHADO 12** — Audit log em CRUD links de registro.  
13. **ACHADO 13** — Alinhar UX loading/erro entre forms públicos.

---

## 8. Parecer final

O Módulo 11 cumpre a **estrutura** esperada (token, middlewares, telas de erro de link, incremento atômico no registro limitado, integração com plano no autocadastro), e o **subfluxo de integração pública** reflete correções anteriores de QA. Porém o **autocadastro de membros permanece funcionalmente incompleto** para igrejas multi-congregação, e há **risco real de perda de dados** em links de integração ilimitados sob concorrência.

**Não aprovar fechamento de QA** até prioridade alta. Após fixes, smoke focado: congregação filial no registro, concorrência integração ilimitada, limite de plano sem desativar link no GET, e mensagens de erro acionáveis.
