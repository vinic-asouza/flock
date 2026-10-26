---
type: regras-modulo
modulo: membros
ultima_atualizacao: 2026-10-26
versao: "1.4"
total_regras: 22
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
| BR-MEM-002 | Aviso de nome e nascimento | Restrição | Ativo |
| BR-MEM-003 | Aviso de e-mail repetido | Restrição | Ativo |
| BR-MEM-004 | Campos obrigatórios do membro | Restrição | Ativo |
| BR-MEM-005 | Nascimento active true | Fato | Ativo |
| BR-MEM-006 | Ministérios do membro válidos | Restrição | Ativo |
| BR-MEM-007 | Import e limite | Restrição | Ativo |
| BR-MEM-008 | Avisos na importação | Derivação | Ativo |
| BR-MEM-009 | Escrita editor+ | Restrição | Ativo |
| BR-MEM-010 | DELETE hard delete | Gatilho | Ativo |
| BR-MEM-011 | Inativação limpa agenda futura | Gatilho | Ativo |
| BR-MEM-012 | Contagem só ativos | Fato | Ativo |
| BR-MEM-013 | Link público válido | Restrição | Ativo |
| BR-MEM-014 | Link e plano | Restrição | Ativo |
| BR-MEM-015 | Race de max_uses | Gatilho | Ativo |
| BR-MEM-016 | Validade de link de registro | Restrição | Ativo |
| BR-MEM-017 | Congregação obrigatória | Restrição | Ativo |
| BR-MEM-018 | Contrato CSV operacional | Restrição | Ativo |
| BR-MEM-019 | Congregação do link público de membros | Restrição | Ativo |
| BR-MEM-020 | Contato mínimo na criação | Restrição | Ativo |
| BR-MEM-021 | Consentimento de comunicação | Fato | Ativo |
| BR-MEM-022 | Revisão de duplicidade no autocadastro | Gatilho | Ativo |

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

### BR-MEM-002: Aviso de nome e nascimento
- **Declaração:** Nome sozinho não bloqueia o cadastro. Quando o nome normalizado (sem acento, sem diferença de maiúsculas, espaços extras colapsados) e a data de nascimento coincidem com outro membro da mesma igreja, o Painel responde 409 `DUPLICATE_CONFIRMATION_REQUIRED` até o body trazer `acknowledgeDuplicates: true`. Homônimos com nascimentos diferentes entram sem aviso.
- **Tipo:** Restrição
- **Gatilho:** POST/PUT members
- **Comportamento esperado:** Salvo após confirmação, sem dados do outro membro na resposta
- **Comportamento em violação:** 409 com `warnings` contendo `name_birth`
- **Implementado em:** `utils/memberIdentity.ts`, `memberController.ts`
- **Testado em:** `utils/__tests__/memberIdentity.test.ts`
- **Depende de:** —

### BR-MEM-003: Aviso de e-mail repetido
- **Declaração:** E-mail repetido na mesma igreja não bloqueia. No Painel entra no mesmo 409 confirmável (`warnings: email`). Familiares podem compartilhar e-mail. A resposta não inclui o nome do outro membro.
- **Tipo:** Restrição
- **Gatilho:** POST/PUT members
- **Comportamento esperado:** Salvo após `acknowledgeDuplicates: true`
- **Comportamento em violação:** 409
- **Implementado em:** `utils/memberIdentity.ts`, `memberController.ts`
- **Testado em:** `utils/__tests__/memberIdentity.test.ts`
- **Depende de:** —

### BR-MEM-004: Campos obrigatórios do membro
- **Declaração:** Membro exige nome, nascimento (não futuro), gênero (só Masculino ou Feminino), estado civil, endereço/cidade/UF, tipo e data de recebimento; docs/CEP/fones válidos se informados. Na criação (Painel e autocadastro) exige ao menos um entre telefone, WhatsApp e e-mail, salvo `minor_without_own_contact` ([[BR-MEM-020]]). Edição não exige contato. O questionário eclesiástico **não** faz parte do contrato de membro (fica no Integrante — [[BR-INT-016]]).
- **Tipo:** Restrição
- **Gatilho:** Create/update/validate (Painel, público de registro, convert)
- **Comportamento esperado:** Validação OK; campos do questionário rejeitados/omitidos
- **Comportamento em violação:** 400 Dados inválidos
- **Implementado em:** `validators/memberValidator.ts`
- **Testado em:** `validators/__tests__/memberValidator.test.ts`
- **Depende de:** [[BR-INT-016]]

