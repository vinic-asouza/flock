# Configuração de Email

Este documento descreve como configurar o serviço de email do sistema Flock.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env` do backend:

```env
# Email SMTP (Umber/Cloudflare)
SMTP_HOST=smtp.umber.com.br
SMTP_PORT=587
SMTP_USER=contato@flockapp.com.br
SMTP_PASS=sua_senha_aqui
SMTP_FROM=contato@flockapp.com.br
SMTP_FROM_NAME=Flock App

# Email para notificações administrativas
ADMIN_EMAIL=contato@flockapp.com.br
```

## Configuração

### SMTP_HOST
Servidor SMTP fornecido pelo Umber. Exemplo: `smtp.umber.com.br` ou `mail.flockapp.com.br`

### SMTP_PORT
Porta SMTP:
- `587` para TLS (recomendado)
- `465` para SSL
- `25` para não criptografado (não recomendado)

### SMTP_USER
Email de autenticação SMTP (geralmente o mesmo que SMTP_FROM)

### SMTP_PASS
Senha do email ou senha de aplicativo gerada no Umber

### SMTP_FROM
Email remetente (deve ser o mesmo configurado no Umber)

### SMTP_FROM_NAME
Nome que aparecerá como remetente nos emails

### ADMIN_EMAIL
Email que receberá notificações administrativas (novos registros, etc.)

## Testando a Configuração

O sistema verificará automaticamente se o email está configurado. Se as variáveis não estiverem definidas, os emails não serão enviados mas o sistema continuará funcionando normalmente (apenas logará um aviso).

## Emails Enviados

### Registro de Usuário
- **Para o usuário**: Email de boas-vindas com informações sobre o sistema
- **Para administradores**: Notificação sobre novo registro com dados da igreja

## Próximos Passos

Após configurar as variáveis de ambiente, os emails serão enviados automaticamente quando:
- Um novo usuário se registra no sistema
- (Futuro) Cliente faz assinatura
- (Futuro) Pagamento é realizado
- (Futuro) Assinatura expira
