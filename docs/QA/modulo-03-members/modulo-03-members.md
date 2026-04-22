# QA — Módulo 03: Gestão de Membros

> **Analista:** QA Sênior (IA)  
> **Data:** Abril 2026  
> **Tipo:** Auditoria inicial  
> **Escopo:** Listagem, CRUD, ativação/inativação, importação CSV, exportação, autocadastro público via link

---

## 1. Resumo Executivo

O módulo de Gestão de Membros é o mais central do produto. Apresenta implementação robusta em vários pontos — validações Joi/Zod alinhadas, lógica de rollback no create/update, controle de plano por limite, e autocadastro público com middleware dedicado.

Foram identificados **12 achados**, incluindo **2 críticos** que causam comportamento incorreto silencioso para o usuário:

1. **Filtro de faixa etária com paginação quebrada** — o filtro de idade é aplicado *após* a paginação do banco, tornando os resultados incompletos e a paginação incorreta. Usuários veem um subconjunto aleatório dos membros com a idade filtrada.
2. **Contador de usos do link público sem atomicidade** — múltiplas submissões simultâneas podem ultrapassar o `max_uses` configurado, permitindo cadastros acima do limite.

A UX geral do formulário principal é sólida (máscaras, auto-complete de CEP, validações inline), mas contém inconsistências de exibição de erro e acoplamentos frágeis entre estado React Hook Form e estado local.

### Placar de Achados

| Gravidade | Qtd | IDs |
|-----------|-----|-----|
| 🔴 Crítica | 2 | 01, 02 |
| 🟠 Alta | 3 | 03, 04, 05 |
| 🟡 Média | 5 | 06, 07, 08, 09, 10 |
| 🟢 Baixa | 2 | 11, 12 |

---

## 2. Mapa do Fluxo Analisado

```
/members
├── [init] MembersProvider → loadMembers() → GET /api/members
│       └── filtersToApiParams (MemberFilters → query params)
│
├── [header] updateMemberLimit() → GET /api/members/... (limit check)
│       └── window.addEventListener('memberUpdated')
│
├── [listagem] MemberList → paginação, filtros, ordenação
│
├── [criar] CreateMemberModal → MemberForm → POST /api/members
│       └── handleCreateSuccess → addMemberOptimistic → 'memberUpdated'
│
├── [editar] EditMemberModal → MemberForm → PUT /api/members/:id
│       └── handleEditSuccess → updateMemberOptimistic → 'memberUpdated'
│
├── [desativar] ConfirmDeactivateModal
│       └── getMember → buildPayload → PUT /api/members/:id (active:false)
│       └── updateMemberOptimistic → 'memberUpdated'
│
├── [reativar] ConfirmReactivateModal
│       └── getMember → buildPayload → PUT /api/members/:id (active:true)
│       └── updateMemberOptimistic → 'memberUpdated'
│
├── [importar] MemberImportModal → POST /api/members/import/validate → preview
│       └── POST /api/members/import
│
├── [exportar] ExportMembersModal → POST /api/export/members/list (PDF)
│       ExportMembersCSVModal → POST /api/export/members/list/csv
│
└── /public/register/[token]
        ├── [init] GET /api/public/registration/:token (valida link)
        └── [submit] POST /api/public/registration/:token → cria membro
```

---

## 3. Achados

---

### ACHADO 01 — Filtro de Faixa Etária Quebra a Paginação

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug — Contrato API / Lógica de negócio
- **Impacto no usuário:** Ao filtrar membros por faixa etária (ex.: 30 a 40 anos), o usuário vê resultados incompletos — somente membros com essa idade que estiverem nas primeiras linhas da página atual do banco, não todos os membros que atendem ao critério. A paginação exibida é incorreta (total, totalPages, hasNextPage todos errados).

**Onde ocorre:** `backend/src/controllers/memberController.ts`, função `listMembers`, linhas ~208–286

**Arquivos relacionados:**
- `backend/src/controllers/memberController.ts`
- `frontend/src/context/MembersContext.tsx` (consumidor da paginação)

