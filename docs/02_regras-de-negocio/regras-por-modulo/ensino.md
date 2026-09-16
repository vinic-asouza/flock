---
type: regras-modulo
modulo: ensino
ultima_atualizacao: 2026-09-15
versao: "1.2"
total_regras: 25
tags: [regras, modulo:ensino]
ver_tambem:
  - "[[04_modulos/ensino]]"
  - "[[02_regras-de-negocio/regras-por-modulo/membros]]"
  - "[[02_regras-de-negocio/politicas-e-restricoes]]"
---

# Regras de Negócio — Ensino

## Responsabilidade do Módulo

Gerenciar **Programas** e **Turmas** formativas (EBD, cursos, estudos), matrículas (membro / convidado / possível membro), match ao rol, link público, **cronograma de aulas**, **chamada** e **certificados PDF** ao encerrar a turma — sem confundir com Grupos (`Classe`), sem sync com Calendário global e sem consumir cota de membros para convidados.

## Índice de Regras

| ID | Nome | Tipo | Status |
| --- | --- | --- | --- |
| BR-ENS-001 | Nome e descrição de programa | Restrição | Ativo |
| BR-ENS-002 | Escopo de congregação do programa | Restrição | Ativo |
| BR-ENS-003 | Turma sempre com congregação | Restrição | Ativo |
| BR-ENS-004 | Consistência programa × turma | Restrição | Ativo |
| BR-ENS-005 | Status da turma | Restrição | Ativo |
| BR-ENS-006 | Responsável e professores | Restrição | Ativo |
| BR-ENS-007 | Datas da turma | Restrição | Ativo |
| BR-ENS-008 | Kinds de matrícula | Restrição | Ativo |
| BR-ENS-009 | Unicidade de membro na turma | Restrição | Ativo |
| BR-ENS-010 | Matriz de match N/W/D | Política | Ativo |
| BR-ENS-011 | Inscrição pública só em turma aberta | Restrição | Ativo |
| BR-ENS-012 | Privacidade do outcome público | Política | Ativo |
| BR-ENS-013 | Fila possível membro (resolve) | Gatilho | Ativo |
| BR-ENS-014 | Skip / dismiss fila se já inscrito | Gatilho | Ativo |
| BR-ENS-015 | Convidado fora da cota | Fato | Ativo |
| BR-ENS-016 | Permissões reader / editor+ | Restrição | Ativo |
| BR-ENS-017 | Um link público por turma | Restrição | Ativo |
| BR-ENS-018 | Cascade delete programa → turmas | Gatilho | Ativo |
| BR-ENS-019 | Aulas sem sync com Calendário | Restrição | Ativo |
| BR-ENS-020 | Séries recorrentes materializadas | Restrição | Ativo |
| BR-ENS-021 | Escopos single / following | Gatilho | Ativo |
| BR-ENS-022 | Chamada aula × matrícula | Restrição | Ativo |
| BR-ENS-023 | Elegibilidade temporal da chamada | Política | Ativo |
| BR-ENS-024 | Emissão de certificado só com turma encerrada | Restrição | Ativo |
| BR-ENS-025 | Conteúdo e template efêmero do certificado | Política | Ativo |

---

## Regras por Categoria

### 📥 Criação / Cadastro

### BR-ENS-001: Nome e descrição de programa
- **Declaração:** Nome do programa 2–100 (trim); descrição opcional.
- **Tipo:** Restrição
- **Gatilho:** Create/update de programa
- **Comportamento esperado:** Persistência OK
- **Comportamento em violação:** 400
- **Implementado em:** `teachingValidator.ts` + CHECK `teaching_programs_name_len`
- **Testado em:** `teachingValidator.test.ts`
- **Depende de:** —

### BR-ENS-002: Escopo de congregação do programa
- **Declaração:** `congregation_id` null = todas as congregações; UUID = escopo daquela unidade (deve pertencer à igreja).
- **Tipo:** Restrição
- **Gatilho:** Create/update de programa
- **Comportamento esperado:** Escopo válido
- **Comportamento em violação:** 400
- **Implementado em:** `teachingProgramController.ts`
- **Testado em:** N/A — cobertura via validadores / smoke
- **Depende de:** Congregações

