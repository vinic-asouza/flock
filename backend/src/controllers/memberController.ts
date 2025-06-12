import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';

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

    // Busca os membros da igreja com informações do cargo e congregação
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select(`
        *,
        roles (
          id,
          name,
          description
        ),
        congregations (
          id,
          name,
          address,
          city,
          state,
          leader,
          phone
        )
      `)
      .eq('church_id', church.id)
      .order('name', { ascending: true });

    if (membersError) {
      console.error('Erro detalhado:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    // Formatar a resposta para manter compatibilidade
    const formattedMembers = members.map(member => ({
      ...member,
      role: member.roles,
      congregation: member.congregations,
      roles: undefined, // Remove o campo roles da resposta
      congregations: undefined // Remove o campo congregations da resposta
    }));

    res.json(formattedMembers);

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

    // Busca o membro específico com informações do cargo e congregação
    const { data: memberWithDetails, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        roles (
          id,
          name,
          description
        ),
        congregations (
          id,
          name,
          address,
          city,
          state,
          leader,
          phone
        )
      `)
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (memberError) {
      console.error('Erro detalhado:', memberError);
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    // Formatar a resposta para manter compatibilidade
    const formattedMember = {
      ...memberWithDetails,
      role: memberWithDetails.roles,
      congregation: memberWithDetails.congregations,
      roles: undefined, // Remove o campo roles da resposta
      congregations: undefined // Remove o campo congregations da resposta
    };

    res.json(formattedMember);

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