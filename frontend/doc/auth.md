# Documentação de Autenticação - Frontend Flock App

## Visão Geral

Este documento descreve a implementação completa do sistema de autenticação do frontend da aplicação Flock App, desenvolvida em Next.js 14 com TypeScript. O sistema utiliza Supabase como backend de autenticação e implementa um fluxo completo de autenticação com gerenciamento de estado global.

## Arquitetura

### Estrutura de Arquivos

```
frontend/src/
├── context/
│   └── AuthContext.tsx          # Contexto global de autenticação
├── services/
│   └── api.ts                   # Serviço de comunicação com API
├── components/
│   ├── AuthGuard.tsx            # Guarda para páginas de auth
│   └── ProtectedRoute.tsx       # Rota protegida
├── types/
│   └── index.ts                 # Tipos TypeScript
└── app/(auth)/
    ├── layout.tsx               # Layout das páginas de auth
    ├── login/
    │   └── page.tsx             # Página de login
    ├── register/
    │   └── page.tsx             # Página de registro
    ├── forgot-password/
    │   └── page.tsx             # Recuperação de senha
    └── reset-password/
        └── page.tsx             # Reset de senha
```

## Componentes Principais

### 1. AuthContext (Contexto Global)

**Arquivo:** `src/context/AuthContext.tsx`

O AuthContext é o coração do sistema de autenticação, gerenciando todo o estado de autenticação da aplicação.

#### Funcionalidades:
- **Gerenciamento de Estado**: Mantém dados do usuário, sessão e estados de loading
- **Persistência**: Recupera dados de autenticação do localStorage na inicialização
- **Operações de Auth**: Login, registro, logout, recuperação e reset de senha
- **Tratamento de Erros**: Preserva propriedades customizadas dos erros da API

#### Estados Gerenciados:
```typescript
interface AuthContextType {
  user: Church | null;           // Dados da igreja
  session: Session | null;       // Sessão de autenticação
  isLoading: boolean;            // Loading inicial
  isOperationLoading: boolean;   // Loading de operações
  isAuthenticated: boolean;      // Status de autenticação
  // ... métodos de autenticação
}
```

#### Características Importantes:
- **Memoização**: Usa `useMemo` e `useCallback` para otimização de performance
- **Inicialização Segura**: Verifica e limpa dados corrompidos do localStorage
- **Tratamento de Erros Robusto**: Preserva detalhes específicos dos erros da API

### 2. ApiService (Serviço de API)

**Arquivo:** `src/services/api.ts`

Serviço responsável por toda comunicação com o backend, incluindo interceptors para autenticação automática.

#### Funcionalidades:
- **Configuração Axios**: Base URL, timeout e headers padrão
- **Interceptors**: Adiciona token automaticamente e trata erros 401
- **Gerenciamento de Token**: Armazena e remove tokens do localStorage
- **Métodos de Auth**: Implementa todas as operações de autenticação

#### Interceptors Implementados:
```typescript
// Request Interceptor
- Adiciona token Bearer automaticamente
- Trata erros de configuração

// Response Interceptor
- Detecta erros 401 e redireciona para login
- Preserva detalhes específicos dos erros da API
- Formata mensagens de erro para melhor UX
```

### 3. AuthGuard (Guarda de Autenticação)

**Arquivo:** `src/components/AuthGuard.tsx`

Componente que protege páginas de autenticação, redirecionando usuários já autenticados para o dashboard.

#### Funcionalidades:
- **Redirecionamento Automático**: Usuários logados são redirecionados para `/dashboard`
- **Loading States**: Mostra loading durante verificação de autenticação
- **Otimização**: Memoizado para evitar re-renderizações desnecessárias
- **Operação Loading**: Considera estados de operação para evitar redirecionamentos prematuros

### 4. ProtectedRoute (Rota Protegida)

**Arquivo:** `src/components/ProtectedRoute.tsx`

Componente que protege rotas que requerem autenticação, redirecionando usuários não autenticados para login.

#### Funcionalidades:
- **Proteção de Rotas**: Verifica autenticação antes de renderizar conteúdo
- **Redirecionamento**: Usuários não autenticados são redirecionados para `/login`
- **Loading States**: Mostra loading durante verificação

## Tipos TypeScript

### Estruturas Principais

#### Church (Igreja)
```typescript
interface Church {
  id: string;
  user_id: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  created_at: string;
}
```

#### Session (Sessão)
```typescript
interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    // ... outras propriedades do usuário
  };
}
```

#### Dados de Formulário
```typescript
interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
}
```

## Fluxos de Autenticação

### 1. Login

**Fluxo Completo:**
1. Usuário preenche formulário de login
2. Validação com Zod schema
3. Chamada para `AuthContext.login()`
4. ApiService faz requisição para `/auth/login`
5. Token e dados da igreja são armazenados no localStorage
6. Estado global é atualizado
7. Redirecionamento automático para `/dashboard`

**Tratamento de Erros:**
- Validação de campos obrigatórios
- Verificação de formato de email
- Preservação de detalhes específicos dos erros da API
- Estados de loading durante operação

### 2. Registro

**Fluxo Completo:**
1. Usuário preenche formulário de registro
2. Validação com Zod schema
3. Formatação automática de CNPJ
4. Validação de confirmação de senha
5. Chamada para `AuthContext.register()`
6. ApiService faz requisição para `/auth/register`
7. Redirecionamento para login após sucesso

**Funcionalidades Especiais:**
- Integração com API IBGE para estados e cidades
- Formatação automática de CNPJ (XX.XXX.XXX/XXXX-XX)
- Validação de confirmação de senha
- Loading states para carregamento de dados geográficos

### 3. Recuperação de Senha