### BR-ENS-003: Turma sempre com congregação
- **Declaração:** Toda turma exige `congregation_id` NOT NULL (onde a aula acontece).
- **Tipo:** Restrição
- **Gatilho:** Create/update de turma
- **Comportamento esperado:** Turma com congregação
- **Comportamento em violação:** 400
- **Implementado em:** `teachingValidator.ts` / `teachingClassController.ts`
- **Testado em:** `teachingValidator.test.ts`
- **Depende de:** BR-ENS-002

### BR-ENS-004: Consistência programa × turma
- **Declaração:** Se o programa tem congregação A, a turma só pode ser em A; se o programa é “todas”, a turma escolhe qualquer congregação da igreja.
- **Tipo:** Restrição
- **Gatilho:** Create/update de turma
- **Comportamento esperado:** Alinhamento aceito
- **Comportamento em violação:** 400
- **Implementado em:** `teachingClassController.ts`
- **Testado em:** N/A — smoke / QA
- **Depende de:** BR-ENS-002, BR-ENS-003

### BR-ENS-005: Status da turma
- **Declaração:** `status` ∈ `draft` | `open` | `in_progress` | `closed` | `archived` (UI: rascunho / aberta / em andamento / encerrada / arquivada). Default create: `draft`.
- **Tipo:** Restrição
- **Gatilho:** Create/update
- **Comportamento esperado:** Status válido
- **Comportamento em violação:** 400
- **Implementado em:** `teachingValidator.ts` + CHECK `teaching_classes_status_check`
- **Testado em:** `teachingValidator.test.ts`
- **Depende de:** —

### BR-ENS-006: Responsável e professores
- **Declaração:** Responsável = 1 membro obrigatório da igreja. Professores = 0..N membros distintos do responsável; sem duplicar o mesmo membro na turma.
- **Tipo:** Restrição
- **Gatilho:** Create/update turma; `PUT …/teachers`
- **Comportamento esperado:** Equipe válida
- **Comportamento em violação:** 400
- **Implementado em:** `teachingClassController.ts`
- **Testado em:** N/A — smoke / QA
- **Depende de:** Membros

### BR-ENS-007: Datas da turma
- **Declaração:** `start_date` obrigatória; `end_date` opcional e, se presente, ≥ `start_date`.
- **Tipo:** Restrição
- **Gatilho:** Create/update turma
- **Comportamento esperado:** Intervalo válido
- **Comportamento em violação:** 400
- **Implementado em:** `teachingValidator.ts` + CHECK `teaching_classes_end_date_check`
- **Testado em:** `teachingValidator.test.ts`
- **Depende de:** —

### BR-ENS-008: Kinds de matrícula
- **Declaração:** `kind` ∈ `member` | `guest` | `possible_member`. Membro exige `member_id`; guest/possible_member exigem `full_name`, `whatsapp`, `birth_date` (e-mail opcional).
- **Tipo:** Restrição
- **Gatilho:** Create enrollment (Painel ou público)
- **Comportamento esperado:** Linha coerente com kind
- **Comportamento em violação:** 400 / CHECK
- **Implementado em:** schema + controllers de enrollment
- **Testado em:** N/A — schema CHECK
- **Depende de:** —

### BR-ENS-009: Unicidade de membro na turma
- **Declaração:** No máximo um enrollment com o mesmo `member_id` por `class_id` (índice único parcial).
- **Tipo:** Restrição
- **Gatilho:** Create / resolve `link_member`
- **Comportamento esperado:** Sem duplicata de membro
- **Comportamento em violação:** 409 / dismiss fila (`already_enrolled`)
- **Implementado em:** `teaching_enrollments_class_member_uidx` + `decideLinkMemberResolve`
- **Testado em:** `teachingEnrollmentPolicy.test.ts`
- **Depende de:** BR-ENS-008

### 🔍 Match e inscrição pública

