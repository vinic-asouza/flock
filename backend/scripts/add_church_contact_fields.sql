-- Script para adicionar campos de contato da igreja e telefone do usuário
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar campos de contato da igreja na tabela churches
ALTER TABLE churches 
ADD COLUMN IF NOT EXISTS email_church VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_church VARCHAR(20);

-- 2. Adicionar comentários para documentação
COMMENT ON COLUMN churches.email_church IS 'Email de contato da igreja (opcional)';
COMMENT ON COLUMN churches.phone_church IS 'Telefone de contato da igreja (opcional)';

-- 3. Verificar se a coluna phone já existe na tabela auth.users (Supabase Auth)
-- Nota: O campo phone já existe por padrão no Supabase Auth, então não precisamos criá-lo

-- 4. Criar índices para melhor performance (opcional)
CREATE INDEX IF NOT EXISTS idx_churches_email_church ON churches(email_church);
CREATE INDEX IF NOT EXISTS idx_churches_phone_church ON churches(phone_church);

-- 5. Verificar a estrutura atualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'churches' 
AND column_name IN ('email_church', 'phone_church')
ORDER BY column_name; 