### BR-MEM-005: Nascimento active true
- **Declaração:** Todo membro criado nasce com active=true.
- **Tipo:** Fato
- **Gatilho:** Create API/batch/público
- **Comportamento esperado:** Ativo no rol
- **Comportamento em violação:** —
- **Implementado em:** `memberController.ts`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** —

### BR-MEM-006: Ministérios do membro válidos
- **Declaração:** Ministérios associados (`groups[]`) devem existir e pertencer à igreja/congregações dela.
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

### BR-MEM-008: Avisos na importação
- **Declaração:** A importação não pula linha só por nome igual. Linha sem contato, com nome+nascimento coincidentes ou com e-mail já usado entra no rol e aparece em `warnings`. Gênero fora de Masculino/Feminino invalida só aquela linha. `skipDuplicates` não volta a pular por nome.
- **Tipo:** Derivação
- **Gatilho:** Import CSV
- **Comportamento esperado:** Importação conclui; avisos separados de erros
- **Comportamento em violação:** Linha inválida em `errors`, as demais seguem
- **Implementado em:** `memberImportService.ts`
- **Testado em:** N/A — sem suite dedicada de import
- **Depende de:** [[BR-MEM-002]], [[BR-MEM-020]]

### BR-MEM-018: Contrato CSV operacional
- **Declaração:** Import e export CSV de membros cobrem o cadastro operacional (pessoais, família — inclusive flags cônjuge/pai/mãe é membro —, contato, endereço, recebimento). **Não** incluem o questionário eclesiástico. `nationality`, `document` e `baptism_date` são só legado no import (aliases). Cabeçalhos Idade/Status/Congregação de um CSV exportado **não** viram cadastro; a congregação do import é a do modal (BR-MEM-017). Labels oficiais do export dos campos suportados devem ser reimportáveis.
- **Tipo:** Restrição
- **Gatilho:** POST import/validate e POST `/api/export/members/list/csv`
- **Comportamento esperado:** Mapping alinhado ao formulário; roundtrip dos campos de cadastro
- **Comportamento em violação:** Coluna skip ignorada; legado inválido falha Joi; CSV só com campos deprecated → 400 (BR-REL-007)
- **Implementado em:** `csvParser.ts`, `memberImportService.ts`, `listFields.ts` (`memberCsvFieldLabels` / `memberCsvFieldValue`), `exportController.ts`
- **Testado em:** `utils/__tests__/csvParser.test.ts`, `utils/pdf/__tests__/listFields.test.ts`
- **Depende de:** [[BR-MEM-004]], [[BR-MEM-017]], [[BR-REL-007]]

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
- **Declaração:** expires_at futuro e ≤1 ano; max_uses 1–10000 se informado; `default_congregation_id` UUID obrigatório na criação/edição do link.
- **Tipo:** Restrição
- **Gatilho:** Create/update registration link
- **Comportamento esperado:** Link salvo com congregação definida
- **Comportamento em violação:** 400
- **Implementado em:** `registrationLinkValidator.ts` / `registrationLinkController.ts`
- **Testado em:** `registrationLinkValidator.test.ts`
- **Depende de:** [[BR-MEM-019]]

### BR-MEM-017: Congregação obrigatória
- **Declaração:** Todo membro deve ter `congregation_id` (UUID da igreja). Não existe membro sem congregação nem sentinel “Sede”.
- **Tipo:** Restrição
- **Gatilho:** Create/update member (API e registro público)
- **Comportamento esperado:** Membro vinculado a uma congregação real
- **Comportamento em violação:** 400 Congregação é obrigatória / inválida
- **Implementado em:** `memberValidator.ts` / `memberValidations.ts` / schema `members.congregation_id NOT NULL`
- **Testado em:** N/A — sem suite dedicada
- **Depende de:** [[BR-CON-010]]