### BR-ENS-010: Matriz de match N/W/D
- **Declaração:** Match só no servidor. N = nome parcial (≥2 palavras pós-normalização; partículas ignoradas; sem fuzzy). W = 4 últimos dígitos do WhatsApp nacional. D = nascimento `YYYY-MM-DD`. E-mail **fora** do match. Matriz: N+W+D **único** → `member` auto; N+W ou N+D (não os três) ou N+W+D com >1 candidato → `possible_member`; só N ou sem N → `guest`.
- **Tipo:** Política
- **Gatilho:** POST público; (re)cálculo na fila
- **Comportamento esperado:** Kind conforme matriz
- **Comportamento em violação:** —
- **Implementado em:** `teachingMatchService.ts`
- **Testado em:** `teachingMatchService.test.ts`
- **Depende de:** Membros ativos

### BR-ENS-011: Inscrição pública só em turma aberta
- **Declaração:** POST público aceito só se link ativo, não expirado, usos OK **e** turma `open` ou `in_progress`. Demais status → recusa genérica.
- **Tipo:** Restrição
- **Gatilho:** `POST /api/public/teaching/:token`
- **Comportamento esperado:** Enrollment criado
- **Comportamento em violação:** 4xx mensagem genérica (“não disponível”)
- **Implementado em:** middleware/controller público de ensino
- **Testado em:** N/A — QA / smoke
- **Depende de:** BR-ENS-005, BR-ENS-017; BR-POL-004 (rate limit)

### BR-ENS-012: Privacidade do outcome público
- **Declaração:** Resposta/UI pública não revela match, fila nem PII do rol. Outcomes: `confirmed` (vínculo membro auto) | `submitted` (fila ou convidado) — copy “Inscrição confirmada” vs “Inscrição enviada”.
- **Tipo:** Política
- **Gatilho:** GET/POST público
- **Comportamento esperado:** Payload mínimo
- **Comportamento em violação:** —
- **Implementado em:** controller público + página `/public/teaching/[token]`
- **Testado em:** N/A — QA
- **Depende de:** BR-ENS-010

### 📝 Fila e resolução

### BR-ENS-013: Fila possível membro (resolve)
- **Declaração:** Editor+ resolve `possible_member` com `link_member` (escolhe candidato do rol) ou `keep_guest` (vira convidado). Não cria `members`. Fila no Painel: contato completo + `whatsapp_masked` para candidatos (override UX-04 — PII completa só autenticado editor+; público sem PII).
- **Tipo:** Gatilho
- **Gatilho:** `PATCH /api/teaching/enrollments/:id/resolve`
- **Comportamento esperado:** Kind atualizado / linha removida conforme ação
- **Comportamento em violação:** 400/403/404
- **Implementado em:** `teachingEnrollmentController.ts`
- **Testado em:** N/A — QA
- **Depende de:** BR-ENS-010, BR-ENS-016

### BR-ENS-014: Skip / dismiss fila se já inscrito
- **Declaração:** Se todos os candidatos de `possible_member` já estão matriculados na turma, o POST público **não** cria linha de fila (vira convidado / fluxo sem queue). No Painel, `link_member` de membro já inscrito **dismissa** a fila (`already_enrolled`) sem duplicar.
- **Tipo:** Gatilho
- **Gatilho:** POST público; resolve `link_member`
- **Comportamento esperado:** Sem duplicata / sem fila inútil
- **Comportamento em violação:** —
- **Implementado em:** `teachingEnrollmentPolicy.ts`
- **Testado em:** `teachingEnrollmentPolicy.test.ts`
- **Depende de:** BR-ENS-009, BR-ENS-010

### 💳 Cota e permissões

### BR-ENS-015: Convidado fora da cota
- **Declaração:** Matrícula `guest` / dados de possível membro **não** criam `members` e **não** consomem cota do plano (BR-POL-001/003).
- **Tipo:** Fato
- **Gatilho:** Create enrollment
- **Comportamento esperado:** Sem incremento de membros
- **Comportamento em violação:** —
- **Implementado em:** controllers (nunca insert em `members` no fluxo Ensino)
- **Testado em:** N/A — QA cenário limite
- **Depende de:** BR-POL-001, BR-POL-003

