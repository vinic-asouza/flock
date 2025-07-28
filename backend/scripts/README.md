# Scripts do Banco de Dados

Este diretório contém scripts SQL para modificar a estrutura do banco de dados no Supabase.

## Script: add_church_contact_fields.sql

### Descrição
Adiciona campos de contato da igreja (`email_church` e `phone_church`) na tabela `churches`.

### Como Executar

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `add_church_contact_fields.sql`
6. Clique em **Run** para executar o script

### Campos Adicionados

- `email_church` (VARCHAR(255), opcional): Email de contato da igreja
- `phone_church` (VARCHAR(20), opcional): Telefone de contato da igreja

### Verificação

Após executar o script, você pode verificar se os campos foram adicionados corretamente executando:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'churches' 
AND column_name IN ('email_church', 'phone_church')
ORDER BY column_name;
```

### Observações

- O campo `phone` do usuário já existe por padrão no Supabase Auth
- Os novos campos são opcionais e podem ser `NULL`
- Índices foram criados para melhor performance em consultas 