# Fluxo de Integração Stripe - Explicação Detalhada

## 📋 Cenário: Novo Cliente Assinando Plano

### Fluxo Atual (Como Está Implementado)

#### 1. **Cliente Acessa Landing Page** (`/landing`)
   - Cliente vê os planos disponíveis
   - Clica em "Assinar Agora" em um plano

#### 2. **Checkout Iniciado** (Sem Autenticação)
   - `CheckoutButton` chama `POST /api/stripe/create-checkout-session`
   - Backend recebe: `{ plan: '200', email: 'cliente@email.com', name: 'Nome da Igreja' }`
   - **Problema atual**: Cliente não está autenticado, então:
     - Cria um cliente temporário no Stripe
     - Salva `church_id: 'pending'` nos metadados
     - Não há vínculo com conta ainda

#### 3. **Checkout no Stripe**
   - Cliente é redirecionado para página de checkout do Stripe
   - Preenche dados do cartão
   - Confirma pagamento

#### 4. **Webhook Processa Pagamento**
   - Stripe envia `checkout.session.completed`
   - Backend tenta atualizar `churches`:
     ```typescript
     // Busca por church_id nos metadados
     churchId = session.metadata?.church_id; // 'pending'
     
     // Como church_id é 'pending', tenta buscar por customer_id
     // Mas não encontra porque a igreja ainda não existe!
     ```
   - **Resultado**: Assinatura fica "órfã" no Stripe, sem vínculo com igreja

#### 5. **Cliente Cria Conta** (Depois do Pagamento)
   - Cliente vai para `/frontend/register`
   - Preenche formulário de registro
   - Cria conta e igreja no banco
   - **Problema**: A assinatura no Stripe não está vinculada à igreja criada!

---

## 🔴 Problema Identificado

**Gap no Fluxo**: Não há mecanismo para vincular a assinatura do Stripe com a conta criada posteriormente.

### Situação Atual:
1. ✅ Cliente pode fazer checkout sem estar autenticado
2. ✅ Assinatura é criada no Stripe
3. ❌ Assinatura não é vinculada à igreja quando ela é criada
4. ❌ Cliente paga mas não tem acesso ao sistema

---

## ✅ Solução Proposta

### Opção 1: Vincular por Email (Recomendada)

**Fluxo Melhorado:**

1. **Checkout sem Autenticação**
   - Cliente faz checkout com email
   - Assinatura criada no Stripe com `customer_email` nos metadados

2. **Webhook Processa**
   - Quando `checkout.session.completed` é recebido:
   - Salva assinatura temporariamente vinculada ao `customer_email` do Stripe

3. **Cliente Cria Conta**
   - No registro, verificar se existe assinatura pendente com o mesmo email
   - Se existir, vincular automaticamente:
     ```typescript
     // No controller de registro
     const { data: pendingSubscription } = await supabase
       .from('pending_subscriptions') // Nova tabela temporária
       .select('*')
       .eq('email', email)
       .single();
     
     if (pendingSubscription) {
       // Vincular assinatura à igreja criada
       await supabase
         .from('churches')
         .update({
           stripe_customer_id: pendingSubscription.customer_id,
           stripe_subscription_id: pendingSubscription.subscription_id,
           // ... outros campos
         })
         .eq('id', churchRecord.id);
     }
     ```

### Opção 2: Criar Conta ANTES do Checkout (Mais Segura)

**Fluxo Alternativo:**

1. **Cliente Acessa Landing**
   - Clica em "Assinar Agora"
   - **Redireciona para `/register` primeiro**

2. **Cliente Cria Conta**
   - Preenche formulário de registro
   - Conta e igreja são criadas

3. **Checkout com Autenticação**
   - Cliente autenticado faz checkout
   - `church_id` já existe e é vinculado imediatamente

4. **Webhook Processa**
   - Assinatura é vinculada corretamente porque `church_id` existe

---

## 🔧 Implementação Recomendada

