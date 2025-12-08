# 🔄 Sincronização Manual de Assinatura Stripe

## ❌ Problema Identificado

Quando uma assinatura é criada no Stripe, mas o webhook não processa corretamente (ou não está configurado), apenas o campo `stripe_customer_id` é preenchido na tabela `churches`, enquanto os outros campos de assinatura (`stripe_subscription_id`, `subscription_status`, `plan_type`, etc.) ficam vazios.

---

## ✅ Solução Implementada

Foi criado um endpoint de sincronização manual que busca a assinatura diretamente do Stripe e atualiza os dados no banco.

### Endpoint Criado

**POST** `/api/stripe/sync-subscription`

- **Autenticação:** Requerida
- **Descrição:** Sincroniza os dados da assinatura do Stripe com o banco de dados

### Funcionamento

1. Busca a igreja do usuário autenticado
2. Verifica se existe `stripe_customer_id`
3. Busca assinaturas ativas do cliente no Stripe
4. Atualiza os campos da igreja com:
   - `stripe_subscription_id`
   - `subscription_status`
   - `plan_type`
   - `subscription_start_date`
   - `subscription_end_date`
   - `subscription_updated_at`

---

## 🎨 Interface Implementada

### Botão "Sincronizar Assinatura"

Adicionado na aba **Pagamento** das configurações:

1. **Quando há assinatura:**
   - Botão ao lado de "Gerenciar Assinatura"
   - Permite sincronizar manualmente se os dados estiverem desatualizados

2. **Quando não há assinatura:**
   - Se o usuário tem `stripe_customer_id` mas não tem assinatura no banco
   - Mostra mensagem: "Não foi encontrada uma assinatura ativa no sistema. Se você acabou de fazer o pagamento, tente sincronizar."
   - Botão "Sincronizar Assinatura" aparece junto com "Assinar Plano"

### Mensagens de Feedback

- ✅ **Sucesso:** "Assinatura sincronizada com sucesso!" (verde)
- ⚠️ **Sem assinatura:** "Nenhuma assinatura encontrada no Stripe." (amarelo)
- ❌ **Erro:** Mensagem de erro específica (vermelho)

---

## 🔧 Como Usar

### Para o Usuário

1. Acesse **Configurações** → **Pagamento**
2. Se não houver assinatura visível mas você acabou de fazer o pagamento:
   - Clique em **"Sincronizar Assinatura"**
   - Aguarde alguns segundos
   - Os dados serão atualizados automaticamente

### Para Desenvolvedores

**Chamada da API:**

```bash
POST /api/stripe/sync-subscription
Headers:
  Cookie: flock_access_token=...
```

**Resposta de Sucesso:**

```json
{
  "message": "Assinatura sincronizada com sucesso",
  "synced": true,
  "subscription": {
    "id": "sub_xxx",
    "status": "active",
    "plan_type": "200",
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": null
  }
}
```

**Resposta Sem Assinatura:**

```json
{
  "message": "Nenhuma assinatura encontrada no Stripe",
  "synced": false
}
```

---

## 🔍 Por Que Isso Acontece?

### Possíveis Causas

1. **Webhook não configurado**
   - O webhook do Stripe não está apontando para o backend
   - Eventos não estão sendo recebidos

2. **Webhook falhou**
   - O webhook recebeu o evento mas houve erro no processamento
   - Logs do backend podem mostrar o erro

3. **Checkout feito antes do webhook estar configurado**
   - Assinatura criada antes do webhook estar ativo
   - Eventos antigos não são reenviados automaticamente

4. **Ambiente de teste**
   - Webhook pode estar configurado apenas para produção
   - Eventos de teste não estão sendo processados

---

## 🛠️ Verificações

### 1. Verificar Webhook no Stripe Dashboard

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers** → **Webhooks**
3. Verifique se há um webhook configurado para:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`

### 2. Verificar Logs do Backend

Procure por mensagens como:
- `✅ Assinatura pendente salva para email: ...`
- `❌ Não foi possível vincular assinatura: ...`
- `Erro ao processar webhook: ...`

### 3. Verificar Dados no Banco

```sql
SELECT 
  id,
  name,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  plan_type,
  subscription_start_date,
  subscription_end_date
FROM churches
WHERE stripe_customer_id IS NOT NULL;
```

---

## 💡 Recomendações

1. **Sempre sincronize após fazer um pagamento de teste**
   - Use o botão "Sincronizar Assinatura" para garantir que os dados estão corretos

2. **Configure o webhook corretamente**
   - Em produção, certifique-se de que o webhook está configurado
   - Use o Stripe CLI para testar webhooks localmente

3. **Monitore os logs**
   - Verifique regularmente se os webhooks estão sendo processados
   - Configure alertas para erros de webhook

---

## 📝 Notas Técnicas

- O endpoint busca apenas a assinatura **mais recente** do cliente
- Se houver múltiplas assinaturas, apenas a primeira será sincronizada
- O endpoint atualiza `subscription_updated_at` com a data/hora atual
- Se não houver assinatura no Stripe, os campos são limpos no banco

