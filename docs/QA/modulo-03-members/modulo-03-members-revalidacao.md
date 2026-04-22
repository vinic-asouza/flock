# QA — Revalidação — Módulo 03: Gestão de Membros

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Revalidação pós-correção  
> **Base:** `modulo-03-members.md` (12 achados) + `modulo-03-members-dev-report.md`  
> **Resultado geral:** ✅ APROVADO COM RESSALVA — 12 achados resolvidos; 1 regressão funcional identificada (crítica para o fluxo de calendário)

---

## 1. Resumo Executivo

O DEV corrigiu os 12 achados em 8 arquivos. A leitura direta do código confirma que todas as implementações estão corretas e alinhadas com as sugestões do relatório original.

As correções mais complexas (filtro de faixa etária com paginação em memória, optimistic locking no contador de usos do link público, endpoint PATCH atômico para status) foram bem executadas. Não há correções superficiais ou simbólicas.

**Foi identificada 1 regressão funcional** introduzida pela correção do ACHADO 05: o novo endpoint `PATCH /members/:id/status` remove a race condition mas perde o efeito colateral de limpeza de participações futuras de calendário, que existia no fluxo original `PUT /members/:id`. Membros desativados via interface permanecem em eventos futuros no calendário.

### Placar

| Classificação | Qtd | Achados |
|---------------|-----|---------|
| ✅ Resolvido | 12 | 01 a 12 todos |
| 🔴 Regressão nova | 1 | R01 — cleanup de calendário perdido ao desativar membro |

---

## 2. Status de Cada Achado Original

---

### ACHADO 01 — Filtro de Faixa Etária Quebra a Paginação
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// memberController.ts — linhas 213–273 (verificado)
const hasAgeFilter = age_from !== undefined || age_to !== undefined;

if (hasAgeFilter) {
  // Busca TODOS os membros sem .range() para filtrar sobre o universo completo
  const { data: allMembers } = await query;
  
  const ageFiltered = allMembers.filter(member => {
    const age = calcAge(member.birth);
    if (age_from !== undefined && age < age_from) return false;
    if (age_to !== undefined && age > age_to) return false;
    return true;
  });
  
  actualCount = ageFiltered.length;             // ← total correto
  filteredMembers = ageFiltered.slice(offset, offset + limit); // ← paginação manual correta
} else {
  // Caminho normal: paginação no banco
  const { data: members, count } = await query.range(offset, offset + limit - 1);
  actualCount = count || 0;
}
```

A bifurcação é limpa: com filtro de idade, busca total e pagina em memória; sem filtro, usa paginação do banco. O `actualCount` reflete o universo real em ambos os caminhos. ✓

Dívida documentada: performance com >10.000 membros por church. Aceitável para estágio atual do produto. ✓

---

### ACHADO 02 — Contador de Usos sem Atomicidade
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// publicRegistrationController.ts — linhas 200–221 (verificado)
if (registrationLink.max_uses !== null) {
  const { data: claimed, error: claimError } = await supabase
    .from('public_registration_links')
    .update({ current_uses: registrationLink.current_uses + 1 })
    .eq('id', registrationLink.id)
    .eq('current_uses', registrationLink.current_uses) // ← lock otimístico
    .lt('current_uses', registrationLink.max_uses)     // ← guarda de limite
    .select('current_uses')
    .single();

  if (claimError || !claimed) {
    await supabase.from('members').delete().eq('id', member.id); // ← rollback
    return res.status(400).json({ error: 'Limite de usos atingido', ... });
  }
}
```

O optimistic locking é correto: a condição `.eq('current_uses', valor_lido)` garante que apenas um request vence a corrida. O outro recebe `error` no `.single()` (0 linhas afetadas → PGRST116), detectado por `claimError || !claimed`, e o membro é removido em rollback. ✓

Para links sem `max_uses`: incremento simples sem lock (correto — sem limite a proteger). ✓

---