### Solução Híbrida (Melhor UX)

**Fluxo:**

1. **Landing Page - Botão "Assinar Agora"**
   ```typescript
   // Se cliente não está autenticado
   if (!isAuthenticated) {
     // Salvar plano escolhido em localStorage
     localStorage.setItem('selectedPlan', plan);
     // Redirecionar para registro
     router.push('/register?plan=' + plan);
   } else {
     // Cliente autenticado, ir direto para checkout
     createCheckoutSession(plan);
   }
   ```

2. **Página de Registro**
   ```typescript
   // Ao criar conta, incluir plano nos metadados
   const churchData = {
     ...formData,
     selected_plan: searchParams.get('plan') // Do query string
   };
   
   // Após criar conta, redirecionar para checkout
   await registerChurch(churchData);
   // Cliente já está autenticado agora
   router.push(`/checkout?plan=${plan}`);
   ```

3. **Checkout com Autenticação**
   - Cliente autenticado faz checkout
   - `church_id` existe e é vinculado imediatamente
   - Webhook processa corretamente

4. **Fallback: Vincular por Email**
   - Se cliente fez checkout sem autenticação
   - Webhook salva assinatura pendente vinculada ao email
   - Quando cliente criar conta com mesmo email, vincula automaticamente

---

## 📊 Tabela de Estados

| Estado | Descrição | Ação Necessária |
|--------|-----------|-----------------|
| `pending` | Checkout feito, conta não criada | Aguardar criação de conta |
| `active` | Assinatura ativa e vinculada | ✅ Tudo OK |
| `orphan` | Assinatura sem vínculo | ⚠️ Precisa vincular manualmente |

---

## 🛠️ Melhorias Necessárias no Código

### 1. Criar Tabela de Assinaturas Pendentes

```sql
CREATE TABLE pending_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  subscription_status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);
```

### 2. Atualizar Webhook Handler

```typescript
async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const email = session.metadata?.customer_email;
  const churchId = session.metadata?.church_id;

  if (churchId && churchId !== 'pending') {
    // Igreja existe, vincular diretamente
    await supabase.from('churches').update({...}).eq('id', churchId);
  } else {
    // Igreja não existe, salvar como pendente
    await supabase.from('pending_subscriptions').insert({
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      // ...
    });
  }
}
```

### 3. Atualizar Controller de Registro

```typescript
export const register = async (req: Request, res: Response) => {
  // ... código existente de criação de conta ...
  
  // Verificar se há assinatura pendente
  const { data: pendingSub } = await supabase
    .from('pending_subscriptions')
    .select('*')
    .eq('email', email)
    .single();
  
  if (pendingSub) {
    // Vincular assinatura à igreja criada
    await supabase
      .from('churches')
      .update({
        stripe_customer_id: pendingSub.stripe_customer_id,
        stripe_subscription_id: pendingSub.stripe_subscription_id,
        subscription_status: pendingSub.subscription_status,
        plan_type: pendingSub.plan_type,
        // ...
      })
      .eq('id', churchRecord.id);
    
    // Remover da tabela de pendentes
    await supabase
      .from('pending_subscriptions')
      .delete()
      .eq('id', pendingSub.id);
  }
  
  // ... resto do código ...
}
```

---

## 📝 Resumo

**Problema Atual:**
- Cliente pode fazer checkout sem conta
- Assinatura fica "órfã" sem vínculo com igreja
- Cliente paga mas não tem acesso

**Solução:**
1. **Preferencial**: Criar conta antes do checkout (melhor UX e segurança)
2. **Fallback**: Sistema de assinaturas pendentes vinculadas por email
3. **Webhook**: Processar ambos os casos corretamente

**Próximos Passos:**
1. Implementar tabela `pending_subscriptions`
2. Atualizar webhook para salvar assinaturas pendentes
3. Atualizar registro para vincular assinaturas pendentes
4. Atualizar landing para redirecionar para registro primeiro

