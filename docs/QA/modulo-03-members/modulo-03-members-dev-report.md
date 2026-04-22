# Relatório de Execução — Módulo 03: Gestão de Membros

> **Engenheiro:** Senior Software Engineer (IA)  
> **Data:** Abril 2026  
> **Módulo:** Gestão de Membros  
> **Relatório referência:** `modulo-03-members.md`  
> **Status geral:** ✅ Todos os 12 achados resolvidos | 0 erros de lint

---

## 1. Resumo Executivo

O módulo de Gestão de Membros apresentava dois achados críticos que afetavam silenciosamente o comportamento do sistema: o filtro de faixa etária produzia resultados incompletos com paginação incorreta, e o contador de usos do link público era vulnerável a race conditions em submissões simultâneas.

Todos os 12 achados foram corrigidos. As correções mais significativas envolveram:
- **Reestruturação da query de listagem** para suportar filtro de faixa etária com paginação correta (em memória)
- **Incremento atômico com optimistic locking** para o contador de usos do link público
- **Novo endpoint PATCH dedicado** para alteração de status, eliminando a race condition do padrão GET+PUT

---

## 2. Achados por Status

| # | Achado | Gravidade | Status | Arquivo(s) |
|---|--------|-----------|--------|-----------|
| 01 | Filtro de faixa etária quebra paginação | 🔴 Crítica | ✅ Resolvido | `memberController.ts` |
| 02 | Contador de usos sem atomicidade | 🔴 Crítica | ✅ Resolvido | `publicRegistrationController.ts` |
| 03 | WhatsApp sem exibição de erro | 🟠 Alta | ✅ Resolvido | `MemberForm.tsx` |
| 04 | `admission` sem validação de enum no backend | 🟠 Alta | ✅ Resolvido | `memberValidator.ts` |
| 05 | Desativar/Reativar com GET+PUT TOCTOU | 🟠 Alta | ✅ Resolvido | `memberController.ts`, `members.ts`, `api.ts`, `members/page.tsx` |
| 06 | Verificação de nome duplicado O(n) no link público | 🟡 Média | ✅ Resolvido | `publicRegistrationController.ts` |
| 07 | `sort_by` sem whitelist | 🟡 Média | ✅ Resolvido | `memberController.ts` |
| 08 | `memberLimit null` (loading) vs null (error) | 🟡 Média | ✅ Resolvido | `members/page.tsx` |
| 09 | `createMember` retorna membro sem grupos | 🟡 Média | ✅ Resolvido | `memberController.ts` |
| 10 | Default de sorting divergente entre Context e Página | 🟡 Média | ✅ Resolvido | `MembersContext.tsx` |
| 11 | CEP auto-complete sobrescreve campos preenchidos | 🟢 Baixa | ✅ Resolvido | `MemberForm.tsx` |
| 12 | `calcularIdade` off-by-one em UTC- | 🟢 Baixa | ✅ Resolvido | `MemberForm.tsx` |

---

## 3. Detalhamento por Achado

---

### ACHADO 01 — Filtro de Faixa Etária Quebra a Paginação ✅

**Causa raiz confirmada:** A coluna `birth` não é filterable via SQL por faixa etária — a idade precisa ser calculada. O código anterior aplicava o filtro de idade *após* o `.range()` do banco, o que significa que filtrava apenas os 10 registros da página atual, não o universo completo.

**Diagnóstico:** Se existem 50 membros com idade entre 30-40 anos espalhados por 5 páginas, o usuário via no máximo os que estavam na página 1 (antes do filtro de idade), podendo ver 0-10 resultados e sem paginação.

**Correção aplicada em `memberController.ts`:**

```typescript
const hasAgeFilter = age_from !== undefined || age_to !== undefined;

// Função de cálculo de idade timezone-safe (também usada no ACHADO 12)
const calcAge = (birth: string): number | null => {
  const parts = birth.split('T')[0].split('-').map(Number);
  const [bYear, bMonth, bDay] = parts;
  const today = new Date();
  let age = today.getFullYear() - bYear;
  if (today.getMonth() + 1 < bMonth || (today.getMonth() + 1 === bMonth && today.getDate() < bDay)) age--;
  return age >= 0 ? age : null;
};

if (hasAgeFilter) {
  // Busca todos os membros (sem range) que passam nos filtros de banco,
  // aplica filtro de idade em memória, depois pagina o resultado filtrado
  const { data: allMembers } = await query; // sem .range()
  const ageFiltered = allMembers.filter(m => { /* calcAge */ });
  actualCount = ageFiltered.length;
  filteredMembers = ageFiltered.slice(offset, offset + limit); // paginação manual
} else {
  // Caminho normal: paginação no banco
  const { data: members, count } = await query.range(offset, offset + limit - 1);
  filteredMembers = members;
  actualCount = count;
}
```