### ACHADO 03 — Campo WhatsApp Não Exibe Erro de Validação
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```tsx
// MemberForm.tsx — linha 714 (verificado)
<Input
  label="WhatsApp"
  value={whatsappDisplay}
  onChange={(e) => handlePhoneChange(e, 'whatsapp')}
  maxLength={15}
  error={errors.whatsapp?.message}   // ← adicionado
  isLoading={isLoading}
/>
```

Alinhado com o campo Telefone (que já tinha o `error` prop). ✓

---

### ACHADO 04 — `admission` sem Validação de Enum no Backend
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// memberValidator.ts — linhas 198–216 (verificado)
admission: Joi.string()
  .valid(
    'Batismo', 'Batismo Infantil', 'Transferencia', 'Reconciliação',
    'Profissão de fé', 'Apresentação (sem batismo)', 'Apresentação (Criança)',
    'Batismo não professo (Criança)', 'Outro'
  )
  .required()
  .messages({
    'any.only': 'Tipo de recebimento inválido. Valores aceitos: ...',
    ...
  }),
```

Os 9 valores cobrem tanto as opções do `<Select>` adulto quanto infantil, além de valores legados que podem existir no banco (`Apresentação (Criança)`, `Batismo não professo (Criança)`). ✓

Nota: `Apresentação (Criança)` e `Batismo não professo (Criança)` existem no validator mas não aparecem no `<Select>` do formulário (são detectados pelo `isInfantMember` para exibição correta, mas não são selecionáveis novamente em edição). É comportamento pré-existente — não regressão introduzida por esta correção.

---

### ACHADO 05 — Desativar/Reativar com GET+PUT Race Condition
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

**Backend — novo handler (verificado):**
```typescript
// memberController.ts — linhas 1960–2030
export const setMemberStatus = async (req, res) => {
  // Verificação de posse (church_id) via SELECT
  const { data: existing } = await supabase
    .from('members').select('id, name, active')
    .eq('id', id).eq('church_id', churchId).single();
  
  // Atualização atômica — APENAS o campo active
  const { data: updated } = await supabase
    .from('members').update({ active })
    .eq('id', id).eq('church_id', churchId)
    .select('id, name, active').single();
  
  // Auditoria registrada ✓
  res.json({ message: '...', member: updated });
};
```

**Rota (verificada):** `router.patch('/:id/status', requireRole('editor'), setMemberStatus)` ✓

**API service (verificado):** `apiService.setMemberStatus(id, active)` via `.patch()` ✓

**Frontend (verificado):**
```typescript
// members/page.tsx — handleConfirmDeactivate (linhas 244–253)
await apiService.setMemberStatus(selectedMemberId, false);
updateMemberOptimistic(selectedMemberId, { active: false });
window.dispatchEvent(new CustomEvent('memberUpdated'));
```

Sem mais GET+PUT. Sem mais cópia de todos os campos. Sem janela de race condition. ✓

**⚠️ Ver REGRESSÃO R01** — o cleanup de calendário foi perdido nesta correção.

---

### ACHADO 06 — Verificação O(n) de Nome Duplicado no Link Público
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// publicRegistrationController.ts — linhas 113–121 (verificado)
const { data: duplicate } = await supabase
  .from('members')
  .select('id, name')
  .eq('church_id', churchId)
  .ilike('name', normalizedData.name.trim()) // ← filtro no banco
  .limit(1);                                  // ← no máximo 1 linha retornada

if (!checkError && duplicate && duplicate.length > 0) {
  return res.status(400).json({ error: 'Membro já cadastrado', ... });
}
```

Alinhado com o `memberController.ts` autenticado. ✓

---

