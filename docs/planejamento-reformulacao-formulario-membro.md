# Planejamento — Reformulação do Formulário de Membro

> **Escopo:** Módulo 3 (Gestão de Membros) e Módulo 11 (Links Públicos)
> **Data:** Junho 2026
> **Status:** Planejamento — Decisões alinhadas, pronto para implementação

---

## 1. Visão Geral das Mudanças

A reformulação reorganiza o formulário de membro em três grandes frentes:

1. **Campos existentes ajustados** — renomeações, reordenação e novos sub-campos a campos existentes.
2. **Campos novos simples** — adição de colunas à tabela `members`.
3. **Campos novos complexos com lógica condicional** — principalmente a seção de Informações Eclesiásticas, com perguntas ramificadas (radio/checkbox com revelação progressiva).

As mudanças impactam **4 camadas**:

| Camada | Arquivos principais |
|--------|---------------------|
| Banco de dados | `members` table (Supabase/Postgres) |
| Backend — Tipos | `backend/src/types/index.ts` |
| Backend — Validação | `backend/src/validators/memberValidator.ts` |
| Frontend — Formulário Admin | `frontend/src/components/members/MemberForm.tsx` |
| Frontend — Formulário Público | `frontend/src/components/public/PublicMemberForm.tsx` |

---

## 2. Campos: Estado Atual vs. Estado Futuro

### 2.1 Seção — INFORMAÇÕES BÁSICAS

| Linha | Campo Atual | Campo Novo | Tipo de Mudança |
|-------|-------------|------------|-----------------|
| 1 | Nome Completo | Nome Completo | Sem mudança |
| 2 | Data de Nascimento + **Nacionalidade** (país) | Data de Nascimento + **Natural de** (cidade) | Nova coluna `hometown`; `nationality` depreciado no formulário |
| 3 | *(Gênero estava separado, profissão em outra posição)* | **Gênero** + **Profissão** | Reordenação — Gênero agrupa com Profissão na mesma linha |
| 4 | Estado Civil + *(cônjuge aparecia depois)* | Estado Civil + **Data do Casamento** | Adicionar "União Estável" ao enum + novo campo `wedding_date` |
| 5 | Cônjuge *(só se casado)* | Nome do Cônjuge + **Cônjuge é membro?** | Novo campo `spouse_is_member` (boolean) |
| 6 | Nome do Pai | Nome do Pai + **É membro? (sim/não/falecido)** | Novo campo `father_is_member` (enum 3 valores) |
| 7 | Nome da Mãe | Nome da Mãe + **É membro? (sim/não/falecido)** | Novo campo `mother_is_member` (enum 3 valores) |
| 8 | Filhos (com "Dependente") | Filhos (com "**Reside com você?**") | Mudança de label apenas (campo `dependent` no DB mantido) |

> **Decisão — Campo `nationality`:** Será criada nova coluna `hometown` (texto livre — cidade de origem). O campo `nationality` **permanece no banco** para preservar dados históricos, mas é **removido do formulário** e não receberá novos dados. Código que ainda referencie `nationality` deve ser mantido apenas para leitura legada; não enviar mais no payload de criação/edição.

> **Decisão — Campo `Gênero`:** Mantido como obrigatório. Posicionado na linha 3 junto com Profissão (`gender | occupation`), o que libera a linha 2 para `birth | hometown` e mantém o fluxo natural de leitura.

> **Decisão — Campo `document` (CPF):** **Removido do formulário** (criação e edição). A coluna `document` permanece no banco para preservar dados já cadastrados. Componentes de *exibição* que mostrem CPF devem ser avaliados (ver seção 5.4).

### 2.2 Seção — CONTATO E ENDEREÇO

| Campo Atual | Campo Novo | Mudança |
|-------------|------------|---------|
| Email | Email | Sem mudança |
| Telefone / WhatsApp | Telefone / WhatsApp | Reordenação (ir para seção Contato) |
| Endereço (inclui número) | **Endereço** (só logradouro) + **Número** | Novo campo `address_number` |
| Bairro / Complemento | Bairro / Complemento | Sem mudança |
| CEP / Estado / Cidade | CEP / Estado / Cidade | Reordenação visual |