**Evidência:**

```typescript
// memberController.ts — a query aplica paginação ANTES do filtro de idade
const { data: members, error: membersError, count } = await query
  .range(offset, offset + limit - 1); // ← pagina 10 registros do banco

// Filtro de idade aplicado APÓS receber apenas 10 registros
let filteredMembers = members;
if (age_from !== undefined || age_to !== undefined) {
  filteredMembers = members.filter(member => { ... }); // ← filtra sobre 10 registros
}

// Total calculado incorretamente: reflete apenas a faixa paginada, não o universo
const actualCount = age_from !== undefined || age_to !== undefined 
  ? filteredMembers.length  // ← pode ser 0-10, não o total real
  : (count || 0);
```

**Como reproduzir:**
1. Ter >10 membros cadastrados com diversas idades
2. Aplicar filtro de faixa etária (ex.: 20-30 anos) onde há >10 membros nessa faixa
3. Observar que a lista mostra <10 resultados e não há próxima página disponível

**Causa provável:** A idade não é uma coluna no banco; é calculada a partir de `birth`. Por isso o filtro não pode ser aplicado na query SQL diretamente. A solução atual de filtrar pós-query funciona apenas dentro de uma página, ignorando todas as páginas seguintes.

**Sugestão de correção:**

Duas abordagens, em ordem de preferência:

**Opção A — Coluna calculada no banco:** Adicionar uma coluna computada ou view `member_age` em Supabase.

**Opção B — Buscar sem paginação quando age_from/age_to estiver ativo, depois paginar em memória (aceitável para volumes moderados):**

```typescript
// Se há filtro de faixa etária, buscar todos (sem range) para filtrar primeiro
if (age_from !== undefined || age_to !== undefined) {
  // Remover .range() e aplicar filtro em todos os membros
  const { data: allMembers } = await query; // sem .range()
  const filtered = allMembers.filter(ageFilter);
  const paginated = filtered.slice(offset, offset + limit);
  const total = filtered.length;
  // ... retornar com paginação correta
}
```

---

### ACHADO 02 — Contador de Usos do Link Público sem Atomicidade

- **Gravidade:** 🔴 Crítica
- **Tipo:** Bug — Race condition / Segurança
- **Impacto no usuário:** Uma igreja que configura `max_uses=10` em um link público pode receber mais de 10 cadastros se múltiplos visitantes enviarem o formulário simultaneamente. O limite configurado pelo administrador é ignorado em cenários de concorrência.

**Onde ocorre:** `backend/src/controllers/publicRegistrationController.ts`, linha ~209–214

**Arquivos relacionados:**
- `backend/src/controllers/publicRegistrationController.ts`
- `backend/src/middlewares/publicRegistrationAuth.ts`

**Evidência:**

```typescript
// publicRegistrationController.ts — incremento não-atômico (read-modify-write)
const { error: updateError } = await supabase
  .from('public_registration_links')
  .update({ 
    current_uses: registrationLink.current_uses + 1 // ← lido no middleware; +1 local
  })
  .eq('id', registrationLink.id);
```

O valor `registrationLink.current_uses` foi lido no middleware (antes do insert). Se dois usuários fazem submit simultaneamente:
- Ambos leem `current_uses = 9` (max=10 → ambos passam na verificação)
- Ambos inserem membros
- Ambos atualizam `current_uses = 10`
- Resultado: `current_uses = 10` mas 2 membros foram criados além do limite

**Sugestão de correção:**

Usar incremento atômico no banco (RPC ou `increment`):

```typescript
// Opção 1 — SQL raw via Supabase RPC (recomendado):
const { data, error } = await supabase.rpc('increment_registration_link_uses', {
  link_id: registrationLink.id,
  max_uses: registrationLink.max_uses
});
// RPC retorna false se limit foi atingido; nesse caso, reverter o membro criado

// Opção 2 — Mover o increment para ANTES do insert com verificação atômica:
// UPDATE public_registration_links
// SET current_uses = current_uses + 1
// WHERE id = $1 AND (max_uses IS NULL OR current_uses < max_uses)
// RETURNING current_uses
```

