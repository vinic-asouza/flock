---
type: regras-modulo
modulo: membros
ultima_atualizacao: 2026-07-14
versao: "1.1"
total_regras: 17
tags: [regras, modulo:membros]
ver_tambem:
  - "[[02_regras-de-negocio/regras-gerais]]"
  - "[[04_modulos/membros/overview]]"
  - ""[[02_regras-de-negocio/regras-por-modulo/billing]]""
---

# Regras de Negócio — Gestão de Membros

## Responsabilidade do Módulo
Gerenciar o rol oficial de membros da igreja (CRUD, import, status, autocadastro).

## Índice de Regras
| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-MEM-001 | Limite de plano na criação | Restrição | Ativo |
| BR-MEM-002 | Nome único na igreja | Restrição | Ativo |
| BR-MEM-003 | E-mail único na igreja | Restrição | Ativo |
| BR-MEM-004 | Campos obrigatórios do membro | Restrição | Ativo |
| BR-MEM-005 | Nascimento active true | Fato | Ativo |
| BR-MEM-006 | Grupos do membro válidos | Restrição | Ativo |
| BR-MEM-007 | Import e limite | Restrição | Ativo |
| BR-MEM-008 | Skip duplicatas no import | Derivação | Ativo |
| BR-MEM-009 | Escrita editor+ | Restrição | Ativo |
| BR-MEM-010 | DELETE hard delete | Gatilho | Ativo |
| BR-MEM-011 | Inativação limpa agenda futura | Gatilho | Ativo |
| BR-MEM-012 | Contagem só ativos | Fato | Ativo |
| BR-MEM-013 | Link público válido | Restrição | Ativo |
| BR-MEM-014 | Link e plano | Restrição | Ativo |
| BR-MEM-015 | Race de max_uses | Gatilho | Ativo |
| BR-MEM-016 | Validade de link de registro | Restrição | Ativo |
| BR-MEM-017 | Congregação obrigatória | Restrição | Ativo |

---

## Regras por Categoria

### 📥 Regras de Criação / Cadastro

### BR-MEM-001: Limite de plano na criação
- **Declaração:** Um membro só pode ser criado quando membros ativos + quantidade ≤ teto do plano e status ≠ past_due.
- **Tipo:** Restrição
- **Gatilho:** POST members / batch / público
- **Comportamento esperado:** Membro criado
- **Comportamento em violação:** 403 Limite ou pagamento pendente
- **Implementado em:** `memberController; planLimits`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-001]]

### BR-MEM-002: Nome único na igreja
- **Declaração:** Na mesma igreja, nome completo do membro deve ser único (case-insensitive) na criação.
- **Tipo:** Restrição
- **Gatilho:** POST create
- **Comportamento esperado:** Criado
- **Comportamento em violação:** 400 Membro já cadastrado
- **Implementado em:** `memberController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-003: E-mail único na igreja
- **Declaração:** E-mail informado deve ser único entre membros da mesma igreja.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** Persistido
- **Comportamento em violação:** 400 Email já cadastrado
- **Implementado em:** `utils/memberValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-004: Campos obrigatórios do membro
- **Declaração:** Membro exige nome, nascimento (não futuro), gênero, estado civil, endereço/cidade/UF, tipo e data de recebimento; docs/CEP/fones válidos se informados.
- **Tipo:** Restrição
- **Gatilho:** Create/update/validate
- **Comportamento esperado:** Validação OK
- **Comportamento em violação:** 400 Dados inválidos
- **Implementado em:** `validators/memberValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-005: Nascimento active true
- **Declaração:** Todo membro criado nasce com active=true.
- **Tipo:** Fato
- **Gatilho:** Create API/batch/público
- **Comportamento esperado:** Ativo no rol
- **Comportamento em violação:** —
- **Implementado em:** `memberController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-006: Grupos do membro válidos
- **Declaração:** Grupos associados devem existir e pertencer à igreja/congregações dela.
- **Tipo:** Restrição
- **Gatilho:** Create/update com groups
- **Comportamento esperado:** Vínculos OK
- **Comportamento em violação:** 400 Erro ao validar grupos
- **Implementado em:** `memberValidations.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-007: Import e limite
- **Declaração:** Importação CSV só se todos os válidos couberem no restante do plano.
- **Tipo:** Restrição
- **Gatilho:** POST import
- **Comportamento esperado:** Import executado
- **Comportamento em violação:** 403 Limite atingido
- **Implementado em:** `memberImportController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-001]]