**Fluxo Completo:**
1. Usuário informa email em `/forgot-password`
2. Chamada para `AuthContext.forgotPassword()`
3. ApiService faz requisição para `/password/forgot`
4. Email de recuperação é enviado via Supabase
5. Usuário clica no link do email
6. Redirecionamento para `/reset-password` com token na URL
7. Usuário define nova senha
8. Token é validado e senha é atualizada

**Características:**
- Token extraído da URL hash
- Validação de token antes de permitir reset
- Confirmação de nova senha
- Integração com Supabase Auth

### 4. Logout

**Fluxo Completo:**
1. Usuário clica em logout
2. Chamada para `AuthContext.logout()`
3. Delay de 500ms para mostrar loading
4. Token e dados removidos do localStorage
5. Estado global limpo
6. Redirecionamento para `/login`

## Páginas de Autenticação

### 1. Login (`/login`)

**Características:**
- Formulário com validação Zod
- Tratamento robusto de erros
- Estados de loading
- Links para recuperação de senha e registro
- Memoização para performance

### 2. Registro (`/register`)

**Características:**
- Formulário completo de registro de igreja
- Integração com API IBGE
- Formatação automática de CNPJ
- Validação de confirmação de senha
- Estados de loading para dados geográficos

### 3. Recuperação de Senha (`/forgot-password`)

**Características:**
- Formulário simples com email
- Validação de formato de email
- Feedback de sucesso após envio

### 4. Reset de Senha (`/reset-password`)

**Características:**
- Extração de token da URL
- Validação de token
- Formulário de nova senha com confirmação
- Integração com backend para reset

## Gerenciamento de Estado

### LocalStorage

**Chaves Utilizadas:**
- `flock_token`: Token de autenticação
- `flock_church`: Dados da igreja serializados

**Segurança:**
- Verificação de dados corrompidos na inicialização
- Limpeza automática em caso de erro
- Verificação de existência antes de uso

### Estados de Loading

**Tipos de Loading:**
1. **isLoading**: Loading inicial da aplicação
2. **isOperationLoading**: Loading durante operações de auth

**Uso nos Componentes:**
- Evita redirecionamentos prematuros
- Melhora UX com feedback visual
- Previne múltiplas submissões

## Tratamento de Erros

### Estratégias Implementadas

1. **Preservação de Propriedades**: Erros da API mantêm detalhes específicos
2. **Formatação de Mensagens**: Erros são formatados para melhor UX
3. **Fallbacks**: Estados de erro com fallbacks para dados estáticos
4. **Logging**: Console logs para debugging

### Estrutura de Erro
```typescript
interface ApiError {
  error: string;
  details?: string | string[];
  message?: string;
}
```

## Considerações de Performance

### Otimizações Implementadas

1. **Memoização**: Componentes e valores memoizados com React.memo e useMemo
2. **Lazy Loading**: Componentes carregados sob demanda
3. **Interceptors**: Configuração única do Axios
4. **Singleton Pattern**: ApiService como instância única

### Boas Práticas

1. **Evitar Re-renderizações**: Uso de memoização e useCallback
2. **Gerenciamento de Estado**: Estados locais e globais bem definidos
3. **Loading States**: Feedback visual durante operações
4. **Error Boundaries**: Tratamento robusto de erros

## Segurança

### Medidas Implementadas

1. **Validação de Token**: Verificação automática de tokens expirados
2. **Interceptors**: Redirecionamento automático em caso de 401
3. **Sanitização**: Validação de dados de entrada
4. **Persistência Segura**: Armazenamento seguro no localStorage

### Considerações

1. **HTTPS**: Requerido em produção
2. **Token Expiration**: Tokens têm tempo de expiração
3. **CSRF Protection**: Implementado no backend
4. **Input Validation**: Validação tanto no frontend quanto backend

## Manutenção e Escalabilidade

### Pontos de Atenção

1. **Versionamento de API**: Considerar versionamento para futuras mudanças
2. **Refresh Tokens**: Implementar refresh automático de tokens
3. **Rate Limiting**: Implementar no backend para prevenir abuso
4. **Logs de Auditoria**: Implementar logs de ações de autenticação

### Extensibilidade

1. **Novos Provedores**: Estrutura permite adição de OAuth providers
2. **MFA**: Estrutura preparada para autenticação multi-fator
3. **Roles e Permissões**: Sistema de roles pode ser expandido
4. **Sessões Múltiplas**: Suporte para múltiplas sessões

## Configuração de Ambiente

### Variáveis de Ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Dependências Principais

```json
{
  "axios": "^1.6.0",
  "react-hook-form": "^7.48.0",
  "@hookform/resolvers": "^3.3.0",
  "zod": "^3.22.0",
  "lucide-react": "^0.294.0"
}
```

## Testes e Debugging

### Logs de Debug

- Console logs em operações críticas
- Estados de loading visíveis
- Mensagens de erro detalhadas

### Pontos de Teste

1. **Fluxo de Login**: Validação, erro, sucesso
2. **Fluxo de Registro**: Validação, integração IBGE, sucesso
3. **Recuperação de Senha**: Envio de email, reset
4. **Logout**: Limpeza de dados, redirecionamento
5. **Proteção de Rotas**: Redirecionamentos automáticos

## Conclusão

O sistema de autenticação implementado oferece uma base sólida e escalável para a aplicação Flock App. Com arquitetura bem definida, tratamento robusto de erros, otimizações de performance e considerações de segurança, o sistema está preparado para crescimento e manutenção futura.

A documentação serve como guia para desenvolvedores que precisam entender, manter ou estender o sistema de autenticação, garantindo consistência e qualidade no desenvolvimento.
