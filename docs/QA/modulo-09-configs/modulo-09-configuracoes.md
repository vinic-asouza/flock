# QA — Módulo 09: Configurações e Administração

> **Analista:** QA Sênior (IA)  
> **Data:** Maio/2026  
> **Tipo:** Auditoria inicial (fluxo ponta a ponta FE/BE)  
> **Escopo:** `/settings`, tabs Igreja / Plano / Conta / Usuários / Logs, APIs de church, account, church-users, stripe  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 9), `docs/prompts/QA/qa-usability-master.mdc`

---

## 1. Resumo executivo

O módulo de configurações cobre operações sensíveis (dados da igreja, billing, conta, convites e auditoria) com proteção de rota no layout `(main)` e papéis no backend (`requireRole`). O **caminho feliz** para admin/owner funciona na maior parte dos fluxos, mas a auditoria encontrou **bugs silenciosos de sincronização de estado**, **divergências de permissão na UI**, **integração Stripe fora do cliente HTTP padrão** e **paginação incorreta nos logs** — problemas que não quebram a tela, mas geram decisões erradas ou frustração.

### Placar

| Gravidade | Qtd | IDs |
|---|---:|---|
| Alta | 4 | 01, 02, 04, 06 |
| Média | 6 | 03, 05, 07, 08, 09, 10 |
| Baixa | 3 | 11, 12, 13 |

### Riscos centrais

- aba Plano e ações Stripe expostas a papéis sem permissão real (reader/editor);
- chamadas Stripe com `axios` direto, sem interceptor/`formatApiError` do `apiService`;
- dados da igreja e da conta podem ficar **desatualizados na UI** após sucesso;
- filtro de logs “Ativação/Inativação” distorce totais e paginação;
- texto de exclusão de conta superestima o impacto para usuários convidados.

**Parecer:** módulo **não recomendado para fechamento de QA** sem correções de prioridade alta e smoke nos cenários da seção 4.

---

## 2. Mapa ponta a ponta validado

1. Usuário autenticado acessa `/settings` (`frontend/src/app/(main)/settings/page.tsx`)  
2. Layout `(main)` redireciona para `/login` se `!isAuthenticated` (`frontend/src/app/(main)/layout.tsx`)  
3. Tabs locais: `church` | `payment` | `account` | `users` | `logs` (últimas duas só admin/owner no FE)  
4. Query `?tab=` é lida na montagem; clique nas tabs **não** atualiza a URL  
5. Subfluxos montam componentes sob demanda (unmount ao trocar tab):

| Tab | Componente | APIs principais |
|-----|------------|-----------------|
| Igreja | `ChurchManagement` | `PUT /api/church` (admin+), leitura via `AuthContext.user` |
| Plano | `PaymentManagement` | `POST /api/stripe/*` (admin+), `GET /api/plans` |
| Conta | `AccountManagement` | `GET/PUT/DELETE /api/account/*` |
| Usuários | `ChurchUsersManagement` | `GET/POST/PATCH/DELETE /api/church-users` (admin+) |
| Logs | `AuditLogs` | `GET /api/account/logs` (admin+) |

6. Sucesso/erro: toasts + blocos inline; Stripe abre portal em nova aba  
7. Sessão expirada: interceptor do `apiService` redireciona `/login` (401); **não** vale para `axios` cru em Plano/Conta (Stripe)

### Arquivos auditados

**Frontend:**  
`frontend/src/app/(main)/settings/page.tsx`  
`frontend/src/components/settings/ChurchManagement.tsx`  
`frontend/src/components/settings/PaymentManagement.tsx`  
`frontend/src/components/settings/AccountManagement.tsx`  
`frontend/src/components/settings/ChurchUsersManagement.tsx`  
`frontend/src/components/settings/AuditLogs.tsx`  
`frontend/src/app/(main)/layout.tsx`  
`frontend/src/context/AuthContext.tsx`  
`frontend/src/services/api.ts`

**Backend:**  
`backend/src/routes/church.ts`  
`backend/src/routes/account.ts`  
`backend/src/routes/churchUsers.ts`  
`backend/src/routes/stripe.ts`  
`backend/src/controllers/churchController.ts`  
`backend/src/controllers/accountController.ts`  
`backend/src/controllers/churchUserController.ts`  
`backend/src/controllers/stripeController.ts`  
`backend/src/validators/churchValidator.ts`  
`backend/src/validators/accountValidator.ts`  
`backend/src/middlewares/requireRole.ts`