---

### ACHADO 03 — Campo WhatsApp Não Exibe Erro de Validação

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug — UX / Validação
- **Impacto no usuário:** Se o usuário digitar um WhatsApp inválido (ex.: número com menos de 10 dígitos), o formulário não envia, mas nenhuma mensagem de erro aparece próxima ao campo. O usuário não sabe qual campo está incorreto — especialmente problemático em um formulário longo com 20+ campos.

**Onde ocorre:** `frontend/src/components/members/MemberForm.tsx`, linha ~704–711

**Arquivos relacionados:**
- `frontend/src/components/members/MemberForm.tsx`

**Evidência:**

```tsx
// MemberForm.tsx — linha 704
<Input
  label="WhatsApp"
  placeholder="(11) 99999-9999"
  value={whatsappDisplay}
  onChange={(e) => handlePhoneChange(e, 'whatsapp')}
  maxLength={15}
  isLoading={isLoading}
  // ← AUSENTE: error={errors.whatsapp?.message}
/>
```

Comparar com o campo "Telefone" logo acima (linha 696):
```tsx
<Input
  label="Telefone"
  ...
  error={errors.phone?.message}  // ← Telefone exibe erro
/>
```

O campo WhatsApp tem validação Zod (`validatePhone`), que falha corretamente, mas o erro não é renderizado. O formulário bloqueia a submissão silenciosamente.

**Sugestão de correção:**

```tsx
<Input
  label="WhatsApp"
  placeholder="(11) 99999-9999"
  value={whatsappDisplay}
  onChange={(e) => handlePhoneChange(e, 'whatsapp')}
  maxLength={15}
  isLoading={isLoading}
  error={errors.whatsapp?.message}  // ← adicionar
/>
```

---

### ACHADO 04 — Campo `admission` Sem Validação de Enum no Backend

- **Gravidade:** 🟠 Alta
- **Tipo:** Bug — Validação / Integridade de dados
- **Impacto no usuário:** Via chamada direta à API (Postman, curl, scripts), qualquer string pode ser submetida como tipo de recebimento. Membros podem ter `admission = "foo"`, "hacker", ou strings arbitrárias. O frontend restringe os valores via `<Select>`, mas o backend não garante integridade.

**Onde ocorre:** `backend/src/validators/memberValidator.ts`, linha ~198–203

**Arquivos relacionados:**
- `backend/src/validators/memberValidator.ts`
- `backend/src/controllers/publicRegistrationController.ts` (reusa o mesmo validador)

**Evidência:**

```typescript
// memberValidator.ts — admission sem .valid()
admission: Joi.string()
  .required()
  .messages({
    'string.empty': 'Tipo de recebimento é obrigatório',
    'any.required': 'Tipo de recebimento é obrigatório'
  }),
  // ← deveria ter: .valid('Batismo', 'Batismo Infantil', 'Transferencia', 'Reconciliação', 'Profissão de fé', 'Apresentação (sem batismo)', 'Outro')
```

Comparar com `gender` e `marital_status` que usam `.valid()`:
```typescript
gender: Joi.string().valid('Masculino', 'Feminino').required(),
marital_status: Joi.string().valid('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro').required(),
```

**Sugestão de correção:**

```typescript
const ADMISSION_TYPES = [
  'Batismo', 'Batismo Infantil', 'Transferencia', 'Reconciliação', 
  'Profissão de fé', 'Apresentação (sem batismo)', 'Apresentação (Criança)',
  'Batismo não professo (Criança)', 'Outro'
];

admission: Joi.string()
  .valid(...ADMISSION_TYPES)
  .required()
  .messages({
    'any.only': `Tipo de recebimento deve ser um dos valores: ${ADMISSION_TYPES.join(', ')}`,
    'any.required': 'Tipo de recebimento é obrigatório'
  }),
```

