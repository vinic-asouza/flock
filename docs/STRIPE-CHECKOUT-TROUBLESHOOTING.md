# 🔧 Troubleshooting: Erro ao Criar Sessão de Checkout

## ❌ Erro: "Erro ao criar sessão de checkout"

Este erro pode ter várias causas. Siga este guia para identificar e resolver o problema.

---

## 🔍 Verificações Iniciais

### 1. **Verificar Variáveis de Ambiente do Backend**

Certifique-se de que as seguintes variáveis estão configuradas no arquivo `.env` do backend:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...  # ou sk_live_... em produção
STRIPE_PRICE_ID_M200=price_...
STRIPE_PRICE_ID_M500=price_...
STRIPE_PRICE_ID_M800=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (para redirecionamentos)
FRONTEND_URL=http://localhost:3001  # ou sua URL de produção
```

**Como verificar:**
1. Abra o arquivo `.env` na pasta `backend/`
2. Verifique se todas as variáveis acima estão presentes
3. Se estiver usando Railway ou outro serviço, verifique as variáveis de ambiente no painel

---

### 2. **Verificar Price IDs no Stripe**

Os Price IDs devem ser criados no Stripe Dashboard:

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Products** → **Pricing**
3. Para cada plano (200, 500, 800), copie o **Price ID** (começa com `price_`)
4. Adicione no `.env` do backend:
   ```env
   STRIPE_PRICE_ID_M200=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_M500=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_M800=price_xxxxxxxxxxxxx
   ```

**⚠️ Importante:** 
- Use Price IDs de **test mode** para desenvolvimento
- Use Price IDs de **live mode** para produção
- Certifique-se de que a `STRIPE_SECRET_KEY` corresponde ao modo (test ou live)

---

### 3. **Verificar Logs do Backend**

Abra o console do backend e verifique os logs quando o erro ocorrer:

```bash
# No terminal do backend, você deve ver algo como:
Erro ao criar checkout: [detalhes do erro]
```

**Erros comuns nos logs:**

#### ❌ "STRIPE_PRICE_ID_M200 não está configurado"
**Solução:** Adicione a variável `STRIPE_PRICE_ID_M200` no `.env`

#### ❌ "STRIPE_SECRET_KEY não está configurada"
**Solução:** Adicione a variável `STRIPE_SECRET_KEY` no `.env`

#### ❌ "Igreja não encontrada"
**Solução:** O usuário está autenticado mas não tem igreja cadastrada. Verifique se o registro foi concluído corretamente.

#### ❌ "No such price: price_xxx"
**Solução:** O Price ID não existe no Stripe ou está no modo errado (test vs live)

---

### 4. **Verificar Autenticação**

O erro pode ocorrer se o usuário não estiver autenticado corretamente:

1. Verifique se os cookies de autenticação estão sendo enviados
2. Abra o DevTools (F12) → Network
3. Veja a requisição para `/api/stripe/create-checkout-session`
4. Verifique se há cookies `accessToken` e `refreshToken`

**Se não houver cookies:**
- Faça login novamente
- Verifique se o `withCredentials: true` está sendo enviado (já está no código)

---

### 5. **Verificar Console do Navegador**

Abra o DevTools (F12) → Console e verifique se há erros:

```javascript
// Você deve ver algo como:
Erro ao criar checkout: [detalhes]
```

**Se o erro mostrar `details`:**
- Copie a mensagem completa
- Ela contém informações específicas sobre o problema

---

## 🛠️ Soluções por Tipo de Erro

### Erro: "Plano não configurado"

**Causa:** O Price ID do plano não está configurado no `.env`

**Solução:**
1. Acesse o Stripe Dashboard
2. Crie ou copie o Price ID do plano
3. Adicione no `.env`:
   ```env
   STRIPE_PRICE_ID_M200=price_xxxxxxxxxxxxx
   ```
4. Reinicie o servidor backend

---

### Erro: "Igreja não encontrada"

**Causa:** O usuário está autenticado mas não tem igreja cadastrada no banco

**Solução:**
1. Verifique se o registro foi concluído
2. Verifique no Supabase se existe um registro na tabela `churches` com o `user_id` correto
3. Se não existir, faça o registro novamente

---

### Erro: "No such price" ou erro do Stripe API

**Causa:** O Price ID não existe ou está no modo errado

**Solução:**
1. Verifique se o Price ID está correto no Stripe Dashboard
2. Certifique-se de que está usando Price IDs de **test mode** se `STRIPE_SECRET_KEY` começa com `sk_test_`
3. Certifique-se de que está usando Price IDs de **live mode** se `STRIPE_SECRET_KEY` começa com `sk_live_`

---

### Erro: "STRIPE_SECRET_KEY não está configurada"

**Causa:** A chave secreta do Stripe não está no `.env`

**Solução:**
1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers** → **API keys**
3. Copie a **Secret key** (test ou live)
4. Adicione no `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```
5. Reinicie o servidor backend

---

## 📋 Checklist de Verificação

Antes de reportar o erro, verifique:

- [ ] `STRIPE_SECRET_KEY` está configurada no `.env`
- [ ] `STRIPE_PRICE_ID_M200`, `STRIPE_PRICE_ID_M500`, `STRIPE_PRICE_ID_M800` estão configurados
- [ ] Os Price IDs existem no Stripe Dashboard
- [ ] O modo do Price ID corresponde ao modo da Secret Key (test vs live)
- [ ] O servidor backend foi reiniciado após adicionar variáveis de ambiente
- [ ] O usuário está autenticado (tem cookies de autenticação)
- [ ] O usuário tem uma igreja cadastrada no banco
- [ ] Verificou os logs do backend para mais detalhes

---

## 🔍 Como Obter Mais Detalhes do Erro

### No Frontend

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por mensagens de erro quando clicar em "Continuar para Pagamento"
4. A mensagem agora mostra mais detalhes, incluindo `details` se houver

### No Backend

1. Verifique o terminal onde o backend está rodando
2. Procure por mensagens que começam com `Erro ao criar checkout:`
3. Se for um erro do Stripe, você verá:
   ```
   Erro do Stripe: {
     type: 'StripeInvalidRequestError',
     message: '...',
     code: '...',
     param: '...'
   }
   ```

---

## 💡 Dicas

1. **Sempre reinicie o backend** após alterar variáveis de ambiente
2. **Use test mode** durante desenvolvimento
3. **Verifique os logs** - eles contêm informações valiosas
4. **Teste com um plano diferente** - pode ser que apenas um Price ID esteja incorreto

---

## 🆘 Ainda com Problemas?

Se após seguir este guia o problema persistir:

1. Copie a mensagem de erro completa do console do navegador
2. Copie os logs do backend
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Verifique se os Price IDs existem no Stripe Dashboard