---

## 3. Achados

### ACHADO 01 — Query `?tab=` não sincroniza ao trocar aba (deep link unidirecional)
- **Gravidade:** alta  
- **Tipo:** UX / estado inconsistente  
- **Impacto no usuário:** compartilhar `/settings?tab=payment` funciona na entrada, mas ao clicar em outra aba a URL permanece antiga; F5 ou compartilhamento posterior abre a aba errada. Suporte e documentação interna ficam inconsistentes.
- **Arquivos relacionados:** `frontend/src/app/(main)/settings/page.tsx`
- **Evidência:** leitura de `tabFromUrl` no `useEffect` (L34–38); botões só chamam `setActiveSection(section.id)` (L55) sem `router.replace`/`searchParams`.
- **Como reproduzir:** abrir `/settings?tab=account` → clicar “Plano” → observar URL ainda `tab=account` → F5 volta para Conta.
- **Causa provável:** estado local sem espelhar na rota.
- **Ajuste recomendado:** ao mudar aba, `router.replace(\`/settings?tab=${id}\`)`; manter `useEffect` para entrada por URL; ignorar `tab` inválido com fallback + toast opcional.

---

### ACHADO 02 — Dados da igreja vêm só do `AuthContext`, sem `GET /api/church`
- **Gravidade:** alta  
- **Tipo:** bug silencioso / contrato API  
- **Impacto no usuário:** após atualizar igreja em outra sessão/aba ou via outro admin, a aba Igreja pode mostrar dados antigos até refresh global. Loading é “falso” (preenche do `user` sem round-trip).
- **Arquivos relacionados:** `ChurchManagement.tsx`, `AuthContext.tsx`, `apiService.getChurchData`, `churchController.getChurch`
- **Evidência:** `loadChurchData` só copia `user` do contexto (L126–144); `apiService.getChurchData()` existe mas não é chamado neste componente.
- **Como reproduzir:** admin A altera nome da igreja e salva; admin B na mesma página (sem F5) continua vendo nome antigo na visualização.
- **Causa provável:** otimização inicial assumindo contexto sempre fresco.
- **Ajuste recomendado:** ao montar aba Igreja, `GET /api/church` e sincronizar formulário; após `updateChurch`, confiar no retorno da API (já atualiza contexto em `AuthContext.updateChurch`).

---

### ACHADO 03 — Aba “Plano” visível para reader/editor (levantamento: Owner/Admin)
- **Gravidade:** média  
- **Tipo:** UX / autorização  
- **Impacto no usuário:** leitor/editor vê plano, preços e botões desabilitados com tooltip genérico — sensação de funcionalidade bloqueada sem explicação clara do papel. Risco de chamadas manuais à API se alguém reabilitar botão no DevTools (BE ainda retorna 403).
- **Arquivos relacionados:** `settings/page.tsx`, `PaymentManagement.tsx`, `levantamento-fluxos.md` (L714–715)
- **Evidência:** `settingsSections` inclui `payment` para todos (L24–30); restrição só em `canManagePlan` nos botões (L95, L686+).
- **Como reproduzir:** login como `reader` → Configurações → aba Plano visível, botões disabled.
- **Causa provável:** tabs únicas para todos os papéis.
- **Ajuste recomendado:** incluir `payment` em `settingsSections` apenas se `currentRole === 'admin' || currentRole === 'owner'`; opcional card informativo read-only para outros papéis (“fale com o administrador”).

---

### ACHADO 04 — Stripe e parte da conta usam `axios` cru, fora do `apiService`
- **Gravidade:** alta  
- **Tipo:** contrato API / autenticação  
- **Impacto no usuário:** erros 401 em Stripe **não** disparam o redirect global do interceptor; mensagens usam só `response.data.error`, perdendo `details` (rate limit, permissão). Duplicação de `API_URL` e cookies `withCredentials` manual.
- **Arquivos relacionados:** `PaymentManagement.tsx`, `AccountManagement.tsx` (sync/portal), `api.ts` (interceptors L62–89, `formatApiError` L1049+)
- **Evidência:**
```typescript
// PaymentManagement.tsx — padrão repetido
await axios.post(`${API_URL}/stripe/sync-subscription`, {}, { withCredentials: true });
```
`apiService` já centraliza checkout/plans mas **não** expõe portal/sync/change-plan.
- **Como reproduzir:** expirar sessão → abrir aba Plano → sincronizar; comparar comportamento com `GET /api/account` (redirect) vs Stripe (toast genérico, permanece na página).
- **Causa provável:** implementação Stripe anterior ao padrão do módulo checkout.
- **Ajuste recomendado:** adicionar `createPortalSession`, `syncSubscription`, `changePlan` no `ApiService`; migrar componentes; tratar erros com `formatApiError`.