---

### ACHADO 05 — Desativar/Reativar Membro Usa GET+PUT — TOCTOU Race Condition

- **Gravidade:** 🟠 Alta
- **Tipo:** Risco — Race condition / Perda de dados
- **Impacto no usuário:** Se um editor está desativando um membro ao mesmo tempo em que outro editor está editando os dados desse mesmo membro, o processo de desativação pode sobrescrever as edições recentes com dados desatualizados.

**Onde ocorre:** `frontend/src/app/(main)/members/page.tsx`, funções `handleConfirmDeactivate` e `handleConfirmReactivate`, linhas ~238–285

**Arquivos relacionados:**
- `frontend/src/app/(main)/members/page.tsx`

**Evidência:**

```typescript
// members/page.tsx — handleConfirmDeactivate
const handleConfirmDeactivate = useCallback(async () => {
  // Passo 1: busca dados atuais do membro
  const currentMember = await apiService.getMember(selectedMemberId);
  
  // ← JANELA DE RACE CONDITION: outro editor pode ter modificado o membro aqui
  
  // Passo 2: reconstrói payload inteiro com dados do GET
  const updateData = {
    name: currentMember.name,
    birth: currentMember.birth,
    // ... todos os 20+ campos copiados do GET
    active: false // único campo que realmente queremos mudar
  };
  
  // Passo 3: PUT sobrescreve tudo, inclusive as edições feitas na janela
  await apiService.updateMember(selectedMemberId, updateData);
}, [selectedMemberId, selectedMemberName, updateMemberOptimistic]);
```

O backend aceita um `PATCH` via `PUT` com todos os campos. O problema é que o FE busca os dados no momento T e envia o update no momento T+delay, potencialmente sobrescrevendo alterações feitas entre T e T+delay.

**Sugestão de correção:**

Criar um endpoint dedicado `PATCH /api/members/:id/status` que altere apenas `active`:

```typescript
// Backend — novo endpoint
export const setMemberStatus = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // boolean
  
  const { data, error } = await supabase
    .from('members')
    .update({ active })
    .eq('id', id)
    .eq('church_id', churchId)
    .select()
    .single();
  
  // ...
};
```

Isso elimina a necessidade do GET prévio e torna a operação atômica.

---

### ACHADO 06 — Verificação de Nome Duplicado no Cadastro Público é O(n)

- **Gravidade:** 🟡 Média
- **Tipo:** Risco — Performance / Escalabilidade
- **Impacto no usuário:** Para igrejas com milhares de membros, a verificação de duplicidade no autocadastro público busca TODOS os membros da igreja em memória para fazer comparação string a string. Pode causar timeouts ou lentidão perceptível.

**Onde ocorre:** `backend/src/controllers/publicRegistrationController.ts`, linhas ~111–133

**Arquivos relacionados:**
- `backend/src/controllers/publicRegistrationController.ts`

**Evidência:**

```typescript
// publicRegistrationController.ts — O(n): busca todos os membros
const { data: existingMembers, error: checkError } = await supabase
  .from('members')
  .select('id, name')
  .eq('church_id', churchId); // ← sem LIMIT — pode retornar milhares de registros

for (const existingMember of existingMembers) {
  // comparação case-insensitive manualmente em JS
  if (existingMember.name.trim().toLowerCase() === normalizedName) { ... }
}
```

Comparar com `memberController.ts` (createMember autenticado) que usa `ilike` diretamente:
```typescript
// memberController.ts — O(log n): query eficiente no banco
const { data: duplicate } = await supabase
  .from('members')
  .select('id, name')
  .eq('church_id', churchId)
  .ilike('name', normalizedName) // ← filtro no banco com índice
  .limit(1);
```

**Sugestão de correção:** Replicar a abordagem do `memberController.ts` no `publicRegistrationController.ts`:

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

### ACHADO 07 — `sort_by` sem Whitelist no Backend