> **Nota — `address_number`:** O campo `address` atual é livre e provavelmente contém endereço + número juntos ("Rua das Flores, 123"). Adicionar `address_number` como novo campo é não-destrutivo. **Não será necessário migrar dados existentes** — o número já no campo `address` ficará lá; novos cadastros usarão o campo separado.

### 2.3 Seção — INFORMAÇÕES ECLESIÁSTICAS (nova)

Todos os campos abaixo são **novos**. Nenhum existe no banco ou nos formulários.

| # | Campo | Tipo | Condicionais |
|---|-------|------|--------------|
| 1 | É cristão evangélico há quantos anos? | `text` / número livre | — |
| 2 | Vem de família cristã evangélica? | `boolean` (sim/não) | — |
| 3 | Já é batizado? | `boolean` (sim/não) | Sim → exibe sub-questionário |
| 3a | Tipo de batismo | `enum` (ver abaixo) | Exclusão mútua (radio) |
| 3b | Nome da igreja anterior | `text` | Só se "adulto em outra igreja" ou "criança em outra igreja" |
| 3c | Religião anterior | `text` ou "nenhuma" | Só se "novo convertido" |
| 4 | Era membro ativo da igreja anterior? | `boolean` | Exibido apenas se veio de outra igreja evangélica |
| 5 | Motivo de tornar-se membro | `text` (textarea) | — |
| 6 | Há quanto tempo frequenta? | `text` | — |
| 7 | Frequenta cultos dominicais? | `enum` (3 opções) | — |
| 8 | Participa de atividade semanal? | `boolean` | Sim → textarea "Quais?" |
| 8a | Quais atividades? | `text` (textarea) | Condicional de #8 |

**Enum `baptism_type` (campo 3a) — opções mutuamente exclusivas:**
```
'catolica'                  → "Fui batizado na igreja católica"
'adulto_nesta_igreja'       → "Fui batizado(a) quando adulto — nesta igreja"
'adulto_outra_igreja'       → "Fui batizado(a) quando adulto — em outra igreja evangélica"
'crianca_nesta_igreja'      → "Fui batizado(a) quando criança — nesta igreja"
'crianca_outra_igreja'      → "Fui batizado(a) quando criança — em outra igreja evangélica"
'novo_convertido'           → "Sou novo convertido — minha religião era: ___"
'sem_religiao'              → "Sou novo convertido — nenhuma religião anterior"
```

**Enum `sunday_attendance` (campo 8):**
```
'todos_os_domingos'
'regularmente'
'as_vezes'
```

### 2.4 Seção — INFORMAÇÕES DE RECEBIMENTO

Manter exatamente como está:
- Checkbox Membro Infantil
- Tipo de Recebimento
- Data de Recebimento
- Congregação
- Grupos / Ministérios

---

## 3. Mudanças no Banco de Dados

### 3.1 Alterações na tabela `members`

#### Nova coluna `hometown` (campo `nationality` depreciado — não renomear)
```sql
ALTER TABLE members ADD COLUMN hometown text;
```
> A coluna `nationality` é **mantida** no banco para preservar dados históricos. Apenas `hometown` receberá dados novos. Nenhum dado é migrado automaticamente (dados antigos de `nationality` ficam com o label semântico errado, mas isso é aceitável).

#### Adicionar "União Estável" ao CHECK de `marital_status`
```sql
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_marital_status_check;
ALTER TABLE members ADD CONSTRAINT members_marital_status_check
  CHECK (marital_status = ANY (ARRAY[
    'Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro', 'União Estável'
  ]));
```

#### Novas colunas — Informações Básicas
```sql
ALTER TABLE members ADD COLUMN wedding_date       date;
ALTER TABLE members ADD COLUMN spouse_is_member   boolean;
ALTER TABLE members ADD COLUMN father_is_member   text CHECK (father_is_member IS NULL OR father_is_member = ANY (ARRAY['sim', 'nao', 'falecido']));
ALTER TABLE members ADD COLUMN mother_is_member   text CHECK (mother_is_member IS NULL OR mother_is_member = ANY (ARRAY['sim', 'nao', 'falecido']));
ALTER TABLE members ADD COLUMN address_number     text;
```

