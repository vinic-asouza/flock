---
type: integracao
servico: Query APIs (IBGE + ViaCEP)
categoria: Dados públicos
status: Ativo
ultima_atualizacao: 2026-07-14
versao: "1.0"
dashboard_url: null
documentacao_oficial: https://servicodados.ibge.gov.br/api/docs/localidades
tags: [integrações, query-apis, ibge, viacep]
---

# Query APIs — IBGE e ViaCEP

> APIs **públicas** de consulta (sem conta, sem API key, sem custo).  
> Índice: [[06_integracoes/index]] · Formulários: [[04_modulos/membros]], [[04_modulos/congregacoes]], auth/register, landing waitlist.

Não exigem setup na plataforma de terceiros. Este doc só registra **quais APIs usamos**, **URLs** e **comportamento se falharem**.

---

## 1. 📌 Visão Geral

| API | Para quê | Onde no Flock |
| --- | --- | --- |
| **IBGE Localidades** | Lista UFs e municípios | `frontend/src/hooks/useIbgeData.ts` (+ register / waitlist fetch direto) |
| **ViaCEP** | Autocomplete de endereço por CEP | `frontend/src/utils/validations.ts` → `fetchCEPData` |

Chamadas saem do **browser** (`fetch` HTTPS). Sem proxy no backend, sem env vars, sem SDK npm.

---

## 2. 🌍 Endpoints usados

### IBGE

| Uso | URL |
| --- | --- |
| Estados | `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome` |
| Municípios por UF | `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{id}/municipios?orderBy=nome` |

Docs: [Servicodados — Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### ViaCEP

| Uso | URL |
| --- | --- |
| Consulta CEP | `GET https://viacep.com.br/ws/{cep8digitos}/json/` |

Docs: [ViaCEP](https://viacep.com.br)

---

## 3. 🔑 Credenciais

**Nenhuma.** Sem `.env`, dashboard ou keys.

---

## 4. ⚙️ Comportamento e fallback

| API | Sucesso | Falha / indisponível |
| --- | --- | --- |
| IBGE estados | Popula select de UF | Usa `FALLBACK_UF_STATES` (27 UFs hardcoded) + mensagem de erro |
| IBGE cidades | Popula select de município | Lista vazia + erro na UI (sem fallback de cidades) |
| ViaCEP | Preenche logradouro/bairro/cidade/UF | Retorna `null` (silencioso) — CEP continua opcional |

---

## 5. 🚨 Troubleshooting

| Problema | O que fazer |
| --- | --- |
| Estados não carregam | Rede/CORS/browser; conferir se fallback de UF apareceu |
| Cidades vazias após escolher UF | Conferir `id` do estado IBGE; retry; API IBGE fora do ar |
| CEP não autocompleta | CEP inválido / ViaCEP down — usuário preenche manual |
| Rate limit / lentidão | APIs públicas sem SLA nosso — evitar refetch agressivo |

Não há webhook nem painel para reiniciar.

---

## 6. 📋 Manutenção

- Sem rotação de keys.
- Se IBGE/ViaCEP mudarem path ou saírem do ar: atualizar URLs no front ou trocar provedor (BrasilAPI etc.).
- Revisar se vale cache/proxy no backend só se volume ou latência virarem problema.

---

## 7. 🔗 Referências

- [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)
- [ViaCEP](https://viacep.com.br)
- Código: `useIbgeData.ts`, `validations.ts` (`fetchCEPData`)