### BR-ENS-016: Permissões reader / editor+
- **Declaração:** GET autenticado ≥ reader; mutações (CRUD, fila, link, **export de certificados**) ≥ editor. Disponível em **todos** os planos (BR-POL-027). Reader consulta a aba Certificados sem configurar/gerar; não há biblioteca de PDFs entre sessões.
- **Tipo:** Restrição
- **Gatilho:** Rotas `/api/teaching/*`
- **Comportamento esperado:** 200 / 403 conforme role
- **Comportamento em violação:** 403
- **Implementado em:** `routes/teaching.ts` (`requireRole`)
- **Testado em:** N/A — QA
- **Depende de:** Auth / BR-POL-005

### 🔗 Link e exclusão

### BR-ENS-017: Um link público por turma
- **Declaração:** No máximo um registro em `teaching_public_links` por `class_id` (token UNIQUE). Gerar / ativar / desativar / expirar / max_uses espelham padrão de links de membros/integração.
- **Tipo:** Restrição
- **Gatilho:** POST/PATCH public-link
- **Comportamento esperado:** Meta do link atualizada
- **Comportamento em violação:** 400/409
- **Implementado em:** `teachingPublicLinkController.ts` + UNIQUE `class_id`
- **Testado em:** N/A — QA
- **Depende de:** BR-MEM-013/014/015 (padrão)

### BR-ENS-018: Cascade delete programa → turmas
- **Declaração:** DELETE de programa remove turmas (CASCADE), professores, matrículas e link. UI deve confirmar.
- **Tipo:** Gatilho
- **Gatilho:** `DELETE /api/teaching/programs/:id`
- **Comportamento esperado:** Remoção em cascata
- **Comportamento em violação:** —
- **Implementado em:** FKs `ON DELETE CASCADE`
- **Testado em:** N/A — schema
- **Depende de:** —

### 📅 Aulas e chamada

### BR-ENS-019: Aulas sem sync com Calendário
- **Declaração:** Aulas de Ensino vivem só em `teaching_lessons` / série da turma. Criar, editar ou excluir aula **não** cria nem altera itens do módulo Calendário global.
- **Tipo:** Restrição
- **Gatilho:** CRUD de aulas / séries
- **Comportamento esperado:** Isolamento de bounded contexts
- **Comportamento em violação:** —
- **Implementado em:** `teachingLessonController.ts` (sem chamadas ao Calendário)
- **Testado em:** N/A — revisão / QA
- **Depende de:** —

### BR-ENS-020: Séries recorrentes materializadas
- **Declaração:** Recorrência `weekly` \| `monthly` \| `interval_days` materializa ocorrências até `ends_on`, com teto de **366** datas, prévia obrigatória (conflitos e meses ignorados) e UNIQUE de horário por turma.
- **Tipo:** Restrição
- **Gatilho:** Preview / create lesson-series
- **Comportamento esperado:** Lote criado sem duplicar silenciosamente aula equivalente
- **Comportamento em violação:** 400 / 409
- **Implementado em:** `teachingLessonRecurrenceService.ts` + RPCs de série
- **Testado em:** `teachingLessonRecurrenceService.test.ts`
- **Depende de:** BR-ENS-019

### BR-ENS-021: Escopos single / following
- **Declaração:** Edição e exclusão de aula recorrente usam `scope=single` (só a ocorrência) ou `following` (esta e as próximas). Em `single`, a **data** não pode mudar (mantém `occurrence_key`); título/horário/descrição sim. Excluir a última ocorrência remove a série órfã.
- **Tipo:** Gatilho
- **Gatilho:** PATCH/DELETE `/api/teaching/lessons/:id`
- **Comportamento esperado:** Conjunto correto de ocorrências afetado; 400 se tentar mudar data em single
- **Comportamento em violação:** 400 / 409 (presença exige confirmação)
- **Implementado em:** `teachingLessonController.ts` + `delete_teaching_lessons_scope` / update RPC
- **Testado em:** N/A — QA smoke + review
- **Depende de:** BR-ENS-020

