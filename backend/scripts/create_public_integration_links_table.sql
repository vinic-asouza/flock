-- Script para criar tabela de links públicos de integração
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela public_integration_links
CREATE TABLE IF NOT EXISTS public_integration_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT NULL, -- NULL = ilimitado
  current_uses INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notes TEXT, -- Para identificar o propósito do link
  
  -- Constraints
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT valid_current_uses CHECK (current_uses >= 0),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_public_integration_links_church_id ON public_integration_links(church_id);
CREATE INDEX IF NOT EXISTS idx_public_integration_links_token ON public_integration_links(token);
CREATE INDEX IF NOT EXISTS idx_public_integration_links_expires_at ON public_integration_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_integration_links_is_active ON public_integration_links(is_active);

-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_public_integration_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_public_integration_links_updated_at ON public_integration_links;
CREATE TRIGGER trigger_update_public_integration_links_updated_at
  BEFORE UPDATE ON public_integration_links
  FOR EACH ROW
  EXECUTE FUNCTION update_public_integration_links_updated_at();

-- 5. Adicionar comentários para documentação
COMMENT ON TABLE public_integration_links IS 'Links públicos temporários para auto-cadastro de integrantes';
COMMENT ON COLUMN public_integration_links.token IS 'Token único e seguro para acesso público ao formulário de integração';
COMMENT ON COLUMN public_integration_links.expires_at IS 'Data e hora de expiração do link';
COMMENT ON COLUMN public_integration_links.max_uses IS 'Número máximo de usos permitidos (NULL = ilimitado)';
COMMENT ON COLUMN public_integration_links.current_uses IS 'Número atual de cadastros realizados através deste link';
COMMENT ON COLUMN public_integration_links.is_active IS 'Indica se o link está ativo (pode ser desativado manualmente)';
COMMENT ON COLUMN public_integration_links.notes IS 'Notas ou descrição do propósito do link';

-- 6. Verificar a estrutura criada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'public_integration_links'
ORDER BY ordinal_position;