---

### ACHADO 05 — Sincronização automática de assinatura engole falhas
- **Gravidade:** média  
- **Tipo:** bug silencioso  
- **Impacto no usuário:** ao entrar na aba Plano, falha de rede/403/500 na sync automática não gera feedback; UI mostra plano possivelmente desatualizado (dados só do `user` em contexto).
- **Arquivos relacionados:** `PaymentManagement.tsx` (L202–246)
- **Evidência:**
```typescript
} catch {
  // Não mostrar erro na sincronização automática
} finally {
  setIsSyncing(false);
}
```
- **Como reproduzir:** bloquear `POST /api/stripe/sync-subscription` → abrir Configurações → Plano; nenhum aviso, dados antigos.
- **Causa provável:** evitar “poluir” a UI na montagem.
- **Ajuste recomendado:** banner discreto ou ícone de aviso quando sync automática falhar; manter sync manual com mensagem completa.

---

### ACHADO 06 — Filtro Ativação/Inativação nos logs quebra paginação e total
- **Gravidade:** alta  
- **Tipo:** bug silencioso de dados  
- **Impacto no usuário:** ao filtrar “Ativação”, vê no máximo os itens da página atual que passaram no filtro client-side; total e “X de Y logs” ficam errados; páginas vazias sem explicar que o filtro é parcial.
- **Arquivos relacionados:** `AuditLogs.tsx`, `accountController.getAuditLogs`
- **Evidência:** BE filtra `action=update` (L94–96); FE filtra `getRealAction === activate` (L118–123) e sobrescreve `pagination.total` com `filteredLogs.length` (L126–128) — contagem da página, não do universo.
- **Como reproduzir:** garantir >10 ativações no histórico → filtro “Ativação” → ver no máximo 10 linhas e total incorreto.
- **Causa provável:** ativação não é `action` nativa no banco.
- **Ajuste recomendado:** filtro server-side (metadata/flag) ou endpoint dedicado; não recalcular `total` no cliente; exibir aviso se filtro for client-side.

---

### ACHADO 07 — Logs de auditoria restritos a `entity=member`
- **Gravidade:** média  
- **Tipo:** divergência de escopo / UX  
- **Impacto no usuário:** alterações em igreja, conta, congregação e ações transversais registradas no BE não aparecem; administrador acredita que “não houve movimento” no sistema.
- **Arquivos relacionados:** `AuditLogs.tsx` (L101–102), `accountController.getAuditLogs`, `churchController.updateChurch` (auditoria `entity: 'church'`)
- **Evidência:** `entity: 'member'` fixo na chamada; `ENTITY_LABELS` só `member` e `congregation`.
- **Como reproduzir:** atualizar dados da igreja → aba Logs → evento `church` não listado.
- **Causa provável:** MVP focado em membros.
- **Ajuste recomendado:** filtro por entidade (Todas / Membros / Igreja / Conta / …) repassado ao BE; labels e ícones por tipo.

---

### ACHADO 08 — Email alterado com sucesso, UI mantém email antigo
- **Gravidade:** média  
- **Tipo:** estado inconsistente  
- **Impacto no usuário:** após trocar email, card “Informações da Conta” continua mostrando o endereço antigo até F5; risco de achar que a operação falhou.
- **Arquivos relacionados:** `AccountManagement.tsx` (`handleChangeEmail` L257–262 vs `accountData` L464–469)
- **Evidência:** sucesso fecha modal e limpa formulário, mas **não** chama `getAccountData()` nem atualiza `accountData`.
- **Como reproduzir:** alterar email com sucesso → observar card sem atualização.
- **Ajuste recomendado:** recarregar conta após sucesso ou atualizar `accountData.email` com `newEmail` + aviso de confirmação pendente.

---