### ACHADO 07 — `sort_by` sem Whitelist
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// memberController.ts — linhas 56–59 (verificado)
const ALLOWED_SORT_FIELDS = ['name', 'birth', 'created_at', 'updated_at', 'admission_date', 'city', 'state'];
const sort_by_raw = req.query.sort_by as string || 'name';
const sort_by = ALLOWED_SORT_FIELDS.includes(sort_by_raw) ? sort_by_raw : 'name';
```

Valores fora da whitelist silenciosamente caem para `'name'` — comportamento seguro e sem erro para o usuário. ✓

---

### ACHADO 08 — `memberLimit null` (Loading) vs `null` (Error)
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// members/page.tsx — linhas 107–128 (verificado)
const [memberLimitLoadError, setMemberLimitLoadError] = useState(false);

// No catch:
setMemberLimitLoadError(true);

// Limpar erro em chamada subsequente bem-sucedida:
setMemberLimitLoadError(false);
```

```tsx
// Render com 3 estados distintos (linhas 442–446):
{memberLimitLoadError ? (
  <div className="text-sm text-amber-600 ... bg-amber-50 ...">
    Não foi possível verificar o limite de membros.
  </div>
) : memberLimit === null || memberLimit.canAdd ? (
  <>{/* botões */}</>
) : (
  <div>Limite atingido...</div>
)}
```

Estado `null` (loading) e estado de erro são agora distintos. Quando a API falha, o usuário vê um aviso discreto sem os botões de ação (mais conservador que a sugestão, mas correto e seguro). ✓

---

### ACHADO 09 — `createMember` Retorna Membro sem Grupos
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// memberController.ts — linhas 651–679 (verificado)
// Após insert e associação de grupos:
const { data: fullMember } = await supabase
  .from('members')
  .select(`*, congregations(id, name, address, city, state, leader, phone), member_groups(groups(...))`)
  .eq('id', member.id)
  .single();

if (fullMember) {
  const memberWithGroups = {
    ...fullMember,
    congregation: fullMember.congregations,
    groups: (fullMember.member_groups || []).map(mg => mg.groups).filter(Boolean),
    congregations: undefined,
    member_groups: undefined,
  };
  return res.status(201).json(memberWithGroups); // ← membro completo
}

// Fallback se join falhar:
res.status(201).json(member); // ← membro simples (sem grupos)
```

O update otimístico no frontend agora recebe um `Member` completo com `groups` e `congregation`. O cast `as unknown as Member` ainda existe mas agora é semanticamente correto. ✓

---

### ACHADO 10 — Default de Sorting Divergente
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// MembersContext.tsx — linhas 115–120 (verificado)
const [currentSorting, setCurrentSorting] = useState({
  sort_by: 'created_at',  // era 'name'
  sort_order: 'desc'       // era 'asc'
});
```

Alinhado com `initialSorting` da página. `syncWithServer()` agora parte do mesmo estado inicial. ✓

---