### BR-MEM-019: Congregação do link público de membros
- **Declaração:** A congregação do autocadastro público de membros é definida na criação do link (`default_congregation_id`). O formulário anônimo não solicita congregação; o POST usa exclusivamente a congregação do link (ignora override do body). Ministérios do form público são os da congregação do link. Links sem congregação são rejeitados no validate/create públicos.
- **Tipo:** Restrição
- **Gatilho:** Create link; GET/POST `/api/public/registration/:token`; GET `.../groups`
- **Comportamento esperado:** Membro nasce na congregação do link; form sem campo congregação
- **Comportamento em violação:** 400 link mal configurado / congregação obrigatória na criação do link
- **Implementado em:** `registrationLinkValidator.ts` / `publicRegistrationController.ts` / `RegistrationLinksModal` / `PublicMemberForm`
- **Testado em:** `registrationLinkValidator.test.ts` + QA local DEV-157
- **Depende de:** [[BR-MEM-016]], [[BR-MEM-017]]

### BR-MEM-020: Contato mínimo na criação
- **Declaração:** Criar membro no Painel ou no autocadastro exige telefone, WhatsApp ou e-mail não vazio, salvo a marcação manual `minor_without_own_contact` (menor de 18 anos sem contato próprio). A exceção não é calculada pela data de nascimento. Editar um membro existente não exige contato. Na importação, linha sem contato entra com aviso.
- **Tipo:** Restrição
- **Gatilho:** POST members e POST público com `mode: create`
- **Comportamento esperado:** Criado com a flag persistida quando marcada
- **Comportamento em violação:** 400 pedindo contato ou a exceção de menor
- **Implementado em:** `memberValidator.ts`
- **Testado em:** `validators/__tests__/memberValidator.test.ts`
- **Depende de:** [[BR-MEM-004]]

### BR-MEM-021: Consentimento de comunicação
- **Declaração:** Consentimento é um registro único (`communication_consent_at` + `communication_consent_source`: `internal`, `public` ou `import`). Ausência dos dois campos significa sem consentimento registrado; cadastros antigos não são presumidos. Desmarcar zera os dois. Marcar de novo sem desmarcar preserva data e origem. Na importação, um checkbox do modal vale para as linhas inseridas daquela leva e começa desmarcado.
- **Tipo:** Fato
- **Gatilho:** Create/update/import
- **Comportamento esperado:** Ficha mostra data e origem, ou "sem consentimento registrado"
- **Comportamento em violação:** CHECK impede data sem origem ou origem sem data
- **Implementado em:** `memberIdentity.ts`, migration `20261026120000_dev_173_member_contact_consent`
- **Testado em:** `utils/__tests__/memberIdentity.test.ts`
- **Depende de:** —

### BR-MEM-022: Revisão de duplicidade no autocadastro
- **Declaração:** O autocadastro nunca informa que outra pessoa já existe. Se nome+nascimento ou e-mail coincidem, o membro é criado com `duplicate_review_pending`. Um PUT interno bem-sucedido zera a flag. A resposta pública omite essa flag.
- **Tipo:** Gatilho
- **Gatilho:** POST `/api/public/registration/:token`
- **Comportamento esperado:** Sucesso idêntico para o visitante; aviso na ficha para reader+
- **Comportamento em violação:** —
- **Implementado em:** `publicRegistrationController.ts`
- **Testado em:** N/A — sem suite HTTP
- **Depende de:** [[BR-MEM-002]], [[BR-MEM-003]]

---

## ⚠️ Regras Inferidas (Aguardando Confirmação)

- 🔍 Reativação via PATCH status não revalida limite do plano.
- 🔍 Comentário da rota fala soft delete; DELETE é hard delete.

---

*Atualizado em 2026-10-19 (DEV-157).*
