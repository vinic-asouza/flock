# 🚀 Guia Completo de Deploy - Flock App

Este guia explica **tudo** que você precisa saber para publicar seu MVP na internet, desde os conceitos básicos até as diferentes opções de deploy.

## 📚 Índice

1. [Conceitos Básicos](#conceitos-básicos)
2. [Pré-requisitos](#pré-requisitos)
3. [Preparação do Projeto](#preparação-do-projeto)
4. [Opções de Deploy](#opções-de-deploy)
5. [Deploy Unificado com Docker](#deploy-unificado-com-docker)
6. [Deploy em Plataformas Específicas](#deploy-em-plataformas-específicas)
7. [Configuração Pós-Deploy](#configuração-pós-deploy)
8. [Troubleshooting](#troubleshooting)

---

## 🎓 Conceitos Básicos

### O que é Deploy?

**Deploy** (ou publicação) é o processo de colocar sua aplicação na internet para que outras pessoas possam acessá-la. Atualmente, seu projeto roda apenas no seu computador (localhost). Após o deploy, ele estará acessível através de uma URL pública.

### Componentes do Seu Projeto

1. **Backend (API)**: Servidor que processa requisições, acessa o banco de dados e retorna dados
   - Tecnologia: Node.js + Express
   - Porta: 4000 (desenvolvimento)
   - Banco de dados: Supabase (já está na nuvem)

2. **Frontend (Interface)**: Aplicação web que os usuários acessam
   - Tecnologia: Next.js (React)
   - Porta: 3000 (desenvolvimento)

### O que é um Monorepo?

Um **monorepo** é um repositório que contém múltiplos projetos (backend e frontend) no mesmo lugar. Isso facilita o gerenciamento, mas requer estratégias específicas de deploy.

### Deploy Unificado vs Separado

- **Deploy Unificado**: Backend e frontend no mesmo servidor/plataforma
  - ✅ Mais simples de gerenciar
  - ✅ Menor custo inicial
  - ✅ Comunicação mais rápida entre frontend e backend
  - ❌ Menos flexível para escalar

- **Deploy Separado**: Backend e frontend em servidores diferentes
  - ✅ Mais flexível para escalar
  - ✅ Melhor para projetos grandes
  - ❌ Mais complexo de gerenciar
  - ❌ Maior custo

**Para um MVP, recomendamos deploy unificado!**

---

## ✅ Pré-requisitos

Antes de começar, você precisa ter:

1. **Conta no Supabase** (já deve ter)
   - Projeto criado
   - Credenciais de API

2. **Conta em uma plataforma de deploy** (escolha uma):
   - [Railway](https://railway.app) - ⭐ Recomendado para iniciantes
   - [Render](https://render.com)
   - [Fly.io](https://fly.io)
   - [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
   - [AWS](https://aws.amazon.com) - Mais complexo
   - [Google Cloud](https://cloud.google.com) - Mais complexo

3. **Git instalado** (para versionamento)
4. **Docker instalado** (opcional, mas recomendado)
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## 🔧 Preparação do Projeto

### 1. Variáveis de Ambiente

#### Backend (.env)

Crie um arquivo `.env` na pasta `backend/`:

```env
# Supabase
SUPABASE_URL=https://seu-projeto-id.supabase.co
SUPABASE_KEY=sua-chave-publica-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico-aqui

# Frontend URL (será configurada após o deploy)
FRONTEND_URL=https://seu-app.railway.app
# ou
FRONTEND_URL=https://seu-app.onrender.com

# Porta (geralmente definida pela plataforma)
PORT=4000

# Ambiente
NODE_ENV=production
```

#### Frontend (.env.local)

Crie um arquivo `.env.local` na pasta `frontend/`:

```env
# URL da API Backend (será configurada após o deploy)
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api
# ou
NEXT_PUBLIC_API_URL=https://seu-backend.onrender.com/api
```

**⚠️ IMPORTANTE**: 
- No frontend, variáveis devem começar com `NEXT_PUBLIC_` para serem acessíveis no navegador
- Nunca commite arquivos `.env` ou `.env.local` no Git!

### 2. Build do Projeto

Antes de fazer deploy, teste se o build funciona localmente:

```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd frontend
npm install
npm run build
```

Se ambos os builds funcionarem, você está pronto para o deploy!

---

## 🎯 Opções de Deploy

### Opção 1: Railway (⭐ Recomendado para Iniciantes)

**Por que Railway?**
- ✅ Interface muito simples
- ✅ Deploy automático via Git
- ✅ Suporte nativo a Docker
- ✅ Plano gratuito generoso
- ✅ SSL/HTTPS automático
- ✅ Variáveis de ambiente fáceis de configurar

**Passos:**

1. **Criar conta**: [railway.app](https://railway.app)
2. **Conectar repositório Git** (GitHub/GitLab)
3. **Criar dois serviços**:
   - Um para o backend
   - Um para o frontend
4. **Configurar variáveis de ambiente** em cada serviço
5. **Deploy automático!**

**Custo**: Gratuito até $5/mês de uso, depois $0.000463/GB de RAM/hora

---

### Opção 2: Render

**Por que Render?**
- ✅ Plano gratuito disponível
- ✅ Deploy automático via Git
- ✅ Suporte a Docker
- ✅ SSL automático

**Passos:**

1. **Criar conta**: [render.com](https://render.com)
2. **Criar Web Service** para backend
3. **Criar Static Site** para frontend (ou Web Service)
4. **Configurar variáveis de ambiente**
5. **Deploy!**

**Custo**: Gratuito (com limitações), planos pagos a partir de $7/mês

---

### Opção 3: Fly.io

**Por que Fly.io?**
- ✅ Boa performance global
- ✅ Plano gratuito
- ✅ Focado em Docker

**Custo**: Gratuito até 3 VMs compartilhadas, depois pago

---

### Opção 4: DigitalOcean App Platform

**Por que DigitalOcean?**
- ✅ Boa documentação
- ✅ Interface clara
- ✅ Suporte a Docker

**Custo**: A partir de $5/mês

---

## 🐳 Deploy Unificado com Docker

Docker permite empacotar sua aplicação completa (backend + frontend) em containers, facilitando o deploy em qualquer plataforma.

### Estrutura do Deploy Unificado

```
┌─────────────────────────────────┐
│     Servidor/Plataforma        │
│                                 │
│  ┌──────────┐  ┌──────────┐   │
│  │ Frontend │  │ Backend  │   │
│  │ (Next.js)│  │(Express) │   │
│  │ Port 3000│  │ Port 4000│   │
│  └──────────┘  └──────────┘   │
│                                 │
│  Nginx (opcional) - Proxy       │
└─────────────────────────────────┘
```

### Vantagens do Docker

- ✅ Mesmo ambiente em desenvolvimento e produção
- ✅ Fácil de replicar
- ✅ Isolamento de dependências
- ✅ Funciona em qualquer plataforma

---

## 📦 Implementação do Deploy Unificado

Siga os arquivos criados neste projeto:

1. **Dockerfile** (backend e frontend)
2. **docker-compose.yml** (orquestração)
3. **Scripts de build**

Veja os arquivos na raiz do projeto para detalhes de implementação.

---

## 🚀 Deploy Passo a Passo (Railway - Exemplo)

### Passo 1: Preparar o Repositório

```bash
# Certifique-se de que tudo está commitado
git add .
git commit -m "Preparar para deploy"
git push
```

### Passo 2: Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha seu repositório

### Passo 3: Configurar Backend

1. No Railway, clique em "New Service"
2. Selecione "GitHub Repo" novamente
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Variáveis de Ambiente** (vá em Settings > Variables):
   ```
   SUPABASE_URL=sua-url
   SUPABASE_KEY=sua-chave
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
   NODE_ENV=production
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   ```
   ⚠️ **Importante**: Por enquanto, use `http://localhost:3000` para `FRONTEND_URL`. Vamos atualizar depois com a URL real do frontend.

5. **Clique em "Deploy"** ou aguarde o deploy automático
   - Railway começará a fazer o build e deploy automaticamente
   - Aguarde o deploy terminar (pode levar alguns minutos)

6. **Configurar domínio público** (opcional, mas recomendado):
   - Vá em **Settings** > **Networking** > **Public Domain**
   - Clique em **Generate Domain** ou **Add Domain**
   - Quando pedir a **porta**, insira: `4000`
     - ⚠️ **Importante**: O backend está configurado para rodar na porta 4000
   - Railway gerará uma URL automaticamente
   - Exemplo: `seu-backend-production.up.railway.app`

7. **Anote a URL do backend**:
   - Copie a URL gerada (ex: `seu-backend-production.up.railway.app`)
   - **Você precisará dessa URL no próximo passo para configurar o frontend!**

### Passo 4: Configurar Frontend

1. No mesmo projeto Railway, clique em "New Service" novamente
2. Selecione "GitHub Repo" (o mesmo repositório)
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: ⚠️ **DEIXE VAZIO** (o Dockerfile cuida disso)
   - **Start Command**: ⚠️ **DEIXE VAZIO** (o Dockerfile cuida disso)
   
   ⚠️ **IMPORTANTE**: Como você tem um Dockerfile, o Railway usará ele automaticamente. Não configure Build Command nem Start Command manualmente!

4. **Variáveis de Ambiente** (Settings > Variables):
   ```
   NEXT_PUBLIC_API_URL=https://SUA-URL-DO-BACKEND/api
   NODE_ENV=production
   ```
   ⚠️ **Importante**: Substitua `SUA-URL-DO-BACKEND` pela URL real que você anotou no Passo 3.7
   - Exemplo: Se sua URL do backend é `seu-backend-production.up.railway.app`
   - Então use: `NEXT_PUBLIC_API_URL=https://seu-backend-production.up.railway.app/api`

5. **Clique em "Deploy"** ou aguarde o deploy automático
   - Aguarde o deploy terminar

6. **Configurar domínio público** (opcional, mas recomendado):
   - Vá em **Settings** > **Networking** > **Public Domain**
   - Clique em **Generate Domain** ou **Add Domain**
   - Quando pedir a **porta**, insira: `3000`
     - ⚠️ **Importante**: O frontend está configurado para rodar na porta 3000
   - Railway gerará uma URL automaticamente
   - Exemplo: `seu-frontend-production.up.railway.app`

7. **Anote a URL do frontend**:
   - Copie a URL gerada (ex: `seu-frontend-production.up.railway.app`)
   - **Você precisará dessa URL no próximo passo para atualizar o backend!**

### Passo 5: Atualizar URLs

1. **Volte ao serviço do backend** (clique no serviço do backend no Railway)
2. Vá em **Settings** > **Variables**
3. **Atualize a variável `FRONTEND_URL`**:
   - Substitua `http://localhost:3000` pela URL real do frontend que você anotou no Passo 4.7
   - Exemplo: `FRONTEND_URL=https://seu-frontend-production.up.railway.app`
   - ⚠️ **Importante**: Não coloque barra `/` no final da URL!
4. **Salve as alterações**
5. Railway fará um **redeploy automático** do backend com a nova configuração
   - Aguarde o redeploy terminar

### Passo 6: Testar

Acesse a URL do frontend e teste a aplicação!

---

## 🔒 Configuração Pós-Deploy

### 1. Configurar CORS no Backend

O CORS já está configurado no código, mas certifique-se de que `FRONTEND_URL` está correto.

### 2. Configurar Supabase

No Supabase Dashboard:
1. Vá em **Settings > API**
2. Adicione a URL do frontend em **Site URL**
3. Adicione a URL do frontend em **Redirect URLs**

### 3. Configurar Domínio Personalizado (Opcional)

Muitas plataformas permitem usar seu próprio domínio:
- Railway: Settings > Domains
- Render: Settings > Custom Domains

### 4. Monitoramento

Configure logs e monitoramento:
- Railway: Logs automáticos
- Render: Logs na dashboard
- Considere usar [Sentry](https://sentry.io) para erros

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

- Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_KEY` estão corretas
- Verifique se o Supabase permite conexões da sua plataforma

### Erro: "CORS policy"

- Verifique se `FRONTEND_URL` no backend está correto
- Certifique-se de que não há barra `/` no final da URL

### Erro: "404 Not Found" no frontend

- Verifique se `NEXT_PUBLIC_API_URL` está correto
- Certifique-se de incluir `/api` no final da URL

### Build falha

- Verifique os logs da plataforma
- Teste o build localmente primeiro
- Verifique se todas as dependências estão no `package.json`

### Erro: "canvas" ou "node-gyp" falha no build

Se você ver erros relacionados a `canvas`, `node-gyp` ou "Python is not set":

**Causa**: O pacote `canvas` (usado por `chartjs-node-canvas`) precisa de dependências nativas para compilar.

**Solução**: O Dockerfile já foi corrigido para incluir essas dependências. Se ainda tiver problemas:

1. **Verifique se o Dockerfile está atualizado** - Ele deve incluir as dependências do Alpine Linux
2. **Se estiver usando Railway sem Dockerfile**: Railway detecta automaticamente, mas você pode precisar configurar:
   - **Build Command**: `npm install && npm run build`
   - Certifique-se de que todas as dependências estão instaladas

3. **Alternativa**: Se o problema persistir, você pode remover temporariamente `chartjs-node-canvas` se não estiver usando relatórios com gráficos ainda.

### Erro: "next: not found" no frontend

Se você ver o erro `sh: next: not found` ao iniciar o frontend:

**Causa**: O Railway está tentando usar `npm start` (que executa `next start`) ao invés do Dockerfile.

**Solução**:

1. **Remova os comandos manuais no Railway**:
   - Vá em Settings > Build & Deploy
   - **Deixe Build Command vazio**
   - **Deixe Start Command vazio**
   - O Railway deve usar o Dockerfile automaticamente

2. **Verifique se o Dockerfile está sendo usado**:
   - Nos logs do deploy, você deve ver "Using Detected Dockerfile"
   - Se não aparecer, o Railway pode não estar detectando o Dockerfile

3. **Forçar uso do Dockerfile**:
   - Certifique-se de que o Dockerfile está na pasta `frontend/`
   - Se necessário, recrie o serviço no Railway

### Erro: "502 Bad Gateway" no frontend

Se você ver o erro `502 Bad Gateway` ao acessar a URL do frontend:

**Possíveis causas e soluções**:

1. **Verifique os logs do deploy**:
   - No Railway, vá em **Deployments** > clique no último deploy > veja os logs
   - Procure por erros durante o build ou início da aplicação

2. **Verifique se o container está rodando**:
   - No Railway, vá em **Metrics** ou **Logs**
   - Veja se há mensagens de erro ou se o container está crashando

3. **Problema com porta**:
   - O Railway pode estar usando uma porta diferente
   - Verifique se a variável `PORT` está configurada (geralmente o Railway define automaticamente)
   - O Dockerfile já foi atualizado para usar `${PORT:-3000}`

4. **Problema com modo standalone**:
   - Verifique se o build gerou o arquivo `.next/standalone/server.js`
   - Se não, pode haver um problema no build

5. **Solução alternativa - Usar build sem Dockerfile**:
   Se o problema persistir, você pode tentar sem Dockerfile:
   - Delete o serviço do frontend
   - Crie um novo serviço
   - Configure:
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Porta**: `3000` (quando configurar domínio)
   - ⚠️ Isso pode não funcionar bem com o modo standalone

6. **Verificar variáveis de ambiente**:
   - Certifique-se de que `NEXT_PUBLIC_API_URL` está configurado
   - Verifique se não há erros de sintaxe nas variáveis

### Aplicação não inicia

- Verifique os logs
- Certifique-se de que a porta está configurada corretamente
- Verifique se todas as variáveis de ambiente estão definidas

---

## 📊 Comparação de Plataformas

| Plataforma | Dificuldade | Custo | Docker | Deploy Automático |
|------------|-------------|-------|--------|-------------------|
| Railway    | ⭐ Fácil    | $0-5/mês | ✅ | ✅ |
| Render     | ⭐⭐ Médio  | $0-7/mês | ✅ | ✅ |
| Fly.io     | ⭐⭐ Médio  | $0+    | ✅ | ✅ |
| DigitalOcean | ⭐⭐⭐ Difícil | $5+/mês | ✅ | ✅ |
| AWS        | ⭐⭐⭐⭐ Muito Difícil | Variável | ✅ | ⚠️ |
| Google Cloud | ⭐⭐⭐⭐ Muito Difícil | Variável | ✅ | ⚠️ |

---

## 🎯 Recomendação Final

Para seu MVP, recomendamos:

1. **Começar com Railway** - Mais fácil e rápido
2. **Usar Docker** - Facilita migração futura
3. **Deploy separado** (backend e frontend em serviços diferentes) - Mais flexível
4. **Monitorar custos** - Acompanhe o uso mensal

---

## 📚 Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Testar todas as funcionalidades
2. ✅ Configurar domínio personalizado
3. ✅ Configurar backup do banco de dados
4. ✅ Configurar monitoramento de erros
5. ✅ Documentar processo de deploy para a equipe

---

## 🆘 Precisa de Ajuda?

- Documentação Railway: https://docs.railway.app
- Documentação Render: https://render.com/docs
- Documentação Next.js: https://nextjs.org/docs
- Documentação Docker: https://docs.docker.com

---

**Boa sorte com seu deploy! 🚀**