### BR-MEM-008: Skip duplicatas no import
- **Declaração:** Com skipDuplicates (padrão), linhas com mesmo nome na igreja são puladas.
- **Tipo:** Derivação
- **Gatilho:** Import CSV
- **Comportamento esperado:** Parcial import
- **Comportamento em violação:** Linha marcada duplicada
- **Implementado em:** `memberImportService.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### 📝 Regras de Atualização / Edição

### BR-MEM-009: Escrita editor+
- **Declaração:** Criar/editar/excluir/importar membros exige role editor+.
- **Tipo:** Restrição
- **Gatilho:** Rotas members mutáveis
- **Comportamento esperado:** 200/201
- **Comportamento em violação:** 403
- **Implementado em:** `routes/members.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-015]]

### 🗑️ Regras de Exclusão / Desativação

### BR-MEM-010: DELETE hard delete
- **Declaração:** Exclusão via DELETE remove o registro permanentemente (hard delete).
- **Tipo:** Gatilho
- **Gatilho:** DELETE /members/:id
- **Comportamento esperado:** Removido + audit
- **Comportamento em violação:** 404 se outra igreja
- **Implementado em:** `memberController.deleteMember`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-028]]

### BR-MEM-011: Inativação limpa agenda futura
- **Declaração:** Ao passar de ativo→inativo, remover participações em eventos com start_date ≥ agora.
- **Tipo:** Gatilho
- **Gatilho:** PATCH status / PUT active false
- **Comportamento esperado:** Status inativo + cleanup
- **Comportamento em violação:** —
- **Implementado em:** `memberController`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-027]]

### 🔄 Regras de Estado / Status

#### Tabela de transições (membro)

| Estado Atual | Evento | Próximo | Condição | Quem |
| --- | --- | --- | --- | --- |
| active=true | PATCH/PUT inativar | active=false | editor+ | editor+ |
| active=false | PATCH reativar | active=true | editor+ | editor+ |
| qualquer | DELETE | (removido) | editor+; mesma church_id | editor+ |


### BR-MEM-012: Contagem só ativos
- **Declaração:** O limite de plano conta apenas active=true.
- **Tipo:** Fato
- **Gatilho:** checkMemberLimit
- **Comportamento esperado:** Quota correta
- **Comportamento em violação:** —
- **Implementado em:** `planLimits.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-POL-003]]

### 🔗 Regras de Relacionamento

### BR-MEM-013: Link público válido
- **Declaração:** Autocadastro só com token existente, is_active, não expirado e abaixo de max_uses.
- **Tipo:** Restrição
- **Gatilho:** POST public register
- **Comportamento esperado:** Membro criado
- **Comportamento em violação:** 403/404 link
- **Implementado em:** `publicRegistrationAuth.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-GEN-023]]

### BR-MEM-014: Link e plano
- **Declaração:** Cadastro público também exige capacidade no plano.
- **Tipo:** Restrição
- **Gatilho:** Public create
- **Comportamento esperado:** OK
- **Comportamento em violação:** 403 Limite
- **Implementado em:** `publicRegistrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-015: Race de max_uses
- **Declaração:** Se incrementar usos falhar por limite, reverter membro criado.
- **Tipo:** Gatilho
- **Gatilho:** Concorrência no link
- **Comportamento esperado:** 409 Limite de usos
- **Comportamento em violação:** Rollback
- **Implementado em:** `publicRegistrationController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-016: Validade de link de registro
- **Declaração:** expires_at futuro e ≤1 ano; max_uses 1–10000 se informado.
- **Tipo:** Restrição
- **Gatilho:** Create/update registration link
- **Comportamento esperado:** Link salvo
- **Comportamento em violação:** 400
- **Implementado em:** `registrationLinkValidator.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-017: Congregação obrigatória
- **Declaração:** Todo membro deve ter `congregation_id` (UUID da igreja). Não existe membro sem congregação nem sentinel “Sede”.
- **Tipo:** Restrição
- **Gatilho:** Create/update member (API e registro público)
- **Comportamento esperado:** Membro vinculado a uma congregação real
- **Comportamento em violação:** 400 Congregação é obrigatória / inválida
- **Implementado em:** `memberValidator.ts` / `memberValidations.ts` / schema `members.congregation_id NOT NULL`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-CON-010]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Reativação via PATCH status não revalida limite do plano.
- 🔍 Comentário da rota fala soft delete; DELETE é hard delete.

---

*Atualizado em 2026-07-14 (DEV-18).*
