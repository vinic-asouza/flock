-- Script para adicionar a coluna 'plan' na tabela waitlist
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna plan (primeiro como nullable para permitir atualização de registros existentes)
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS plan VARCHAR(20);

-- Atualizar registros existentes com valor padrão '200'
UPDATE waitlist 
SET plan = '200' 
WHERE plan IS NULL;

-- Agora tornar a coluna NOT NULL
ALTER TABLE waitlist 
ALTER COLUMN plan SET NOT NULL;

-- Adicionar constraint para garantir valores válidos
ALTER TABLE waitlist 
DROP CONSTRAINT IF EXISTS check_plan_valid;

ALTER TABLE waitlist 
ADD CONSTRAINT check_plan_valid 
CHECK (plan IN ('200', '500', '800', 'personalizado'));

-- Criar índice para busca por plano (opcional, mas ajuda na performance)
CREATE INDEX IF NOT EXISTS idx_waitlist_plan ON waitlist(plan);

-- Comentário para documentação
COMMENT ON COLUMN waitlist.plan IS 'Plano de interesse do cliente: 200, 500, 800 ou personalizado';

