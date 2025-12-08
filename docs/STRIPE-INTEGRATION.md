# Guia de Integração Stripe - Flock App

Este guia fornece instruções completas para integrar o Stripe no projeto Flock, incluindo configuração de planos, checkout e webhooks.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial no Stripe](#configuração-inicial-no-stripe)
3. [Configuração do Backend](#configuração-do-backend)
4. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
5. [Configuração do Frontend/Landing](#configuração-do-frontendlanding)
6. [Configuração de Webhooks](#configuração-de-webhooks)
7. [Testando a Integração](#testando-a-integração)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- Conta Stripe criada e verificada
- Acesso ao Dashboard do Stripe
- Acesso ao Supabase (banco de dados)
- Node.js 18+ instalado
- Credenciais do Stripe (chaves de API)

---

## Configuração Inicial no Stripe

### 1. Obter Chaves de API

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers** → **API keys**
3. Copie as seguintes chaves:
   - **Publishable key** (começa com `pk_`)
   - **Secret key** (começa com `sk_`)
   - **Webhook signing secret** (será obtido após configurar webhook)

⚠️ **Importante**: Use chaves de **teste** durante desenvolvimento e chaves de **produção** apenas em produção.

### 2. Criar Produtos e Planos no Stripe

No Stripe Dashboard, vá em **Products** e crie os seguintes produtos:

#### Plano 200 Membros
- **Nome**: "Flock - Plano 200 Membros"
- **Descrição**: "Plano para igrejas com até 200 membros"
- **Preço**: R$ 200,00/mês (ou valor desejado)
- **Tipo**: Recurring (mensal)
- **Anote o `price_id`** (começa com `price_`)

#### Plano 500 Membros
- **Nome**: "Flock - Plano 500 Membros"
- **Descrição**: "Plano para igrejas com até 500 membros"
- **Preço**: R$ 500,00/mês
- **Tipo**: Recurring (mensal)
- **Anote o `price_id`**

#### Plano 800 Membros
- **Nome**: "Flock - Plano 800 Membros"
- **Descrição**: "Plano para igrejas com até 800 membros"
- **Preço**: R$ 800,00/mês
- **Tipo**: Recurring (mensal)
- **Anote o `price_id`**

#### Plano Personalizado
- **Nome**: "Flock - Plano Personalizado"
- **Descrição**: "Plano personalizado para igrejas com mais de 800 membros"
- **Preço**: Valor variável (será configurado via API)
- **Tipo**: Recurring (mensal)
- **Anote o `price_id`**

💡 **Dica**: Você pode criar os produtos via Dashboard ou via API. Os `price_id` serão usados no código.

---

## Configuração do Backend

### 1. Instalar Dependências

```bash
cd backend
npm install stripe
npm install --save-dev @types/stripe
```

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` do backend:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_... # Chave secreta do Stripe
STRIPE_WEBHOOK_SECRET=whsec_... # Secret do webhook (será configurado depois)
STRIPE_PUBLISHABLE_KEY=pk_test_... # Chave pública (para referência)

# IDs dos Planos Stripe (obtidos no Dashboard)
STRIPE_PRICE_ID_M200=price_... # ID do plano 200 membros
STRIPE_PRICE_ID_M500=price_... # ID do plano 500 membros
STRIPE_PRICE_ID_M800=price_... # ID do plano 800 membros
STRIPE_PRICE_ID_CUSTOM=price_... # ID do plano personalizado

# URL do Frontend (para redirecionamento após checkout)
FRONTEND_URL=http://localhost:3000
```

### 3. Estrutura de Arquivos Criados

Após seguir este guia, você terá:

```
backend/
├── src/
│   ├── services/
│   │   └── stripe.ts          # Serviço do Stripe
│   ├── controllers/
│   │   └── stripeController.ts # Controllers de pagamento
│   ├── routes/
│   │   └── stripe.ts           # Rotas de pagamento
│   └── types/
│       └── stripe.ts           # Tipos TypeScript
```

---

## Configuração do Banco de Dados

### 1. Executar Script SQL

Execute o script `backend/scripts/add_stripe_subscription_fields.sql` no Supabase SQL Editor para adicionar campos de assinatura na tabela `churches`.

Este script adiciona:
- `stripe_customer_id`: ID do cliente no Stripe
- `stripe_subscription_id`: ID da assinatura ativa
- `subscription_status`: Status da assinatura (active, canceled, past_due, etc.)
- `plan_type`: Tipo de plano (200, 500, 800, custom)
- `subscription_start_date`: Data de início da assinatura
- `subscription_end_date`: Data de término (se cancelada)

### 2. Verificar Campos

Após executar o script, verifique se os campos foram criados:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'churches'
AND column_name LIKE '%stripe%' OR column_name LIKE '%subscription%';
```

---

## Configuração do Frontend/Landing

### 1. Instalar Dependências

```bash
# Na landing page
cd landing
npm install @stripe/stripe-js @stripe/react-stripe-js

# No frontend (se necessário)
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Configurar Variáveis de Ambiente

Adicione no `.env.local` da landing page:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

⚠️ **Importante**: A variável `NEXT_PUBLIC_FRONTEND_URL` é necessária para redirecionar para a página de registro quando o cliente não está autenticado.

### 3. Componentes Criados

- `landing/src/components/CheckoutForm.tsx`: Formulário de checkout
- `landing/src/components/Pricing.tsx`: Atualizado com botões de checkout

---

## Configuração de Webhooks

### 1. Configurar Webhook no Stripe Dashboard

1. Acesse **Developers** → **Webhooks** no Stripe Dashboard
2. Clique em **Add endpoint**
3. Configure:
   - **Endpoint URL**: `https://seu-backend.up.railway.app/api/stripe/webhook`
   - **Events to send**: Selecione os seguintes eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Clique em **Add endpoint**
5. **Copie o Signing secret** (começa com `whsec_`)
6. Adicione no `.env` do backend como `STRIPE_WEBHOOK_SECRET`

### 2. Para Desenvolvimento Local

Use o Stripe CLI para testar webhooks localmente:

```bash
# Instalar Stripe CLI
# Windows: https://stripe.com/docs/stripe-cli
# Mac: brew install stripe/stripe-cli/stripe
# Linux: https://stripe.com/docs/stripe-cli


# Login
stripe login

# Forward webhooks para localhost
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

O Stripe CLI fornecerá um `webhook signing secret` temporário. Use-o no `.env` durante desenvolvimento.

---

## Testando a Integração

### 1. Verificar Serviços em Execução

Antes de testar, certifique-se de que os seguintes serviços estão rodando:

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Deve estar em http://localhost:4000

# Terminal 2: Frontend
cd frontend
npm run dev
# Deve estar em http://localhost:3000

# Terminal 3: Landing
cd landing
npm run dev
# Deve estar em http://localhost:3001 (ou próxima porta disponível)
```

### 2. Verificar Variáveis de Ambiente

Certifique-se de que o arquivo `landing/.env.local` existe e contém:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Testar Checkout

1. Acesse a landing page (geralmente `http://localhost:3001`)
2. Clique em "Assinar Agora" em um plano
3. **Se não estiver autenticado**: Será redirecionado para `/register?plan=200` no frontend
4. Preencha o formulário de registro
5. Após criar conta, será redirecionado para `/checkout?plan=200`
6. Clique em "Continuar para Pagamento"
7. Use cartão de teste: `4242 4242 4242 4242`
8. Data: qualquer data futura
9. CVC: qualquer 3 dígitos
10. Complete o pagamento

### 2. Verificar no Stripe Dashboard

- Vá em **Payments** e verifique se o pagamento aparece
- Vá em **Customers** e verifique se o cliente foi criado
- Vá em **Subscriptions** e verifique se a assinatura foi criada

### 3. Verificar no Banco de Dados

```sql
SELECT 
  name,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  plan_type
FROM churches
WHERE stripe_customer_id IS NOT NULL;
```

### 4. Testar Webhooks

1. Use o Stripe CLI para ver logs de webhooks
2. Ou verifique no Dashboard → **Webhooks** → **Events**

---

## Fluxo Completo de Integração

### 1. Cliente Seleciona Plano

- Cliente acessa landing page
- Seleciona um plano (200, 500, 800 ou personalizado)
- Clica em "Assinar agora"

### 2. Criar Checkout Session

- Frontend chama `POST /api/stripe/create-checkout-session`
- Backend cria sessão de checkout no Stripe
- Retorna `session_id` e URL de checkout

### 3. Redirecionamento para Stripe

- Cliente é redirecionado para página de checkout do Stripe
- Preenche dados do cartão
- Confirma pagamento

### 4. Webhook Processa Pagamento

- Stripe envia webhook `checkout.session.completed`
- Backend atualiza `churches` com dados da assinatura
- Cliente é redirecionado para página de sucesso

### 5. Gerenciamento de Assinatura

- Cliente pode cancelar via Dashboard do Stripe
- Webhook `customer.subscription.deleted` atualiza status
- Cliente pode atualizar plano via Dashboard

---

## Troubleshooting

### Erro: "No such customer"

- Verifique se o `stripe_customer_id` está sendo salvo corretamente
- Verifique se o webhook está processando corretamente

### Erro: "Invalid API Key"

- Verifique se está usando a chave correta (test vs production)
- Verifique se a variável de ambiente está configurada

### Webhook não está funcionando

- Verifique se a URL do webhook está acessível publicamente
- Use Stripe CLI para testar localmente
- Verifique logs do backend para erros

### Checkout não redireciona

- Verifique se `FRONTEND_URL` está configurado corretamente
- Verifique CORS no backend
- Verifique console do navegador para erros

### Assinatura não aparece no banco

- Verifique se o webhook está configurado corretamente
- Verifique logs do webhook no Stripe Dashboard
- Verifique se o controller de webhook está processando corretamente

---

## Próximos Passos

Após a integração básica, considere implementar:

1. **Portal do Cliente Stripe**: Permitir que clientes gerenciem assinaturas
2. **Notificações de Email**: Enviar emails quando assinatura é criada/cancelada
3. **Trial Period**: Adicionar período de teste gratuito
4. **Upgrade/Downgrade**: Permitir mudança de planos
5. **Faturas**: Enviar faturas por email
6. **Relatórios**: Dashboard de receitas e assinaturas

---

## Recursos Úteis

- [Documentação Stripe](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do backend
2. Verifique eventos no Stripe Dashboard
3. Consulte a documentação oficial do Stripe
4. Verifique se todas as variáveis de ambiente estão configuradas

