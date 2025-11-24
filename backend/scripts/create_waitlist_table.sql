-- Script para criar a tabela de lista de espera (waitlist)
-- Execute este script no Supabase SQL Editor

-- Criar tabela waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  church_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca por email (já é único, mas ajuda na performance)
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Criar índice para busca por data de criação
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_waitlist_updated_at ON waitlist;
CREATE TRIGGER trigger_update_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- Comentários para documentação
COMMENT ON TABLE waitlist IS 'Tabela para armazenar cadastros da lista de espera da landing page';
COMMENT ON COLUMN waitlist.id IS 'ID único do cadastro';
COMMENT ON COLUMN waitlist.name IS 'Nome completo da pessoa';
COMMENT ON COLUMN waitlist.email IS 'Email único da pessoa';
COMMENT ON COLUMN waitlist.phone IS 'Telefone de contato';
COMMENT ON COLUMN waitlist.church_name IS 'Nome da igreja';
COMMENT ON COLUMN waitlist.city IS 'Cidade da igreja';
COMMENT ON COLUMN waitlist.state IS 'Estado (UF) da igreja';
COMMENT ON COLUMN waitlist.created_at IS 'Data de criação do cadastro';
COMMENT ON COLUMN waitlist.updated_at IS 'Data da última atualização';

