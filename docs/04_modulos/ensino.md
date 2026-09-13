---
type: modulo
nome: ensino
status: Ativo
complexidade: Alta
ultima_atualizacao: 2026-09-13
versao: "1.0"
owner: (não identificado no código)
tags: [módulo, ensino, teaching]
depende_de: [auth, igreja-config, congregacoes, membros]
integracoes: [Supabase PostgreSQL]
---

# Módulo — Ensino

> Programas → Turmas → Inscritos, com match N/W/D ao rol, fila de possível membro e link público da turma.  
> Regras: [[02_regras-de-negocio/regras-por-modulo/ensino]] · Índice: [[04_modulos/index]] · Schema: [[03_arquitetura/banco-de-dados]].

---

## 1. 📌 Visão Geral

Organiza ciclos formativos da igreja (**EBD**, cursos, estudos, treinamentos): catálogo de **Programas**, **Turmas** por congregação e **matrículas** (membro, convidado ou possível membro).

Resolve o problema de gerenciar ofertas formativas e inscrição sem planilha — e sem misturar com **Grupos** (estrutura permanente, tipo `Classe`) nem com **Calendário** (agenda).

Consome [[04_modulos/membros]] e [[04_modulos/congregacoes]]; **não** cria `members` para convidados (fora da cota).  
Produto: [[01_produto/visao-do-produto]] · Glossário: Programa / Turma / Aluno · Jornada [[01_produto/jornadas-de-usuario]] J13.

---

## 2. ⚖️ Bounded Context

### ✅ Este módulo É responsável por:

- CRUD de `teaching_programs` e `teaching_classes` no tenant
- Escopo de congregação do programa (uma unidade **ou** todas) e consistência com a turma
- Responsável (1) + professores (0..N) via `teaching_class_teachers`
- Matrículas `teaching_enrollments` (`member` | `guest` | `possible_member`)
- Match servidor N/W/D (`teachingMatchService`) e fila de possível membro
- Políticas de skip/dismiss de fila (`teachingEnrollmentPolicy`)
- Link público da turma (`teaching_public_links`) + GET/POST `/api/public/teaching/:token`
- Listagens autenticadas com filtros/paginação (classes, enrollments) e seletor de visão por congregação
- Permissões: GET ≥ reader; mutações ≥ editor

### ❌ Este módulo NÃO é responsável por:

- CRUD de membros/congregações (só consome FKs)
- Converter convidado → Integrante/Membro (fase futura)
- Presença, PDF de chamada, capacidade/lista de espera, LMS, certificados
- Sync turma → Calendário; migrar GroupType `Classe` → Ensino
- Login do professor / app do aluno; billing / feature flag por plano

---

## 3. 📁 Estrutura de Arquivos

```
backend/src/
├── routes/
│   └── teaching.ts                 → programs / classes / enrollments / public-link
├── controllers/
│   ├── teachingProgramController.ts
│   ├── teachingClassController.ts
│   ├── teachingEnrollmentController.ts
│   └── teachingPublicLinkController.ts
├── services/
│   ├── teachingMatchService.ts
│   └── teachingEnrollmentPolicy.ts
├── validators/
│   └── teachingValidator.ts
└── (público) rotas em router public + rate limit

frontend/src/
├── app/(main)/teaching/
│   ├── page.tsx                    → hub
│   ├── [programId]/page.tsx
│   └── [programId]/[classId]/page.tsx
├── app/public/teaching/[token]/page.tsx
└── components/teaching/            → UI, filtros, detalhe, modais

Testes: `teachingMatchService.test.ts`, `teachingEnrollmentPolicy.test.ts`, `teachingValidator.test.ts`
Schema: Supabase live + espelho parcial em `backend/bd-structure.sql` (seção Ensino)
```

---

## 4. 🗄️ Entidades e Models

### teaching_programs

Catálogo formativo (ex.: “EBD 2026”).

| Campo | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| church_id | uuid | NOT NULL | — | Tenant CASCADE |
| name | text | NOT NULL | — | 2–100 |
| description | text | NULL | — | Opcional |
| congregation_id | uuid | NULL | — | null = todas; UUID = escopo |
| created_at / updated_at | timestamptz | NOT NULL | now() | Auditoria |

**Relacionamentos:** N turmas (`teaching_classes`, CASCADE).

### teaching_classes (Turma)

Edição com matrícula.

| Campo | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| church_id | uuid | NOT NULL | — | Tenant |
| program_id | uuid | NOT NULL | — | FK programa CASCADE |
| congregation_id | uuid | NOT NULL | — | Onde a aula acontece |
| name | text | NOT NULL | — | 2–100 |
| location / schedule | text | NULL | — | Local / horário (texto livre) |
| status | text | NOT NULL | `draft` | draft\|open\|in_progress\|closed\|archived |
| responsible_id | uuid | NOT NULL | — | Membro responsável RESTRICT |
| start_date | date | NOT NULL | — | Início |
| end_date | date | NULL | — | Fim ≥ start se presente |
| created_at / updated_at | timestamptz | NOT NULL | now() | Auditoria |

### teaching_class_teachers

PK `(class_id, member_id)`; CASCADE com turma. Membros distintos do responsável (validação app).

