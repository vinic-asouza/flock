# Landing Page - Flock

Landing page de vendas para o sistema Flock, focada em captação de clientes para lista de espera.

## 🚀 Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **Axios** - Cliente HTTP

## 📁 Estrutura

```
landing/
├── src/
│   ├── app/              # Rotas e páginas (App Router)
│   │   ├── page.tsx      # Homepage
│   │   ├── waitlist/    # Página de lista de espera
│   │   ├── layout.tsx   # Layout raiz
│   │   └── globals.css  # Estilos globais
│   ├── components/      # Componentes reutilizáveis
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── CTA.tsx
│   │   └── WaitlistForm.tsx
│   └── services/        # Serviços de API
│       └── waitlist.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.js
```

## 🛠️ Instalação

```bash
# Instalar dependências
npm install
```

## 🏃 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3001` (ou próxima porta disponível).

## 🌐 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Para produção, configure a URL do backend:

```env
NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app/api
```

## 📦 Build

```bash
# Build de produção
npm run build

# Iniciar servidor de produção
npm start
```

## 🚢 Deploy no Railway

### Configuração

1. **Criar novo serviço no Railway**
   - Root Directory: `landing/`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:railway`

2. **Variáveis de Ambiente**
   ```
   NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app/api
   NODE_ENV=production
   PORT=3000
   ```

3. **Configurar domínio público**
   - Porta: `3000`

## 📝 Funcionalidades

### Páginas

- **Homepage (`/`)**: Landing page principal com hero, features e CTA
- **Lista de Espera (`/waitlist`)**: Formulário de cadastro na lista de espera

### Componentes

- **Header**: Navegação principal com menu responsivo
- **Hero**: Seção hero com call-to-action
- **Features**: Grid de recursos do sistema
- **CTA**: Seção de call-to-action
- **Footer**: Rodapé com links e informações
- **WaitlistForm**: Formulário de cadastro na lista de espera

## 🔗 Integração com Backend

A landing page se comunica com o backend através do endpoint:

```
POST /api/waitlist
```

Payload:
```json
{
  "name": "Nome Completo",
  "email": "email@exemplo.com",
  "phone": "11999999999",
  "churchName": "Nome da Igreja",
  "city": "São Paulo",
  "state": "SP"
}
```

## 📄 Licença

Este projeto faz parte do sistema Flock.

