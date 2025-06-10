import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { createRoleSchema, updateRoleSchema } from '../validators/roleValidator';
import { AuthRequest } from '../types';

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Dados recebidos:', req.body);
    
    const { error: validationError } = createRoleSchema.validate(req.body);
    if (validationError) {
      console.log('Erro de validação:', validationError);
      return res.status(400).json({ error: validationError.details[0].message });
    }

    const { name, description } = req.body;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    console.log('Dados da igreja:', church);
    console.log('Erro ao buscar igreja:', churchError);

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Verificar se já existe um cargo com o mesmo nome na igreja
    const { data: existingRole, error: existingRoleError } = await supabase
      .from('roles')
      .select('id')
      .eq('church_id', church.id)
      .eq('name', name)
      .single();

    console.log('Cargo existente:', existingRole);
    console.log('Erro ao verificar cargo existente:', existingRoleError);

    if (existingRole) {
      return res.status(400).json({ error: 'Já existe um cargo com este nome' });
    }

    // Criar novo cargo
    const { data: role, error: createError } = await supabase
      .from('roles')
      .insert([
        {
          church_id: church.id,
          name,
          description: description || null // Garantir que description seja null se vazio
        }
      ])
      .select()
      .single();

    console.log('Cargo criado:', role);
    console.log('Erro ao criar cargo:', createError);

    if (createError) {
      return res.status(400).json({ 
        error: 'Erro ao criar cargo',
        details: createError.message
      });
    }

    return res.status(201).json(role);
  } catch (error) {
    console.error('Erro completo:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Buscar todos os cargos da igreja
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('church_id', church.id)
      .order('name');

    if (error) {
      return res.status(400).json({ error: 'Erro ao buscar cargos' });
    }

    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Buscar cargo específico
    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (error || !role) {
      return res.status(404).json({ error: 'Cargo não encontrado' });
    }

    return res.json(role);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError } = updateRoleSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }

    const { name, description } = req.body;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Se o nome foi fornecido, verificar se já existe outro cargo com o mesmo nome
    if (name) {
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('church_id', church.id)
        .eq('name', name)
        .neq('id', id)
        .single();

      if (existingRole) {
        return res.status(400).json({ error: 'Já existe um cargo com este nome' });
      }
    }

    // Atualizar cargo
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        name,
        description,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (error || !role) {
      return res.status(404).json({ error: 'Cargo não encontrado' });
    }

    return res.json(role);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Verificar se existem membros usando este cargo
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .eq('role_id', id)
      .limit(1);

    if (members && members.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um cargo que está sendo usado por membros' });
    }

    // Deletar cargo
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id);

    if (error) {
      return res.status(400).json({ error: 'Erro ao deletar cargo' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 