# Configuração das Variáveis de Ambiente

## Como configurar o arquivo .env

### 1. Criar o arquivo .env

No diretório `backend/`, crie um arquivo chamado `.env` (sem extensão):

```bash
# No terminal, dentro da pasta backend:
touch .env
# ou
echo. > .env
```

### 2. Configurar as variáveis

Copie o conteúdo do arquivo `env.example` para o arquivo `.env` e substitua os valores pelos dados reais do seu projeto Supabase:

```env
# Configurações do Supabase
SUPABASE_URL=https://seu-projeto-id.supabase.co
SUPABASE_KEY=sua-chave-publica-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico-aqui
```

### 3. Onde encontrar os valores no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Você encontrará:
   - **URL**: `Project URL`
   - **anon public**: `Project API keys` > `anon` `public`
   - **service_role**: `Project API keys` > `service_role` `secret`

### 4. Exemplo de configuração real

```env
# Configurações do Supabase
# Copie este arquivo para .env e substitua pelos valores reais do seu projeto Supabase

# URL do seu projeto Supabase (encontrada em Settings > API)
SUPABASE_URL=https://seu-projeto-id.supabase.co

# Chave pública do Supabase (anon key - encontrada em Settings > API)
SUPABASE_KEY=sua-chave-publica-aqui

# Chave de serviço do Supabase (service_role key - encontrada em Settings > API)
# Esta chave tem privilégios administrativos, mantenha-a segura!
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico-aqui
```

### ⚠️ Importante

- **NUNCA** commite o arquivo `.env` para o repositório Git
- O arquivo `.env` já está no `.gitignore` por segurança
- Mantenha suas chaves secretas seguras
- A chave `service_role` tem privilégios administrativos - use com cuidado

### 5. Verificar se está funcionando

Após configurar o `.env`, reinicie o servidor backend:

```bash
npm run dev
# ou
npm start
```

Se houver algum erro relacionado às variáveis de ambiente, verifique se:
- O arquivo `.env` está na pasta `backend/`
- As variáveis estão com os nomes corretos
- Os valores não contêm espaços extras
- As URLs e chaves estão completas