**Limitação documentada:** A abordagem de buscar sem paginação funciona bem para volumes moderados (até alguns milhares de membros por igreja). Para volumes maiores, a solução ideal é uma coluna computada no banco (view ou coluna `member_age`). Esta dívida técnica é explicitada no relatório.

---

### ACHADO 02 — Contador de Usos sem Atomicidade ✅

**Causa raiz confirmada:** O padrão read-modify-write (`current_uses + 1` calculado em JS sobre valor lido no middleware) permite que dois requests simultâneos leiam o mesmo valor e ambos incrementem para o mesmo total.

**Diagnóstico:** Com `max_uses=10` e dois requests simultâneos quando `current_uses=9`:
- Ambos passam pelo middleware (`9 < 10`)
- Ambos criam membros
- Ambos fazem `UPDATE SET current_uses = 10`
- Resultado: 11 membros com `current_uses = 10`

**Correção aplicada em `publicRegistrationController.ts`:**

Implementado **optimistic locking** com duas condições no UPDATE:
1. `eq('current_uses', registrationLink.current_uses)` — só atualiza se o valor não mudou desde a leitura no middleware
2. `lt('current_uses', registrationLink.max_uses)` — guarda extra para não ultrapassar o limite

O incremento ocorre **após** o insert do membro. Se o lock falhar (outro request chegou primeiro), o membro é deletado (rollback) e retorna 400.

```typescript
if (registrationLink.max_uses !== null) {
  const { data: claimed } = await supabase
    .from('public_registration_links')
    .update({ current_uses: registrationLink.current_uses + 1 })
    .eq('id', registrationLink.id)
    .eq('current_uses', registrationLink.current_uses) // lock otimístico
    .lt('current_uses', registrationLink.max_uses)
    .select('current_uses')
    .single();

  if (!claimed) {
    await supabase.from('members').delete().eq('id', member.id); // rollback
    return res.status(400).json({ error: 'Limite de usos atingido', ... });
  }
}
```

Com dois requests simultâneos:
- Request A atualiza WHERE `current_uses=9` → sucesso, `current_uses=10`
- Request B tenta WHERE `current_uses=9` → falha (já é 10), membro é deletado, retorna 400

---

### ACHADO 03 — WhatsApp sem Exibição de Erro ✅

**Causa raiz confirmada:** A prop `error` estava ausente no `<Input label="WhatsApp">`, ao contrário do campo "Telefone" logo acima que tinha `error={errors.phone?.message}`.

**Correção aplicada em `MemberForm.tsx`:**

```tsx
<Input
  label="WhatsApp"
  ...
  error={errors.whatsapp?.message}  {/* adicionado */}
  isLoading={isLoading}
/>
```

---

### ACHADO 04 — `admission` sem Validação de Enum no Backend ✅

**Causa raiz confirmada:** O campo `admission` no `memberSchema` era `Joi.string().required()` sem `.valid()`, aceitando qualquer string. Contrastava com `gender` e `marital_status` que já usavam `.valid()`.

**Correção aplicada em `memberValidator.ts`:**

```typescript
admission: Joi.string()
  .valid(
    'Batismo', 'Batismo Infantil', 'Transferencia', 'Reconciliação',
    'Profissão de fé', 'Apresentação (sem batismo)', 'Apresentação (Criança)',
    'Batismo não professo (Criança)', 'Outro'
  )
  .required()
  .messages({
    'any.only': 'Tipo de recebimento inválido. Valores aceitos: ...',
    'string.empty': 'Tipo de recebimento é obrigatório',
    'any.required': 'Tipo de recebimento é obrigatório'
  }),
```

Os valores foram alinhados com as opções do `<Select>` no frontend.

---

### ACHADO 05 — Desativar/Reativar com GET+PUT Race Condition ✅

**Causa raiz confirmada:** `handleConfirmDeactivate` e `handleConfirmReactivate` faziam `GET /members/:id` para buscar todos os 20+ campos do membro, construíam um payload completo apenas para mudar `active`, e enviavam `PUT`. Qualquer edição feita entre o GET e o PUT era perdida.

**Correção aplicada em 4 arquivos:**

**`backend/src/controllers/memberController.ts`** — novo handler `setMemberStatus`:
```typescript
export const setMemberStatus = async (req, res) => {
  // Atualiza APENAS o campo active — sem GET prévio, sem dados extras
  const { data: updated } = await supabase
    .from('members')
    .update({ active })
    .eq('id', id)
    .eq('church_id', churchId)
    .select('id, name, active')
    .single();
};
```

**`backend/src/routes/members.ts`** — nova rota:
```typescript
router.patch('/:id/status', requireRole('editor'), setMemberStatus);
```

