# 🚫 Como Desabilitar Dockerfile no Railway

Quando o Railway detecta um Dockerfile automaticamente, ele oculta as opções de Build Command e Start Command. Para usar comandos manuais, você precisa desabilitar o Dockerfile.

## 📋 Passo a Passo

### Método 1: Remover Dockerfile das Configurações

1. **Acesse o serviço do frontend** no Railway
2. Vá em **Settings** (ícone de engrenagem ⚙️)
3. Clique em **Build & Deploy**
4. Procure pela seção **"Docker"** ou **"Dockerfile"**
5. Você verá algo como:
   ```
   Dockerfile - Automatically Detected
   frontend/Dockerfile
   ```
6. **Clique no ícone de lixeira (🗑️)** ou **botão "Remove"** ao lado
7. **Salve as alterações** (botão "Save" ou "Update")

### Método 2: Alterar Caminho do Dockerfile

Se não houver botão de remover:

1. Vá em **Settings** > **Build & Deploy**
2. Encontre o campo **"Dockerfile Path"**
3. Altere para um caminho inválido, por exemplo:
   - `Dockerfile.disabled`
   - `.dockerfile.disabled`
   - `frontend/Dockerfile.disabled`
4. **Salve as alterações**

### Método 3: Renomear Dockerfile no Repositório

Se os métodos acima não funcionarem:

1. **Renomeie o Dockerfile** no seu repositório:
   ```bash
   git mv frontend/Dockerfile frontend/Dockerfile.backup
   git commit -m "Renomear Dockerfile para usar build manual"
   git push
   ```

2. O Railway não detectará mais o Dockerfile
3. As opções de Build Command aparecerão

## ✅ Após Desabilitar o Dockerfile

Depois de remover/desabilitar o Dockerfile, você verá:

- ✅ **Build Command** (campo de texto)
- ✅ **Start Command** (campo de texto)
- ✅ **Root Directory** (campo de texto)

Configure:

- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:railway`

## 🔄 Reativar Dockerfile (se necessário)

Se quiser voltar a usar Dockerfile:

1. Vá em **Settings** > **Build & Deploy**
2. Em **Dockerfile Path**, coloque: `frontend/Dockerfile`
3. Ou renomeie o arquivo de volta no repositório

## ⚠️ Nota Importante

- O Railway detecta Dockerfiles automaticamente quando você faz push
- Se você renomear o Dockerfile no código, faça commit e push
- O Railway pode levar alguns segundos para atualizar as configurações

---

**Última atualização**: Baseado na interface atual do Railway

