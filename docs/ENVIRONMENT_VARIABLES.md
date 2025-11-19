# 🔐 Variáveis de Ambiente

Este documento lista todas as variáveis de ambiente necessárias para o projeto.

## 📁 Backend

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```env
# ============================================
# SUPABASE - Banco de Dados
# ============================================
# URL do seu projeto Supabase
# Encontre em: Supabase Dashboard > Settings > API > Project URL
SUPABASE_URL=https://seu-projeto-id.supabase.co

# Chave pública (anon key)
# Encontre em: Supabase Dashboard > Settings > API > Project API keys > anon public
SUPABASE_KEY=sua-chave-publica-aqui

# Chave de serviço (service_role key) - MANTENHA SECRETA!
# Encontre em: Supabase Dashboard > Settings > API > Project API keys > service_role secret
# ⚠️ Esta chave tem privilégios administrativos completos!
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico-aqui

# ============================================
# FRONTEND
# ============================================
# URL do frontend (para CORS e redirecionamentos)
# Desenvolvimento: http://localhost:3000
# Produção: https://seu-app.railway.app (ou sua URL de produção)
FRONTEND_URL=http://localhost:3000

# ============================================
# SERVIDOR
# ============================================
# Porta do servidor backend
# Geralmente definida pela plataforma de deploy
PORT=4000

# Ambiente
# development | production
NODE_ENV=production
```

## 📁 Frontend

Crie um arquivo `.env.local` na pasta `frontend/` com as seguintes variáveis:

```env
# ============================================
# API BACKEND
# ============================================
# URL da API Backend
# ⚠️ IMPORTANTE: Variáveis do Next.js devem começar com NEXT_PUBLIC_
# Desenvolvimento: http://localhost:4000/api
# Produção: https://seu-backend.railway.app/api (ou sua URL de produção)
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# ============================================
# AMBIENTE
# ============================================
# Ambiente
# development | production
NODE_ENV=production
```

## 🔍 Como Encontrar as Credenciais do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Você encontrará:
   - **Project URL**: Use para `SUPABASE_URL`
   - **anon public key**: Use para `SUPABASE_KEY`
   - **service_role secret key**: Use para `SUPABASE_SERVICE_ROLE_KEY`

## ⚠️ Segurança

### ❌ NUNCA faça:

- ❌ Commitar arquivos `.env` ou `.env.local` no Git
- ❌ Compartilhar suas chaves publicamente
- ❌ Usar a mesma chave `service_role` em múltiplos ambientes sem cuidado
- ❌ Expor a chave `service_role` no frontend

### ✅ SEMPRE faça:

- ✅ Adicione `.env` e `.env.local` ao `.gitignore`
- ✅ Use variáveis de ambiente na plataforma de deploy
- ✅ Use chaves diferentes para desenvolvimento e produção
- ✅ Revise as permissões das chaves no Supabase

## 🔄 Configuração por Ambiente

### Desenvolvimento Local

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NODE_ENV=development
```

### Produção

**Backend (na plataforma de deploy):**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
FRONTEND_URL=https://seu-app.railway.app
PORT=4000
NODE_ENV=production
```

**Frontend (na plataforma de deploy):**
```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api
NODE_ENV=production
```

## 🚀 Configurando na Plataforma de Deploy

### Railway

1. Vá em **Settings** > **Variables**
2. Adicione cada variável manualmente
3. Ou use o arquivo `.env` (não recomendado para produção)

### Render

1. Vá em **Environment** > **Environment Variables**
2. Adicione cada variável
3. Clique em **Save Changes**

### Fly.io

1. Use o comando:
```bash
flyctl secrets set SUPABASE_URL=https://seu-projeto.supabase.co
flyctl secrets set SUPABASE_KEY=sua-chave
# ... etc
```

### DigitalOcean

1. Vá em **Settings** > **App-Level Environment Variables**
2. Adicione cada variável

## 🧪 Testando as Variáveis

### Backend

```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

### Frontend

As variáveis `NEXT_PUBLIC_*` estão disponíveis no navegador. Você pode verificar no console do navegador ou criar uma página de teste.

## 📝 Checklist

Antes de fazer deploy, verifique:

- [ ] Todas as variáveis estão configuradas
- [ ] URLs de produção estão corretas
- [ ] Chaves do Supabase estão corretas
- [ ] `FRONTEND_URL` no backend aponta para o frontend
- [ ] `NEXT_PUBLIC_API_URL` no frontend aponta para o backend
- [ ] Arquivos `.env` não estão no Git (verifique `.gitignore`)
- [ ] Variáveis estão configuradas na plataforma de deploy

---

**Dúvidas?** Consulte o [Guia Completo de Deploy](../docs/DEPLOY_GUIDE.md)

