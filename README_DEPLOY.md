# 🚀 Guia de Deploy - Flock App

Bem-vindo ao guia de deploy do Flock App! Este documento fornece uma visão geral rápida e links para documentação detalhada.

## 📚 Documentação Completa

- **[Guia Completo de Deploy](docs/DEPLOY_GUIDE.md)** - Tudo que você precisa saber sobre deploy
- **[Guia Rápido Docker](DOCKER_QUICK_START.md)** - Como usar Docker localmente
- **[Variáveis de Ambiente](docs/ENVIRONMENT_VARIABLES.md)** - Configuração de variáveis

## ⚡ Início Rápido

### 1. Preparação

```bash
# 1. Configure variáveis de ambiente
# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais

# Frontend
cp frontend/.env.example frontend/.env.local
# Edite frontend/.env.local com a URL da API
```

### 2. Teste Local com Docker

```bash
# Windows
.\scripts\deploy.ps1

# Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3. Deploy em Produção

**Opção Recomendada: Railway**

1. Acesse [railway.app](https://railway.app)
2. Crie uma conta e conecte seu repositório GitHub
3. Crie dois serviços:
   - Backend (root: `backend`)
   - Frontend (root: `frontend`)
4. Configure as variáveis de ambiente
5. Deploy automático!

## 🎯 Opções de Deploy

| Plataforma | Dificuldade | Custo | Link |
|------------|-------------|-------|------|
| **Railway** ⭐ | Fácil | $0-5/mês | [railway.app](https://railway.app) |
| **Render** | Médio | $0-7/mês | [render.com](https://render.com) |
| **Fly.io** | Médio | $0+ | [fly.io](https://fly.io) |
| **DigitalOcean** | Difícil | $5+/mês | [digitalocean.com](https://digitalocean.com) |

## 📋 Checklist Pré-Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Build local funcionando (`npm run build` em ambos)
- [ ] Testes passando (se houver)
- [ ] Credenciais do Supabase configuradas
- [ ] URLs de produção definidas
- [ ] CORS configurado no backend
- [ ] Supabase configurado com URLs de produção

## 🐳 Estrutura Docker

O projeto inclui:

- `backend/Dockerfile` - Imagem do backend
- `frontend/Dockerfile` - Imagem do frontend
- `docker-compose.yml` - Orquestração completa

## 🔗 Links Úteis

- [Documentação Railway](https://docs.railway.app)
- [Documentação Render](https://render.com/docs)
- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Docker](https://docs.docker.com)
- [Documentação Supabase](https://supabase.com/docs)

## 🆘 Precisa de Ajuda?

1. Consulte o [Guia Completo](docs/DEPLOY_GUIDE.md)
2. Verifique a seção [Troubleshooting](docs/DEPLOY_GUIDE.md#-troubleshooting)
3. Revise as [Variáveis de Ambiente](docs/ENVIRONMENT_VARIABLES.md)

---

**Boa sorte com seu deploy! 🚀**

