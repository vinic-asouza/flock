import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';

/**
 * Lista todos os membros da igreja com paginação e filtros avançados
 */
export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Parâmetros de busca geral
    const search = req.query.search as string || '';
    
    // Filtros básicos
    const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
    const role_id = req.query.role_id as string || '';
    const congregation_id = req.query.congregation_id as string || '';

    // Filtros por campos específicos
    const gender = req.query.gender as string || '';
    const marital_status = req.query.marital_status as string || '';
    const nationality = req.query.nationality as string || '';
    const occupation = req.query.occupation as string || '';
    const city = req.query.city as string || '';
    const state = req.query.state as string || '';

    // Filtros por datas
    const birth_date_from = req.query.birth_date_from as string || '';
    const birth_date_to = req.query.birth_date_to as string || '';
    const baptism_date_from = req.query.baptism_date_from as string || '';
    const baptism_date_to = req.query.baptism_date_to as string || '';
    const admission_date_from = req.query.admission_date_from as string || '';
    const admission_date_to = req.query.admission_date_to as string || '';

    // Filtros por faixa etária (calculada a partir da data de nascimento)
    const age_from = req.query.age_from ? parseInt(req.query.age_from as string) : undefined;
    const age_to = req.query.age_to ? parseInt(req.query.age_to as string) : undefined;

    // Ordenação
    const sort_by = req.query.sort_by as string || 'name';
    const sort_order = req.query.sort_order as 'asc' | 'desc' || 'asc';

    // Validações
    if (page < 1) {
      return res.status(400).json({
        error: 'Página inválida',
        details: 'A página deve ser maior que 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Limite inválido',
        details: 'O limite deve estar entre 1 e 100'
      });
    }

    // Validações de datas
    const validateDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    const birthFrom = validateDate(birth_date_from);
    const birthTo = validateDate(birth_date_to);
    const baptismFrom = validateDate(baptism_date_from);
    const baptismTo = validateDate(baptism_date_to);
    const admissionFrom = validateDate(admission_date_from);
    const admissionTo = validateDate(admission_date_to);

    // Validações de faixa etária
    if (age_from !== undefined && (age_from < 0 || age_from > 150)) {
      return res.status(400).json({
        error: 'Idade inválida',
        details: 'A idade deve estar entre 0 e 150 anos'
      });
    }

    if (age_to !== undefined && (age_to < 0 || age_to > 150)) {
      return res.status(400).json({
        error: 'Idade inválida',
        details: 'A idade deve estar entre 0 e 150 anos'
      });
    }

    if (age_from !== undefined && age_to !== undefined && age_from > age_to) {
      return res.status(400).json({
        error: 'Faixa etária inválida',
        details: 'A idade inicial deve ser menor que a idade final'
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

    // Calcula o offset
    const offset = (page - 1) * limit;

    // Constrói a query base
    let query = supabase
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
      `, { count: 'exact' })
      .eq('church_id', church.id);

    // Aplica filtros de busca geral
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%,document.ilike.%${search}%`);
    }

    // Aplica filtros básicos
    if (active !== undefined) {
      query = query.eq('active', active);
    }

    if (role_id) {
      query = query.eq('role_id', role_id);
    }

    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar membros sem congregação (congregation_id IS NULL)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    // Aplica filtros por campos específicos
    if (gender) {
      query = query.eq('gender', gender);
    }

    if (marital_status) {
      query = query.eq('marital_status', marital_status);
    }

    if (nationality) {
      query = query.ilike('nationality', `%${nationality}%`);
    }

    if (occupation) {
      query = query.ilike('occupation', `%${occupation}%`);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (state) {
      query = query.eq('state', state);
    }

    // Aplica filtros por datas
    if (birthFrom) {
      query = query.gte('birth', birthFrom.toISOString());
    }

    if (birthTo) {
      query = query.lte('birth', birthTo.toISOString());
    }

    if (baptismFrom) {
      query = query.gte('baptism_date', baptismFrom.toISOString());
    }

    if (baptismTo) {
      query = query.lte('baptism_date', baptismTo.toISOString());
    }

    if (admissionFrom) {
      query = query.gte('admission_date', admissionFrom.toISOString());
    }

    if (admissionTo) {
      query = query.lte('admission_date', admissionTo.toISOString());
    }

    // Aplica ordenação
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Aplica paginação
    const { data: members, error: membersError, count } = await query
      .range(offset, offset + limit - 1);

    if (membersError) {
      console.error('Erro detalhado:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    // Filtra por faixa etária se necessário (após buscar os dados)
    let filteredMembers = members;
    if (age_from !== undefined || age_to !== undefined) {
      filteredMembers = members.filter(member => {
        if (!member.birth) return false;
        
        const birthDate = new Date(member.birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;

        if (age_from !== undefined && actualAge < age_from) return false;
        if (age_to !== undefined && actualAge > age_to) return false;
        
        return true;
      });
    }

    // Formatar a resposta para manter compatibilidade
    const formattedMembers = filteredMembers.map(member => ({
      ...member,
      role: member.roles,
      congregation: member.congregations,
      roles: undefined, // Remove o campo roles da resposta
      congregations: undefined // Remove o campo congregations da resposta
    }));

    // Calcula informações de paginação (ajustado para filtros aplicados)
    const actualCount = age_from !== undefined || age_to !== undefined ? filteredMembers.length : (count || 0);
    const totalPages = Math.ceil(actualCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: formattedMembers,
      pagination: {
        page,
        limit,
        total: actualCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      filters: {
        search: search || null,
        active: active !== undefined ? active : null,
        role_id: role_id || null,
        congregation_id: congregation_id || null,
        gender: gender || null,
        marital_status: marital_status || null,
        nationality: nationality || null,
        occupation: occupation || null,
        city: city || null,
        state: state || null,
        birth_date_from: birth_date_from || null,
        birth_date_to: birth_date_to || null,
        baptism_date_from: baptism_date_from || null,
        baptism_date_to: baptism_date_to || null,
        admission_date_from: admission_date_from || null,
        admission_date_to: admission_date_to || null,
        age_from: age_from || null,
        age_to: age_to || null
      },
      sorting: {
        sort_by,
        sort_order
      }
    });

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

/**
 * Cria múltiplos membros de uma vez
 */
export const createBatchMembers = async (req: AuthRequest, res: Response) => {
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

    const members = req.body;

    if (!Array.isArray(members)) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'O corpo da requisição deve ser um array de membros'
      });
    }

    // Processa cada membro para adicionar o church_id e garantir que active seja true
    const membersWithChurchId = members.map(member => ({
      ...member,
      church_id: church.id,
      active: true
    }));

    // Insere os membros em lote
    const { data, error: insertError } = await supabase
      .from('members')
      .insert(membersWithChurchId)
      .select();

    if (insertError) {
      console.error('Erro ao inserir membros:', insertError);
      return res.status(500).json({
        error: 'Erro ao criar membros',
        details: insertError.message
      });
    }

    res.status(201).json({
      message: 'Membros criados com sucesso',
      count: members.length,
      data
    });

  } catch (error) {
    console.error('Erro ao criar membros em lote:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Gera relatórios agregados dos membros
 */
export const getMemberReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Parâmetros de filtro
    const congregation_id = req.query.congregation_id as string || '';

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

    // Constrói a query base
    let query = supabase
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
      .eq('church_id', church.id);

    // Aplica filtro por congregação
    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar membros sem congregação (congregation_id IS NULL)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    // Busca os membros filtrados
    const { data: allMembers, error: membersError } = await query;

    if (membersError) {
      console.error('Erro detalhado:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    // Calcula estatísticas gerais
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.active).length;
    const inactiveMembers = totalMembers - activeMembers;

    // Estatísticas por gênero
    const genderStats = allMembers.reduce((acc, member) => {
      const gender = member.gender || 'Não informado';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por estado civil
    const maritalStats = allMembers.reduce((acc, member) => {
      const status = member.marital_status || 'Não informado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por cargo
    const roleStats = allMembers.reduce((acc, member) => {
      const roleName = member.roles?.name || 'Sem cargo';
      acc[roleName] = (acc[roleName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por congregação
    const congregationStats = allMembers.reduce((acc, member) => {
      const congregationName = member.congregations?.name || 'Sem congregação';
      acc[congregationName] = (acc[congregationName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por cidade
    const cityStats = allMembers.reduce((acc, member) => {
      const city = member.city || 'Não informado';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por estado
    const stateStats = allMembers.reduce((acc, member) => {
      const state = member.state || 'Não informado';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Análise de faixa etária
    const ageRanges = {
      '0-12': 0,
      '13-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };

    const today = new Date();
    allMembers.forEach(member => {
      if (member.birth) {
        const birthDate = new Date(member.birth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;

        if (actualAge <= 12) ageRanges['0-12']++;
        else if (actualAge <= 17) ageRanges['13-17']++;
        else if (actualAge <= 25) ageRanges['18-25']++;
        else if (actualAge <= 35) ageRanges['26-35']++;
        else if (actualAge <= 50) ageRanges['36-50']++;
        else if (actualAge <= 65) ageRanges['51-65']++;
        else ageRanges['65+']++;
      }
    });

    // Análise de batismos por período
    const baptismByYear = allMembers.reduce((acc, member) => {
      if (member.baptism_date) {
        const year = new Date(member.baptism_date).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de admissões por período
    const admissionByYear = allMembers.reduce((acc, member) => {
      if (member.admission_date) {
        const year = new Date(member.admission_date).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de batismos por mês (para o ano selecionado se fornecido)
    const baptismByMonth = allMembers.reduce((acc, member) => {
      if (member.baptism_date) {
        const date = new Date(member.baptism_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de admissões por mês (para o ano selecionado se fornecido)
    const admissionByMonth = allMembers.reduce((acc, member) => {
      if (member.admission_date) {
        const date = new Date(member.admission_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Formatar todos os membros para manter compatibilidade com o frontend
    const formattedMembers = allMembers.map(member => ({
      ...member,
      role: member.roles,
      congregation: member.congregations,
      roles: undefined,
      congregations: undefined
    }));

    // Membros por ano (batizados ou admitidos)
    const membersByYear = formattedMembers.reduce((acc, member) => {
      // Verifica se o membro foi batizado ou admitido no ano
      const baptismYear = member.baptism_date ? new Date(member.baptism_date).getFullYear() : null;
      const admissionYear = member.admission_date ? new Date(member.admission_date).getFullYear() : null;
      
      // Se foi batizado, adiciona ao ano do batismo
      if (baptismYear) {
        if (!acc[baptismYear]) acc[baptismYear] = [];
        acc[baptismYear].push(member);
      }
      
      // Se foi admitido (e não batizado no mesmo ano), adiciona ao ano da admissão
      if (admissionYear && admissionYear !== baptismYear) {
        if (!acc[admissionYear]) acc[admissionYear] = [];
        acc[admissionYear].push(member);
      }
      
      return acc;
    }, {} as Record<string, any[]>);

    // Membros por mês (batizados ou admitidos)
    const membersByMonth = formattedMembers.reduce((acc, member) => {
      // Verifica se o membro foi batizado ou admitido no mês
      const baptismDate = member.baptism_date ? new Date(member.baptism_date) : null;
      const admissionDate = member.admission_date ? new Date(member.admission_date) : null;
      
      // Se foi batizado, adiciona ao mês do batismo
      if (baptismDate) {
        const year = baptismDate.getFullYear();
        const month = String(baptismDate.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(member);
      }
      
      // Se foi admitido (e não batizado no mesmo mês), adiciona ao mês da admissão
      if (admissionDate) {
        const year = admissionDate.getFullYear();
        const month = String(admissionDate.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        
        // Só adiciona se não foi batizado no mesmo mês
        const baptismKey = member.baptism_date ? 
          `${new Date(member.baptism_date).getFullYear()}-${String(new Date(member.baptism_date).getMonth() + 1).padStart(2, '0')}` : 
          null;
        
        if (key !== baptismKey) {
          if (!acc[key]) acc[key] = [];
          acc[key].push(member);
        }
      }
      
      return acc;
    }, {} as Record<string, any[]>);

    // Top 10 ocupações
    const occupationStats = allMembers.reduce((acc, member) => {
      const occupation = member.occupation || 'Não informado';
      acc[occupation] = (acc[occupation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topOccupations = Object.entries(occupationStats)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([occupation, count]) => ({ occupation, count }));

    // Membros recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMembers = allMembers.filter(member => {
      if (!member.created_at) return false;
      return new Date(member.created_at) >= thirtyDaysAgo;
    }).length;

    // Membros batizados recentemente (últimos 30 dias)
    const recentBaptisms = allMembers.filter(member => {
      if (!member.baptism_date) return false;
      return new Date(member.baptism_date) >= thirtyDaysAgo;
    }).length;

    res.json({
      summary: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        recentMembers,
        recentBaptisms,
        activePercentage: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0
      },
      demographics: {
        gender: genderStats,
        maritalStatus: maritalStats,
        ageRanges,
        cities: cityStats,
        states: stateStats
      },
      churchStructure: {
        roles: roleStats,
        congregations: congregationStats
      },
      timeline: {
        baptismsByYear: baptismByYear,
        admissionsByYear: admissionByYear,
        baptismsByMonth: baptismByMonth,
        admissionsByMonth: admissionByMonth,
        membersByYear: membersByYear,
        membersByMonth: membersByMonth
      },
      topOccupations,
      filters: {
        congregation_id: congregation_id || null
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 