# Documentação de Manutenção - Integração Stripe

Esta documentação explica como funciona a integração com Stripe para fins de manutenção e suporte. Focada em entender o sistema sem entrar em detalhes técnicos de código.

---

## 📋 Visão Geral

O sistema Flock utiliza o **Stripe** como gateway de pagamento para gerenciar assinaturas mensais dos planos. A integração permite que igrejas se inscrevam em planos pagos, gerenciem suas assinaturas e façam upgrade/downgrade conforme necessário.

### Componentes Principais

1. **Checkout**: Processo de pagamento inicial
2. **Webhooks**: Notificações do Stripe sobre eventos de assinatura
3. **Sincronização**: Atualização manual de dados entre Stripe e banco de dados
4. **Portal do Cliente**: Interface do Stripe para gerenciar assinatura
5. **Validação de Limites**: Controle de quantidade de membros por plano

---

## 💳 Planos Disponíveis

O sistema oferece 4 planos principais:

| Plano | Membros | Preço Mensal | Descrição |
|-------|---------|--------------|-----------|
| **100** | 100 | Gratuito | Plano inicial gratuito |
| **200** | 200 | R$ 29,99 | Para igrejas pequenas |
| **500** | 500 | R$ 59,99 | Para igrejas médias |
| **800** | 800 | R$ 89,99 | Para igrejas grandes |

### Plano Gratuito (100)

- **Atribuição automática**: Quando uma assinatura é cancelada e expirada, o sistema automaticamente atribui o plano gratuito
- **Limite**: 100 membros ativos
- **Sem custo**: Não há cobrança

### Planos Pagos (200, 500, 800)

- **Cobrança mensal**: Renovação automática todo mês
- **Upgrade/Downgrade**: Pode ser alterado a qualquer momento
- **Proporcional**: Ao fazer upgrade/downgrade, o valor é ajustado proporcionalmente

---

## 🔄 Fluxo de Checkout

### 1. Início do Checkout

**Onde acontece:**
- Landing page: Usuário clica em "Assinar" em um plano
- URL: `/checkout?plan=200` (exemplo para plano 200)

**O que acontece:**
1. Sistema cria uma sessão de checkout no Stripe
2. Usuário é redirecionado para a página de pagamento do Stripe
3. Usuário preenche dados do cartão e confirma pagamento

### 2. Processamento do Pagamento

**Após pagamento bem-sucedido:**
1. Stripe processa o pagamento
2. Stripe envia webhook `checkout.session.completed` para o backend
3. Backend cria/vincula a assinatura no banco de dados
4. Usuário é redirecionado para página de sucesso

### 3. Página de Sucesso

**URL:** `/subscription/success?session_id=xxx`

**O que acontece:**
- Sistema verifica se o pagamento foi confirmado
- Faz polling (verificação repetida) a cada 2 segundos
- Aguarda até 30 segundos para confirmação
- Atualiza dados do usuário quando confirmado
- Redireciona para dashboard após sucesso

**Por que polling?**
- Webhooks podem demorar alguns segundos para chegar
- Garante que o usuário veja o status atualizado rapidamente

---

## 🔔 Webhooks

Webhooks são notificações que o Stripe envia para o servidor quando eventos importantes acontecem.

### Eventos Configurados

| Evento | Quando acontece | O que o sistema faz |
|--------|----------------|-------------------|
| `checkout.session.completed` | Pagamento concluído | Cria/vincula assinatura no banco |
| `customer.subscription.created` | Nova assinatura criada | Atualiza dados da igreja |
| `customer.subscription.updated` | Assinatura alterada | Atualiza status e plano |
| `customer.subscription.deleted` | Assinatura cancelada | Marca como cancelada, atribui plano gratuito se expirada |
| `invoice.payment_succeeded` | Pagamento bem-sucedido | Atualiza status para "active" |
| `invoice.payment_failed` | Pagamento falhou | Atualiza status para "past_due" |

### Segurança dos Webhooks

- **Assinatura**: Cada webhook é validado com `stripe.webhooks.constructEvent` e `STRIPE_WEBHOOK_SECRET`
- **Idempotência**: Claim atômico em `processed_webhook_events` antes do processamento; duplicatas retornam `{ skipped: true }`
- **Retry**: Em falha de processamento, o claim é removido e o endpoint responde 500 para o Stripe reenviar
- **IP (opcional na infra)**: Allowlist de IPs do Stripe pode ser configurada no proxy/firewall; a aplicação não bloqueia por IP

### Onde Configurar