#### Novas colunas — Informações Eclesiásticas
```sql
ALTER TABLE members ADD COLUMN years_evangelical           text;
ALTER TABLE members ADD COLUMN evangelical_family          boolean;
ALTER TABLE members ADD COLUMN is_baptized                 boolean;
ALTER TABLE members ADD COLUMN baptism_type                text CHECK (
  baptism_type IS NULL OR baptism_type = ANY (ARRAY[
    'catolica', 'adulto_nesta_igreja', 'adulto_outra_igreja',
    'crianca_nesta_igreja', 'crianca_outra_igreja',
    'novo_convertido', 'sem_religiao'
  ])
);
ALTER TABLE members ADD COLUMN baptism_other_church_name   text;
ALTER TABLE members ADD COLUMN previous_religion           text;
ALTER TABLE members ADD COLUMN previous_church_active      boolean;
ALTER TABLE members ADD COLUMN reason_joining              text;
ALTER TABLE members ADD COLUMN time_attending              text;
ALTER TABLE members ADD COLUMN sunday_attendance           text CHECK (
  sunday_attendance IS NULL OR sunday_attendance = ANY (ARRAY[
    'todos_os_domingos', 'regularmente', 'as_vezes'
  ])
);
ALTER TABLE members ADD COLUMN weekly_activities           boolean;
ALTER TABLE members ADD COLUMN weekly_activities_which     text;
```

**Total de colunas novas: 18** (`hometown` + 17 demais), além do ajuste de CHECK em `marital_status`. Nenhuma coluna existente é removida ou renomeada — zero breaking change no banco.

### 3.2 Atualizar `bd-structure.sql`

O arquivo `backend/bd-structure.sql` deve ser atualizado para refletir o novo schema após a migration ser aplicada no Supabase.

---

## 4. Mudanças no Backend

### 4.1 `backend/src/types/index.ts` — Interface `Member`

Adicionar os novos campos à interface **sem remover** `nationality` (mantido para compatibilidade com dados legados):

```typescript
export interface Member {
  // ... campos existentes mantidos, incluindo nationality?: string ...

  // Informações Básicas (novos)
  hometown?: string;
  wedding_date?: Date;
  spouse_is_member?: boolean;
  father_is_member?: 'sim' | 'nao' | 'falecido';
  mother_is_member?: 'sim' | 'nao' | 'falecido';
  address_number?: string;

  // Informações Eclesiásticas (todos novos)
  years_evangelical?: string;
  evangelical_family?: boolean;
  is_baptized?: boolean;
  baptism_type?: 'catolica' | 'adulto_nesta_igreja' | 'adulto_outra_igreja' | 'crianca_nesta_igreja' | 'crianca_outra_igreja' | 'novo_convertido' | 'sem_religiao';
  baptism_other_church_name?: string;
  previous_religion?: string;
  previous_church_active?: boolean;
  reason_joining?: string;
  time_attending?: string;
  sunday_attendance?: 'todos_os_domingos' | 'regularmente' | 'as_vezes';
  weekly_activities?: boolean;
  weekly_activities_which?: string;
}
```

### 4.2 `backend/src/validators/memberValidator.ts`

**Alterar:**
- `nationality`: manter no validator (leitura legada) — não remover
- Adicionar `hometown` como novo campo opcional
- `marital_status`: adicionar `'União Estável'` ao `.valid()`
- `document`: manter no validator para compatibilidade; apenas não será mais enviado por novos formulários

**Adicionar ao schema Joi:**
```typescript
hometown: Joi.string().optional().allow(null, ''),
wedding_date: Joi.date().optional().allow(null),
spouse_is_member: Joi.boolean().optional().allow(null),
father_is_member: Joi.string().valid('sim', 'nao', 'falecido').optional().allow(null, ''),
mother_is_member: Joi.string().valid('sim', 'nao', 'falecido').optional().allow(null, ''),
address_number: Joi.string().optional().allow(null, ''),

years_evangelical: Joi.string().optional().allow(null, ''),
evangelical_family: Joi.boolean().optional().allow(null),
is_baptized: Joi.boolean().optional().allow(null),
baptism_type: Joi.string()
  .valid('catolica', 'adulto_nesta_igreja', 'adulto_outra_igreja',
         'crianca_nesta_igreja', 'crianca_outra_igreja', 'novo_convertido', 'sem_religiao')
  .optional().allow(null, ''),
baptism_other_church_name: Joi.string().optional().allow(null, ''),
previous_religion: Joi.string().optional().allow(null, ''),
previous_church_active: Joi.boolean().optional().allow(null),
reason_joining: Joi.string().optional().allow(null, ''),
time_attending: Joi.string().optional().allow(null, ''),
sunday_attendance: Joi.string()
  .valid('todos_os_domingos', 'regularmente', 'as_vezes')
  .optional().allow(null, ''),
weekly_activities: Joi.boolean().optional().allow(null),
weekly_activities_which: Joi.string().optional().allow(null, ''),
```