### BR-ENS-022: Chamada aula × matrícula
- **Declaração:** Presença é por combinação aula × inscrição, com estados **Não registrada**, **Presente** e **Ausente**. “Marcar todos presentes” promove não registradas; sobrescrever Ausente exige confirmação explícita (`overwrite_absent`).
- **Tipo:** Restrição
- **Gatilho:** GET/PUT attendance
- **Comportamento esperado:** Persistência idempotente; UI com dirty guard
- **Comportamento em violação:** 400 / 409
- **Implementado em:** `save_teaching_lesson_attendance` + `TeachingLessonAttendance.tsx`
- **Testado em:** N/A — QA
- **Depende de:** BR-ENS-016, BR-ENS-023

### BR-ENS-023: Elegibilidade temporal da chamada
- **Declaração:** `possible_member` não entra na chamada até resolução. Membro/convidado entram a partir de `attendance_eligible_from` (inclusivo). Remoção lógica (`removed_at`) preserva presenças de dias **anteriores** e torna a matrícula inelegível a partir do **dia calendário** da remoção (incluindo o próprio dia).
- **Tipo:** Política
- **Gatilho:** GET/PUT attendance; DELETE enrollment
- **Comportamento esperado:** Lista/resumo alinhados ao RPC; histórico anterior consultável
- **Comportamento em violação:** 409 inelegível
- **Implementado em:** `teachingAttendanceEligibility.ts` + RPC save attendance
- **Testado em:** `teachingAttendanceEligibility.test.ts`
- **Depende de:** BR-ENS-008, BR-ENS-022

### 📜 Certificados

### BR-ENS-024: Emissão de certificado só com turma encerrada
- **Declaração:** Export de certificados exige turma `status = closed`. Elegíveis: matrículas `member` ou `guest` **sem** `removed_at`. `possible_member` é inelegível até resolução. Máximo **50** enrollmentIds por request. Revalidação no servidor (tenant, congregação, ownership turma × IDs).
- **Tipo:** Restrição
- **Gatilho:** `POST /api/teaching/classes/:id/certificates/export`
- **Comportamento esperado:** PDF multipágina (1 página/aluno) ou 400 com motivo
- **Comportamento em violação:** 400 (turma não encerrada / seleção inválida / limite)
- **Implementado em:** `teachingCertificateController.ts` + `teachingCertificateService.ts`
- **Testado em:** `teachingCertificateService.test.ts`
- **Depende de:** BR-ENS-005, BR-ENS-008, BR-ENS-016

### BR-ENS-025: Conteúdo e template efêmero do certificado
- **Declaração:** PDF landscape A4 com campos mínimos: nome do aluno, Turma, Programa, Igreja, data de emissão. Template **efêmero** no request: logo da Igreja obrigatório (PNG/JPEG ≤2 MB), até 2 logos adicionais, cores primária/secundária `#RRGGBB`. Sem tabela de template, sem storage de PDF, sem histórico de emissão. WebP não é aceito (PDFKit).
- **Tipo:** Política
- **Gatilho:** Export de certificados (multipart)
- **Comportamento esperado:** PDF com logos embutidos; falha se logo obrigatório inválido ou não embutível
- **Comportamento em violação:** 400 (logo/cores) / 500 se embed obrigatório falhar após headers
- **Implementado em:** `uploadCertificateImages.ts` + `renderTeachingCertificate.ts`
- **Testado em:** `teachingCertificateService.test.ts` · `renderTeachingCertificate.test.ts`
- **Depende de:** BR-ENS-024

---

## Referências transversais

| Regra | Uso no Ensino |
| --- | --- |
| BR-POL-001 / 003 | Cota só `members.active` |
| BR-POL-004 | Rate limit POST público |
| BR-POL-005 / 027 | Role + módulo em todos os planos |
| BR-MEM-013/014/015 | Padrão de token / ativo / usos |