**Stripe Dashboard:**
1. Acesse: https://dashboard.stripe.com/webhooks
2. Configure endpoint: `https://seu-dominio.com/api/stripe/webhook`
3. Selecione os eventos listados acima
4. Copie o "Signing secret" para variável `STRIPE_WEBHOOK_SECRET`

---

## 🛠️ Stripe CLI - Ferramenta de Teste

O **Stripe CLI** é uma ferramenta de linha de comando que permite testar webhooks localmente durante o desenvolvimento, sem precisar configurar túneis ou expor seu servidor local publicamente.

### Instalação

**Windows (via Scoop ou Chocolatey):**
```bash
# Via Scoop
scoop install stripe

# Via Chocolatey
choco install stripe-cli
```

**macOS (via Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Baixar binário
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_*_linux_x86_64.tar.gz
tar -xvf stripe_*_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Verificar instalação:**
```bash
stripe --version
```

### Autenticação

**Primeiro uso:**
```bash
stripe login
```

Este comando abre o navegador para autenticar com sua conta Stripe. Você pode usar tanto a conta de **test mode** quanto **live mode**.

**Verificar autenticação:**
```bash
stripe config --list
```

### Comandos Básicos

#### 1. Escutar Webhooks Localmente

**Comando principal:**
```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

**O que faz:**
- Cria um túnel seguro entre Stripe e seu servidor local
- Captura eventos do Stripe e os encaminha para seu backend
- Exibe o **webhook signing secret** necessário para validar eventos

**Exemplo de saída:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Importante:**
- Use o `webhook signing secret` exibido na variável `STRIPE_WEBHOOK_SECRET` do seu `.env`
- O backend deve estar rodando na porta especificada (ex: `4000`)
- Mantenha este terminal aberto enquanto testa

#### 2. Disparar Eventos de Teste

**Eventos mais usados:**

```bash
# Checkout concluído (pagamento bem-sucedido)
stripe trigger checkout.session.completed

# Assinatura criada
stripe trigger customer.subscription.created

# Assinatura atualizada (cancelamento, mudança de plano, etc.)
stripe trigger customer.subscription.updated

# Assinatura cancelada/deletada
stripe trigger customer.subscription.deleted

# Pagamento bem-sucedido (renovação)
stripe trigger invoice.payment_succeeded

# Pagamento falhado
stripe trigger invoice.payment_failed
```

**Com dados customizados:**
```bash
# Disparar evento com dados específicos
stripe trigger checkout.session.completed --override checkout_session:customer=cus_xxxxx
```

#### 3. Ver Eventos em Tempo Real

**Ver todos os eventos:**
```bash
stripe listen
```

**Ver eventos específicos:**
```bash
stripe listen --events checkout.session.completed,customer.subscription.updated
```

**Ver eventos com detalhes:**
```bash
stripe listen --print-json
```

#### 4. Reenviar Evento Específico

**Reenviar evento por ID:**
```bash
stripe events resend evt_xxxxxxxxxxxxx
```

**Útil quando:**
- Um webhook falhou e você quer testar novamente
- Você quer reprocessar um evento específico

#### 5. Listar Eventos Recentes

**Ver últimos eventos:**
```bash
stripe events list
```

**Ver eventos de um tipo específico:**
```bash
stripe events list --type checkout.session.completed
```

**Ver eventos com limite:**
```bash
stripe events list --limit 10
```

### Fluxo de Teste Completo

**1. Iniciar o backend:**
```bash
cd backend
npm run dev
# Backend rodando em http://localhost:4000
```

**2. Em outro terminal, iniciar o Stripe CLI:**
```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

**3. Copiar o webhook secret:**
- Copie o `whsec_xxxxx` exibido
- Adicione ao `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
- Reinicie o backend se necessário

**4. Disparar evento de teste:**
```bash
# Em um terceiro terminal
stripe trigger checkout.session.completed
```

**5. Verificar logs:**
- No terminal do backend, você deve ver logs do webhook sendo processado
- No terminal do Stripe CLI, você verá a requisição sendo encaminhada

### Modo de Teste vs Produção

**Test Mode (Recomendado para desenvolvimento):**
```bash
# Usar chaves de teste
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

**Live Mode (Cuidado!):**
```bash
# Usar chaves de produção
stripe listen --forward-to localhost:4000/api/stripe/webhook --api-key sk_live_xxxxx
```

**⚠️ Atenção:** Sempre use **test mode** durante desenvolvimento. Eventos em **live mode** podem criar assinaturas reais e cobranças reais!

### Comandos Úteis para Debugging

**Ver detalhes de um evento:**
```bash
stripe events retrieve evt_xxxxxxxxxxxxx
```

**Ver detalhes de uma assinatura:**
```bash
stripe subscriptions retrieve sub_xxxxxxxxxxxxx
```

**Ver detalhes de um customer:**
```bash
stripe customers retrieve cus_xxxxxxxxxxxxx
```

**Ver detalhes de um checkout session:**
```bash
stripe checkout sessions retrieve cs_test_xxxxxxxxxxxxx
```

**Listar assinaturas:**
```bash
stripe subscriptions list
```

**Listar customers:**
```bash
stripe customers list
```

### Troubleshooting do Stripe CLI

**Problema: "command not found"**
- Verificar se Stripe CLI está instalado: `stripe --version`
- Verificar se está no PATH do sistema

**Problema: "Unable to authenticate"**
- Executar `stripe login` novamente
- Verificar se está usando a conta correta (test vs live)

**Problema: "Connection refused" ao fazer forward**
- Verificar se o backend está rodando
- Verificar se a porta está correta (ex: `4000`)
- Verificar se a URL do webhook está correta (`/api/stripe/webhook`)

**Problema: Webhook não chega no backend**
- Verificar se `STRIPE_WEBHOOK_SECRET` está correto (deve ser o `whsec_xxxxx` do `stripe listen`)
- Verificar logs do backend para erros
- Verificar se o endpoint está acessível

**Problema: "Webhook payload must be provided as a string or a Buffer"**
- Verificar ordem dos middlewares no Express
- O middleware `express.json()` não deve processar a rota `/api/stripe/webhook`
- Verificar se `express.raw()` está sendo usado para o webhook

### Recursos Adicionais

- **Documentação oficial**: https://stripe.com/docs/stripe-cli
- **Comandos disponíveis**: `stripe --help`
- **Ajuda de um comando**: `stripe <comando> --help`
- **Exemplos**: https://stripe.com/docs/stripe-cli/webhooks

---

## 🔄 Sincronização de Assinatura

### Sincronização Automática

**Quando acontece:**
- Ao acessar a aba "Plano" nas configurações
- Apenas uma vez por sessão (evita múltiplas requisições)

**O que faz:**
1. Busca assinaturas do cliente no Stripe
2. Seleciona a assinatura mais recente e ativa
3. Atualiza dados no banco de dados:
   - Tipo de plano
   - Status da assinatura
   - Datas de início/término

### Sincronização Manual

**Botão "Sincronizar Assinatura":**
- Disponível na aba "Plano" das configurações
- Útil quando há discrepâncias entre Stripe e banco de dados
- **Cache**: Não faz nova requisição se sincronizou há menos de 5 minutos

**Quando usar:**
- Após cancelar assinatura no Stripe
- Após alterar plano manualmente no Stripe
- Quando dados parecem desatualizados

---

## ❌ Cancelamento de Assinatura

### Como Funciona

**Opção 1: Via Portal do Stripe**
1. Usuário clica em "Gerenciar Assinatura"
2. É redirecionado para portal do Stripe
3. Cancela assinatura no portal
4. Stripe envia webhook `customer.subscription.updated`
5. Sistema marca assinatura como cancelada
6. **Importante**: Plano pago é mantido até o fim do período pago

**Opção 2: Downgrade para Plano Gratuito**
1. Usuário seleciona "Plano 100 Membros" no modal de trocar plano
2. Sistema redireciona para portal do Stripe para cancelar
3. Após cancelamento, plano gratuito é atribuído automaticamente

### Comportamento Após Cancelamento

**Durante período pago:**
- `subscription_status`: `canceled`
- `plan_type`: Mantém plano pago (ex: `200`, `500`, `800`)
- `subscription_end_date`: Data de término do período pago
- Usuário continua com acesso ao plano pago até a data

**Após expiração:**
- `plan_type`: Automaticamente alterado para `100` (gratuito)
- `subscription_status`: `canceled` ou `null`
- Limite reduzido para 100 membros

### Reativação

**Quando assinatura está expirada:**
- Sistema detecta `subscription_status: 'canceled'` e `subscription_end_date` no passado
- Mostra botão "Reativar Assinatura" na aba "Plano"
- Redireciona para checkout para criar nova assinatura

---

## 🔄 Troca de Plano (Upgrade/Downgrade)

### Upgrade (Plano Maior)

**Exemplo:** De 200 para 500 membros

**O que acontece:**
1. Sistema valida que não há mais membros que o novo limite
2. Atualiza assinatura no Stripe
3. Valor é ajustado proporcionalmente
4. Plano é atualizado imediatamente
5. Limite de membros aumenta

### Downgrade (Plano Menor)

**Exemplo:** De 500 para 200 membros

**Validação obrigatória:**
- Sistema verifica quantidade atual de membros
- Se há mais membros que o novo limite, **bloqueia downgrade**
- Mostra mensagem: "Você possui X membros, mas o plano Y permite apenas Z membros. Remova N membro(s) antes de fazer o downgrade."

**Se válido:**
1. Atualiza assinatura no Stripe
2. Valor é ajustado proporcionalmente
3. Plano é atualizado imediatamente
4. Limite de membros diminui

---

## 🛡️ Validação de Limites

### Limite de Membros

**Como funciona:**
- Cada plano tem um limite máximo de membros ativos
- Sistema verifica limite ao:
  - Adicionar novo membro
  - Importar membros via CSV
  - Fazer downgrade de plano

**Comportamento:**
- Se limite atingido: Bloqueia adição de novos membros
- Mostra mensagem clara ao usuário
- Sugere upgrade de plano

### Limite no Import CSV

**Validação:**
- Antes de importar, sistema verifica se quantidade no CSV ultrapassa limite
- Se ultrapassar: Mostra erro e bloqueia importação
- Mensagem: "Limite de membros atingido. A quantidade de membros no arquivo CSV ultrapassa o limite do seu plano atual."

---

## 🔧 Manutenção e Configuração

### Variáveis de Ambiente

Todas as configurações do Stripe são feitas via variáveis de ambiente. Consulte `docs/ENVIRONMENT-VARIABLES.md` para detalhes completos.

**Variáveis obrigatórias:**
- `STRIPE_SECRET_KEY`: Chave secreta da API
- `STRIPE_WEBHOOK_SECRET`: Secret para validar webhooks
- `STRIPE_PRICE_ID_M200`: ID do preço do plano 200
- `STRIPE_PRICE_ID_M500`: ID do preço do plano 500
- `STRIPE_PRICE_ID_M800`: ID do preço do plano 800

### Health Check

**Endpoint:** `GET /api/health/stripe`

**O que verifica:**
- Se todas as variáveis obrigatórias estão configuradas (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs)
- Conectividade com a API Stripe (`stripe.balance.retrieve`)
- Timestamp do último webhook processado (`processed_webhook_events`)

**Proteção (opcional):** defina `HEALTH_CHECK_TOKEN` e envie via header `x-health-token` ou query `?token=`.

**Uso:**
```bash
curl http://localhost:4000/api/health/stripe
```

**Resposta esperada (saudável):**
```json
{
  "status": "ok",
  "stripe_configured": true,
  "stripe_reachable": true,
  "last_webhook_processed_at": "2026-06-05T12:00:00.000Z",
  "timestamp": "2026-06-05T12:00:00.000Z"
}
```

**Resposta degradada (env OK, Stripe inacessível):** HTTP 503 com `"status": "degraded"` e `"stripe_reachable": false`.

### Limpeza Automática

**Cron Job:** Executa diariamente às 2h da manhã

**O que faz:**
- Remove assinaturas pendentes expiradas (mais de 7 dias)
- Limpa registros antigos da tabela `pending_subscriptions`

**Desabilitar:**
- Configure `ENABLE_CRON_JOBS=false` nas variáveis de ambiente

---

## 🐛 Troubleshooting Comum

### Problema: Webhook não está sendo recebido

**Sintomas:**
- Pagamento feito mas assinatura não aparece no sistema
- Dados desatualizados

**Verificações:**
1. ✅ Webhook configurado no Stripe Dashboard?
2. ✅ URL do webhook está correta? (`https://seu-dominio.com/api/stripe/webhook`)
3. ✅ `STRIPE_WEBHOOK_SECRET` está correto?
4. ✅ Eventos corretos selecionados no webhook?
5. ✅ Servidor está acessível publicamente?

**Solução:**
- Verificar logs do servidor para erros
- Testar webhook manualmente no Stripe Dashboard (botão "Send test webhook")
- Usar sincronização manual como workaround temporário

---

### Problema: Assinatura não sincroniza

**Sintomas:**
- Dados diferentes entre Stripe e sistema
- Botão "Sincronizar" não atualiza dados

**Verificações:**
1. ✅ `stripe_customer_id` existe na tabela `churches`?
2. ✅ Customer existe no Stripe?
3. ✅ Assinatura existe no Stripe?

**Solução:**
- Verificar logs do servidor
- Verificar se customer_id está correto no banco
- Tentar forçar sincronização (limpar cache do navegador)

---

### Problema: Downgrade bloqueado incorretamente

**Sintomas:**
- Usuário tem menos membros que o limite mas não consegue fazer downgrade

**Verificações:**
1. ✅ Quantidade de membros ativos está correta?
2. ✅ Membros inativos estão sendo contados?

**Solução:**
- Verificar contagem de membros no banco
- Verificar se há membros duplicados
- Verificar se filtro de "ativos" está correto

---

### Problema: Plano não muda após pagamento

**Sintomas:**
- Pagamento feito mas plano continua o mesmo

**Verificações:**
1. ✅ Webhook foi recebido? (verificar logs)
2. ✅ Webhook foi processado com sucesso?
3. ✅ Dados foram atualizados no banco?

**Solução:**
- Verificar logs do servidor
- Verificar tabela `processed_webhook_events` para ver se evento foi processado
- Usar sincronização manual
- Verificar página de sucesso (pode estar aguardando confirmação)

---

### Problema: Múltiplas assinaturas para mesmo cliente

**Sintomas:**
- Cliente tem várias assinaturas no Stripe
- Sistema não sabe qual usar

**Comportamento do sistema:**
- Prioriza assinaturas ativas (`active`, `trialing`, `past_due`)
- Seleciona a mais recente (por data de criação)
- Loga aviso quando múltiplas assinaturas ativas encontradas

**Solução:**
- Cancelar assinaturas antigas no Stripe Dashboard
- Sincronizar novamente
- Sistema usará automaticamente a assinatura correta

---

## 📊 Tabelas do Banco de Dados

### `churches`

Campos relacionados ao Stripe:
- `stripe_customer_id`: ID do cliente no Stripe
- `stripe_subscription_id`: ID da assinatura no Stripe
- `plan_type`: Tipo de plano (`100`, `200`, `500`, `800`, `custom`)
- `subscription_status`: Status da assinatura (`active`, `canceled`, `past_due`, etc.)
- `subscription_start_date`: Data de início da assinatura
- `subscription_end_date`: Data de término (quando cancelada)

### `processed_webhook_events`

Rastreia eventos já processados (idempotência):
- `stripe_event_id`: ID único do evento do Stripe
- `event_type`: Tipo do evento (ex: `checkout.session.completed`)
- `processed_at`: Quando foi processado

### `pending_subscriptions`

Assinaturas pendentes (quando checkout feito antes de criar conta):
- `email`: Email do cliente
- `stripe_customer_id`: ID do customer no Stripe
- `stripe_subscription_id`: ID da assinatura
- `plan_type`: Tipo de plano
- `expires_at`: Data de expiração (7 dias)

---

## 🔐 Segurança

### Validações Implementadas

1. **Assinatura de Webhooks**: Cada webhook tem assinatura criptográfica validada (`constructEvent`)
2. **Idempotência**: Claim atômico + deduplicação por `stripe_event_id`
3. **Ordenação**: Campo `last_stripe_event_created` ignora eventos Stripe atrasados
4. **Validação de Limites**: Downgrade bloqueado se ultrapassar limite

### Boas Práticas

- ✅ Nunca exponha `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET`
- ✅ Use chaves diferentes para desenvolvimento e produção
- ✅ Monitore logs de webhooks para detectar problemas
- ✅ Rotacione chaves periodicamente
- ✅ Mantenha webhooks configurados corretamente

---

## 📞 Suporte

### Logs Importantes

**Backend:**
- Logs estruturados em formato JSON
- Incluem: `timestamp`, `level`, `message`, `stripeEventId`, etc.
- Níveis: `DEBUG`, `INFO`, `WARN`, `ERROR`

**Onde verificar:**
- Logs do servidor backend
- Stripe Dashboard → Developers → Events
- Stripe Dashboard → Developers → Logs

### Recursos Úteis

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Documentação Stripe**: https://stripe.com/docs
- **Stripe CLI**: Para testar webhooks localmente
- **Health Check**: `/api/health/stripe` para verificar status

---

## 📝 Checklist de Manutenção

### Diário
- [ ] Verificar logs de erros relacionados ao Stripe
- [ ] Verificar webhooks recebidos no Stripe Dashboard

### Semanal
- [ ] Verificar assinaturas pendentes expiradas
- [ ] Revisar logs de sincronização
- [ ] Verificar health check

### Mensal
- [ ] Revisar métricas de conversão (checkout → assinatura)
- [ ] Verificar taxa de falhas de pagamento
- [ ] Revisar cancelamentos e motivos

### Quando necessário
- [ ] Atualizar preços dos planos (se houver mudança)
- [ ] Adicionar novos planos
- [ ] Rotacionar chaves do Stripe
- [ ] Atualizar documentação

---

**Última atualização:** Janeiro 2024

