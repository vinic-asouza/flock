# 🐳 Guia Rápido - Docker

Este guia mostra como usar Docker para rodar sua aplicação localmente ou fazer deploy.

## 📋 Pré-requisitos

1. **Docker Desktop instalado**
   - Windows/Mac: [Download aqui](https://www.docker.com/products/docker-desktop)
   - Linux: `sudo apt install docker.io docker-compose`

2. **Arquivos de ambiente configurados**
   - `backend/.env` (copie de `backend/.env.example`)
   - `frontend/.env.local` (copie de `frontend/.env.example`)

## 🚀 Uso Rápido

### Opção 1: Script Automatizado (Recomendado)

**Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Opção 2: Comandos Manuais

#### 1. Build das imagens
```bash
docker-compose build
```

#### 2. Iniciar containers
```bash
docker-compose up -d
```

#### 3. Ver logs
```bash
docker-compose logs -f
```

#### 4. Parar containers
```bash
docker-compose down
```

## 🔧 Configuração

### 1. Configurar Variáveis de Ambiente

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=production
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NODE_ENV=production
```

### 2. Ajustar docker-compose.yml

Se necessário, ajuste as URLs no `docker-compose.yml`:

```yaml
# Para desenvolvimento local
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Para produção (substitua pelas URLs reais)
FRONTEND_URL=https://seu-app.railway.app
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api
```

## 📍 Acessar Aplicação

Após iniciar os containers:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## 🐛 Troubleshooting

### Erro: "Cannot connect to Docker daemon"

**Solução**: Inicie o Docker Desktop

### Erro: "Port already in use"

**Solução**: Pare outros serviços nas portas 3000 ou 4000, ou altere as portas no `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Mude 3000 para 3001
  - "4001:4000"  # Mude 4000 para 4001
```

### Erro: "Build failed"

**Solução**: 
1. Verifique se os arquivos `.env` estão configurados
2. Limpe o cache: `docker-compose build --no-cache`
3. Verifique os logs: `docker-compose logs`

### Container não inicia

**Solução**:
1. Ver logs: `docker-compose logs backend` ou `docker-compose logs frontend`
2. Verifique variáveis de ambiente
3. Teste build local primeiro: `cd backend && npm run build`

## 🔄 Comandos Úteis

```bash
# Ver containers rodando
docker ps

# Ver todas as imagens
docker images

# Parar e remover tudo
docker-compose down -v

# Rebuild completo (limpa cache)
docker-compose build --no-cache

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Entrar no container
docker exec -it flock-backend sh
docker exec -it flock-frontend sh

# Limpar tudo (cuidado!)
docker system prune -a
```

## 🚀 Deploy em Produção

Para fazer deploy em produção usando Docker:

1. **Railway**: Conecte seu repositório e configure o Dockerfile
2. **Render**: Use o docker-compose.yml ou configure serviços separados
3. **Fly.io**: Use `flyctl launch` e configure o Dockerfile
4. **DigitalOcean**: Use App Platform e configure Docker

Veja o [Guia Completo de Deploy](DEPLOY_GUIDE.md) para mais detalhes.

## 📚 Próximos Passos

1. ✅ Teste localmente com Docker
2. ✅ Configure variáveis de ambiente
3. ✅ Faça deploy em uma plataforma
4. ✅ Configure domínio personalizado
5. ✅ Configure monitoramento

---

**Dúvidas?** Consulte o [Guia Completo de Deploy](DEPLOY_GUIDE.md)

