---
type: index-regras-modulo
ultima_atualizacao: 2026-09-13
versao: "1.7"
total_modulos: 14
total_regras: 168
tags: [regras, índice, módulos]
---

# Índice — Regras por Módulo

> Pasta canônica: `docs/02_regras-de-negocio/regras-por-modulo/`  
> Ver também: [[02_regras-de-negocio/regras-gerais]] · [[02_regras-de-negocio/politicas-e-restricoes]]

## Módulos documentados

| Módulo | Arquivo | Sigla | Regras | Responsabilidade |
| --- | --- | --- | ---: | --- |
| Autenticação e Sessão | [[02_regras-de-negocio/regras-por-modulo/auth]] | AUTH | 14 | Login, sessão, senha, confirmação |
| Admin OPS | [[02_regras-de-negocio/regras-por-modulo/admin-ops]] | OPS | 8 | Allowlist + leitura GET de Igrejas + Lista de espera + saúde agregada |
| Onboarding | [[02_regras-de-negocio/regras-por-modulo/onboarding]] | ONB | 12 | Registro de igreja/owner e funil de plano |
| Membros | [[02_regras-de-negocio/regras-por-modulo/membros]] | MEM | 16 | Rol oficial, import, autocadastro |
| Integração | [[02_regras-de-negocio/regras-por-modulo/integracao]] | INT | 15 | Pré-membros e conversão |
| Congregações | [[02_regras-de-negocio/regras-por-modulo/congregacoes]] | CON | 14 | Unidades locais |
| Grupos | [[02_regras-de-negocio/regras-por-modulo/grupos]] | GRP | 10 | Ministérios/células/etc. |
| Ensino | [[02_regras-de-negocio/regras-por-modulo/ensino]] | ENS | 25 | Programas, turmas, matrículas, aulas, chamada, certificados |
| Calendário | [[02_regras-de-negocio/regras-por-modulo/calendario]] | CAL | 16 | Agenda e participantes |
| Relatórios | [[02_regras-de-negocio/regras-por-modulo/relatorios]] | REL | 13 | Painel e exportações |
| Igreja / Config | [[02_regras-de-negocio/regras-por-modulo/igreja-config]] | CFG | 15 | Igreja, conta, equipe, audit |
| Billing | [[02_regras-de-negocio/regras-por-modulo/billing]] | BILL | 16 | Planos, Stripe, limites |
| Aquisição | [[02_regras-de-negocio/regras-por-modulo/aquisicao]] | ACQ | 5 | Landing / waitlist |
| Tutoriais | [[02_regras-de-negocio/regras-por-modulo/tutoriais]] | TUT | 4 | Guias in-app |

**Total:** 14 módulos · **175 regras**

## Contagem por categoria de prioridade (orientação)

| Prioridade | Módulos |
| --- | --- |
| Crítica | auth, membros, billing, onboarding |
| Alta | integracao, igreja-config, congregacoes, ensino |
| Média | grupos, calendario, relatorios |
| Baixa / acquis. | aquisicao, tutoriais, admin-ops |

## Convenções de ID

`BR-[SIGLA]-[NNN]` — exemplos: `BR-AUTH-001`, `BR-MEM-010`, `BR-ENS-010`, `BR-BILL-008`.

Regras transversais: `BR-GEN-*` · políticas de plano: `BR-POL-*`.

## Última atualização

2026-09-15 — BR-ENS-024…025 (certificados da Turma, DEV-110); índice ENS alinhado a 25 regras.