-- Script para atualizar estrutura da tabela members
-- Execute este script no Supabase SQL Editor

-- 1. Remover obrigatoriedade dos campos: phone, document, neighborhood, cep
ALTER TABLE members 
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN document DROP NOT NULL,
  ALTER COLUMN neighborhood DROP NOT NULL,
  ALTER COLUMN cep DROP NOT NULL;

-- 2. Adicionar campos: father_name, mother_name e children (JSONB)
ALTER TABLE members 
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS children JSONB DEFAULT '[]'::jsonb;

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN members.father_name IS 'Nome do pai do membro (opcional)';
COMMENT ON COLUMN members.mother_name IS 'Nome da mãe do membro (opcional)';
COMMENT ON COLUMN members.children IS 'Array JSON com os filhos do membro. Formato: [{"name": "Nome do filho", "birth": "YYYY-MM-DD"}]';

-- 4. Criar índice GIN para melhor performance em consultas JSONB (opcional)
CREATE INDEX IF NOT EXISTS idx_members_children ON members USING GIN (children);

-- 5. Verificar a estrutura atualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name IN ('phone', 'document', 'neighborhood', 'cep', 'father_name', 'mother_name', 'children')
ORDER BY column_name;

-- 6. Verificar se o campo children foi adicionado
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'children';

