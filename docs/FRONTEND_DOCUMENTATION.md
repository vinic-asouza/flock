# Documentação do Frontend - Flock

## Visão Geral

O frontend do Flock é uma aplicação web construída com **Next.js 15** (App Router), **React 19**, **TypeScript** e **Tailwind CSS**. A aplicação utiliza Context API para gerenciamento de estado global e implementa autenticação baseada em cookies para comunicação com o backend.

---

## Arquitetura

### Stack Tecnológica

- **Framework**: Next.js 15 (App Router)
- **Biblioteca UI**: React 19
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS 4
- **Formulários**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Ícones**: Lucide React, Heroicons
- **Notificações**: React Hot Toast
- **Data Fetching**: Context API (não usa React Query atualmente)

### Estrutura de Pastas

```
frontend/src/
├── app/                      # Rotas do Next.js (App Router)
│   ├── (auth)/              # Grupo de rotas de autenticação
│   ├── (main)/               # Grupo de rotas principais (protegidas)
│   ├── auth/                 # Callback de autenticação
│   ├── layout.tsx            # Layout raiz
│   └── page.tsx              # Dashboard/Home
├── components/               # Componentes React
│   ├── common/               # Componentes comuns (Pagination)
│   ├── congregations/        # Componentes de congregações
│   ├── integration/         # Componentes de integração
│   ├── main/                 # Layout (Header, Sidebar, Footer)
│   ├── members/              # Componentes de membros
│   ├── reports/              # Componentes de relatórios
│   ├── roles/                # Componentes de cargos
│   ├── settings/             # Componentes de configurações
│   └── ui/                   # Componentes de UI base (Button, Input, Modal)
├── context/                  # Context API (estado global)
├── hooks/                    # Hooks customizados
├── services/                 # Serviços (API client)
├── types/                    # Definições TypeScript
└── utils/                   # Utilitários
```

---

## Sistema de Rotas (App Router)

### Estrutura de Rotas

O Next.js App Router utiliza a estrutura de pastas para definir rotas:

- **`app/`**: Diretório raiz de rotas
- **`(auth)/`**: Grupo de rotas de autenticação (não afeta URL)
- **`(main)/`**: Grupo de rotas principais (não afeta URL)
- **`page.tsx`**: Define uma rota pública
- **`layout.tsx`**: Define layout compartilhado

### Rotas Disponíveis

**Públicas (Autenticação)**:
- `/login` - Página de login
- `/register` - Registro de nova igreja
- `/forgot-password` - Recuperação de senha
- `/reset-password` - Redefinição de senha
- `/auth/callback` - Callback de confirmação de email

**Protegidas (Requerem autenticação)**:
- `/` - Dashboard com relatórios
- `/members` - Gerenciamento de membros
- `/integration` - Integrantes em processo
- `/congregations` - Gerenciamento de congregações
- `/roles` - Gerenciamento de cargos
- `/settings` - Configurações da igreja e conta
- `/tutorials` - Tutoriais (se implementado)

### Layouts

1. **Layout Raiz** (`app/layout.tsx`):
   - Envolve toda a aplicação
   - Configura fonte Inter
   - Provê `AuthProvider`

2. **Layout de Autenticação** (`app/(auth)/layout.tsx`):
   - Layout específico para páginas de auth
   - Design centrado, sem sidebar

3. **Layout Principal** (`app/(main)/layout.tsx`):
   - Layout para páginas autenticadas
   - Inclui Header, Sidebar e Footer
   - Acesso apenas para usuários autenticados

---

## Autenticação

### Fluxo de Autenticação

1. **Inicialização**:
   - `AuthContext` verifica autenticação ao carregar
   - Faz requisição para `/api/refresh/check` (com cookies)
   - Se autenticado, busca dados da igreja
   - Atualiza estado global (`user`, `session`)

2. **Login**:
   - Usuário submete credenciais
   - Backend valida e retorna cookies (access + refresh tokens)
   - Cookies são armazenados automaticamente (HttpOnly)
   - Estado global é atualizado com dados da igreja
   - Redirecionamento para dashboard

3. **Registro**:
   - Usuário preenche dados da igreja
   - Backend cria usuário e igreja
   - Email de confirmação é enviado
   - Redirecionamento para página de confirmação

