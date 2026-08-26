# Admin OPS — Flock

Centro operacional interno da plataforma Flock. Uso exclusivo da equipe da
plataforma — **não** é o Painel da Igreja (`frontend/`, `painel.flockapp.com.br`).

Este pacote é o 4º app do monorepo. Login de operador usa `POST /api/ops/login`
(cookies httpOnly, `withCredentials`). O console (overview, Igrejas, waitlist)
fica para Issues seguintes.

## Tecnologias

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Headless UI, Axios, React Hook Form + Zod, react-hot-toast

Sem Sentry. Sem npm workspaces — pacote isolado, no mesmo padrão de `landing/`.

## Instalação

```bash
cd admin-ops
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O app sobe em `http://localhost:3002`.

## Variáveis de Ambiente

Crie `.env.local` a partir de `.env.example`. O app chama a API em
`NEXT_PUBLIC_API_URL` (padrão local `http://localhost:4000/api`).

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Scripts

- `npm run dev` — Turbopack na porta **3002**
- `npm run build` — build de produção
- `npm start` — servidor de produção
- `npm run start:railway` — bind `0.0.0.0` e `PORT` (serviço Railway **não** é criado nesta Issue)
- `npm run lint` — ESLint (`next/core-web-vitals`)
- `npm test` — mapeamento de erros 401/403 do login

## Rotas

- `/login` — e-mail/senha (RHF+Zod) → `/api/ops/login`
- `/` — shell autenticado (e-mail, logout, placeholder). Deslogado redireciona para `/login`.

## Deploy

Não há serviço Railway nesta Issue. Quando houver pedido explícito de deploy:
root directory `admin-ops/`, build `npm install && npm run build`, start
`npm run start:railway`.
