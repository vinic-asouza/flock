# Stripe - Guia Rápido de Configuração

## ✅ Checklist de Configuração

### 1. Configuração no Stripe Dashboard

- [ ] Obter chaves de API (Publishable Key e Secret Key)
- [ ] Criar produtos e planos no Stripe:
  - [ ] Plano 200 Membros (anotar `price_id`)
  - [ ] Plano 500 Membros (anotar `price_id`)
  - [ ] Plano 800 Membros (anotar `price_id`)
  - [ ] Plano Personalizado (anotar `price_id`)
- [ ] Configurar webhook endpoint
- [ ] Obter Webhook Signing Secret

### 2. Configuração do Banco de Dados

- [ ] Executar script `backend/scripts/add_stripe_subscription_fields.sql` no Supabase

### 3. Configuração do Backend

- [ ] Instalar dependências: `cd backend && npm install stripe`
- [ ] Configurar variáveis de ambiente no `.env`:
  ```env
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_PRICE_ID_200=price_...
  STRIPE_PRICE_ID_500=price_...
  STRIPE_PRICE_ID_800=price_...
  STRIPE_PRICE_ID_CUSTOM=price_...
  FRONTEND_URL=http://localhost:3000
  ```

### 4. Configuração da Landing Page

- [ ] Instalar dependências: `cd landing && npm install @stripe/stripe-js @stripe/react-stripe-js`
- [ ] Configurar variável de ambiente no `.env.local`:
  ```env
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  NEXT_PUBLIC_API_URL=http://localhost:4000/api
  ```

### 5. Testar Integração

- [ ] Testar checkout com cartão de teste: `4242 4242 4242 4242`
- [ ] Verificar se webhook está funcionando
- [ ] Verificar se dados estão sendo salvos no banco

## 📝 Arquivos Criados

### Backend
- `backend/src/services/stripe.ts` - Serviço do Stripe
- `backend/src/controllers/stripeController.ts` - Controllers de pagamento
- `backend/src/routes/stripe.ts` - Rotas de pagamento
- `backend/src/types/stripe.ts` - Tipos TypeScript
- `backend/scripts/add_stripe_subscription_fields.sql` - Script SQL

### Landing
- `landing/src/services/stripe.ts` - Serviço de API
- `landing/src/components/CheckoutButton.tsx` - Componente de checkout

## 🔗 Endpoints Criados

- `POST /api/stripe/create-checkout-session` - Criar sessão de checkout
- `POST /api/stripe/create-portal-session` - Criar sessão do portal do cliente
- `POST /api/stripe/webhook` - Webhook do Stripe

## 📚 Documentação Completa

Consulte `docs/STRIPE-INTEGRATION.md` para instruções detalhadas.