4. **Logout**:
   - Chama endpoint de logout no backend
   - Backend limpa cookies
   - Estado local é limpo
   - Redirecionamento para login

### Proteção de Rotas

**Componente `ProtectedRoute`**:
- Verifica `isAuthenticated` do `AuthContext`
- Mostra loading durante verificação
- Redireciona para `/login` se não autenticado
- Renderiza children apenas se autenticado

**Uso**:
- Envolve páginas que requerem autenticação
- Pode ser usado em layouts ou páginas individuais

### Gerenciamento de Tokens

- **Cookies HttpOnly**: Tokens armazenados em cookies seguros
- **Automático**: Axios envia cookies automaticamente (`withCredentials: true`)
- **Renovação**: Backend renova tokens automaticamente quando expirados
- **Transparente**: Frontend não gerencia tokens diretamente

---

## Gerenciamento de Estado

### Context API

O sistema utiliza Context API para estado global:

1. **AuthContext** (`context/AuthContext.tsx`):
   - Estado de autenticação
   - Dados do usuário/igreja
   - Funções: login, logout, register, etc.
   - Disponível globalmente via `useAuth()`

2. **MembersContext** (`context/MembersContext.tsx`):
   - Estado de membros (lista, paginação, filtros)
   - Funções de CRUD otimistas
   - Sincronização com servidor
   - Disponível via `useMembers()`

3. **IntegrationContext** (`context/IntegrationContext.tsx`):
   - Estado de integrantes em processo
   - Similar ao MembersContext
   - Disponível via `useIntegration()`

### Estado Local

Para estado específico de componentes:
- **useState**: Estado local de componentes
- **useEffect**: Efeitos colaterais (carregar dados, sincronizar)
- **useCallback**: Memoização de funções
- **useMemo**: Memoização de valores computados

### Atualizações Otimistas

O sistema implementa atualizações otimistas:

1. **Ação do usuário** → Atualização imediata na UI
2. **Requisição ao servidor** → Em background
3. **Sucesso** → Confirmação silenciosa
4. **Erro** → Reversão + notificação de erro

---

## Componentes

### Estrutura de Componentes

**Componentes por Módulo**:
- Cada módulo (members, roles, etc.) tem sua própria pasta
- Componentes específicos do módulo ficam juntos
- Componentes reutilizáveis em `components/ui/`

### Tipos de Componentes

1. **Componentes de Página**:
   - Orquestram lógica e layout
   - Conectam contextos e hooks
   - Gerenciam estado local da página

2. **Componentes de Lista**:
   - Exibem listas de dados
   - Gerenciam paginação
   - Implementam filtros e busca

3. **Componentes de Formulário**:
   - Formulários de criação/edição
   - Validação com React Hook Form + Zod
   - Feedback de erros

4. **Componentes de Modal**:
   - Modais para ações (criar, editar, visualizar, excluir)
   - Gerenciam estado de abertura/fechamento
   - Integração com formulários

5. **Componentes de UI Base**:
   - Button, Input, Select, Modal, Card, Spinner
   - Estilizados com Tailwind
   - Reutilizáveis em toda aplicação

### Padrões de Componentes

- **Client Components**: Maioria dos componentes usa `'use client'`
- **Server Components**: Apenas layouts e páginas estáticas
- **Composição**: Componentes pequenos e compostos
- **Props Tipadas**: TypeScript para todas as props

---

## Hooks Customizados

### Hooks Disponíveis

1. **`useAuth()`**: Acesso ao contexto de autenticação
2. **`useMembers()`**: Acesso ao contexto de membros
3. **`useIntegration()`**: Acesso ao contexto de integração
4. **`useViewMode()`**: Persistência de modo de visualização (localStorage)
5. **`useChurch()`**: Dados e operações da igreja
6. **`useReports()`**: Carregamento e filtros de relatórios
7. **`useFiltersData()`**: Dados para filtros (cargos, congregações)
8. **`useGeographyData()`**: Dados geográficos (IBGE)
9. **`useIbgeData()`**: Integração com API do IBGE
10. **`useMemberOptions()`**: Opções de membros para selects
11. **`useProfessions()`**: Lista de profissões

### Padrões de Hooks