### 4.3 `backend/src/controllers/memberController.ts`

Verificar se as queries de INSERT/UPDATE são dinâmicas (via spread) ou explícitas. Se explícitas, adicionar os novos campos. Verificar também se o campo `nationality` é referenciado diretamente e substituir por `hometown`.

---

## 5. Mudanças no Frontend

### 5.1 Schema Zod — alterações em ambos os formulários

**Remover dos formulários (campos não aparecem mais no layout):**
```typescript
// Remover do schema Zod e do JSX:
nationality: z.string().optional().or(z.literal('')),
nationality_other: z.string().optional().or(z.literal('')),
document: z.string()...  // campo CPF removido do formulário
```
> Esses campos ainda existem no banco e no validator do backend — apenas não são mais enviados pelo frontend.

**Adicionar `hometown` (substitui `nationality` no formulário):**
```typescript
hometown: z.string().optional().or(z.literal('')),
```

**Atualizar enum `marital_status`:**
```typescript
marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro', 'União Estável']),
```

**Adicionar novos campos ao schema Zod:**
```typescript
// Informações Básicas
wedding_date: z.string().optional().or(z.literal('')),
spouse_is_member: z.boolean().optional(),
father_is_member: z.enum(['sim', 'nao', 'falecido']).optional(),
mother_is_member: z.enum(['sim', 'nao', 'falecido']).optional(),
address_number: z.string().optional().or(z.literal('')),

// Informações Eclesiásticas
years_evangelical: z.string().optional().or(z.literal('')),
evangelical_family: z.boolean().optional(),
is_baptized: z.boolean().optional(),
baptism_type: z.enum([
  'catolica', 'adulto_nesta_igreja', 'adulto_outra_igreja',
  'crianca_nesta_igreja', 'crianca_outra_igreja',
  'novo_convertido', 'sem_religiao'
]).optional(),
baptism_other_church_name: z.string().optional().or(z.literal('')),
previous_religion: z.string().optional().or(z.literal('')),
previous_church_active: z.boolean().optional(),
reason_joining: z.string().optional().or(z.literal('')),
time_attending: z.string().optional().or(z.literal('')),
sunday_attendance: z.enum(['todos_os_domingos', 'regularmente', 'as_vezes']).optional(),
weekly_activities: z.boolean().optional(),
weekly_activities_which: z.string().optional().or(z.literal('')),
```

### 5.2 `MemberForm.tsx` — Mudanças estruturais

#### Seção Informações Básicas — layout final

| Linha | Col. esquerda | Col. direita | Observação |
|-------|---------------|--------------|------------|
| 1 | `name` (col-span-2) | — | Obrigatório |
| 2 | `birth` | `hometown` | `hometown` = texto livre (cidade de origem) |
| 3 | `gender` | `occupation` | Gênero mantido, agrupado com Profissão |
| 4 | `marital_status` | `wedding_date` | `wedding_date` aparece se Casado ou União Estável |
| 5 | `spouse` | `spouse_is_member` | Linha aparece se Casado ou União Estável |
| 6 | `father_name` | `father_is_member` | Radio: sim / não / falecido |
| 7 | `mother_name` | `mother_is_member` | Radio: sim / não / falecido |
| 8 | Seção Filhos | — | Label "Reside com você?" no lugar de "Dependente" |

**Remover do JSX:** campos `nationality`, `nationality_other`, `document` (e toda lógica de `selectedNationality === 'Outra'` e `validateCPFOrCNPJ`)

#### Seção Contato e Endereço — layout final

**Sub-bloco Contato:**

| Linha | Col. esquerda | Col. direita |
|-------|---------------|--------------|
| 1 | `email` (col-span-2) | — |
| 2 | `phone` | `whatsapp` |

**Sub-bloco Endereço:**

| Linha | Col. esquerda | Col. direita |
|-------|---------------|--------------|
| 1 | `cep` | `state` / `city` *(ou cep+state numa linha, city na outra)* |
| 2 | `address` | `address_number` |
| 3 | `neighborhood` | `complement` |