- **Gravidade:** 🟡 Média
- **Tipo:** Risco — Segurança / Estabilidade
- **Impacto no usuário:** Um atacante pode passar `sort_by=password` ou qualquer coluna existente na tabela (inclusive colunas sensíveis) para explorar dados por ordenação. Mesmo que o Supabase proteja contra SQL injection literal, colunas como `created_by` ou campos internos podem ser expostos indiretamente.

**Onde ocorre:** `backend/src/controllers/memberController.ts`, linhas ~57–58, 204–205

**Arquivos relacionados:**
- `backend/src/controllers/memberController.ts`

**Evidência:**

```typescript
// memberController.ts
const sort_by = req.query.sort_by as string || 'name'; // ← qualquer string
const sort_order = req.query.sort_order as 'asc' | 'desc' || 'asc';

// ...
query = query.order(sort_by, { ascending: sort_order === 'asc' }); // ← usado diretamente
```

**Sugestão de correção:**

```typescript
const ALLOWED_SORT_FIELDS = ['name', 'birth', 'created_at', 'updated_at', 'admission_date', 'city', 'state'];
const sort_by_raw = req.query.sort_by as string || 'name';
const sort_by = ALLOWED_SORT_FIELDS.includes(sort_by_raw) ? sort_by_raw : 'name';
```

---

### ACHADO 08 — `updateMemberLimit` Falha Silenciosamente — Botões Ficam Visíveis com Limite Atingido

- **Gravidade:** 🟡 Média
- **Tipo:** Bug — UX / Estado incorreto
- **Impacto no usuário:** Se a chamada para `getMemberLimit` falhar (timeout, 503, rede), `memberLimit` permanece `null`. O código exibe todos os botões de ação quando `memberLimit === null` (intencionalmente durante o carregamento inicial), mas se a API falhar depois que o usuário já atingiu o limite, os botões "Adicionar Membro", "Importar CSV" e "Links de Autocadastro" continuam visíveis. O usuário clica, começa a preencher e recebe o erro 403 apenas ao submeter.

**Onde ocorre:** `frontend/src/app/(main)/members/page.tsx`, linhas ~113–126

**Arquivos relacionados:**
- `frontend/src/app/(main)/members/page.tsx`

**Evidência:**

```typescript
// members/page.tsx — catch silencioso
const updateMemberLimit = useCallback(async () => {
  try {
    const limitData = await apiService.getMemberLimit();
    setMemberLimit({ ... });
  } catch {
    // Silenciar erro - não crítico, apenas para controle de UI
    // Estado permanece como null
  }
}, []);

// No render: memberLimit === null → mostra todos os botões
{memberLimit === null || memberLimit.canAdd === true ? (
  <>
    <Button>Links de Autocadastro</Button>
    <Button>Importar CSV</Button>
    <Button>Adicionar Membro</Button>
  </>
) : (
  <div>Limite atingido...</div>
)}
```

**Sugestão de correção:**

Distinguir estado `null` (ainda carregando) de estado `loadError` (falhou):

```typescript
const [memberLimit, setMemberLimit] = useState<LimitData | null>(null);
const [memberLimitLoadError, setMemberLimitLoadError] = useState(false);

// catch:
} catch {
  setMemberLimitLoadError(true);
  // Não alterar memberLimit — manter null
}

// No render — exibir estado de erro de forma distinta:
{!memberLimitLoadError && (memberLimit === null || memberLimit.canAdd) ? (
  <>{/* botões */}</>
) : memberLimitLoadError ? (
  <p className="text-sm text-gray-500">Não foi possível verificar o limite de membros.</p>
) : (
  <div>Limite atingido...</div>
)}
```

---

### ACHADO 09 — Resposta do `createMember` Retorna Membro sem Grupos

- **Gravidade:** 🟡 Média
- **Tipo:** Bug — Contrato API / Estado inconsistente
- **Impacto no usuário:** Quando um editor cria um membro e seleciona grupos no formulário, o membro é adicionado à lista otimisticamente sem os grupos associados. A UI mostra o membro sem grupos até a próxima recarga. Se o editor abrir o membro imediatamente após criar, verá dados sem os grupos (antes do refetch completar).