- **Retornam objetos**: `{ data, loading, error, functions }`
- **Memoização**: Usam `useCallback` e `useMemo` quando necessário
- **Cleanup**: Limpam efeitos colaterais quando desmontam

---

## Serviços de API

### ApiService

**Localização**: `services/api.ts`

**Responsabilidades**:
- Configuração do cliente Axios
- Interceptores de requisição/resposta
- Tratamento de erros
- Redirecionamento em caso de 401
- Métodos para todos os endpoints

**Configuração**:
- Base URL via `NEXT_PUBLIC_API_URL`
- Cookies automáticos (`withCredentials: true`)
- Timeout de 10 segundos
- Headers JSON padrão

**Interceptores**:
- **Request**: Adiciona headers se necessário
- **Response**: Trata erros, redireciona em 401

**Métodos**:
- Organizados por módulo (auth, members, roles, etc.)
- Retornam dados tipados
- Lançam erros com detalhes

---

## Formulários e Validação

### React Hook Form

- **Biblioteca**: React Hook Form para gerenciamento de formulários
- **Validação**: Zod para schemas de validação
- **Integração**: `@hookform/resolvers/zod` para conectar

### Fluxo de Validação

1. **Schema Zod**: Define regras de validação
2. **Resolver**: Conecta Zod com React Hook Form
3. **Form**: Usa `useForm` com resolver
4. **Campos**: Registrados com `register()`
5. **Submit**: Valida antes de enviar
6. **Erros**: Exibidos automaticamente

### Padrões de Formulário

- **Validação em tempo real**: Erros aparecem ao perder foco
- **Mensagens claras**: Erros específicos e acionáveis
- **Loading states**: Botões desabilitados durante submit
- **Feedback visual**: Indicadores de sucesso/erro

---

## Estilização

### Tailwind CSS

- **Versão**: Tailwind CSS 4
- **Configuração**: `tailwind.config.js`
- **PostCSS**: `postcss.config.mjs`
- **Classes utilitárias**: Uso extensivo de classes Tailwind

### Padrões de Estilo

- **Design System**: Cores e espaçamentos consistentes
- **Responsividade**: Mobile-first approach
- **Dark Mode**: Não implementado (pode ser adicionado)
- **Componentes UI**: Estilizados com Tailwind

### Ícones

- **Lucide React**: Ícones principais
- **Heroicons**: Ícones complementares
- **Uso consistente**: Mesmo estilo em toda aplicação

---

## Tratamento de Erros

### Estratégias

1. **Erros de API**:
   - Capturados no interceptor do Axios
   - Formatados com mensagem e detalhes
   - Exibidos via toast (React Hot Toast)

2. **Erros de Validação**:
   - Tratados pelo React Hook Form
   - Exibidos abaixo dos campos
   - Mensagens específicas

3. **Erros de Autenticação**:
   - 401 → Redirecionamento automático para login
   - Silenciados durante verificação inicial

4. **Erros de Rede**:
   - Timeout após 10 segundos
   - Mensagem genérica ao usuário
   - Log detalhado no console

### Feedback ao Usuário

- **Toasts**: Notificações não intrusivas (React Hot Toast)
- **Mensagens inline**: Erros em formulários
- **Estados de loading**: Spinners durante operações
- **Estados vazios**: Mensagens quando não há dados

---

## Performance

### Otimizações Implementadas

1. **Code Splitting**:
   - Next.js faz split automático por rota
   - Componentes carregados sob demanda

2. **Memoização**:
   - `useCallback` para funções
   - `useMemo` para valores computados
   - `React.memo` para componentes (quando necessário)

3. **Atualizações Otimistas**:
   - UI atualiza antes da confirmação do servidor
   - Melhor percepção de performance

4. **Lazy Loading**:
   - Componentes pesados carregados sob demanda
   - Imagens otimizadas pelo Next.js

5. **LocalStorage**:
   - Preferências do usuário (modo de visualização)
   - Reduz requisições ao servidor

### Melhorias Futuras

- Implementar React Query para cache de dados
- Virtualização de listas longas
- Service Workers para cache offline

---

## Variáveis de Ambiente

### Obrigatórias

- `NEXT_PUBLIC_API_URL`: URL da API backend (ex: `http://localhost:4000/api`)

### Desenvolvimento

