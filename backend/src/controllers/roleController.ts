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

    // Para cada cargo, buscar a contagem de membros ativos
    const rolesWithMemberCount = await Promise.all(
      roles.map(async (role) => {
        // Contar membros ativos com este cargo
        const { count: activeMembersCount, error: countError } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('church_id', church.id)
          .eq('role_id', role.id)
          .eq('active', true);

        if (countError) {
          console.error(`Erro ao contar membros para o cargo ${role.name}:`, countError);
          return { ...role, activeMembersCount: 0 };
        }

        return {
          ...role,
          activeMembersCount: activeMembersCount || 0
        };
      })
    );

    return res.json(rolesWithMemberCount);
  } catch (error) {
    console.error('Erro ao buscar cargos:', error);
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

    // Contar membros ativos com este cargo
    const { count: activeMembersCount, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church.id)
      .eq('role_id', role.id)
      .eq('active', true);

    if (countError) {
      console.error(`Erro ao contar membros para o cargo ${role.name}:`, countError);
    }

    return res.json({
      ...role,
      activeMembersCount: activeMembersCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar cargo:', error);
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

export const createRolesBatch = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Dados recebidos:', req.body);
    
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'O corpo da requisição deve ser um array de cargos'
      });
    }

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Validar cada cargo
    for (const role of req.body) {
      const { error: validationError } = createRoleSchema.validate(role);
      if (validationError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: `Erro na validação do cargo: ${validationError.details[0].message}`
        });
      }
    }

    // Verificar se já existem cargos com os mesmos nomes
    const roleNames = req.body.map(role => role.name);
    const { data: existingRoles, error: existingRolesError } = await supabase
      .from('roles')
      .select('name')
      .eq('church_id', church.id)
      .in('name', roleNames);

    if (existingRolesError) {
      return res.status(400).json({ 
        error: 'Erro ao verificar cargos existentes',
        details: existingRolesError.message
      });
    }

    if (existingRoles && existingRoles.length > 0) {
      const existingNames = existingRoles.map(role => role.name).join(', ');
      return res.status(400).json({ 
        error: 'Cargos já existentes',
        details: `Os seguintes cargos já existem: ${existingNames}`
      });
    }

    // Preparar dados para inserção
    const rolesToInsert = req.body.map(role => ({
      church_id: church.id,
      name: role.name,
      description: role.description || null
    }));

    // Inserir cargos em lote
    const { data: roles, error: createError } = await supabase
      .from('roles')
      .insert(rolesToInsert)
      .select();

    if (createError) {
      return res.status(400).json({ 
        error: 'Erro ao criar cargos',
        details: createError.message
      });
    }

    return res.status(201).json(roles);
  } catch (error) {
    console.error('Erro completo:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 