**Onde ocorre:** `backend/src/controllers/memberController.ts`, linha ~618

**Arquivos relacionados:**
- `backend/src/controllers/memberController.ts`
- `frontend/src/app/(main)/members/page.tsx` (`handleCreateSuccess`)

**Evidência:**

```typescript
// memberController.ts — retorna membro sem grupos
res.status(201).json(member); // ← apenas o row do banco, sem groups join

// members/page.tsx — handleCreateSuccess espera um Member completo com groups
const handleCreateSuccess = useCallback((memberData: { id: string; [key: string]: unknown }) => {
  addMemberOptimistic(memberData as unknown as Member); // ← cast inseguro: memberData não tem groups
}, [addMemberOptimistic]);
```

Comparar com `getMember` que retorna o membro completo com grupos e congregações.

**Sugestão de correção:**

No `createMember`, antes de retornar, buscar o membro com joins:

```typescript
// Após criar o membro, buscar com joins para resposta completa
const { data: fullMember } = await supabase
  .from('members')
  .select(`*, congregations(*), member_groups(groups(*))`)
  .eq('id', member.id)
  .single();

res.status(201).json(formatMemberResponse(fullMember));
```

Alternativamente, o frontend pode disparar `loadMembers` após create para sincronizar o estado.

---

### ACHADO 10 — Default de Ordenação Divergente Entre Context e Página

- **Gravidade:** 🟡 Média
- **Tipo:** Inconsistência — Estado / UX
- **Impacto no usuário:** Se `syncWithServer()` for chamado antes de `loadMembers()` (ex.: em condição de race), a lista será reordenada de forma inesperada. Adicionalmente, se um usuário restaurar filtros via `handleClearAllFilters`, a ordenação volta para `created_at desc` (página), mas o contexto ainda guarda `name asc` como valor inicial até a próxima `loadMembers`.

**Onde ocorre:**
- `frontend/src/context/MembersContext.tsx`, linha ~115–118
- `frontend/src/app/(main)/members/page.tsx`, linha ~75–78

**Evidência:**

```typescript
// MembersContext.tsx — default: name asc
const [currentSorting, setCurrentSorting] = useState({
  sort_by: 'name',
  sort_order: 'asc'
});

// members/page.tsx — default: created_at desc
const initialSorting = {
  sort_by: 'created_at',
  sort_order: 'desc'
};
```

**Sugestão de correção:** Alinhar o default do contexto com o da página, ou remover o default do contexto (o contexto sempre recebe o sorting via `loadMembers`).

---

### ACHADO 11 — CEP Auto-complete Sobrescreve Seleções Manuais do Usuário

- **Gravidade:** 🟢 Baixa
- **Tipo:** UX
- **Impacto no usuário:** Se o usuário seleciona manualmente Estado/Cidade e depois digita o CEP, os campos são sobrescritos pelo auto-complete do CEP sem aviso. Situações onde o CEP retorna dados incorretos ou o usuário queria manter a seleção são prejudicadas.

**Onde ocorre:** `frontend/src/components/members/MemberForm.tsx`, função `handleCEPChange`, linhas ~514–538

**Arquivos relacionados:**
- `frontend/src/components/members/MemberForm.tsx`

**Evidência:**

```typescript
// handleCEPChange — sobrescreve incondicionalmente
if (cepData.logradouro) setValue('address', cepData.logradouro);
if (cepData.bairro) setValue('neighborhood', cepData.bairro);
if (cepData.localidade) setValue('city', cepData.localidade);  // ← sobrescreve sem confirmar
if (cepData.uf) {
  setValue('state', cepData.uf);   // ← sobrescreve
  fetchCities(state.id.toString()); // ← recarga de cidades
}
```

**Sugestão de correção:** Preencher apenas os campos que estiverem vazios, ou exibir um toast "Endereço preenchido automaticamente" com opção de desfazer:

