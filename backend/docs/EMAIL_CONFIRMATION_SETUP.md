# 📧 Configuração de Confirmação de Email

## 📋 Visão Geral

Este documento explica como configurar a confirmação de email no Supabase para funcionar corretamente com o sistema de alteração de email.

## 🔧 Configuração no Supabase Dashboard

### 1. Configurar URL de Redirecionamento

1. Acesse o **Supabase Dashboard**
2. Vá em **Authentication** → **Settings**
3. Na seção **URL Configuration**, configure:

```
Site URL: http://localhost:3000 (desenvolvimento)
         https://seu-dominio.com (produção)

Redirect URLs:
- http://localhost:3000/auth/callback (desenvolvimento)
- https://seu-dominio.com/auth/callback (produção)
```

### 2. Configurar Email Templates

1. Vá em **Authentication** → **Email Templates**
2. Configure o template **Confirm signup**:

```html
<h2>Confirme seu novo email</h2>
<p>Clique no link abaixo para confirmar sua alteração de email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Email</a></p>
<p>Se você não solicitou esta alteração, ignore este email.</p>
```

### 3. Configurar SMTP (Opcional)

Para emails mais confiáveis, configure um provedor SMTP:

1. Vá em **Authentication** → **Settings**
2. Na seção **SMTP Settings**, configure:
   - **Host**: smtp.gmail.com (exemplo)
   - **Port**: 587
   - **Username**: seu-email@gmail.com
   - **Password**: sua-senha-de-app
   - **Sender name**: Nome da sua aplicação

## 🚀 Como Funciona

### Fluxo de Confirmação:

1. **Usuário altera email** → Frontend chama `/api/account/email`
2. **Backend atualiza email** → Supabase envia email de confirmação
3. **Usuário clica no link** → Redireciona para `/auth/callback`
4. **Frontend processa tokens** → Chama `/api/auth/callback`
5. **Backend valida tokens** → Configura cookies de autenticação
6. **Usuário é redirecionado** → Para `/settings?tab=account`

### Arquivos Implementados:

- **Frontend**: `frontend/src/app/(auth)/callback/page.tsx`
- **Backend**: `backend/src/controllers/authCallbackController.ts`
- **Rota**: `backend/src/routes/authCallback.ts`

## 🔍 Troubleshooting

### Problema: "Token inválido"
- **Causa**: URL de redirecionamento não configurada no Supabase
- **Solução**: Adicionar `http://localhost:3000/auth/callback` nas Redirect URLs

### Problema: "Auth session missing!"
- **Causa**: Tokens não estão sendo processados corretamente
- **Solução**: Verificar se a rota `/api/auth/callback` está funcionando

### Problema: Email não chega
- **Causa**: Configuração SMTP ou limite de emails
- **Solução**: Configurar SMTP personalizado ou verificar spam

## 📝 Variáveis de Ambiente

```env
# Backend (.env)
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
PORT=4000
NODE_ENV=development

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## ⚠️ IMPORTANTE: Configuração Corrigida

**Problema identificado**: O backend estava configurado para redirecionar para `localhost:4000` em vez de `localhost:3000`.

**Solução aplicada**: 
- ✅ Alterado `APP_URL` para `FRONTEND_URL` no `authController.ts`
- ✅ URL de redirecionamento agora aponta para o frontend (porta 3000)

## ✅ Teste da Funcionalidade

1. **Alterar email** na seção de Contas
2. **Verificar email** na caixa de entrada
3. **Clicar no link** de confirmação
4. **Verificar redirecionamento** para a página de callback
5. **Confirmar login** automático no sistema

## 🎯 Próximos Passos

- [ ] Configurar URL de redirecionamento no Supabase
- [ ] Testar fluxo completo de confirmação
- [ ] Configurar SMTP para produção
- [ ] Implementar logs de confirmação de email