### ACHADO 09 — Texto de exclusão de conta superestima impacto para convidados
- **Gravidade:** média  
- **Tipo:** UX / clareza  
- **Impacto no usuário:** modal lista remoção de “dados da igreja, membros, relatórios” para qualquer usuário; `DELETE /api/account` remove o usuário Auth (`accountController` L428), não a igreja inteira quando o papel é admin convidado.
- **Arquivos relacionados:** `AccountManagement.tsx` (L705–710), `accountController.deleteAccount`
- **Evidência:** copy fixo “todos os dados… incluindo igreja, membros…”; BE bloqueia só assinatura paga ativa (L408–412), não diferencia owner vs convidado no texto.
- **Como reproduzir:** login como admin convidado (não owner) → Excluir conta → ler aviso vs efeito real (perde acesso; igreja permanece).
- **Ajuste recomendado:** copy condicional por `currentRole === 'owner'` vs demais; para owner, descrever exclusão completa se for regra de negócio (validar cascata no banco).

---

### ACHADO 10 — CNPJ exibido como obrigatório, mas opcional no FE/BE
- **Gravidade:** média  
- **Tipo:** UX / validação  
- **Impacto no usuário:** label “CNPJ *” sugere obrigatoriedade; Zod e Joi permitem vazio; inconsistência com onboarding e suporte.
- **Arquivos relacionados:** `ChurchManagement.tsx` (L477–478, schema L76–83), `churchValidator` `cnpj` optional
- **Como reproduzir:** salvar igreja sem CNPJ → sucesso; label ainda mostra asterisco.
- **Ajuste recomendado:** remover `*` ou tornar CNPJ obrigatório em ambos os lados (decisão de produto).

---

### ACHADO 11 — Erros sem `formatApiError` em Usuários e Logs
- **Gravidade:** baixa  
- **Tipo:** clareza de mensagem  
- **Impacto no usuário:** validações Joi (`details` array) aparecem como “Erro ao adicionar usuário” sem detalhe.
- **Arquivos relacionados:** `ChurchUsersManagement.tsx` (L67, L95), `AuditLogs.tsx` (L131), `api.ts` `formatApiError`
- **Evidência:** `err instanceof Error ? err.message` sem concatenar `details`.
- **Ajuste recomendado:** padronizar `toast.error(formatApiError(err))` em todos os catches do módulo.

---

### ACHADO 12 — `?tab=` inválido ou sem permissão não corrige aba ativa
- **Gravidade:** baixa  
- **Tipo:** edge case / UX  
- **Impacto no usuário:** `/settings?tab=users` como reader mantém aba anterior no estado, URL enganosa.
- **Arquivos relacionados:** `settings/page.tsx` (L34–38)
- **Evidência:** `setActiveSection` só quando `settingsSections.some(...)`; se falhar, não há fallback nem limpeza da query.
- **Ajuste recomendado:** fallback para `account` ou `church` + `replace` da URL.

---

### ACHADO 13 — Convite de usuário: busca global `listUsers` limitada a 1000
- **Gravidade:** baixa  
- **Tipo:** risco provável (escala)  
- **Impacto no usuário:** em bases Auth grandes, email existente pode não ser encontrado e sistema tenta criar duplicata (erro confuso do Supabase).
- **Arquivos relacionados:** `churchUserController.createChurchUser` (L106–108)
- **Evidência:** `listUsers({ perPage: 1000 })` sem paginação completa.
- **Ajuste recomendado:** `getUserByEmail` admin API ou paginação até achar email.

---

## 4. Sessão, credenciais inválidas, expiração e redirecionamentos

| Cenário | Comportamento observado |
|---------|-------------------------|
| Rota `/settings` sem login | `(main)/layout` → `/login` após `isLoading` |
| 401 em `apiService` | Redirect `/login` (exceto rotas públicas/check auth) |
| 401 em Stripe (`axios` cru) | **Sem** redirect automático; toast/erro local |
| `PUT /church` como reader | 403 no BE; FE desabilita “Editar” (`canManageChurch`) |
| Stripe portal/sync/change-plan | `requireRole('admin')` — owner OK (`hasRoleOrHigher`) |
| `GET /account/logs` | `requireRole('admin')` — editor/reader 403 |
| Rate limit conta sensível | 5 req/h em email/delete (`account.ts` L30–37) |
| Exclusão com assinatura paga ativa | BE 400 com `details`; FE esconde formulário se `hasActivePaidPlan()` |

