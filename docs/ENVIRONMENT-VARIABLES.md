# Variáveis de Ambiente - Documentação Completa

Este documento lista **todas** as variáveis de ambiente necessárias para o funcionamento completo do sistema Flock, incluindo backend, frontend e integrações.

---

## 📋 Índice

1. [Variáveis do Backend](#variáveis-do-backend)
2. [Variáveis do Frontend](#variáveis-do-frontend)
3. [Variáveis do Stripe](#variáveis-do-stripe)
4. [Configuração por Ambiente](#configuração-por-ambiente)
5. [Validação e Segurança](#validação-e-segurança)
6. [Exemplos de Configuração](#exemplos-de-configuração)

---

## 🔧 Variáveis do Backend

### Obrigatórias

#### SUPABASE_URL
- **Descrição:** URL do projeto Supabase
- **Formato:** `https://xxxxx.supabase.co`
- **Onde obter:** Dashboard do Supabase → Settings → API → Project URL
- **Uso:** Conexão com banco de dados e serviços do Supabase
- **Exemplo:** `https://abcdefghijklmnop.supabase.co`

#### SUPABASE_KEY
- **Descrição:** Chave pública (anon key) do Supabase
- **Formato:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Onde obter:** Dashboard do Supabase → Settings → API → Project API keys → `anon` `public`
- **Uso:** Operações comuns do cliente (autenticação, queries)
- **Importante:** Esta chave é pública e pode ser exposta no frontend
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IiwiYXVkIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NTU1NTU1fQ.abcdefghijklmnopqrstuvwxyz1234567890`

#### SUPABASE_SERVICE_ROLE_KEY
- **Descrição:** Chave de serviço (admin) do Supabase
- **Formato:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Onde obter:** Dashboard do Supabase → Settings → API → Project API keys → `service_role` `secret`
- **Uso:** Operações administrativas no backend (bypass de RLS)
- **⚠️ CRÍTICO:** Esta chave tem acesso total ao banco. **NUNCA** exponha no frontend ou em repositórios públicos
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IiwiYXVkIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE5NTU1NTU1NTV9.abcdefghijklmnopqrstuvwxyz1234567890`

### Opcionais (com valores padrão)

#### PORT
- **Descrição:** Porta em que o servidor backend será executado
- **Padrão:** `4000`
- **Formato:** Número (string ou número)
- **Uso:** Configuração do servidor Express
- **Exemplo:** `4000` ou `3001`

#### NODE_ENV
- **Descrição:** Ambiente de execução da aplicação
- **Valores possíveis:** `development`, `staging`, `production`
- **Padrão:** `development` (se não definido)
- **Uso:** 
  - Controla comportamento de segurança (cookies, CORS)
  - Exibe detalhes de erro em desenvolvimento
  - Habilita/desabilita recursos de debug
- **Exemplo:** `production`

#### FRONTEND_URL
- **Descrição:** URL completa do frontend da aplicação
- **Padrão:** `http://localhost:3001`
- **Formato:** URL completa com protocolo
- **Uso:** 
  - Redirecionamentos após autenticação
  - URLs de callback
  - Configuração de CORS
- **Desenvolvimento:** `http://localhost:3001`
- **Produção:** `https://app.flock.com.br`
- **Exemplo:** `https://app.flock.com.br`

#### LANDING_URL
- **Descrição:** URL da landing page (site de marketing)
- **Padrão:** `http://localhost:3000`
- **Formato:** URL completa com protocolo
- **Uso:** Configuração de CORS para permitir requisições da landing page
- **Desenvolvimento:** `http://localhost:3000`
- **Produção:** `https://flock.com.br`
- **Exemplo:** `https://flock.com.br`

#### ENABLE_CRON_JOBS
- **Descrição:** Habilita ou desabilita jobs agendados (cron jobs)
- **Valores possíveis:** `true` (padrão) ou `false`
- **Uso:** Controla execução de tarefas agendadas (ex: limpeza de assinaturas pendentes)
- **Padrão:** `true` (cron jobs habilitados)
- **Exemplo:** `false` (para desabilitar)

---

## 🎨 Variáveis do Frontend

### Obrigatórias

#### NEXT_PUBLIC_API_URL
- **Descrição:** URL base da API backend
- **Padrão:** `http://localhost:4000/api`
- **Formato:** URL completa com `/api` no final
- **Uso:** Todas as requisições HTTP do frontend para o backend
- **Importante:** Prefixo `NEXT_PUBLIC_` é necessário para expor a variável no cliente (Next.js)
- **Desenvolvimento:** `http://localhost:4000/api`
- **Produção:** `https://api.flock.com.br/api`
- **Exemplo:** `https://api.flock.com.br/api`

---

## 💳 Variáveis do Stripe

### Obrigatórias

#### STRIPE_SECRET_KEY
- **Descrição:** Chave secreta da API do Stripe
- **Formato:** `sk_test_...` (teste) ou `sk_live_...` (produção)
- **Onde obter:** https://dashboard.stripe.com/apikeys
- **Importante:** Use a chave "Secret key", não a "Publishable key"
- **Uso:** Todas as operações com a API do Stripe (criar checkout, gerenciar assinaturas)
- **⚠️ CRÍTICO:** Esta chave permite acesso total à conta Stripe. **NUNCA** exponha publicamente
- **Teste:** `sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`
- **Produção:** `sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`

#### STRIPE_WEBHOOK_SECRET
- **Descrição:** Secret usado para validar webhooks do Stripe
- **Formato:** `whsec_...`
- **Onde obter:** https://dashboard.stripe.com/webhooks
- **Como configurar:**
  1. Acesse o dashboard do Stripe
  2. Vá em "Webhooks"
  3. Crie um endpoint apontando para: `https://seu-dominio.com/api/stripe/webhook`
  4. Configure os eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
  5. Copie o "Signing secret"
- **Uso:** Validação de segurança para garantir que webhooks vêm do Stripe
- **⚠️ CRÍTICO:** Mantenha este secret seguro - ele valida a autenticidade dos webhooks
- **Exemplo:** `whsec_1234567890abcdefghijklmnopqrstuvwxyz`

#### STRIPE_PRICE_ID_M200
- **Descrição:** Price ID do plano de 200 membros no Stripe
- **Formato:** `price_...`
- **Onde obter:** https://dashboard.stripe.com/products
- **Como criar:**
  1. Acesse "Products" no dashboard do Stripe
  2. Clique em "Add product"
  3. Configure:
     - Name: "Plano 200 Membros"
     - Price: R$ 29,99
     - Billing period: Monthly (Recurring)
  4. Copie o "Price ID"
- **Uso:** Identificação do plano no checkout e gerenciamento de assinaturas
- **Exemplo:** `price_1AbCdEfGhIjKlMnOpQrStUvW`

#### STRIPE_PRICE_ID_M500
- **Descrição:** Price ID do plano de 500 membros no Stripe
- **Formato:** `price_...`
- **Onde obter:** https://dashboard.stripe.com/products
- **Como criar:** Similar ao M200, mas com preço R$ 59,99
- **Uso:** Identificação do plano no checkout e gerenciamento de assinaturas
- **Exemplo:** `price_1XyZaBcDeFgHiJkLmNoPqRsTuV`

#### STRIPE_PRICE_ID_M800
- **Descrição:** Price ID do plano de 800 membros no Stripe
- **Formato:** `price_...`
- **Onde obter:** https://dashboard.stripe.com/products
- **Como criar:** Similar ao M200, mas com preço R$ 89,99
- **Uso:** Identificação do plano no checkout e gerenciamento de assinaturas
- **Exemplo:** `price_1MnOpQrStUvWxYzAbCdEfGhIjK`

---

## 🌍 Configuração por Ambiente

### Desenvolvimento (Development)

```bash
# Backend
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
LANDING_URL=http://localhost:3000
ENABLE_CRON_JOBS=true

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_M200=price_...
STRIPE_PRICE_ID_M500=price_...
STRIPE_PRICE_ID_M800=price_...
```

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Produção (Production)

```bash
# Backend
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://app.flock.com.br
LANDING_URL=https://flock.com.br
ENABLE_CRON_JOBS=true

# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_M200=price_...
STRIPE_PRICE_ID_M500=price_...
STRIPE_PRICE_ID_M800=price_...
```

```bash
# Frontend
NEXT_PUBLIC_API_URL=https://api.flock.com.br/api
```

---

## ✅ Validação e Segurança

### Validação Automática

O sistema valida automaticamente variáveis críticas no startup:

**Backend:**
- ✅ Todas as variáveis do Stripe são validadas no startup
- ✅ Se alguma variável obrigatória faltar, o servidor não inicia
- ✅ Mensagem de erro clara indica quais variáveis estão ausentes

**Frontend:**
- ⚠️ Variáveis do frontend não são validadas automaticamente
- ⚠️ Se `NEXT_PUBLIC_API_URL` não estiver configurada, usa valor padrão

### Segurança

#### ⚠️ Variáveis Críticas (NUNCA expor)

Estas variáveis têm acesso total ou podem causar problemas de segurança:

1. **SUPABASE_SERVICE_ROLE_KEY**
   - Acesso total ao banco de dados
   - Bypass de Row Level Security (RLS)
   - **NUNCA** commite no repositório

2. **STRIPE_SECRET_KEY**
   - Acesso total à conta Stripe
   - Pode criar/alterar/cancelar assinaturas
   - Pode acessar dados de pagamento
   - **NUNCA** exponha publicamente

3. **STRIPE_WEBHOOK_SECRET**
   - Permite validar webhooks falsos
   - **NUNCA** exponha publicamente

#### ✅ Variáveis Seguras (podem ser expostas)

Estas variáveis são públicas por design:

1. **SUPABASE_KEY** (anon key)
   - Pública por design
   - Limitada por Row Level Security (RLS)
   - Pode ser usada no frontend

2. **NEXT_PUBLIC_API_URL**
   - Pública por design (prefixo `NEXT_PUBLIC_`)
   - Necessária para requisições do cliente

### Boas Práticas

1. **Nunca commite arquivos `.env`** com valores reais
2. **Use `.env.example`** como template (sem valores sensíveis)
3. **Use secret managers** em produção (AWS Secrets Manager, Azure Key Vault, etc)
4. **Rotacione chaves periodicamente** (especialmente Stripe e Supabase)
5. **Use chaves diferentes** para desenvolvimento e produção
6. **Limite acesso** às variáveis apenas a pessoas que precisam
7. **Monitore uso** das chaves no dashboard do Stripe e Supabase
8. **Use variáveis de ambiente** do sistema operacional ou provedor de hospedagem
9. **Não hardcode** valores no código
10. **Valide variáveis** no startup da aplicação

---

## 📝 Exemplos de Configuração

### Arquivo `.env` do Backend

```bash
# Supabase Configuration
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IiwiYXVkIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NTU1NTU1fQ.abcdefghijklmnopqrstuvwxyz1234567890
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IiwiYXVkIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE5NTU1NTU1NTV9.abcdefghijklmnopqrstuvwxyz1234567890

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URLs
FRONTEND_URL=http://localhost:3001
LANDING_URL=http://localhost:3000

# Cron Jobs
ENABLE_CRON_JOBS=true

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
STRIPE_PRICE_ID_M200=price_1AbCdEfGhIjKlMnOpQrStUvW
STRIPE_PRICE_ID_M500=price_1XyZaBcDeFgHiJkLmNoPqRsTuV
STRIPE_PRICE_ID_M800=price_1MnOpQrStUvWxYzAbCdEfGhIjK
```

### Arquivo `.env.local` do Frontend

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Arquivo `.env.example` (Template)

```bash
# Backend - Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Backend - Server
PORT=4000
NODE_ENV=development

# Backend - URLs
FRONTEND_URL=http://localhost:3001
LANDING_URL=http://localhost:3000

# Backend - Cron Jobs
ENABLE_CRON_JOBS=true

# Backend - Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_M200=
STRIPE_PRICE_ID_M500=
STRIPE_PRICE_ID_M800=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 🧪 Testando a Configuração

### Backend

1. **Iniciar o servidor:**
   ```bash
   cd backend
   npm run dev
   ```
   Se todas as variáveis estiverem corretas, o servidor iniciará normalmente.

2. **Verificar health check básico:**
   ```bash
   curl http://localhost:4000/health
   ```
   Deve retornar: `{"status":"ok"}`

3. **Verificar health check do Stripe:**
   ```bash
   curl http://localhost:4000/api/health/stripe
   ```
   Deve retornar status `healthy` se tudo estiver configurado.

### Frontend

1. **Iniciar o servidor:**
   ```bash
   cd frontend
   npm run dev
   ```
   O frontend deve iniciar e conseguir fazer requisições para o backend.

2. **Verificar no console do navegador:**
   - Abra DevTools → Console
   - Verifique se não há erros de conexão com a API

---

## 🔄 Migração entre Ambientes

### Desenvolvimento → Produção

#### 1. Supabase
- ✅ Mesmo projeto pode ser usado (ou criar projeto separado)
- ✅ Mesmas chaves funcionam (ou criar novas)
- ⚠️ Verificar configurações de RLS e políticas de segurança

#### 2. Stripe
- ✅ Criar conta Stripe de produção (se ainda não tiver)
- ✅ Obter chaves de produção:
   - `STRIPE_SECRET_KEY` (sk_live_...)
   - Criar webhook de produção
   - Obter `STRIPE_WEBHOOK_SECRET`
- ✅ Criar produtos de produção:
   - Criar produtos com preços reais
   - Obter `STRIPE_PRICE_ID_M200`, `M500`, `M800`

#### 3. URLs
- ✅ Atualizar `FRONTEND_URL` para URL de produção
- ✅ Atualizar `LANDING_URL` para URL de produção
- ✅ Atualizar `NEXT_PUBLIC_API_URL` para URL da API de produção

#### 4. Ambiente
- ✅ Configurar `NODE_ENV=production`
- ✅ Configurar variáveis no provedor de hospedagem
- ✅ Verificar que todas as variáveis estão configuradas

---

## 📊 Resumo por Categoria

### Backend - Obrigatórias
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `STRIPE_PRICE_ID_M200`
- ✅ `STRIPE_PRICE_ID_M500`
- ✅ `STRIPE_PRICE_ID_M800`

### Backend - Opcionais (com padrão)
- ⚙️ `PORT` (padrão: 4000)
- ⚙️ `NODE_ENV` (padrão: development)
- ⚙️ `FRONTEND_URL` (padrão: http://localhost:3001)
- ⚙️ `LANDING_URL` (padrão: http://localhost:3000)
- ⚙️ `ENABLE_CRON_JOBS` (padrão: true)

### Frontend - Obrigatórias
- ✅ `NEXT_PUBLIC_API_URL`

**Total:** 9 obrigatórias + 5 opcionais = 14 variáveis

---

## 📞 Suporte

Se tiver problemas com a configuração:

1. ✅ Verifique se todas as variáveis obrigatórias estão definidas
2. ✅ Verifique se os valores estão corretos (sem espaços extras)
3. ✅ Verifique os logs do servidor para erros específicos
4. ✅ Consulte a documentação específica:
   - Stripe: `docs/STRIPE-MAINTENANCE.md`
   - Backend: `docs/BACKEND_DOCUMENTATION.md`
   - Frontend: `docs/FRONTEND_DOCUMENTATION.md`

---

**Última atualização:** Janeiro 2026

