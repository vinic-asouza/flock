# 🚀 Guia de Setup - Landing Page

## ✅ O que foi criado

A estrutura completa do projeto landing foi criada com sucesso! Agora você precisa seguir estes passos:

## 📋 Próximos Passos

### 1. Instalar Dependências

```bash
cd landing
npm install
```

### 2. Criar Tabela no Banco de Dados

Execute o script SQL no Supabase:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Abra o arquivo `backend/scripts/create_waitlist_table.sql`
6. Cole o conteúdo no editor
7. Clique em **Run** para executar

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na pasta `landing/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Para desenvolvimento local:**
- Se o backend estiver rodando em `http://localhost:4000`, use: `http://localhost:4000/api`
- Se estiver em outra porta, ajuste conforme necessário

### 4. Configurar Backend (Variáveis de Ambiente)

No backend, adicione a variável de ambiente `LANDING_URL`:

**Desenvolvimento:**
```env
LANDING_URL=http://localhost:3000
```

**Produção (Railway):**
```env
LANDING_URL=https://sua-landing.up.railway.app
```

### 5. Testar Localmente

```bash
# Terminal 1 - Backend (se ainda não estiver rodando)
cd backend
npm run dev

# Terminal 2 - Landing
cd landing
npm run dev
```

A landing page estará disponível em `http://localhost:3000` (ou próxima porta disponível).

## 🎨 Estrutura Criada

```
landing/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Homepage
│   │   ├── waitlist/         # Página de lista de espera
│   │   ├── layout.tsx        # Layout raiz
│   │   └── globals.css       # Estilos globais
│   ├── components/
│   │   ├── Header.tsx        # Cabeçalho com navegação
│   │   ├── Footer.tsx        # Rodapé
│   │   ├── Hero.tsx          # Seção hero
│   │   ├── Features.tsx      # Grid de recursos
│   │   ├── CTA.tsx           # Call-to-action
│   │   └── WaitlistForm.tsx  # Formulário de cadastro
│   └── services/
│       └── waitlist.ts        # Serviço de API
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.js
```

## 🔌 Endpoints Criados no Backend

- **POST** `/api/waitlist` - Cadastrar na lista de espera

## 🚢 Deploy no Railway

### Configuração do Serviço Landing

1. **Criar novo serviço no Railway**
   - No mesmo projeto onde está o backend e frontend
   - Selecione "GitHub Repo"
   - Configure:
     - **Root Directory**: `landing/`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run start:railway`

2. **Variáveis de Ambiente**
   ```
   NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app/api
   NODE_ENV=production
   PORT=3000
   ```

3. **Configurar Domínio Público**
   - Porta: `3000`
   - Anote a URL gerada

4. **Atualizar Backend**
   - Adicione a URL da landing em `LANDING_URL` no backend
   - Exemplo: `LANDING_URL=https://sua-landing.up.railway.app`

## ✨ Funcionalidades Implementadas

- ✅ Landing page responsiva e moderna
- ✅ Formulário de lista de espera com validação
- ✅ Integração com backend
- ✅ Tratamento de erros
- ✅ Feedback visual (toast notifications)
- ✅ SEO otimizado (metadata)
- ✅ Design consistente com o app operacional

## 🐛 Troubleshooting

### Erros de CORS
- Verifique se `LANDING_URL` está configurado no backend
- Em desenvolvimento, o CORS permite localhost automaticamente

### Erro ao cadastrar
- Verifique se a tabela `waitlist` foi criada no Supabase
- Verifique se `NEXT_PUBLIC_API_URL` está correto
- Verifique os logs do backend

### Porta já em uso
- O Next.js automaticamente usa a próxima porta disponível
- Ou defina manualmente: `npm run dev -- -p 3001`

## 📝 Próximas Melhorias (Futuro)

- [ ] Página de confirmação de email
- [ ] Dashboard admin para visualizar lista de espera
- [ ] Integração com sistema de email (envio automático)
- [ ] Analytics e tracking
- [ ] Testes automatizados