```typescript
if (cepData.logradouro && !watch('address')) setValue('address', cepData.logradouro);
```

---

### ACHADO 12 — `calcularIdade` pode Retornar Idade com Off-by-One em Aniversários

- **Gravidade:** 🟢 Baixa
- **Tipo:** Bug — Timezone / Cálculo de data
- **Impacto no usuário:** A exibição da idade dos filhos no formulário pode mostrar a idade errada (1 ano a menos) no dia do aniversário para fusos horários negativos (UTC-3, UTC-5, etc.).

**Onde ocorre:** `frontend/src/components/members/MemberForm.tsx`, função `calcularIdade`, linha ~238–248

**Arquivos relacionados:**
- `frontend/src/components/members/MemberForm.tsx`

**Evidência:**

```typescript
const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  const birthDate = new Date(birth); // ← 'YYYY-MM-DD' → UTC midnight
  // Em UTC-3: '1990-01-01' → 31/12/1989 21:00 local
  // ...
};
```

**Sugestão de correção:**

```typescript
const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  // Extrair partes sem usar Date constructor (evita timezone)
  const [year, month, day] = birth.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age--;
  }
  return age >= 0 ? age : null;
};
```

---

## 4. Cenários Extras a Testar

### Formulário de Criação/Edição de Membro

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Clicar "Criar Membro" duas vezes rapidamente | Apenas um submit; botão fica disabled após primeiro clique |
| Fechar modal durante submissão | Modal fecha; backend pode ter recebido o request |
| CEP inválido (99999-999) | Campo não consulta API; erro inline |
| CEP não encontrado (00000-000) | Sem erro, campos permanecem editáveis |
| Selecionar cônjuge e mudar estado civil para "Solteiro" | Campo cônjuge some; valor mantido ou limpo? |
| Adicionar filho sem nome e submeter | Erro inline no campo do filho |
| Remover todos os filhos antes de submeter no modo edit | `children: []` enviado para API |
| Nome com 1 caractere | Erro Zod: "mínimo 2 caracteres" |
| Data de nascimento futura | Erro Zod e backend rejeita |
| Membro com e-mail já existente na church | Backend 400 com mensagem clara ao usuário |
| Membro com nome exato já existente | Backend 400 bloqueando duplicidade |
| Session expirada durante preenchimento | Interceptor de 401 → redirect para login; dados perdidos |

### Filtros e Listagem

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Filtro de faixa etária com >1 página de resultados | Paginação incorreta (bug confirmado — ACHADO 01) |
| `sort_by=church_id` na URL | Backend deve rejeitar ou ignorar — atualmente usa o valor |
| Filtros combinados: status=inactive + age_from=60 | Resultados restritos a membros inativos com >=60 anos (na página atual) |
| Paginação além do total | Última página mostra lista vazia; hasNextPage=false |
| Busca por texto com caracteres especiais: `'`, `%`, `_` | Sem SQL injection; ILIKE deve escapar corretamente |
| 0 membros cadastrados | Empty state correto — não apenas loading infinito |

### Importação CSV

| Cenário | Comportamento Esperado |
|---------|----------------------|
| CSV com 0 linhas (apenas header) | Erro claro: "arquivo vazio" |
| CSV com encoding Latin-1 | Pode falhar; verificar charset handling |
| CSV com 1000 linhas | Verificar timeout e feedback de progresso |
| Importação parcial (linha 500 falha) | Linhas 1-499 importadas? Ou rollback total? |
| CSV com datas no formato DD/MM/YYYY | Aceito? Backend espera YYYY-MM-DD |

### Link de Autocadastro Público

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Link expirado | Tela "Link Inválido ou Expirado" — ok |
| 10 tabs abertas simultâneas enviando formulário com max_uses=10 | Potencial para >10 cadastros (ACHADO 02) |
| Link desativado manualmente após usuário abrir formulário | Erro 403 no submit, não na abertura |
| Campo obrigatório vazio no formulário público | Validação inline antes do submit |
| Nome do membro com 300 caracteres | Backend aceita? Banco tem limite? |