**`frontend/src/services/api.ts`** — novo método:
```typescript
async setMemberStatus(id: string, active: boolean) {
  const response = await this.api.patch(`/members/${id}/status`, { active });
  return response.data;
}
```

**`frontend/src/app/(main)/members/page.tsx`** — handlers simplificados:
```typescript
const handleConfirmDeactivate = useCallback(async () => {
  await apiService.setMemberStatus(selectedMemberId, false);
  updateMemberOptimistic(selectedMemberId, { active: false });
  window.dispatchEvent(new CustomEvent('memberUpdated'));
}, [...]);
```

---

### ACHADO 06 — Verificação O(n) de Nome Duplicado no Link Público ✅

**Causa raiz confirmada:** `publicRegistrationController.ts` buscava todos os membros da igreja (sem LIMIT) e fazia comparação string por string em JS. O `memberController.ts` autenticado já usava `ilike` com `limit(1)`.

**Correção aplicada em `publicRegistrationController.ts`:**

```typescript
const { data: duplicate } = await supabase
  .from('members')
  .select('id, name')
  .eq('church_id', churchId)
  .ilike('name', normalizedData.name.trim())
  .limit(1);

if (duplicate && duplicate.length > 0) {
  return res.status(400).json({ error: 'Membro já cadastrado', ... });
}
```

---

### ACHADO 07 — `sort_by` sem Whitelist ✅

**Causa raiz confirmada:** `req.query.sort_by` era passado diretamente ao `.order()` do Supabase sem validação, permitindo ordenar por qualquer coluna incluindo campos internos.

**Correção aplicada em `memberController.ts`:**

```typescript
const ALLOWED_SORT_FIELDS = ['name', 'birth', 'created_at', 'updated_at', 'admission_date', 'city', 'state'];
const sort_by_raw = req.query.sort_by as string || 'name';
const sort_by = ALLOWED_SORT_FIELDS.includes(sort_by_raw) ? sort_by_raw : 'name';
```

Qualquer valor fora da whitelist silenciosamente cai para `name` (comportamento seguro e sem erro para o usuário).

---

### ACHADO 08 — `memberLimit null` (Loading) vs (Error) ✅

**Causa raiz confirmada:** O catch de `updateMemberLimit` silenciava o erro sem diferenciar o estado inicial `null` (ainda carregando) do estado de erro. O render mostrava os botões de ação em ambos os casos.

**Correção aplicada em `members/page.tsx`:**

```typescript
const [memberLimitLoadError, setMemberLimitLoadError] = useState(false);

// catch:
setMemberLimitLoadError(true);

// render — três estados:
{memberLimitLoadError ? (
  <div className="text-amber-600 bg-amber-50 ...">
    Não foi possível verificar o limite de membros.
  </div>
) : memberLimit === null || memberLimit.canAdd ? (
  <>{/* botões normais */}</>
) : (
  <div>Limite de membros atingido...</div>
)}
```

---

### ACHADO 09 — `createMember` Retorna Membro sem Grupos ✅

**Causa raiz confirmada:** `res.status(201).json(member)` retornava o row bruto do banco sem `groups` e sem `congregation`. O frontend fazia `as unknown as Member` (cast inseguro) e exibia o membro sem grupos no update otimístico.

**Correção aplicada em `memberController.ts`:**

Após o insert e a associação de grupos, um segundo `select` com joins retorna o membro completo:

```typescript
const { data: fullMember } = await supabase
  .from('members')
  .select(`*, congregations(...), member_groups(groups(...))`)
  .eq('id', member.id)
  .single();

const memberWithGroups = {
  ...fullMember,
  congregation: fullMember.congregations,
  groups: fullMember.member_groups.map(mg => mg.groups).filter(Boolean),
  congregations: undefined,
  member_groups: undefined,
};
return res.status(201).json(memberWithGroups);
```

Fallback para o `member` simples mantido caso o join falhe inesperadamente.

---

### ACHADO 10 — Default de Sorting Divergente ✅

**Causa raiz confirmada:** `MembersContext.tsx` inicializava `currentSorting` com `name asc`, enquanto `members/page.tsx` usava `created_at desc` como `initialSorting`.

**Correção aplicada em `MembersContext.tsx`:**

```typescript
const [currentSorting, setCurrentSorting] = useState({
  sort_by: 'created_at',  // era 'name'
  sort_order: 'desc'       // era 'asc'
});
```

---

### ACHADO 11 — CEP Auto-complete Sobrescreve Campos Preenchidos ✅

**Causa raiz confirmada:** O handler `handleCEPChange` aplicava `setValue` para todos os campos retornados pelo ViaCEP incondicionalmente, mesmo que o usuário já tivesse preenchido esses campos manualmente.

**Correção aplicada em `MemberForm.tsx`:**

