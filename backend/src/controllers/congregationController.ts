import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { createCongregationSchema, updateCongregationSchema } from '../validators/congregationValidator';
import { AuthRequest } from '../types';

export const createCongregation = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Dados recebidos:', req.body);
    
    const { error: validationError } = createCongregationSchema.validate(req.body);
    if (validationError) {
      console.log('Erro de validação:', validationError);
      return res.status(400).json({ error: validationError.details[0].message });
    }

    const { name, address, city, state, leader, phone } = req.body;

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

    // Verificar se já existe uma congregação com o mesmo nome na igreja
    const { data: existingCongregation, error: existingCongregationError } = await supabase
      .from('congregations')
      .select('id')
      .eq('church_id', church.id)
      .eq('name', name)
      .single();

    console.log('Congregação existente:', existingCongregation);
    console.log('Erro ao verificar congregação existente:', existingCongregationError);

    if (existingCongregation) {
      return res.status(400).json({ error: 'Já existe uma congregação com este nome' });
    }

    // Criar nova congregação
    const { data: congregation, error: createError } = await supabase
      .from('congregations')
      .insert([
        {
          church_id: church.id,
          name,
          address,
          city,
          state,
          leader: leader || null,
          phone: phone || null
        }
      ])
      .select()
      .single();

    console.log('Congregação criada:', congregation);
    console.log('Erro ao criar congregação:', createError);

    if (createError) {
      return res.status(400).json({ 
        error: 'Erro ao criar congregação',
        details: createError.message
      });
    }

    return res.status(201).json(congregation);
  } catch (error) {
    console.error('Erro completo:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getCongregations = async (req: AuthRequest, res: Response) => {
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

    // Buscar todas as congregações da igreja
    const { data: congregations, error } = await supabase
      .from('congregations')
      .select('*')
      .eq('church_id', church.id)
      .order('name');

    if (error) {
      return res.status(400).json({ error: 'Erro ao buscar congregações' });
    }

    return res.json(congregations);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getCongregation = async (req: AuthRequest, res: Response) => {
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

    // Buscar congregação específica
    const { data: congregation, error } = await supabase
      .from('congregations')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (error || !congregation) {
      return res.status(404).json({ error: 'Congregação não encontrada' });
    }

    return res.json(congregation);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateCongregation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError } = updateCongregationSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }

    const { name, address, city, state, leader, phone } = req.body;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user?.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    // Se o nome foi fornecido, verificar se já existe outra congregação com o mesmo nome
    if (name) {
      const { data: existingCongregation } = await supabase
        .from('congregations')
        .select('id')
        .eq('church_id', church.id)
        .eq('name', name)
        .neq('id', id)
        .single();

      if (existingCongregation) {
        return res.status(400).json({ error: 'Já existe uma congregação com este nome' });
      }
    }

    // Atualizar congregação
    const { data: congregation, error } = await supabase
      .from('congregations')
      .update({
        name,
        address,
        city,
        state,
        leader,
        phone,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (error || !congregation) {
      return res.status(404).json({ error: 'Congregação não encontrada' });
    }

    return res.json(congregation);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteCongregation = async (req: AuthRequest, res: Response) => {
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

    // Verificar se existem membros usando esta congregação
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .eq('congregation', id)
      .limit(1);

    if (members && members.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir uma congregação que possui membros' });
    }

    // Deletar congregação
    const { error } = await supabase
      .from('congregations')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id);

    if (error) {
      return res.status(400).json({ error: 'Erro ao deletar congregação' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 