### ACHADO 11 — CEP Auto-complete Sobrescreve Seleções do Usuário
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// MemberForm.tsx — linhas 520–535 (verificado)
if (cepData.logradouro && !watch('address')) {
  setValue('address', cepData.logradouro);
}
if (cepData.bairro && !watch('neighborhood')) {
  setValue('neighborhood', cepData.bairro);
}
if (cepData.localidade && !watch('city')) {
  setValue('city', cepData.localidade);
}
if (cepData.uf && !watch('state')) {
  setValue('state', cepData.uf);
  fetchCities(...);
}
```

Campos já preenchidos pelo usuário são preservados. ✓

Nota residual: no modo `edit`, se o usuário quer usar o CEP para atualizar o endereço, deve limpar os campos antes. Comportamento aceitável e intuitivo.

---

### ACHADO 12 — `calcularIdade` Off-by-One em UTC-
**Status: ✅ RESOLVIDO — CONFIRMADO NO CÓDIGO**

```typescript
// MemberForm.tsx — linhas 237–253 (verificado)
const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  const datePart = birth.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3) return null;
  const [bYear, bMonth, bDay] = parts;
  if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return null;
  const today = new Date();
  let age = today.getFullYear() - bYear;
  const monthDiff = today.getMonth() + 1 - bMonth;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDay)) age--;
  return age >= 0 ? age : null;
};
```

Parse manual de `YYYY-MM-DD` sem usar `new Date()` no parse. Inclui guarda para `parts.length < 3` e `isNaN` — mais defensivo que a sugestão original. ✓

A mesma lógica timezone-safe foi aplicada no `calcAge` do `memberController.ts` (ACHADO 01). ✓

---

## 3. Regressão Identificada

---

### REGRESSÃO R01 — Desativação via PATCH não Remove Participações Futuras de Calendário

- **Gravidade:** 🔴 Crítica (impacto funcional silencioso)
- **Tipo:** Regressão — Funcionalidade perdida
- **Introduzida por:** Correção do ACHADO 05 (novo endpoint `PATCH /members/:id/status`)
- **Arquivo:** `backend/src/controllers/memberController.ts`

**Problema:** O fluxo original de desativação usava `PUT /members/:id` via `updateMember`, que continha um bloco explícito de limpeza de calendário:

```typescript
// memberController.ts — updateMember (LÓGICA ORIGINAL, ~linhas 764–796)
// PASSO 1.5: Se o membro foi inativado, remover de eventos futuros de calendário
if (existingMember.active === true && member.active === false) {
  const now = new Date().toISOString();
  const { data: futureParticipations } = await supabase
    .from('calendar_participants')
    .select(`id, calendar_items!inner(start_date)`)
    .eq('member_id', id)
    .gte('calendar_items.start_date', now);

  if (futureParticipations?.length > 0) {
    await supabase
      .from('calendar_participants')
      .delete()
      .in('id', participationIds);
  }
}
```

O novo `setMemberStatus` altera APENAS `active` — sem nenhum efeito colateral de calendário:

```typescript
// memberController.ts — setMemberStatus (linhas 1993–2000)
const { data: updated } = await supabase
  .from('members')
  .update({ active })      // ← apenas active, sem cleanup de calendário
  .eq('id', id)
  .eq('church_id', churchId)
  .select('id, name, active')
  .single();