```typescript
if (cepData.logradouro && !watch('address')) setValue('address', cepData.logradouro);
if (cepData.bairro && !watch('neighborhood')) setValue('neighborhood', cepData.bairro);
if (cepData.localidade && !watch('city')) setValue('city', cepData.localidade);
if (cepData.uf && !watch('state')) {
  setValue('state', cepData.uf);
  fetchCities(...);
}
```

Campos já preenchidos pelo usuário são preservados.

---

### ACHADO 12 — `calcularIdade` Off-by-One em UTC- ✅

**Causa raiz confirmada:** `new Date('YYYY-MM-DD')` interpreta a string como UTC midnight. Em fusos negativos (UTC-3, UTC-5), esse timestamp é convertido para o dia anterior local. No dia do aniversário, a idade calculada era 1 ano a menos.

**Correção aplicada em `MemberForm.tsx`:**

```typescript
const calcularIdade = (birth: string): number | null => {
  const datePart = birth.split('T')[0]; // suporte a ISO completo
  const [bYear, bMonth, bDay] = datePart.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - bYear;
  const monthDiff = today.getMonth() + 1 - bMonth;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDay)) age--;
  return age >= 0 ? age : null;
};
```

Parse manual dos componentes da data — sem `new Date()` no parse inicial.

---

## 4. Arquivos Modificados

| Arquivo | Achados | Natureza |
|---------|---------|---------|
| `backend/src/controllers/memberController.ts` | 01, 05, 07, 09 | Lógica de query, whitelist, novo handler, resposta completa |
| `backend/src/routes/members.ts` | 05 | Nova rota PATCH |
| `backend/src/validators/memberValidator.ts` | 04 | Enum de admission |
| `backend/src/controllers/publicRegistrationController.ts` | 02, 06 | Atomicidade, ilike query |
| `frontend/src/services/api.ts` | 05 | Novo método setMemberStatus |
| `frontend/src/app/(main)/members/page.tsx` | 05, 08 | Handlers simplificados, estado de erro separado |
| `frontend/src/context/MembersContext.tsx` | 10 | Default de sorting alinhado |
| `frontend/src/components/members/MemberForm.tsx` | 03, 11, 12 | Erro whatsapp, CEP condicional, idade timezone-safe |

---

## 5. Correção Pós-Revalidação

### REGRESSÃO R01 — Desativação via PATCH não Remove Participações de Calendário ✅

**Problema identificado pelo QA:** O novo endpoint `PATCH /members/:id/status` (ACHADO 05) altera apenas o campo `active`, mas o fluxo original `PUT /members/:id` (`updateMember`) continha um bloco explícito que removia as participações futuras de calendário quando um membro era desativado. Esse efeito colateral foi perdido na refatoração.

**Impacto:** Membro desativado permanecia em eventos futuros do calendário — inconsistência de dados visível no módulo de calendário.

**Correção aplicada em `memberController.ts` — função `setMemberStatus`:**

```typescript
// Após o update bem-sucedido, replicar cleanup de calendário do updateMember:
if (active === false && existing.active === true) {
  const now = new Date().toISOString();
  const { data: futureParticipations } = await supabase
    .from('calendar_participants')
    .select(`id, calendar_item_id, calendar_items!inner(start_date)`)
    .eq('member_id', id)
    .gte('calendar_items.start_date', now);

  if (futureParticipations && futureParticipations.length > 0) {
    const participationIds = futureParticipations.map(p => p.id);
    await supabase.from('calendar_participants').delete().in('id', participationIds);
  }
}
```

A lógica é idêntica à do `updateMember`. Erros no cleanup são logados mas não falham a operação de desativação — mesmo comportamento conservador do original.

---

## 6. Riscos Residuais e Dívidas Técnicas

| Item | Risco | Recomendação |
|------|-------|--------------|
| ACHADO 01 — Filtro de faixa etária sem paginação no banco | Para igrejas com >10.000 membros, buscar todos sem `.range()` pode causar latência | Criar coluna computada `member_age` ou view `members_with_age` no Supabase para filtro nativo |
| ACHADO 02 — Optimistic locking no contador de usos | Há uma janela mínima entre o insert do membro e o increment atômico (membro existe sem contador incrementado) | Considerar RPC SQL (`increment_and_check`) para atomicidade completa em produção de alta carga |
| ACHADO 05 — updateMember sem rollback de status | O antigo GET+PUT foi substituído pelo PATCH atômico, mas o endpoint PUT ainda existe e pode ser chamado diretamente por scripts | Documentar que alterações de status devem usar PATCH |
| `updateMemberLimit()` sem log de erro | O estado de erro agora é sinalizado na UI, mas sem log não é monitorável | Adicionar `console.warn` com contexto no catch de `updateMemberLimit` |

---

## 6. Linter

Após todas as modificações, nenhum erro de lint foi encontrado em nenhum dos 8 arquivos alterados.
