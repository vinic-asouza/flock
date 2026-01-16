# Flock - Sistema de Gerenciamento de Membros para Igrejas

Sistema completo para gerenciamento de membresia para igrejas. Desenvolvido com arquitetura moderna, multi-tenant e foco em segurança e performance.

## 📋 Sobre o Projeto

O Flock é uma plataforma SaaS que permite às igrejas gerenciar seus membros de forma eficiente, com funcionalidades completas de cadastro, filtros avançados, relatórios analíticos e exportação de dados.

### Principais Funcionalidades

- ✅ Gerenciamento completo de membros
- ✅ Processo de integração de novos membros
- ✅ Gerenciamento de congregações e cargos
- ✅ Relatórios e analytics completos
- ✅ Exportação de dados em PDF
- ✅ Sistema multi-tenant (isolamento por igreja)
- ✅ Autenticação segura com JWT
- ✅ Interface moderna e responsiva

## 🏗️ Arquitetura

O projeto é dividido em três partes principais:

- **Backend**: API RESTful em Node.js + Express + TypeScript
- **Frontend**: Aplicação web em Next.js 15 + React 19 + TypeScript
- **Landing**: Site institucional (Next.js)

## 📁 Estrutura do Repositório

```
flock-app/
├── backend/          # API Backend (Express + TypeScript)
├── frontend/         # Aplicação Web (Next.js)
├── landing/         # Site Institucional
├── docs/            # Documentação do projeto
└── scripts/         # Scripts de deploy
```

## 🚀 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 18+ e npm
- **Supabase** (conta e projeto configurado)
- **Git**

## ⚙️ Configuração do Ambiente

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd flock-app
```

### 2. Configuração do Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Servidor
PORT=4000
NODE_ENV=development

# URLs (opcional)
FRONTEND_URL=http://localhost:3001
LANDING_URL=http://localhost:3000
```

### 3. Configuração do Frontend

```bash
cd frontend
npm install
```

Crie um arquivo `.env.local` na pasta `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 🛠️ Desenvolvimento Local

### Iniciar o Backend

```bash
cd backend
npm run dev
```

O backend estará disponível em `http://localhost:4000`

### Iniciar o Frontend

```bash
cd frontend
npm run dev
```

O frontend estará disponível em `http://localhost:3001`

### Iniciar a Landing

```bash
cd landing
npm run dev
```

A landing estará disponível em `http://localhost:3000`

## 📝 Scripts Disponíveis

### Backend

- `npm run dev` - Inicia servidor de desenvolvimento com hot-reload
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia servidor em produção
- `npm test` - Executa testes

### Frontend

- `npm run dev` - Inicia servidor de desenvolvimento (Turbopack)
- `npm run build` - Cria build de produção
- `npm start` - Inicia servidor em produção
- `npm run lint` - Executa linter

## 🔐 Primeiro Acesso

1. Acesse `http://localhost:3001/register`
2. Preencha os dados da igreja
3. Confirme o email recebido
4. Faça login com as credenciais criadas

## 📚 Documentação

Documentação completa disponível na pasta `docs/`:

- **[Documentação do Backend](docs/BACKEND_DOCUMENTATION.md)** - Arquitetura e fluxos do backend
- **[Documentação do Frontend](docs/FRONTEND_DOCUMENTATION.md)** - Arquitetura e fluxos do frontend
- **[Features v1.0](docs/FEATURES_V1.0.md)** - Lista completa de funcionalidades

## 🧪 Testes

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm run lint
```

## 🐳 Docker (Opcional)

O projeto inclui configuração Docker. Para usar:

```bash
docker-compose up
```

## 🔧 Troubleshooting

### Erro de conexão com Supabase

- Verifique se as variáveis de ambiente estão corretas
- Confirme que o projeto Supabase está ativo
- Verifique as configurações de RLS no Supabase

### Erro de CORS

- Certifique-se de que `FRONTEND_URL` está configurado no backend
- Verifique se as URLs estão corretas no `.env`

### Problemas de autenticação

- Limpe os cookies do navegador
- Verifique se o email foi confirmado no Supabase
- Confirme que os tokens estão sendo enviados corretamente

## 📦 Tecnologias Principais

### Backend
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL + Auth)
- Joi (Validação)
- PDFKit (Exportação)

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- React Hook Form + Zod
- Axios

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
2. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
3. Push para a branch (`git push origin feature/nova-feature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Equipe

Flock Team

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação em `docs/` ou abra uma issue no repositório.

---

**Versão**: 1.0  
**Última Atualização**: 2024

