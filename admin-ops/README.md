# Admin OPS — Flock

Centro operacional interno da plataforma Flock. Uso exclusivo da equipe da
plataforma — **não** é o Painel da Igreja (`frontend/`, `painel.flockapp.com.br`).

Este pacote é o 4º app do monorepo. Nesta entrega (DEV-73) só o scaffold:
app sobe, build passa, páginas placeholder. Login real, cookies e `/api/ops`
ficam para Issues seguintes.

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

Crie `.env.local` a partir de `.env.example` quando for integrar a API
(DEV-75). O scaffold não chama o backend.

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Scripts

- `npm run dev` — Turbopack na porta **3002**
- `npm run build` — build de produção
- `npm start` — servidor de produção
- `npm run start:railway` — bind `0.0.0.0` e `PORT` (serviço Railway **não** é criado nesta Issue)
- `npm run lint` — ESLint (`next/core-web-vitals`)

## Rotas (scaffold)

- `/` — placeholder do app
- `/login` — placeholder estático (campos desabilitados, sem API)

## Deploy

Não há serviço Railway nesta Issue. Quando houver pedido explícito de deploy:
root directory `admin-ops/`, build `npm install && npm run build`, start
`npm run start:railway`.