> O autocomplete por CEP (ViaCEP) continua preenchendo apenas `address`, `neighborhood`, `city` e `state` — não preenche `address_number`.

**Removido:** campo `document` (CPF) — não aparece mais no formulário.

#### Nova seção — Informações Eclesiásticas (antes de Informações de Recebimento)

Criar seção completamente nova com a lógica condicional descrita no item 2.3. Pontos de implementação:

1. **Campos `years_evangelical` e `evangelical_family`** — simples (input texto + radio sim/não)

2. **Campo `is_baptized`** — radio sim/não. Se **sim**, revelar progressivamente:
   - Radio group exclusivo com 5 opções principais (ver árvore no item 2.3)
   - Ao selecionar opção que menciona "outra igreja", revelar `baptism_other_church_name`
   - Ao selecionar "novo convertido", revelar `previous_religion` + opção "nenhuma"

3. **Campo `previous_church_active`** — exibir **somente se** `baptism_type` for `adulto_outra_igreja` ou `crianca_outra_igreja`

4. **Campo `reason_joining`** — textarea simples

5. **Campos `time_attending` e `sunday_attendance`** — texto livre e select com 3 opções

6. **Campo `weekly_activities`** — radio sim/não. Se **sim**, revelar textarea `weekly_activities_which`

### 5.3 `PublicMemberForm.tsx` — Mesmas mudanças

O `PublicMemberForm` deve espelhar **todas** as mudanças do `MemberForm`:
- Todos os campos novos das Informações Básicas e Endereço
- Seção Eclesiástica completa
- `document` (CPF) já não existia no público — sem mudança nesse ponto
- Labels continuam usando terminologia mais amigável ao público ("obrigatório" em vez de `*`)
- A lógica condicional da seção eclesiástica deve ser idêntica ao `MemberForm`

> **Oportunidade de refatoração:** Como `MemberForm` e `PublicMemberForm` compartilham praticamente todo o schema Zod e lógica, vale considerar extrair um `useMemberFormLogic` hook ou um schema compartilhado (`memberFormSchema.ts`) para evitar duplicação, especialmente com a adição dos novos campos.

### 5.4 Componentes de exibição a atualizar

Além dos formulários, os seguintes locais que **exibem** dados de membros precisarão mostrar (ou omitir) os novos campos:

| Componente/Tela | Localização provável | O que fazer |
|-----------------|----------------------|-------------|
| Detalhes do membro (modal/página) | `frontend/src/components/members/` | Exibir novos campos por seção |
| Card de membro (lista) | `frontend/src/components/members/` | Avaliar quais campos resumidos mostrar |
| Relatórios / Dashboard | `frontend/src/components/reports/` | Avaliar agregações (ex: % batizados, % família evangélica) |
| Exportação PDF individual | `backend/src/services/` (gerador PDF) | Adicionar campos novos ao template |
| Exportação lista PDF/CSV | `backend/src/controllers/` | Avaliar quais colunas incluir |

> **Sobre CPF nos componentes de exibição:** O campo `document` (CPF) pode ainda aparecer em componentes de exibição para membros já cadastrados com esse dado. Recomenda-se **manter a exibição** para leitura (não esconder dados históricos), apenas removendo do formulário de edição.

---

## 6. Decisões Tomadas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | `nationality` → renomear ou nova coluna? | **Nova coluna `hometown`**, `nationality` depreciado no formulário mas mantido no banco |
| 2 | Campo `document` (CPF) | **Removido do formulário** (coluna mantida no banco) |
| 3 | Campo `Gênero` | **Mantido**, posicionado na linha 3 junto com Profissão |
| 4 | Formulário público — campos eclesiásticos | **Todos os campos** da seção eclesiástica |
| 5 | Validações condicionais como obrigatórias | **Não** — todos os campos novos são opcionais |

### Alterações posteriores

> **Jul/2026:** Campos `secret_organization` e `secret_organization_which` removidos do formulário, backend e banco por decisão do produto.

---

## 7. Pontos Ainda em Aberto

### 7.1 Importação CSV
O módulo de importação em lote (`backend/src/services/memberImportService.ts`) e o template CSV precisarão ser atualizados para incluir os novos campos. **Questões:**
- Quais dos 18 novos campos devem ser importáveis via CSV? Provavelmente apenas os simples (não os condicionais eclesiásticos).
- O campo `document` (CPF) deve continuar no CSV de importação para casos de migração de sistemas legados?

