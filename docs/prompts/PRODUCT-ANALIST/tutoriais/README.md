# Módulo 13 — Tutoriais — Documentação de Produto

> **Elaborado por:** Analista de Produto (IA)  
> **Data:** Junho 2026  
> **Referências:** `docs/levantamento-fluxos.md` (Módulo 13), `docs/prompts/PRODUCT-ANALIST/product-analist.mdc`

---

## Objetivo desta pasta

Centralizar a análise de produto, proposta de implementação e catálogo de conteúdo para o **Módulo 13 — Tutoriais** do Flock: um ambiente de ajuda para usuários iniciantes consultarem rapidamente como realizar as operações básicas do sistema.

---

## Documentos

| Arquivo | Conteúdo |
|---------|----------|
| [01-diagnostico-estado-atual.md](./01-diagnostico-estado-atual.md) | Análise do que existe hoje no código e nos fluxos reais de cada módulo |
| [02-proposta-produto.md](./02-proposta-produto.md) | Proposta completa: objetivo, UX, layout, impacto técnico, MVP e evoluções |
| [03-catalogo-guias-iniciantes.md](./03-catalogo-guias-iniciantes.md) | Roteiro passo a passo de cada guia, alinhado às telas e ações reais do app |
| [04-especificacao-interface.md](./04-especificacao-interface.md) | Wireframes textuais, componentes, estados e responsividade |

---

## Escopo dos tutoriais (v1)

| Área | Rota no app | Público-alvo |
|------|-------------|--------------|
| Relatórios / Analytics | `/` | Todos (reader+) |
| Gestão de Membros | `/members` | Editor+ para ações; reader para consulta |
| Integração de Novos Membros | `/integration` | Editor+ para ações; reader para consulta |
| Gestão de Congregações | `/congregations` | Editor+ para ações; reader para consulta |
| Gestão de Grupos | `/groups` | Editor+ para ações; reader para consulta |
| Calendário e Eventos | `/calendar` | Editor+ para ações; reader para consulta |

**Fora do escopo v1 (evolução):** Configurações, Billing, Links públicos, Onboarding — podem ser adicionados como trilhas complementares após validação do MVP.

---

## Decisão de produto recomendada (resumo)

**Centro de Ajuda estático no frontend** (conteúdo em Markdown/MDX versionado no repositório), com:

- Hub em `/tutorials` com busca local e cards por módulo
- Guias curtos (3–7 passos) + seção "Saiba mais" opcional
- Deep links para abrir o guia certo (`/tutorials?guia=membros-cadastrar`)
- Badge de papel (`reader` vs `editor`) quando a ação exige permissão
- Botão "Ir para a tela" em cada guia (link direto à rota correspondente)

Sem backend nem CMS na v1 — reduz complexidade, custo e tempo de entrega, mantendo conteúdo versionado junto ao código.
