---
type: visao-produto
status: Rascunho
ultima_atualizacao: 2026-07-13
versao: "1.0"
tags: [produto, estratégia, contexto]
---

# Visão do Produto — Flock

> Âncora de contexto do produto. Agentes e o time devem consultar este documento antes de propor mudanças.

---

## 🎯 Missão do Produto

O **Flock** ajuda **líderes e equipes de igrejas** a **organizar membresia, integração de novos membros e a vida congregacional** para **tomar decisões com dados e reduzir o trabalho manual do secretariado**.

---

## 💡 Proposta de Valor

- Um único lugar para a vida administrativa da igreja (membros, estrutura, agenda e indicadores).
- Captação de novos membros com menos fricção (formulários públicos e fluxo de integração).
- Visibilidade demográfica e operacional sem depender de planilhas.
- Isolamento por igreja: cada organização vê apenas os próprios dados.
- Entrada gradual: plano gratuito e upgrade por tamanho da membership.

---

## 👥 Público-Alvo

**Segmento:** igrejas e organizações religiosas no Brasil (SaaS B2B de gestão eclesiástica).

**Perfis de uso (roles no código):** `owner`, `admin`, `editor`, `reader` — da conta que administra a igreja à equipe operacional que consulta e cadastra.

**Casos de uso primários identificados:**
- Secretariado cadastrar e consultar membros com filtros avançados
- Equipe acompanhar pré-membros até a conversão em membro
- Líderes estruturar congregações, grupos/ministérios e agenda
- Direção acompanhar painel/relatórios e exportar PDFs
- Visitante externo se cadastrar via link público sem login

---

## 🏆 Diferenciais

- Foco em **igreja brasileira** (CNPJ, telefones, geography IBGE, linguagem e fluxos eclesiais).
- **Integração de novos membros** como processo (status, mentor, conversão), não só cadastro.
- **Links públicos** de registro e integração para captação sem conta.
- **Multi-tenant** nativo + equipe com papéis distintos por igreja.
- Monetização clara por **limite de membros**, alinhada ao crescimento da igreja.

_(Comparação competitiva formal: não identificada no código — preencher manualmente.)_

---

## 🔑 Funcionalidades Principais

| Área | Funcionalidade | Benefício ao usuário |
| --- | --- | --- |
| Membresia | Cadastro, filtros, importação CSV, status ativo/inativo | Manter o rol de membros atualizado e encontrável |
| Integração | Pré-membros, mentor, conversão / descarte | Controlar o funil de novos membros |
| Estrutura | Congregações e grupos (ministérios, células, etc.) | Organizar a igreja além da lista plana de nomes |
| Agenda | Calendário de eventos/reuniões com participantes | Centralizar programação e participação |
| Inteligência | Painel e relatórios demográficos/temporais | Enxergar perfil e evolução da membership |
| Captação | Links públicos + landing (pricing/waitlist) | Captar interesses e leads sem atrito |
| Administração | Igreja, conta, usuários, auditoria, tutoriais | Operar a conta com segurança e onboarding |
| Assinatura | Planos e portal Stripe | Escalar o plano conforme o tamanho da igreja |

---

## 🏗️ Estado Atual do Produto

**Implementado e operando (v1.0+ no monorepo):** autenticção/registro de igreja, membros (CRUD, filtros, PDF, import), integração, congregações, grupos, calendário, relatórios no painel, configurações, billing Stripe, links públicos, landing com pricing e waitlist, tutoriais com guias.

**Em evolução / parcialmente maduro:** billing com estados e edge cases complexos; alertas de limite de membros; multi-igreja via switcher; reformulação do formulário de membro (documento de planejamento de jun/2026).

**Planejado / incompleto / dívida:** blacklist de JWT em memória (TODO de produção); plano `custom` no schema sem pricing espelhado na landing; cobertura automatizada de testes rarefeita (Jest declarado, QA predominantemente manual). Tutoriais avançaram além do “placeholder” antigo, mas maturidade do onboarding ainda pode evoluir.

---

## 📐 Modelo de Negócio

Assinatura recorrente via **Stripe**, com limite de membros por plano:

| Plano | Preço (config) | Limite de membros |
| --- | --- | --- |
| `100` | Gratuito | 100 |
| `200` | R$ 29,99 | 200 |
| `500` | R$ 59,99 | 500 |
| `800` | R$ 89,99 | 800 |
| `custom` | (não identificado no pricing público) | (preencher manualmente) |

Upgrade/downgrade e gestão no portal do cliente Stripe. Adição de membros bloqueada ao atingir o limite (e em `past_due`). Features de produto são as mesmas nos planos pagos listados na landing; a diferenciação é capacidade + nível de suporte comercial/dedicado.

---

## 🔗 Integrações Estratégicas

| Serviço | Papel no produto |
| --- | --- |
| Supabase | Autenticação e banco (dados da igreja) |
| Stripe | Checkout, assinatura e cobrança |
| Resend | E-mails transacionais (senha, billing, avisos) |
| IBGE | Estados/cidades no cadastro brasileiro |
| Sentry | Observabilidade de erros |
| Railway _(deploy)_ | Hospedagem dos apps |

---

## ⚠️ Limitações e Restrições Conhecidas

- Quota dura de membros por plano; grace `past_due` impede novas inclusões.
- Isolamento multi-tenant é por aplicação (`church_id`); RLS no backend usa service_role.
- Tokens revogados em memória — risco em múltiplas instâncias (TODO no auth).
- Sem suite e2e padronizada; confiança em QA manual / Insomnia.
- Diferenciação funcional entre planos pagos na landing é baixa (mesmo conjunto de benefits).
- Posicionamento competitivo e métricas de go-to-market: (não identificado no código — preencher manualmente).

---

## 📚 Contexto para os Agentes de IA

Este é um SaaS de **gestão eclesiástica (church management)** que ajuda igrejas brasileiras a gerenciar membros, integração, estrutura organizacional, agenda e relatórios, com monetização por limite de membros via Stripe. Os usuários principais são **donos/admins da igreja e equipes com papéis (owner, admin, editor, reader)**. O produto está em **estágio operacional v1+ com billing ativo e evoluções de produto em curso**. As principais entidades do sistema são **igreja (tenant), usuários da igreja, membros, integrantes (integração), congregações, grupos, itens de calendário, assinatura/planos e links públicos**.

---

## Arquivos e fontes analisadas

- `README.md`
- `docs/01_produto/` · `docs/02_regras-de-negocio/` · `docs/04_modulos/` · `docs/06_integracoes/`
- `backend/package.json`, `frontend/package.json`, `landing/package.json`
- `backend/src/config/plans.ts`, `backend/src/utils/planLimits.ts`
- `backend/bd-structure.sql`
- `backend/src/controllers/authController.ts` _(TODO de tokens)_
- `backend/src/app.ts` / rotas REST
- `frontend/src/components/main/Sidebar.tsx`
- `frontend/src/app/(main)/tutorials/page.tsx`, `frontend/src/lib/tutorials/`
- `landing/README.md`, `landing/src/components/Hero.tsx`, `Features.tsx`, `Pricing.tsx`
- Variáveis de ambiente: ver `docs/03_arquitetura/infraestrutura.md` e docs em `docs/06_integracoes/`