**Conclusão:** proteção de rota e papéis no BE são sólidas; gaps estão em **consistência FE** (tabs, mensagens, cliente HTTP) e **estado pós-sucesso**.

---

## 5. Cenários extras a testar

- Compartilhar link `/settings?tab=payment` e navegar entre abas (URL vs conteúdo).  
- Reader/editor: tabs visíveis vs ações permitidas; 403 no DevTools em Stripe.  
- Sessão expirada durante sync automática na aba Plano vs durante `GET /account`.  
- Alterar email/senha/telefone: UI atualiza sem F5; rate limit (6ª tentativa em 1h).  
- Owner vs admin convidado: exclusão de conta (copy e efeito real).  
- Plano cancelado com `subscription_end_date` futuro: exclusão permitida? sync pós-portal Stripe.  
- Logs: filtro Ativação com >1 página de `update` no backend.  
- Duplo clique em “Salvar”, “Adicionar usuário”, “Confirmar troca de plano”.  
- Convite email já em outra igreja / já na mesma igreja.  
- Admin edita próprio papel/status; remover último admin.  
- `?tab=invalid` e `?tab=users` como reader.  
- Múltiplas abas: igreja atualizada em uma, visualizada na outra.

---

## 6. Lacunas de cobertura

- Testes E2E por papel (reader/editor/admin/owner) em cada tab.  
- Teste de contrato: respostas 403/400 com `details` chegam ao toast.  
- Testes de paginação/filtro de audit logs com seed conhecido.  
- Teste de integração Stripe mockado (sync falha, portal sem URL).  
- Remoção de `console.log` em produção em `getAuditLogs` (L574–589).  
- UI para `resend-confirmation` (`POST /api/account/resend-confirmation`) — endpoint existe, FE não expõe.  
- Status `invited` em `church_users` — BE aceita, FE só `active`/`disabled`.

---

## 7. O que desenvolvimento deve ajustar (priorizado)

### Prioridade alta

1. **ACHADO 01** — Sincronizar `?tab=` com `router.replace` ao trocar abas; fallback para tab inválida (**ACHADO 12** no mesmo PR).  
2. **ACHADO 02** — Carregar igreja via `GET /api/church` na aba Igreja (e após salvar).  
3. **ACHADO 04** — Centralizar Stripe no `apiService` + `formatApiError` + interceptor 401.  
4. **ACHADO 06** — Corrigir filtro Ativação/Inativação (server-side ou documentar limitação e não mentir no `total`).

### Prioridade média

5. **ACHADO 03** — Ocultar aba Plano para quem não é admin/owner (ou modo read-only explícito).  
6. **ACHADO 05** — Feedback mínimo quando sync automática falhar.  
7. **ACHADO 07** — Ampliar logs (entidades) ou filtro “Todas”.  
8. **ACHADO 08** — Recarregar/atualizar `accountData` após troca de email (e telefone se reabilitar UI).  
9. **ACHADO 09** — Ajustar copy do modal de exclusão por papel (owner vs convidado).  
10. **ACHADO 10** — Alinhar obrigatoriedade do CNPJ (label vs schema).

### Prioridade baixa

11. **ACHADO 11** — `formatApiError` em Usuários e Logs.  
12. **ACHADO 13** — Busca de usuário por email sem `listUsers(1000)`.

### Melhorias opcionais (fora dos IDs)

- Expor “Reenviar confirmação de email” quando `email_confirmed_at` nulo.  
- Remover segundo `window.confirm` em troca de plano (já há modal de confirmação).  
- Reabilitar ou remover de vez fluxo de telefone (UI desabilitada, modal ainda existe).  
- `requestIdRef` em `fetchLogs` se filtros forem trocados rapidamente.

---

## 8. Parecer final

O Módulo 9 entrega a estrutura esperada de configurações multi-tenant com RBAC no backend, mas **não está pronto para sign-off de QA** enquanto persistirem:

- deep link de tabs inconsistente;  
- dados da igreja/conta desatualizados na UI;  
- integração Stripe paralela ao cliente HTTP padrão;  
- paginação enganosa nos logs filtrados.

Após o pacote de prioridade alta e smoke da seção 5, recomenda-se ciclo de revalidação focado em papéis, sessão expirada e billing.
