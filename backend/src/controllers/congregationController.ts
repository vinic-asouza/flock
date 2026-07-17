import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { createCongregationSchema, updateCongregationSchema } from '../validators/congregationValidator';
import { AuthRequest } from '../types';
import { logAudit } from '../utils/auditLogger';
import { logError } from '../utils/logger';
import {
  applyScopedCongregationFilter,
  assertCongregationAccess,
  canCreateCongregation,
  congregationIsSoleScopeForAnyUser,
  resolveScopedCongregationFilter,
} from '../utils/congregationScope';

const normalizeAbbreviation = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const isUniqueViolation = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  return error.code === '23505' || Boolean(error.message?.toLowerCase().includes('abbreviation'));
};

/**
 * Cria uma nova congregação
 * 
 * @param req - Request contendo os dados da congregação no body
 * @param res - Response com a congregação criada
 * 
 * @remarks
 * - Valida duplicidade de nome (case-insensitive)
 * - Valida duplicidade de abreviação (case-insensitive) quando preenchida
 * - Normaliza telefone (remove formatação)
 * - Normaliza estado (uppercase)
 * - Normaliza abreviação (trim; vazio → null)
 * - Registra a operação no audit log
 */
export const createCongregation = async (req: AuthRequest, res: Response) => {
  try {
    if (!canCreateCongregation(req.church!)) {
      return res.status(403).json({
        error: 'Sem permissão',
        details: 'Usuários com acesso restrito a congregações não podem criar novas congregações',
      });
    }

    const { error: validationError } = createCongregationSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationError.details[0].message 
      });
    }

    const { name, address, city, state, leader, phone, abbreviation } = req.body;
    const normalizedAbbreviation = normalizeAbbreviation(abbreviation);

    // Buscar church_id do usuário autenticado
    const churchId = req.church!.churchId;

    // Verificar se já existe uma congregação com o mesmo nome na igreja (case-insensitive)
    const { data: existingCongregations, error: existingCongregationError } = await supabase
      .from('congregations')
      .select('id')
      .eq('church_id', churchId)
      .ilike('name', name.trim());

    if (existingCongregationError) {
      logError('Erro ao verificar congregação existente:', existingCongregationError);
      return res.status(500).json({ 
        error: 'Erro ao verificar congregação existente',
        details: 'Não foi possível verificar se já existe uma congregação com este nome'
      });
    }

    if (existingCongregations && existingCongregations.length > 0) {
      return res.status(400).json({ 
        error: 'Congregação já existe',
        details: 'Já existe uma congregação com este nome nesta igreja'
      });
    }

    if (normalizedAbbreviation) {
      const { data: existingAbbreviations, error: abbreviationError } = await supabase
        .from('congregations')
        .select('id')
        .eq('church_id', churchId)
        .ilike('abbreviation', normalizedAbbreviation);

      if (abbreviationError) {
        logError('Erro ao verificar abreviação existente:', abbreviationError);
        return res.status(500).json({
          error: 'Erro ao verificar abreviação',
          details: 'Não foi possível verificar se já existe uma congregação com esta abreviação'
        });
      }

      if (existingAbbreviations && existingAbbreviations.length > 0) {
        return res.status(400).json({
          error: 'Abreviação já existe',
          details: 'Já existe uma congregação com esta abreviação nesta igreja'
        });
      }
    }

    // Normalizar telefone (remover formatação antes de salvar)
    const normalizedPhone = phone ? phone.replace(/\D/g, '') : null;

    // Criar nova congregação
    const { data: congregation, error: createError } = await supabase
      .from('congregations')
      .insert([
        {
          church_id: churchId,
          name: name.trim(),
          abbreviation: normalizedAbbreviation,
          address: address.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          leader: leader?.trim() || null,
          phone: normalizedPhone || null,
          is_primary: false
        }
      ])
      .select()
      .single();

    if (createError) {
      logError('Erro ao criar congregação:', createError);
      if (isUniqueViolation(createError)) {
        return res.status(400).json({
          error: 'Abreviação já existe',
          details: 'Já existe uma congregação com esta abreviação nesta igreja'
        });
      }
      return res.status(400).json({ 
        error: 'Erro ao criar congregação',
        details: createError.message || 'Não foi possível criar a congregação. Verifique os dados e tente novamente.'
      });
    }

    // Log da operação de criação
    await logAudit(req, {
      entity: 'congregation',
      entityId: congregation.id,
      action: 'create',
      changesAfter: congregation
    });

    return res.status(201).json(congregation);
  } catch (error) {
    logError('Erro ao criar congregação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Lista todas as congregações da igreja com contagem de membros ativos
 * 
 * @param req - Request do usuário autenticado
 * @param res - Response com array de congregações incluindo activeMembersCount
 * 
 * @remarks
 * - Retorna congregações ordenadas por nome
 * - Inclui contagem de membros ativos para cada congregação
 * - Usa query otimizada para evitar N+1 problem
 */
export const getCongregations = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const search = (req.query.search as string)?.trim() || '';

    // Buscar congregações da igreja (com filtro opcional por nome ou abreviação)
    let query = supabase
      .from('congregations')
      .select('*')
      .eq('church_id', churchId);

    const scoped = resolveScopedCongregationFilter(req.church!, undefined);
    if (!scoped.ok) {
      return res.status(scoped.status).json({
        error: 'Sem acesso',
        details: scoped.message,
      });
    }
    query = applyScopedCongregationFilter(query, 'id', scoped);

    if (search) {
      const safeSearch = search.replace(/,/g, '');
      query = query.or(`name.ilike.%${safeSearch}%,abbreviation.ilike.%${safeSearch}%`);
    }

    const { data: congregations, error } = await query.order('name', { ascending: true });

    if (error) {
      logError('Erro ao buscar congregações:', error);
      return res.status(400).json({ 
        error: 'Erro ao buscar congregações',
        details: error.message || 'Não foi possível buscar as congregações'
      });
    }

    if (!congregations || congregations.length === 0) {
      return res.json([]);
    }

    // Buscar contagem de membros ativos para todas as congregações de uma vez
    // Usando uma única query agregada para evitar N+1 problem
    const congregationIds = congregations.map(c => c.id);
    
    // Buscar todos os membros ativos com congregation_id nas congregações da igreja
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('congregation_id')
      .eq('church_id', churchId)
      .eq('active', true)
      .in('congregation_id', congregationIds);

    if (membersError) {
      logError('Erro ao buscar contagem de membros por congregação:', membersError);
      return res.status(500).json({
        error: 'Erro ao calcular resumo de congregações',
        details: 'Não foi possível carregar a contagem de membros ativos por congregação no momento'
      });
    }

    // Contar membros por congregação
    const memberCountByCongregation = (members || []).reduce((acc, member) => {
      if (member.congregation_id) {
        acc[member.congregation_id] = (acc[member.congregation_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const congregationsWithMemberCount = congregations.map(congregation => ({
      ...congregation,
      activeMembersCount: memberCountByCongregation[congregation.id] || 0
    }));

    return res.json(congregationsWithMemberCount);
  } catch (error) {
    logError('Erro ao buscar congregações:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Busca uma congregação específica por ID
 */
export const getCongregation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const churchId = req.church!.churchId;

    const { data: congregation, error } = await supabase
      .from('congregations')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (error || !congregation) {
      return res.status(404).json({ 
        error: 'Congregação não encontrada',
        details: 'A congregação solicitada não existe ou não pertence à sua igreja'
      });
    }

    const access = assertCongregationAccess(req.church!, congregation.id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    // Contar membros ativos
    const { count: activeMembersCount, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('congregation_id', congregation.id)
      .eq('active', true);

    if (countError) {
      logError(`Erro ao contar membros para a congregação ${congregation.name}:`, countError);
    }

    return res.json({
      ...congregation,
      activeMembersCount: activeMembersCount || 0
    });
  } catch (error) {
    logError('Erro ao buscar congregação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Atualiza uma congregação existente
 * 
 * @param req - Request contendo o ID nos params e dados no body
 * @param res - Response com a congregação atualizada
 * 
 * @remarks
 * - Permite atualização parcial (apenas campos fornecidos são atualizados)
 * - Valida duplicidade de nome (case-insensitive) se nome for alterado
 * - Valida duplicidade de abreviação quando fornecida
 * - Normaliza telefone e estado antes de salvar
 * - Registra a operação no audit log
 */
export const updateCongregation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError } = updateCongregationSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationError.details[0].message 
      });
    }

    // Buscar church_id do usuário autenticado
    const churchId = req.church!.churchId;

    // Buscar congregação existente para auditoria
    const { data: existingCongregation, error: existingError } = await supabase
      .from('congregations')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existingCongregation) {
      return res.status(404).json({ 
        error: 'Congregação não encontrada',
        details: 'A congregação solicitada não existe ou não pertence à sua igreja'
      });
    }

    const access = assertCongregationAccess(req.church!, existingCongregation.id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { name, address, city, state, leader, phone, abbreviation } = req.body;

    // Se o nome foi fornecido, verificar se já existe outra congregação com o mesmo nome (case-insensitive)
    if (name) {
      const { data: existingCongregations, error: duplicateError } = await supabase
        .from('congregations')
        .select('id')
        .eq('church_id', churchId)
        .ilike('name', name.trim())
        .neq('id', id);

      if (duplicateError) {
        logError('Erro ao verificar duplicidade de nome:', duplicateError);
        return res.status(500).json({ 
          error: 'Erro ao verificar duplicidade',
          details: 'Não foi possível verificar se já existe uma congregação com este nome'
        });
      }

      if (existingCongregations && existingCongregations.length > 0) {
        return res.status(400).json({ 
          error: 'Congregação já existe',
          details: 'Já existe uma congregação com este nome nesta igreja'
        });
      }
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (abbreviation !== undefined) {
      const normalizedAbbreviation = normalizeAbbreviation(abbreviation);
      if (normalizedAbbreviation) {
        const { data: existingAbbreviations, error: abbreviationError } = await supabase
          .from('congregations')
          .select('id')
          .eq('church_id', churchId)
          .ilike('abbreviation', normalizedAbbreviation)
          .neq('id', id);

        if (abbreviationError) {
          logError('Erro ao verificar duplicidade de abreviação:', abbreviationError);
          return res.status(500).json({
            error: 'Erro ao verificar duplicidade',
            details: 'Não foi possível verificar se já existe uma congregação com esta abreviação'
          });
        }

        if (existingAbbreviations && existingAbbreviations.length > 0) {
          return res.status(400).json({
            error: 'Abreviação já existe',
            details: 'Já existe uma congregação com esta abreviação nesta igreja'
          });
        }
      }
      updateData.abbreviation = normalizedAbbreviation;
    }
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim().toUpperCase();
    if (leader !== undefined) updateData.leader = leader?.trim() || null;
    if (phone !== undefined) {
      // Normalizar telefone (remover formatação antes de salvar)
      updateData.phone = phone ? phone.replace(/\D/g, '') : null;
    }

    // Validar integridade após atualização parcial
    // Garantir que campos obrigatórios não ficaram vazios
    const finalData = { ...existingCongregation, ...updateData };
    if (!finalData.name || finalData.name.trim() === '') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'O nome da congregação é obrigatório e não pode estar vazio'
      });
    }
    if (!finalData.address || finalData.address.trim() === '') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'O endereço é obrigatório e não pode estar vazio'
      });
    }
    if (!finalData.city || finalData.city.trim() === '') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'A cidade é obrigatória e não pode estar vazia'
      });
    }
    if (!finalData.state || finalData.state.trim() === '') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'O estado é obrigatório e não pode estar vazio'
      });
    }

    // Atualizar congregação
    const { data: congregation, error } = await supabase
      .from('congregations')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (error || !congregation) {
      logError('Erro ao atualizar congregação:', error);
      if (isUniqueViolation(error)) {
        return res.status(400).json({
          error: 'Abreviação já existe',
          details: 'Já existe uma congregação com esta abreviação nesta igreja'
        });
      }
      return res.status(404).json({ 
        error: 'Erro ao atualizar congregação',
        details: error?.message || 'Não foi possível atualizar a congregação'
      });
    }

    // Log da operação de atualização
    await logAudit(req, {
      entity: 'congregation',
      entityId: congregation.id,
      action: 'update',
      changesBefore: existingCongregation,
      changesAfter: congregation
    });

    return res.json(congregation);
  } catch (error) {
    logError('Erro ao atualizar congregação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Deleta uma congregação
 * 
 * @param req - Request contendo o ID da congregação nos params
 * @param res - Response 204 (No Content) em caso de sucesso
 * 
 * @remarks
 * - Valida que a congregação pertence à igreja do usuário
 * - Impede exclusão se houver membros ativos vinculados
 * - Registra a operação no audit log antes de deletar
 */
export const deleteCongregation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar church_id do usuário autenticado
    const churchId = req.church!.churchId;

    // Buscar congregação existente para auditoria
    const { data: existingCongregation, error: existingError } = await supabase
      .from('congregations')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existingCongregation) {
      return res.status(404).json({ 
        error: 'Congregação não encontrada',
        details: 'A congregação solicitada não existe ou não pertence à sua igreja'
      });
    }

    const access = assertCongregationAccess(req.church!, existingCongregation.id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    // Nova regra: não excluir congregação principal
    if (existingCongregation.is_primary) {
      return res.status(400).json({
        error: 'Não é possível excluir congregação',
        details: 'A congregação principal da igreja não pode ser excluída.',
      });
    }

    // Nova regra: não excluir a última congregação da igreja
    const { count: congregationCount, error: countError } = await supabase
      .from('congregations')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId);

    if (countError) {
      logError('Erro ao contar congregações:', countError);
      return res.status(500).json({
        error: 'Erro ao verificar congregações',
        details: 'Não foi possível verificar se esta é a última congregação da igreja',
      });
    }

    if ((congregationCount ?? 0) <= 1) {
      return res.status(400).json({
        error: 'Não é possível excluir congregação',
        details: 'A igreja precisa manter ao menos uma congregação.',
      });
    }

    const soleScope = await congregationIsSoleScopeForAnyUser(id);
    if (soleScope.blocked) {
      return res.status(400).json({
        error: 'Não é possível excluir congregação',
        details: soleScope.message,
      });
    }

    // Verificar se existem membros ativos usando esta congregação
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id')
      .eq('congregation_id', id)
      .eq('active', true)
      .limit(1);

    if (membersError) {
      logError('Erro ao verificar membros da congregação:', membersError);
      return res.status(500).json({ 
        error: 'Erro ao verificar membros',
        details: 'Não foi possível verificar se existem membros vinculados a esta congregação'
      });
    }

    if (members && members.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir congregação',
        details: 'Esta congregação possui membros ativos vinculados. Remova ou altere a congregação dos membros antes de excluir.'
      });
    }

    // Deletar congregação
    const { error } = await supabase
      .from('congregations')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (error) {
      logError('Erro ao deletar congregação:', error);
      return res.status(400).json({ 
        error: 'Erro ao deletar congregação',
        details: error.message || 'Não foi possível deletar a congregação'
      });
    }

    // Log da operação de deleção
    await logAudit(req, {
      entity: 'congregation',
      entityId: existingCongregation.id,
      action: 'delete',
      changesBefore: existingCongregation
    });

    return res.status(204).send();
  } catch (error) {
    logError('Erro ao deletar congregação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Cria múltiplas congregações de uma vez (bulk)
 * 
 * @param req - Request contendo array de congregações no body
 * @param res - Response com array de congregações criadas
 * 
 * @remarks
 * - Valida cada congregação individualmente
 * - Verifica duplicatas (case-insensitive) antes de inserir
 * - Normaliza telefones e estados antes de salvar
 * - Registra cada criação no audit log
 */
export const createCongregationsBatch = async (req: AuthRequest, res: Response) => {
  try {
    if (!canCreateCongregation(req.church!)) {
      return res.status(403).json({
        error: 'Sem permissão',
        details: 'Usuários com acesso restrito a congregações não podem criar novas congregações',
      });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: 'O corpo da requisição deve ser um array de congregações'
      });
    }

    const churchId = req.church!.churchId;

    // Validar cada congregação
    for (const congregation of req.body) {
      const { error: validationError } = createCongregationSchema.validate(congregation);
      if (validationError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: `Erro na validação da congregação: ${validationError.details[0].message}`
        });
      }
    }

    const congregationNames = req.body.map((congregation: { name: string }) => congregation.name.trim());
    const normalizedBatchNames = congregationNames.map((name: string) => name.toLowerCase());
    const duplicateNamesInPayload = Array.from(
      new Set(
        congregationNames.filter((name: string, index: number) =>
          normalizedBatchNames.indexOf(name.toLowerCase()) !== index
        )
      )
    );

    if (duplicateNamesInPayload.length > 0) {
      return res.status(400).json({
        error: 'Nomes duplicados no lote',
        details: `O payload contém congregações repetidas: ${duplicateNamesInPayload.join(', ')}`
      });
    }

    const batchAbbreviations = req.body
      .map((congregation: { abbreviation?: string | null }) => normalizeAbbreviation(congregation.abbreviation))
      .filter((abbr: string | null): abbr is string => Boolean(abbr));
    const normalizedBatchAbbreviations = batchAbbreviations.map((abbr: string) => abbr.toLowerCase());
    const duplicateAbbreviationsInPayload = Array.from(
      new Set(
        batchAbbreviations.filter((abbr: string, index: number) =>
          normalizedBatchAbbreviations.indexOf(abbr.toLowerCase()) !== index
        )
      )
    );

    if (duplicateAbbreviationsInPayload.length > 0) {
      return res.status(400).json({
        error: 'Abreviações duplicadas no lote',
        details: `O payload contém abreviações repetidas: ${duplicateAbbreviationsInPayload.join(', ')}`
      });
    }

    // Verificar se já existem congregações com os mesmos nomes/abreviações (case-insensitive)
    const { data: allCongregations, error: existingCongregationsError } = await supabase
      .from('congregations')
      .select('name, abbreviation')
      .eq('church_id', churchId);

    if (existingCongregationsError) {
      logError('Erro ao verificar congregações existentes:', existingCongregationsError);
      return res.status(400).json({ 
        error: 'Erro ao verificar congregações existentes',
        details: existingCongregationsError.message || 'Não foi possível verificar congregações existentes'
      });
    }

    // Verificar duplicatas (case-insensitive)
    const existingNamesLower = (allCongregations || []).map(c => c.name.toLowerCase());
    const duplicateNames = congregationNames.filter((name: string) => 
      existingNamesLower.includes(name.toLowerCase())
    );

    if (duplicateNames.length > 0) {
      return res.status(400).json({ 
        error: 'Congregações já existentes',
        details: `As seguintes congregações já existem: ${duplicateNames.join(', ')}`
      });
    }

    const existingAbbreviationsLower = (allCongregations || [])
      .map(c => c.abbreviation?.trim().toLowerCase())
      .filter(Boolean) as string[];
    const duplicateAbbreviations = batchAbbreviations.filter((abbr: string) =>
      existingAbbreviationsLower.includes(abbr.toLowerCase())
    );

    if (duplicateAbbreviations.length > 0) {
      return res.status(400).json({
        error: 'Abreviações já existentes',
        details: `As seguintes abreviações já existem: ${duplicateAbbreviations.join(', ')}`
      });
    }

    // Preparar dados para inserção (normalizar telefones)
    const congregationsToInsert = req.body.map((congregation: {
      name: string;
      address: string;
      city: string;
      state: string;
      leader?: string;
      phone?: string;
      abbreviation?: string | null;
    }) => ({
      church_id: churchId,
      name: congregation.name.trim(),
      abbreviation: normalizeAbbreviation(congregation.abbreviation),
      address: congregation.address.trim(),
      city: congregation.city.trim(),
      state: congregation.state.trim().toUpperCase(),
      leader: congregation.leader?.trim() || null,
      phone: congregation.phone ? congregation.phone.replace(/\D/g, '') : null,
      is_primary: false,
    }));

    // Inserir congregações em lote
    const { data: congregations, error: createError } = await supabase
      .from('congregations')
      .insert(congregationsToInsert)
      .select();

    if (createError) {
      logError('Erro ao criar congregações em lote:', createError);
      if (isUniqueViolation(createError)) {
        return res.status(400).json({
          error: 'Abreviação já existe',
          details: 'Já existe uma congregação com esta abreviação nesta igreja'
        });
      }
      return res.status(400).json({ 
        error: 'Erro ao criar congregações',
        details: createError.message || 'Não foi possível criar as congregações. Verifique os dados e tente novamente.'
      });
    }

    // Log da operação de criação em lote
    for (const congregation of congregations) {
      await logAudit(req, {
        entity: 'congregation',
        entityId: congregation.id,
        action: 'create',
        changesAfter: congregation
      });
    }

    return res.status(201).json(congregations);
  } catch (error) {
    logError('Erro ao criar congregações em lote:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};
