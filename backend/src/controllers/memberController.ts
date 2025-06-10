import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, Member } from '../types';

/**
 * Lista todos os membros da igreja
 */
export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Primeiro busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Busca os membros da igreja
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('church_id', church.id)
      .order('name', { ascending: true });

    if (membersError) {
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    res.json(members);

  } catch (error) {
    console.error('Erro ao listar membros:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Busca um membro específico
 */
export const getMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Busca o membro específico
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Membro não encontrado',
          details: 'Não foi possível encontrar o membro solicitado'
        });
      }
      return res.status(500).json({
        error: 'Erro ao buscar membro',
        details: memberError.message
      });
    }

    res.json(member);

  } catch (error) {
    console.error('Erro ao buscar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo membro
 */
export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Primeiro busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const memberData: Partial<Member> = {
      ...req.body,
      church_id: church.id,
      active: true
    };

    // Cria o novo membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao criar membro',
        details: memberError.message
      });
    }

    res.status(201).json(member);

  } catch (error) {
    console.error('Erro ao criar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualiza um membro existente
 */
export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verifica se o membro pertence a esta igreja
    const { data: existingMember, error: checkError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (checkError || !existingMember) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    // Atualiza o membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .update(req.body)
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao atualizar membro',
        details: memberError.message
      });
    }

    res.json(member);

  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Remove um membro permanentemente
 */
export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verifica se o membro pertence a esta igreja
    const { data: existingMember, error: checkError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (checkError || !existingMember) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    // Remove o membro permanentemente
    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id);

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao remover membro',
        details: memberError.message
      });
    }

    res.json({
      message: 'Membro removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 