- `.env.local`: Variáveis locais (não commitadas)
- `.env`: Variáveis padrão (pode ser commitada)

---

## Desenvolvimento

### Scripts Disponíveis

- `npm run dev`: Desenvolvimento com hot-reload (Turbopack)
- `npm run build`: Build de produção
- `npm start`: Execução em produção
- `npm run lint`: Verificação de lint

### Estrutura de Desenvolvimento

1. **TypeScript**: Código tipado
2. **ESLint**: Linting configurado
3. **Hot Reload**: Turbopack para desenvolvimento rápido
4. **Type Safety**: TypeScript para validação de tipos

---

## Padrões e Convenções

### Nomenclatura

- **Componentes**: PascalCase (ex: `MemberList.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useAuth`)
- **Contextos**: PascalCase com sufixo `Context` (ex: `AuthContext`)
- **Tipos**: PascalCase (ex: `Member`, `Church`)
- **Arquivos**: kebab-case ou PascalCase (consistente por tipo)

### Estrutura de Componentes

1. **Imports**: Bibliotecas externas → Internas → Tipos
2. **Tipos/Interfaces**: No topo do arquivo
3. **Componente**: Função principal
4. **Hooks**: No início do componente
5. **Handlers**: Funções de evento
6. **Render**: JSX no final

### Gerenciamento de Estado

- **Global**: Context API (auth, dados principais)
- **Local**: useState (estado específico do componente)
- **Derivado**: useMemo (valores computados)
- **Efeitos**: useEffect (side effects)

---

## Fluxo de Dados Típico

### Exemplo: Criar Membro

1. **Usuário** → Clica em "Adicionar Membro"
2. **Modal** → Abre `CreateMemberModal`
3. **Formulário** → Usuário preenche dados
4. **Validação** → React Hook Form + Zod valida
5. **Submit** → Chama `apiService.createMember()`
6. **Otimista** → `addMemberOptimistic()` atualiza UI
7. **API** → Requisição ao backend (com cookies)
8. **Sucesso** → Membro adicionado, modal fecha
9. **Erro** → Reversão otimista + toast de erro

### Exemplo: Listar Membros

1. **Página** → `MembersPage` carrega
2. **Context** → `MembersContext` inicializa
3. **Hook** → `useMembers()` disponibiliza funções
4. **Carregamento** → `loadMembers()` com filtros iniciais
5. **API** → Requisição ao backend
6. **Atualização** → Estado do contexto atualizado
7. **Render** → `MemberList` renderiza dados
8. **Interação** → Usuário filtra/busca
9. **Recarregamento** → Nova requisição com novos filtros

---

## Considerações Importantes

### Autenticação

- **Sempre** verificar `isAuthenticated` antes de renderizar conteúdo protegido
- **Nunca** armazenar tokens no localStorage ou estado
- **Sempre** usar `ProtectedRoute` para rotas protegidas
- **Tratar** erros 401 com redirecionamento

### Estado

- **Context API** para estado global compartilhado
- **useState** para estado local de componentes
- **Evitar** prop drilling excessivo
- **Usar** atualizações otimistas quando apropriado

### Performance

- **Memoizar** funções e valores quando necessário
- **Lazy load** componentes pesados
- **Otimizar** re-renders desnecessários
- **Usar** skeletons durante carregamento

### Acessibilidade

- **Labels** em todos os inputs
- **ARIA** attributes quando necessário
- **Navegação** por teclado funcional
- **Contraste** adequado de cores

### Manutenção

- **Componentes pequenos**: Fáceis de testar e manter
- **Separação de concerns**: Lógica separada de apresentação
- **Tipos TypeScript**: Documentação implícita
- **Comentários**: Apenas quando necessário explicar "por quê"

---

## Próximos Passos

Para adicionar uma nova funcionalidade:

1. **Criar tipos** em `types/`
2. **Criar componentes** em `components/[modulo]/`
3. **Criar página** em `app/(main)/[rota]/page.tsx`
4. **Adicionar métodos** em `services/api.ts`
5. **Criar contexto** (se necessário estado global)
6. **Criar hooks** (se necessário lógica reutilizável)
7. **Adicionar rota** na Sidebar (se aplicável)
8. **Testar** fluxo completo

---

**Versão**: 1.0  
**Última Atualização**: 2024