### 7.2 Exportação PDF / CSV
- Quais dos novos campos devem aparecer no PDF individual do membro?
- A exportação de lista (PDF e CSV) deve incluir algum novo campo como coluna padrão?
- Os campos da seção eclesiástica são sensíveis — avaliar se entram na exportação de lista ou apenas no PDF individual.

### 7.3 Filtros e relatórios
O módulo de relatórios (`frontend/src/components/reports/`) pode se beneficiar dos novos campos para novas agregações. Exemplos:
- % de membros batizados
- % vindos de família evangélica
- Distribuição por frequência dominical
Não é escopo desta tarefa, mas vale registrar para futuras iterações.

### 7.4 Ficha de cadastro impressa
Se existir um template de ficha impressa (PDF de formulário em branco para preenchimento manual), ele também precisará ser atualizado com os novos campos.

---

## 8. Ordem de Implementação Sugerida

```
1. [DB]      Migration no Supabase:
               - ADD COLUMN hometown
               - ADD COLUMN wedding_date, spouse_is_member, father_is_member, mother_is_member, address_number
               - ADD COLUMN (17 campos eclesiásticos)
               - Alterar CHECK de marital_status (add 'União Estável')
2. [DB]      Atualizar bd-structure.sql
3. [BE]      Atualizar types/index.ts (adicionar novos campos à interface Member)
4. [BE]      Atualizar memberValidator.ts (hometown + novos campos + marital_status)
5. [BE]      Verificar memberController.ts (queries INSERT/UPDATE — garantir que novos campos passam)
6. [FE]      Extrair schema Zod compartilhado (memberFormSchema.ts) — opcional mas recomendado
7. [FE]      Refatorar MemberForm.tsx:
               a. Seção Informações Básicas (novo layout + remover nationality/document)
               b. Seção Contato e Endereço (novo layout + address_number)
               c. Nova seção Informações Eclesiásticas (lógica condicional completa)
8. [FE]      Espelhar mudanças em PublicMemberForm.tsx
9. [FE]      Atualizar componentes de exibição (modal de detalhes, cards)
10. [FE/BE]  Atualizar importação CSV (após alinhar quais campos incluir — ver 7.1)
11. [BE]     Atualizar gerador de PDF individual (após alinhar layout — ver 7.2)
```

---

## 9. Estimativa de Impacto

| Área | Complexidade | Observações |
|------|-------------|-------------|
| Migration DB | Baixa | Apenas ADDs + CHECK — zero breaking change |
| Types/Validator BE | Baixa-Média | Adição direta de campos |
| MemberForm FE | **Alta** | Lógica condicional da seção eclesiástica é complexa |
| PublicMemberForm FE | **Alta** | Espelho do MemberForm |
| Componentes de exibição | Média | Depende de quantos campos mostrar |
| Importação CSV | Média | Atualizar parser e template |
| Exportação PDF | Baixa-Média | Adicionar campos ao template |

---

## 10. Notas Técnicas

### Lógica condicional do batismo (campo mais complexo)

A árvore de decisão do campo de batismo deve ser implementada com state local no React. Sugestão de modelagem:

```typescript
// State auxiliar no componente
const [showBaptismDetails, setShowBaptismDetails] = useState(false);
// Controlado pelo watch('is_baptized')

// No Zod, usar .superRefine() para validação cruzada:
.superRefine((data, ctx) => {
  if (data.is_baptized && !data.baptism_type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione o tipo de batismo',
      path: ['baptism_type'],
    });
  }
  if (
    (data.baptism_type === 'adulto_outra_igreja' || data.baptism_type === 'crianca_outra_igreja')
    && !data.baptism_other_church_name
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o nome da igreja',
      path: ['baptism_other_church_name'],
    });
  }
});
```

### Campo `address_number`
Adicionar **após** o campo `address` no formulário, não juntos numa única string. O autocomplete por CEP deve continuar preenchendo apenas `address` (logradouro).

### Estado Civil "União Estável"
Deve se comportar igual a "Casado" para revelar os campos `wedding_date` e `spouse`/`spouse_is_member`. A data do casamento pode ser nomeada "Data da União" no formulário quando "União Estável" for selecionado.
