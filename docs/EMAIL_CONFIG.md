# Configuração de Email - Resend

Este documento descreve como configurar o serviço de email do sistema Flock usando Resend.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env` do backend:

```env
# Resend API (envio de emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@flockapp.com.br
RESEND_FROM_NAME=Flock App

# Email para notificações administrativas e recebimento de respostas
ADMIN_EMAIL=contato@flockapp.com.br
```

## Configuração

### RESEND_API_KEY
Chave de API do Resend. Obtenha em: https://resend.com/api-keys

### RESEND_FROM_EMAIL
Email remetente. Deve ser um domínio verificado no Resend.
**Importante:** Use um subdomínio como `noreply@` ou `notificacoes@` para envios automáticos.

### RESEND_FROM_NAME
Nome que aparecerá como remetente nos emails.

### ADMIN_EMAIL
Email que receberá:
- Notificações administrativas (novos registros, etc.)
- Respostas dos clientes (via Reply-To)

**Nota:** Este email pode continuar usando Umbler para recebimento, apenas o envio migra para Resend.

## Configuração no Resend

### Passo 1: Criar Conta
1. Acesse https://resend.com
2. Crie uma conta (plano gratuito disponível: 3.000 emails/mês)

### Passo 2: Verificar Domínio
1. No dashboard do Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Adicione seu domínio (ex: `flockapp.com.br`)
4. Siga as instruções para adicionar os registros DNS:
   - **SPF:** `v=spf1 include:resend.com ~all`
   - **DKIM:** Registros fornecidos pelo Resend (3 registros)
   - **DMARC:** (opcional, mas recomendado)
5. Aguarde a verificação (pode levar até 48h, geralmente < 1h)

### Passo 3: Criar API Key
1. Vá em **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "Flock Production")
4. Selecione permissões: "Sending access"
5. Clique em **Create**
6. **Copie a chave imediatamente** (ela só aparece uma vez)

### Passo 4: Configurar Email Remetente
- Use um subdomínio para envios automáticos: `noreply@flockapp.com.br` ou `notificacoes@flockapp.com.br`
- Configure `RESEND_FROM_EMAIL` com este email
- O domínio deve estar verificado no Resend

### Passo 5: Configurar no Railway
1. No projeto Railway, vá em **Variables**
2. Adicione as variáveis:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@flockapp.com.br
   RESEND_FROM_NAME=Flock App
   ADMIN_EMAIL=contato@flockapp.com.br
   ```
3. Salve e faça deploy

## Testando a Configuração

O sistema verificará automaticamente se o email está configurado. Se `RESEND_API_KEY` não estiver definida, os emails não serão enviados mas o sistema continuará funcionando normalmente (apenas logará um aviso).

## Emails Enviados

### Registro de Usuário
- **Para o usuário**: Email de boas-vindas com informações sobre o sistema
- **Para administradores**: Notificação sobre novo registro com dados da igreja

### Stripe/Pagamentos
- Pagamento bem-sucedido
- Pagamento falhado
- Assinatura cancelada
- Renovação bem-sucedida
- Mudança de plano
- Assinatura reativada
- Aviso de expiração de assinatura

### Conta
- Senha alterada
- Email alterado
- Conta deletada

### Outros
- Confirmação de waitlist
- Aviso de limite de membros

## Recebimento de Respostas

As respostas dos clientes serão direcionadas para `ADMIN_EMAIL` (via Reply-To), que pode continuar usando Umbler para recebimento. Isso permite:
- ✅ Envio rápido e confiável via Resend
- ✅ Recebimento organizado via Umbler (caixa de entrada tradicional)

## Migração de SMTP

Esta migração remove completamente a dependência de SMTP:
- ✅ Removido `nodemailer`
- ✅ Removido `@types/nodemailer`
- ✅ Todas as conexões agora via HTTP (Resend API)
- ✅ Compatível com Railway e outras plataformas cloud
- ✅ Sem problemas de timeout ou bloqueio de portas

## Troubleshooting

### Erro: "Unauthorized" ou "API key"
- Verifique se `RESEND_API_KEY` está correta
- Certifique-se de que a API key tem permissão de "Sending access"

### Erro: "Domain not verified"
- Verifique se o domínio está verificado no Resend
- Confirme que os registros DNS foram adicionados corretamente
- Aguarde a verificação (pode levar até 48h)

### Erro: "Rate limit exceeded"
- Você excedeu o limite do seu plano
- Verifique seu uso no dashboard do Resend
- Considere fazer upgrade do plano se necessário

### Emails não estão chegando
- Verifique os logs do Railway para erros
- Confirme que `RESEND_FROM_EMAIL` usa um domínio verificado
- Verifique a pasta de spam do destinatário
- Use o dashboard do Resend para ver o status dos envios