### teaching_enrollments

| Campo | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| church_id / class_id | uuid | NOT NULL | — | Tenant + turma CASCADE |
| kind | text | NOT NULL | — | member\|guest\|possible_member |
| member_id | uuid | NULL | — | Obrigatório se member; UNIQUE parcial por turma |
| full_name / whatsapp / birth_date | — | NULL* | — | Obrigatórios se guest/possible_member |
| email | text | NULL | — | Fora do match |
| match_meta | jsonb | NULL | — | Sinais/candidatos (não expor no público) |
| created_at / updated_at | timestamptz | NOT NULL | now() | Auditoria |

### teaching_public_links

Um link por turma (`UNIQUE class_id`); `token` UNIQUE; `expires_at`, `max_uses`, `current_uses`, `is_active`, `created_by`.

**Soft delete:** não (hard delete + status de turma/link).  
**Auditoria:** timestamps; ops sensíveis via fluxo de audit quando aplicável.

---

## 5. 🌐 Interface Pública (API)

Router autenticado: `authMiddleware` + `requireRole('reader')`; mutações `editor+`.

| Método | Rota | Role | Descrição |
| --- | --- | --- | --- |
| GET/POST | `/api/teaching/programs` | reader / editor | Lista (+ `class_count`) / cria |
| GET/PATCH/DELETE | `/api/teaching/programs/:id` | reader / editor | Detalhe / atualiza / remove (cascade) |
| GET/POST | `/api/teaching/classes` | reader / editor | Lista paginada / cria |
| GET/PATCH/DELETE | `/api/teaching/classes/:id` | reader / editor | Detalhe (+ teachers) / atualiza / remove |
| PUT | `/api/teaching/classes/:id/teachers` | editor | Substitui conjunto de professores |
| GET/POST | `/api/teaching/classes/:id/enrollments` | reader / editor | Lista `{ data, queue, pagination }` / cria |
| PATCH | `/api/teaching/enrollments/:id/resolve` | editor | `link_member` \| `keep_guest` |
| DELETE | `/api/teaching/enrollments/:id` | editor | Remove matrícula |
| GET/POST/PATCH | `/api/teaching/classes/:id/public-link` | reader*/editor | Meta / gerar / ativar-desativar |

\* GET do link: autenticado reader+ (token não é secreto no Painel; POST público usa o token).

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/public/teaching/:token` | token | Meta turma/igreja (sem PII de match) |
| POST | `/api/public/teaching/:token` | token + rate limit | Inscrição; `{ outcome: confirmed\|submitted }` |

**Busca:** filtros `ilike` sanitizados (`buildIlikeContainsOrFilter`) — evita quebra PostgREST com caracteres especiais.

---

## 6. 🔁 Fluxos principais

1. **CRUD Programa/Turma** — editor+; seletor de congregação no hub filtra visão.
2. **Matrícula Painel** — vincular membro ou criar convidado.
3. **Link público** — visitante preenche form único → match → `confirmed` ou `submitted`.
4. **Fila** — editor+ vê candidatos (contato completo + máscara auxiliar), Vincular ou Manter convidado; skip/dismiss se já inscrito.

```mermaid
flowchart LR
  Visitante -->|POST token| Match
  Match -->|N+W+D único| Member
  Match -->|parcial| Fila
  Match -->|sem N / só N| Guest
  Fila -->|link_member| Member
  Fila -->|keep_guest| Guest
```

---

## 7. 🖥️ Frontend

| Rota | Papel |
| --- | --- |
| `/teaching` | Hub (programas / turmas + seletor congregação) |
| `/teaching/[programId]` | Contexto do programa |
| `/teaching/[programId]/[classId]` | Detalhe da turma (equipe, link, **Inscritos**, fila) |
| `/public/teaching/[token]` | Form público brand full-bleed |

Nav: label **Ensino**, ícone `GraduationCap`, entre Calendário e Configurações.  
UI lista de matrículas: seção **Inscritos** (termo de negócio **Aluno** = matrícula; ver glossário).

---

## 8. 🔐 Segurança e multi-tenant

- Todas as queries autenticadas filtram `church_id`.
- Público: sem `match_meta`, sem lista do rol; mensagens genéricas se link/turma inválidos.
- Rate limit no POST público (padrão dos outros links).
- Escopo de congregação do usuário respeitado nos listadores (padrão Grupos/Relatórios).

---

## 9. 🧪 Testes

| Suite | Foco |
| --- | --- |
| `teachingMatchService.test.ts` | Normalização nome/WhatsApp; matriz N/W/D |
| `teachingEnrollmentPolicy.test.ts` | Skip fila; dismiss `already_enrolled` |
| `teachingValidator.test.ts` | Status, datas, nomes |

---

## 10. 📝 Notas para Agentes

- Código EN (`teaching_*`); UI PT (**Ensino / Programa / Turma / Inscritos**).
- Não confundir Turma com GroupType **Classe**.
- Convidado **nunca** vira `members` neste módulo.
- Documentar mudanças permanentes em `BR-ENS-*` + este arquivo + glossário/jornadas.
- Dump: seção Ensino em `backend/bd-structure.sql`; fonte de verdade = Supabase live.
