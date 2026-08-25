---
type: modulo
nome: Admin OPS
status: Em Desenvolvimento
versao: "0.1"
owner: plataforma
ultima_atualizacao: 2026-08-25
tags: [admin-ops, plataforma, interno]
dependencias: []
---

# Módulo — Admin OPS

> Superfície interna de operação do SaaS. **Não** é o Painel da Igreja.  
> Glossário: [[01_produto/glossario]] · Arquitetura: [[03_arquitetura/visao-geral]] · Auth da igreja: [[04_modulos/auth]].

---

## 📌 Overview

**Responsabilidade única:** hospedar o app `admin-ops/` (local **:3002**) para o **Operador da plataforma**.

Estado atual (DEV-73): **scaffold**. Páginas placeholder `/` e `/login` (sem API, sem sessão). Login allowlist, `/api/ops`, console read-only, waitlist e saúde ficam para Issues seguintes.

**Fora:** Mintlify (usuário da igreja não usa isto). Sentry (DEV-70). Deploy Railway (pedido explícito depois). npm workspaces.

---

## 🗂️ Código

```text
admin-ops/                 → Next.js 15, porta 3002, sem @sentry/nextjs
admin-ops/src/app/         → `/`, `/login`, `robots.ts` (Disallow: /)
```

Backend `/api/ops/*` **ainda não** existe neste recorte.

---

## 🔐 Auth

Não implementado neste módulo ainda. Decisão de produto: allowlist `PLATFORM_ADMIN_EMAILS` + conta **sem** `church_users`. Não reusar `POST /api/auth/login` do Painel.

---

## 📡 Interface pública

Nenhuma rota de domínio nesta entrega. Rotas UI:

| Rota | Auth | Nota |
| --- | --- | --- |
| `/` | pública (scaffold) | Placeholder |
| `/login` | pública (scaffold) | Formulário desabilitado |

---

## ⚠️ Pontos de atenção

- Admin OPS ≠ papel `admin` da igreja.
- Não copiar o shell `(main)` do Painel para o login (DEV-75).
- `NEXT_PUBLIC_API_URL` no `.env.example`; o scaffold não chama a API.
- Evitar `npm run build` com `next dev` no mesmo pacote (corrupção de `.next`).