---

## 5. Lacunas de Cobertura

### Validações Ausentes

| Campo | Frontend | Backend | Status |
|-------|----------|---------|--------|
| `admission` | enum via `<Select>` | ❌ sem `.valid()` | Bug confirmado (ACHADO 04) |
| `sort_by` | — | ❌ sem whitelist | Risco confirmado (ACHADO 07) |
| Idade mínima do membro | ✅ data não pode ser futura | ✅ mesma regra | OK |
| CNPJ no documento | ✅ `validateCPFOrCNPJ` | ✅ mesma função | OK |
| Email único por church | — | ✅ `validateEmailUniqueness` | OK |
| Nome único por church | — | ✅ `ilike` query | OK (público tem bug de O(n)) |

### Observabilidade Ausente

- `updateMemberLimit()` falha sem log de erro — impossível monitorar frequência de falhas
- `handleCEPChange` falha silenciosamente — sem log, sem alerta ao usuário
- `publicRegistrationController.ts` usa `console.error` em vez do `logger` centralizado do backend
- Não há log de tentativas de uso de link expirado/desativado (útil para detectar abuso de links)

### Contratos Não Garantidos

- `createMember` retorna `Member` sem `groups` e `congregation` — frontend espera os dois via cast `as unknown as Member`
- `listMembers` com `age_from/age_to` retorna `pagination.total` incorreto — frontend não tem como detectar que está vendo resultado incompleto
- Resposta de `validateRegistrationLink` inclui `remaining_uses: null` quando `max_uses` é null — frontend deve diferenciar "sem limite" de "0 restantes"

### Testes Ausentes

- Teste de concorrência para o incremento de `current_uses`
- Teste de paginação com filtro de faixa etária em múltiplas páginas
- Teste de rollback do `createMember` quando associação de grupos falha
- Teste de validação de `admission` com valores fora do enum esperado
- Teste de CEP com caracteres especiais no `logradouro`

---

## 6. Ajustes de Desenvolvimento — Resumo Prioritário

| Prioridade | ID | Arquivo | Ação |
|------------|----|---------|------|
| 🔴 1 | ACHADO 01 | `memberController.ts` | Corrigir filtro de faixa etária: aplicar antes da paginação |
| 🔴 2 | ACHADO 02 | `publicRegistrationController.ts` | Usar incremento atômico para `current_uses` |
| 🟠 3 | ACHADO 03 | `MemberForm.tsx` | Adicionar `error={errors.whatsapp?.message}` ao campo WhatsApp |
| 🟠 4 | ACHADO 04 | `memberValidator.ts` | Adicionar `.valid(...)` ao campo `admission` com enum de valores aceitos |
| 🟠 5 | ACHADO 05 | `memberController.ts` + `members/page.tsx` | Criar endpoint `PATCH /members/:id/status` para inativação atômica |
| 🟡 6 | ACHADO 06 | `publicRegistrationController.ts` | Substituir loop O(n) por `ilike` query no banco |
| 🟡 7 | ACHADO 07 | `memberController.ts` | Adicionar whitelist de campos para `sort_by` |
| 🟡 8 | ACHADO 08 | `members/page.tsx` | Diferenciar `memberLimit=null (loading)` de `memberLimit=null (error)` |
| 🟡 9 | ACHADO 09 | `memberController.ts` | Retornar membro completo (com grupos) no response do `createMember` |
| 🟡 10 | ACHADO 10 | `MembersContext.tsx` | Alinhar default de sorting com `initialSorting` da página |
| 🟢 11 | ACHADO 11 | `MemberForm.tsx` | CEP auto-complete condicional (não sobrescrever campos preenchidos) |
| 🟢 12 | ACHADO 12 | `MemberForm.tsx` | Corrigir `calcularIdade` para evitar off-by-one em UTC-3 |

---

*Auditoria gerada com base em leitura direta do código. Todos os achados têm evidência concreta de arquivos verificados.*
