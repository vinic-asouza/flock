# 🔄 Alternativas de Deploy no Railway - Resolvendo 502 Bad Gateway

Este documento lista alternativas para resolver o erro 502 Bad Gateway no Railway.

## 🔍 Diagnóstico

O erro 502 geralmente indica que:
- O Railway não consegue se comunicar com o container
- A aplicação não está escutando na porta correta
- A aplicação não está escutando em `0.0.0.0`

## ✅ Alternativa 1: Usar Script de Start Customizado

### Passo 1: Criar script de start

Crie um arquivo `frontend/start.sh`:

```bash
#!/bin/sh
export HOSTNAME="0.0.0.0"
PORT=${PORT:-3000}
exec next start -H "$HOSTNAME" -p "$PORT"
```

### Passo 2: Modificar Dockerfile.simple

```dockerfile
# No final do Dockerfile.simple, substitua:
CMD ["npm", "start"]

# Por:
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x start.sh
CMD ["./start.sh"]
```

## ✅ Alternativa 2: Deploy Sem Dockerfile (Recomendado)

Esta é a solução mais simples e geralmente funciona melhor no Railway.

### Passo 1: Remover Dockerfile do Railway

1. No Railway, vá em **Settings** > **Build & Deploy**
2. **Delete** ou **desabilite** o Dockerfile
3. Deixe **Dockerfile Path** vazio

### Passo 2: Configurar Build Commands

No Railway, configure:

- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:railway` (ou `npm start -H 0.0.0.0 -p $PORT`)
- **Porta** (ao configurar domínio): `3000`

⚠️ **Nota**: O script `start:railway` já foi adicionado ao `package.json` e força o Next.js a escutar em `0.0.0.0` e usar a porta do Railway.

### Passo 3: Variáveis de Ambiente

Configure as variáveis:
- `NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api`
- `NODE_ENV=production`

## ✅ Alternativa 3: Modificar package.json

Adicione um script customizado no `package.json`:

```json
{
  "scripts": {
    "start:railway": "next start -H 0.0.0.0 -p ${PORT:-3000}"
  }
}
```

E no Railway, use:
- **Start Command**: `npm run start:railway`

## ✅ Alternativa 4: Usar Render ou Outra Plataforma

Se o Railway continuar dando problemas, considere:

### Render

1. Crie conta em [render.com](https://render.com)
2. Crie um **Web Service**
3. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && npm start`
   - **Porta**: `3000`

### Fly.io

1. Crie conta em [fly.io](https://fly.io)
2. Use `flyctl launch`
3. Configure o `fly.toml`:

```toml
[env]
  PORT = "3000"
  HOST = "0.0.0.0"
```

## ✅ Alternativa 5: Verificar Configuração do Railway

### Checklist

- [ ] **Porta configurada corretamente**:
  - Settings > Networking > Public Domain
  - Porta deve ser `3000`

- [ ] **Variável PORT não está definida manualmente**:
  - Settings > Variables
  - Remova `PORT` se existir (Railway define automaticamente)

- [ ] **Healthcheck configurado**:
  - Railway faz healthcheck automático
  - Certifique-se de que a aplicação responde em `/`

- [ ] **Logs não mostram erros**:
  - Verifique os logs completos
  - Procure por erros de conexão

## 🔧 Solução Rápida: Teste Local

Teste localmente se o problema é com o Railway ou com a aplicação:

```bash
cd frontend
npm run build
PORT=8080 npm start -H 0.0.0.0 -p 8080
```

Acesse `http://localhost:8080`. Se funcionar, o problema é configuração do Railway.

## 📝 Recomendação Final

**Para resolver rapidamente, use a Alternativa 2 (Deploy Sem Dockerfile)**:

1. É mais simples
2. Funciona melhor com Next.js no Railway
3. Menos problemas de configuração
4. Mais fácil de debugar

## 🆘 Ainda com Problemas?

Se nenhuma alternativa funcionar:

1. **Verifique os logs completos** do Railway
2. **Teste localmente** com Docker
3. **Considere usar Render** (geralmente funciona melhor com Next.js)
4. **Entre em contato com suporte do Railway**

---

**Última atualização**: Baseado em problemas comuns de deploy Next.js no Railway