```

**Impacto no usuário:** 
- Admin desativa um membro que está escalado em eventos futuros do calendário
- O membro aparece como inativo na lista, mas suas participações futuras permanecem em `calendar_participants`
- O evento do calendário continua listando esse membro como participante
- Inconsistência de dados: membro inativo em escala ativa de evento futuro

**Como reproduzir:**
1. Criar um membro e adicioná-lo a um evento de calendário futuro
2. Desativar o membro via "Desativar" na lista ou modal de visualização
3. Verificar o evento de calendário — o membro ainda aparece como participante

**Sugestão de correção:**

Adicionar o cleanup de calendário ao `setMemberStatus` quando `active = false`:

```typescript
// No setMemberStatus, após o update bem-sucedido:
if (active === false && existing.active === true) {
  const now = new Date().toISOString();
  const { data: futureParticipations } = await supabase
    .from('calendar_participants')
    .select(`id, calendar_items!inner(start_date)`)
    .eq('member_id', id)
    .gte('calendar_items.start_date', now);

  if (futureParticipations && futureParticipations.length > 0) {
    const ids = futureParticipations.map(p => p.id);
    await supabase.from('calendar_participants').delete().in('id', ids);
  }
}
```

---

## 4. Avaliação de UX Após Correção

### Formulário de Criação/Edição de Membro

**Antes:** WhatsApp com erro silencioso; CEP sobrescrevia seleções; `calcularIdade` incorreta em aniversários.

**Depois:**
- ✅ WhatsApp exibe erro inline com a mesma formatação do campo Telefone
- ✅ CEP auto-complete respeita valores já preenchidos — sem frustração em modo edit
- ✅ Idade dos filhos correta em qualquer fuso horário
- ✅ Tipo de recebimento com enum robusto — dados inconsistentes via API direta bloqueados

### Listagem e Filtros

**Antes:** Filtro de faixa etária retornava resultados aleatoriamente incompletos; `sort_by` exposto.

**Depois:**
- ✅ Filtro de faixa etária retorna TODOS os membros que se enquadram, paginados corretamente
- ✅ Ordenação segura — campos sensíveis inacessíveis via query param
- ✅ Paginação (`totalPages`, `hasNextPage`) correta em todos os cenários

### Header de Limite de Membros

**Antes:** Falha da API de limite → botões sempre visíveis (estado indefinido).

**Depois:**
- ✅ Falha da API → aviso discreto em âmbar, sem botões de ação (comportamento conservador e seguro)
- ✅ Sucesso recuperado → aviso some, botões voltam normalmente

### Desativar/Reativar Membro

**Antes:** GET+PUT com risco de sobrescrever edições concorrentes.

**Depois:**
- ✅ PATCH atômico — sem GET de dados, sem risco de perda de edições concorrentes
- 🔴 Participações futuras de calendário não são removidas (REGRESSÃO R01)

### Autocadastro Público

**Antes:** Race condition em max_uses; verificação O(n) de nome.

**Depois:**
- ✅ Optimistic locking previne ultrapassagem do limite configurado
- ✅ Verificação de nome com ilike — performática para qualquer volume

### Atualização Otimística ao Criar Membro

**Antes:** Membro adicionado à lista sem grupos.

**Depois:**
- ✅ Backend retorna membro completo com groups e congregation após create
- ✅ Update otimístico reflete dados reais imediatamente

---

## 5. Itens Encerrados

Os seguintes achados podem ser **fechados definitivamente**:

| Achado | Evidência |
|--------|-----------|
| 01 — Filtro etário quebra paginação | `hasAgeFilter` → query sem `.range()` + slice manual |
| 02 — Contador sem atomicidade | Optimistic locking com `.eq(current_uses)` + rollback |
| 03 — WhatsApp sem erro | `error={errors.whatsapp?.message}` adicionado |
| 04 — `admission` sem enum | `.valid(...)` com 9 valores no Joi |
| 05 — GET+PUT TOCTOU | `PATCH /:id/status` atômico (com ressalva de calendário → R01) |
| 06 — O(n) de nome duplicado | `.ilike(...).limit(1)` no public controller |
| 07 — `sort_by` sem whitelist | `ALLOWED_SORT_FIELDS` + fallback para `'name'` |
| 08 — `memberLimit null` ambíguo | `memberLimitLoadError` state separado + 3 estados no render |
| 09 — `createMember` sem grupos | Segunda query com joins retorna membro completo |
| 10 — Sorting default divergente | `MembersContext` alinhado com `initialSorting` da página |
| 11 — CEP sobrescreve campos | `!watch('field')` guard antes de cada `setValue` |
| 12 — `calcularIdade` off-by-one | Parse manual `YYYY-MM-DD` sem `new Date()` |

---

## 6. Itens Reabertos / Novos Tickets

### 🔴 NOVO TICKET — REGRESSÃO R01: Desativação não Remove Participações de Calendário

**Título:** `PATCH /members/:id/status` não limpa participações futuras de calendário ao desativar membro  
**Arquivo:** `backend/src/controllers/memberController.ts` → função `setMemberStatus`  
**Prioridade:** Alta — inconsistência de dados visível no módulo de calendário  
**Ação:** Adicionar bloco de cleanup de `calendar_participants` quando `active = false` e `existing.active = true`

---

## 7. Parecer Final

O módulo 03 está tecnicamente em excelente estado: 12 dos 12 achados foram resolvidos com correções reais e bem estruturadas. A regressão R01 é funcional e impacta o módulo de calendário, devendo ser corrigida antes de considerar o módulo fechado completamente.

**Recomendação:** Aplicar a correção de R01 e encerrar o ciclo QA do Módulo 03.

---

### Histórico do Ciclo QA — Módulo 03

| Etapa | Documento | Resultado |
|-------|-----------|-----------|
| Auditoria | `modulo-03-members.md` | 12 achados (2 críticos) |
| Correção | `modulo-03-members-dev-report.md` | 12 corrigidos |
| **Revalidação** | **`modulo-03-members-revalidacao.md`** | **12 ok; 1 regressão aberta** |

---

*Revalidação gerada com base em leitura direta do código atualizado. Todos os achados têm evidência concreta dos arquivos verificados.*
