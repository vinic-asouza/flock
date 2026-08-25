import { Response } from 'express';
import { AuthRequest } from '../types';
import { supabaseAdmin as supabase } from '../services/supabase';
import { getMemberReports } from './memberController';
import {
  applyScopedCongregationFilter,
  assertCongregationAccess,
  resolveScopedCongregationFilter,
} from '../utils/congregationScope';
import { exportGroupsListFiltersSchema } from '../validators/groupValidator';
import { logAudit } from '../utils/auditLogger';
import { renderMemberProfilePdf } from '../utils/pdf/renderMemberProfile';
import { renderIntegrationProfilePdf } from '../utils/pdf/renderIntegrationProfile';
import { renderBlankRegistrationPdf } from '../utils/pdf/renderBlankRegistration';
import { renderLandscapeListPdf } from '../utils/pdf/renderList';
import { renderDashboardPdf } from '../utils/pdf/renderDashboard';
import {
  integrationFieldValue,
  integrationListFieldLabels,
  memberCsvFieldLabels,
  memberCsvFieldValue,
  memberFieldValue,
  memberListFieldLabels,
  resolveExportColumns,
  rowsFromColumnKeys,
} from '../utils/pdf/listFields';
import { formatPhoneBR } from '../utils/pdf/format';

export const exportMemberPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    // Buscar dados do membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        congregation:congregations(name)
      `)
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (memberError || !member) {
      const errorMessage = memberError
        ? (typeof memberError === 'object' && 'message' in memberError
          ? (memberError as { message: string }).message
          : String(memberError))
        : 'Membro não existe ou não pertence a esta igreja';

      return res.status(404).json({
        error: 'Membro não encontrado',
        details: errorMessage
      });
    }

    const access = assertCongregationAccess(req.church!, member.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    // Buscar grupos do membro
    const { data: memberGroups, error: memberGroupsError } = await supabase
      .from('member_groups')
      .select(`
        id,
        groups (
          id,
          name,
          type,
          status,
          congregation_id,
          congregations (
            id,
            name,
            abbreviation
          )
        )
      `)
      .eq('member_id', id);

    if (!memberGroupsError && memberGroups) {
      (member as any).groups = memberGroups
        .filter((mg: any) => mg.groups)
        .map((mg: any) => mg.groups);
    } else {
      (member as any).groups = [];
    }

    renderMemberProfilePdf(res, churchData?.name || 'Igreja', member);
    return;

  } catch (error) {
    console.error('Erro ao gerar PDF do membro:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

const getIntegrationSelect = () => `
  *,
  expected_congregation:congregations!integration_members_expected_congregation_id_fkey (
    name,
    abbreviation,
    city,
    state
  ),
  mentor:members!integration_members_mentor_id_fkey (
    name,
    phone,
    whatsapp
  )
`;

export const exportIntegrationMemberPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    const { data: integrationMemberData, error: integrationError } = await supabase
      .from('integration_members')
      .select(getIntegrationSelect())
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (integrationError || !integrationMemberData) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: integrationError?.message ?? 'Integrante não existente ou não pertence a esta igreja'
      });
    }

    const integrationMember = integrationMemberData as any;

    const access = assertCongregationAccess(req.church!, integrationMember.expected_congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    renderIntegrationProfilePdf(res, churchData?.name || 'Igreja', integrationMember);
    return;
  } catch (error) {
    console.error('Erro ao gerar PDF de integração:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

export const exportIntegrationMembersList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { filters, fields } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: 'Selecione pelo menos um campo para exportar'
      });
    }

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    let query = supabase
      .from('integration_members')
      .select(getIntegrationSelect())
      .eq('church_id', churchId);

    const integrationScoped = resolveScopedCongregationFilter(
      req.church!,
      filters?.expectedCongregationId,
      { includeNullAsChurchWide: true }
    );
    if (!integrationScoped.ok) {
      return res.status(integrationScoped.status).json({
        error: 'Filtro inválido',
        details: integrationScoped.message,
      });
    }
    query = applyScopedCongregationFilter(query, 'expected_congregation_id', integrationScoped);

    if (filters) {
      if (filters.search) {
        const safeSearch = filters.search.replace(/,/g, '');
        query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,whatsapp.ilike.%${safeSearch}%`);
      }
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters.mentorId) {
        query = query.eq('mentor_id', filters.mentorId);
      }
    }

    if (filters?.sort_by) {
      query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: integrationMembersData, error: listError } = await query;

    if (listError) {
      return res.status(500).json({
        error: 'Erro ao buscar integrantes',
        details: listError.message
      });
    }

    const integrationMembers = (integrationMembersData as any[]) || [];

    if (integrationMembers.length === 0) {
      return res.status(404).json({
        error: 'Nenhum integrante encontrado',
        details: 'Não há integrantes que correspondam aos filtros aplicados'
      });
    }

    const resolved = resolveExportColumns(fields, integrationListFieldLabels);
    if (!resolved.ok) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: resolved.message,
      });
    }
    const { columns } = resolved;
    const rows = rowsFromColumnKeys(integrationMembers, columns, integrationFieldValue);

    const filename = `lista-integrantes-${new Date().toISOString().split('T')[0]}.pdf`;
    renderLandscapeListPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      title: 'Lista de Integrantes',
      metaLines: [`Total: ${integrationMembers.length} integrantes`],
      columns,
      rows,
    });
    return;
  } catch (error) {
    console.error('Erro ao gerar PDF da lista de integrantes:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

export const exportDashboardPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    // Obter filtros da query string
    const { congregation_id } = req.query;
    const filters: any = {};

    if (congregation_id) {
      filters.congregation_id = congregation_id as string;
    }

    // Buscar dados dos relatórios usando o controller existente
    const mockReq = {
      ...req,
      query: filters,
      user: req.user
    } as AuthRequest;

    // Criar um objeto de resposta mock para capturar os dados
    let reportsData: any = null;
    let statusCode = 200;
    const mockRes = {
      json: (data: any) => {
        reportsData = data;
        return mockRes;
      },
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
    } as unknown as Response;

    // Chamar o controller de relatórios
    await getMemberReports(mockReq, mockRes);

    if (!reportsData || statusCode !== 200) {
      console.error('Erro ao buscar dados dos relatórios');
      return res.status(500).json({
        error: 'Erro ao buscar dados',
        details: 'Não foi possível obter dados dos relatórios'
      });
    }

    // Determinar título do relatório baseado nos filtros
    let reportTitle = 'Relatório Geral';
    let reportSubtitle = 'Todos os membros da igreja';

    if (congregation_id) {
      const scoped = resolveScopedCongregationFilter(req.church!, String(congregation_id), {
        includeNullAsChurchWide: false,
      });
      if (!scoped.ok) {
        return res.status(scoped.status).json({ error: 'Filtro inválido', details: scoped.message });
      }
      if (scoped.mode === 'single') {
        const { data: congregation } = await supabase
          .from('congregations')
          .select('name')
          .eq('id', scoped.congregationId)
          .eq('church_id', churchId)
          .single();

        if (congregation) {
          reportTitle = `Relatório - ${congregation.name}`;
          reportSubtitle = `Membros da congregação ${congregation.name}`;
        }
      }
    }

    // Buscar grupos da igreja (seção Grupos/Ministérios do PDF)
    let groupsQuery = supabase
      .from('groups')
      .select(`
        id,
        name,
        type,
        status,
        congregation_id
      `)
      .eq('church_id', churchId)
      .eq('status', true); // Apenas grupos ativos

    const groupsScoped = resolveScopedCongregationFilter(req.church!, congregation_id as string | undefined, {
      includeNullAsChurchWide: false,
    });
    if (!groupsScoped.ok) {
      return res.status(groupsScoped.status).json({
        error: 'Filtro inválido',
        details: groupsScoped.message,
      });
    }
    groupsQuery = applyScopedCongregationFilter(groupsQuery, 'congregation_id', groupsScoped);

    const { data: groups, error: groupsError } = await groupsQuery;

    let groupsByType: Record<string, Array<{ name: string; count: number }>> | undefined;

    if (!groupsError && groups && groups.length > 0) {
      const groupIds = groups.map((g: any) => g.id as string);
      const memberCounts: Record<string, number> = {};

      const { data: membershipRows } = await supabase
        .from('member_groups')
        .select('group_id')
        .in('group_id', groupIds);

      for (const row of membershipRows || []) {
        const gid = (row as { group_id: string }).group_id;
        memberCounts[gid] = (memberCounts[gid] || 0) + 1;
      }

      const groupsWithCounts = groups.map((group: any) => ({
        ...group,
        memberCount: memberCounts[group.id] || 0,
      }));

      const grouped: Record<string, Array<{ name: string; count: number }>> = {};
      groupsWithCounts.forEach((group: any) => {
        const type = group.type || 'Outros';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({ name: group.name, count: group.memberCount || 0 });
      });

      const typeOrder = [
        'Ministério', 'Departamento', 'Grupo', 'Equipe', 'Time', 'Comissão',
        'Célula', 'Grupo de Crescimento', 'Pequeno Grupo', 'Discipulado',
        'Classe', 'Núcleo', 'Região'
      ];

      const sortedTypes = Object.keys(grouped).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      groupsByType = {};
      sortedTypes.forEach((type) => {
        groupsByType![type] = grouped[type].sort((a, b) => b.count - a.count);
      });
    }

    const filename = `relatorio-${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    renderDashboardPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      reportTitle,
      reportSubtitle,
      reportsData,
      groupsByType,
      hideCongregations: Boolean(congregation_id),
    });

    return;

  } catch (error) {
    console.error('Erro ao gerar PDF do dashboard:', error);

    // Se já iniciou o stream do PDF, não pode enviar JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

export const exportMembersList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { filters, fields } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: 'É necessário selecionar pelo menos um campo para exportar'
      });
    }

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    // Construir query para buscar membros
    let query = supabase
      .from('members')
      .select(`
        *,
        congregation:congregations(name)
      `)
      .eq('church_id', churchId);

    const membersScoped = resolveScopedCongregationFilter(req.church!, filters?.congregation_id, {
      includeNullAsChurchWide: false,
    });
    if (!membersScoped.ok) {
      return res.status(membersScoped.status).json({
        error: 'Filtro inválido',
        details: membersScoped.message,
      });
    }
    query = applyScopedCongregationFilter(query, 'congregation_id', membersScoped);

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('active', filters.status === 'active');
      }
      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }
      if (filters.marital_status) {
        query = query.eq('marital_status', filters.marital_status);
      }
      if (filters.nationality) {
        query = query.ilike('nationality', `%${filters.nationality}%`);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.neighborhood) {
        query = query.ilike('neighborhood', `%${filters.neighborhood}%`);
      }
      if (filters.occupation) {
        query = query.ilike('occupation', `%${filters.occupation}%`);
      }
      if (filters.age_from || filters.age_to) {
        const today = new Date();
        if (filters.age_to) {
          const dateFrom = new Date(today.getFullYear() - parseInt(filters.age_to) - 1, today.getMonth(), today.getDate());
          query = query.gte('birth', dateFrom.toISOString());
        }
        if (filters.age_from) {
          const dateTo = new Date(today.getFullYear() - parseInt(filters.age_from), today.getMonth(), today.getDate());
          query = query.lte('birth', dateTo.toISOString());
        }
      }
      if (filters.birth_date_from) {
        query = query.gte('birth', filters.birth_date_from);
      }
      if (filters.birth_date_to) {
        query = query.lte('birth', filters.birth_date_to);
      }
      if (filters.baptism_date_from) {
        query = query.gte('baptism_date', filters.baptism_date_from);
      }
      if (filters.baptism_date_to) {
        query = query.lte('baptism_date', filters.baptism_date_to);
      }
      if (filters.admission_date_from) {
        query = query.gte('admission_date', filters.admission_date_from);
      }
      if (filters.admission_date_to) {
        query = query.lte('admission_date', filters.admission_date_to);
      }
    }

    // Aplicar ordenação
    if (filters?.sort_by) {
      query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    if (!members || members.length === 0) {
      return res.status(404).json({
        error: 'Nenhum membro encontrado',
        details: 'Não há membros que correspondam aos filtros aplicados'
      });
    }

    await logAudit(req, {
      entity: 'church',
      entityId: churchId,
      action: 'export',
      changesAfter: {
        list_type: 'members',
        format: 'pdf',
        exportedRows: members.length
      }
    });

    const resolved = resolveExportColumns(fields, memberListFieldLabels);
    if (!resolved.ok) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: resolved.message,
      });
    }
    const { columns } = resolved;
    const rows = rowsFromColumnKeys(members, columns, memberFieldValue);

    const filename = `lista-membros-${new Date().toISOString().split('T')[0]}.pdf`;
    renderLandscapeListPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      title: 'Lista de Membros',
      metaLines: [`Total: ${members.length} membros`],
      columns,
      rows,
    });
    return;

  } catch (error) {
    console.error('Erro ao gerar PDF da lista de membros:', error);

    // Se já iniciou o stream do PDF, não pode enviar JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

/**
 * Exporta lista de grupos para PDF.
 * Inclui dados do grupo (nome, tipo, congregação, status, descrição, responsável) e tabela de membros com campos selecionados.
 */
export const exportGroupsList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { filters: rawFilters } = req.body;

    const { error: filtersError, value: filters } = exportGroupsListFiltersSchema.validate(
      rawFilters ?? {},
      { abortEarly: false }
    );

    if (filtersError) {
      return res.status(400).json({
        error: 'Filtros inválidos',
        details: filtersError.details.map((d) => d.message),
      });
    }

    // Campos fixos: tipo, nome, congregação, responsável, quantidade de membros

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    // Base: groups + congregação + responsável
    let query = supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name,
          abbreviation
        ),
        members!groups_responsible_id_fkey (
          id,
          name,
          email,
          phone,
          whatsapp
        )
      `)
      .eq('church_id', churchId)
      .in('type', filters.types);

    const groupsScoped = resolveScopedCongregationFilter(req.church!, filters.congregation_id, {
      includeNullAsChurchWide: false,
    });
    if (!groupsScoped.ok) {
      return res.status(groupsScoped.status).json({
        error: 'Filtro inválido',
        details: groupsScoped.message,
      });
    }
    query = applyScopedCongregationFilter(query, 'congregation_id', groupsScoped);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status === 'active');
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // Ordenar por tipo e nome
    query = query.order('type', { ascending: true }).order('name', { ascending: true });

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      return res.status(500).json({
        error: 'Erro ao buscar grupos',
        details: groupsError.message,
      });
    }

    if (!groups || groups.length === 0) {
      return res.status(404).json({
        error: 'Nenhum grupo encontrado',
        details: 'Não há grupos que correspondam aos filtros aplicados',
      });
    }

    const groupIds = (groups as any[]).map(g => g.id);
    const memberCounts: Record<string, number> = {};

    if (groupIds.length > 0) {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('member_groups')
        .select('group_id')
        .in('group_id', groupIds);

      if (membershipError) {
        return res.status(500).json({
          error: 'Erro ao contar membros dos grupos',
          details: membershipError.message,
        });
      }

      for (const row of membershipRows || []) {
        const gid = (row as { group_id: string }).group_id;
        memberCounts[gid] = (memberCounts[gid] || 0) + 1;
      }
    }

    const columns = [
      { key: 'type', label: 'Tipo', width: 1.2 },
      { key: 'name', label: 'Nome do grupo', width: 2 },
      { key: 'congregation', label: 'Congregação', width: 1.5 },
      { key: 'responsible_name', label: 'Responsável', width: 1.5 },
      { key: 'member_count', label: 'Qtd. membros', width: 0.9 },
    ];

    const rows = (groups as any[]).map((group) => ({
      type: group.type || '—',
      name: group.name || '—',
      congregation: group.congregations?.name || '—',
      responsible_name: group.members?.name || '—',
      member_count: String(memberCounts[group.id] ?? 0),
    }));

    const filename = `lista-grupos-${new Date().toISOString().split('T')[0]}.pdf`;
    renderLandscapeListPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      title: 'Lista de Grupos',
      metaLines: [`Total: ${groups.length} grupo(s)`],
      columns,
      rows,
    });
    return;
  } catch (error) {
    console.error('Erro ao exportar PDF de grupos:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao exportar lista de grupos',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
};

/**
 * Exporta lista de congregações para PDF.
 */
export const exportCongregationsList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { filters } = req.body;
    const search = (filters?.search as string)?.trim() || '';

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

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
      query = query.ilike('name', `%${search}%`);
    }

    const { data: congregations, error: congregationsError } = await query.order('name', { ascending: true });

    if (congregationsError) {
      return res.status(500).json({
        error: 'Erro ao buscar congregações',
        details: congregationsError.message,
      });
    }

    if (!congregations || congregations.length === 0) {
      return res.status(404).json({
        error: 'Nenhuma congregação encontrada',
        details: 'Não há congregações que correspondam aos critérios aplicados',
      });
    }

    const congregationIds = congregations.map((c: { id: string }) => c.id);
    const { data: members } = await supabase
      .from('members')
      .select('congregation_id')
      .eq('church_id', churchId)
      .eq('active', true)
      .in('congregation_id', congregationIds);

    const memberCountByCongregation: Record<string, number> = {};
    (members || []).forEach((m: { congregation_id: string }) => {
      if (m.congregation_id) {
        memberCountByCongregation[m.congregation_id] = (memberCountByCongregation[m.congregation_id] || 0) + 1;
      }
    });

    const columns = [
      { key: 'name', label: 'Nome', width: 1.5 },
      { key: 'address', label: 'Endereço', width: 2 },
      { key: 'city_state', label: 'Cidade / Estado', width: 1.3 },
      { key: 'leader', label: 'Líder', width: 1.2 },
      { key: 'phone', label: 'Telefone', width: 1.1 },
      { key: 'member_count', label: 'Qtd. membros', width: 0.9 },
    ];

    const rows = (congregations as any[]).map((c: any) => ({
      name: c.name || '—',
      address: c.address || '—',
      city_state: [c.city, c.state].filter(Boolean).join(' / ') || '—',
      leader: c.leader || '—',
      phone: formatPhoneBR(c.phone),
      member_count: String(memberCountByCongregation[c.id] ?? 0),
    }));

    const filename = `lista-congregacoes-${new Date().toISOString().split('T')[0]}.pdf`;
    renderLandscapeListPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      title: 'Lista de Congregações',
      metaLines: [`Total: ${congregations.length} congregação(ões)`],
      columns,
      rows,
    });
    return;
  } catch (error) {
    console.error('Erro ao exportar PDF de congregações:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao exportar lista de congregações',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
};

/**
 * Exporta lista de membros de um grupo para PDF.
 * Inclui dados do grupo (nome, tipo, congregação, responsável) e tabela de membros com campos selecionados.
 */
export const exportGroupMembersList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { groupId, fields } = req.body;

    if (!groupId || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'É necessário informar o ID do grupo e selecionar pelo menos um campo para exportar'
      });
    }

    const churchId = req.church!.churchId;

    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        type,
        congregation_id,
        congregations ( id, name, abbreviation ),
        members!groups_responsible_id_fkey ( id, name, email, phone, whatsapp )
      `)
      .eq('id', groupId)
      .eq('church_id', churchId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    const access = assertCongregationAccess(req.church!, group.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { data: memberGroups } = await supabase
      .from('member_groups')
      .select('member_id')
      .eq('group_id', groupId);

    const memberIds = (memberGroups || []).map((mg: { member_id: string }) => mg.member_id);

    if (memberIds.length === 0) {
      return res.status(404).json({
        error: 'Nenhum membro encontrado',
        details: 'Este grupo não possui membros para exportar',
      });
    }

    let members: any[] = [];
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select(`
          *,
          congregation:congregations(name)
        `)
      .eq('church_id', churchId)
      .in('id', memberIds)
      .order('name', { ascending: true });

    if (membersError) {
      return res.status(500).json({
        error: 'Erro ao buscar membros do grupo',
        details: membersError.message
      });
    }
    members = membersData || [];

    if (members.length === 0) {
      return res.status(404).json({
        error: 'Nenhum membro encontrado',
        details: 'Este grupo não possui membros para exportar',
      });
    }

    const groupData = group as any;
    const congregationName = groupData.congregations?.name || '—';
    const responsible = groupData.members || null;
    const subtitleParts = [
      `Grupo: ${groupData.name || '—'}`,
      `Tipo: ${groupData.type || '—'}`,
      `Congregação: ${congregationName}`,
    ];
    if (responsible?.name) {
      subtitleParts.push(`Responsável: ${responsible.name}`);
    }

    const resolved = resolveExportColumns(fields, memberListFieldLabels);
    if (!resolved.ok) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: resolved.message,
      });
    }
    const { columns } = resolved;
    const rows = rowsFromColumnKeys(members, columns, memberFieldValue);

    const filename = `grupo-${(group.name || 'grupo').replace(/\s+/g, '-')}-membros-${new Date().toISOString().split('T')[0]}.pdf`;
    renderLandscapeListPdf(res, {
      filename,
      churchName: churchData?.name || 'Igreja',
      title: 'Lista de membros do grupo',
      subtitle: subtitleParts.join(' • '),
      metaLines: [`Total: ${members.length} membro(s)`],
      columns,
      rows,
    });
    return;
  } catch (error) {
    console.error('Erro ao exportar PDF do grupo:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao exportar lista do grupo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

export const exportMembersListCSV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { filters, fields, delimiter = ',', includeHeaders = true } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: 'É necessário selecionar pelo menos um campo para exportar'
      });
    }

    const resolved = resolveExportColumns(fields, memberCsvFieldLabels);
    if (!resolved.ok) {
      return res.status(400).json({
        error: 'Campos inválidos',
        details: resolved.message,
      });
    }
    const { columns } = resolved;

    const churchId = req.church!.churchId;

    // Construir query para buscar membros (mesma lógica do PDF)
    let query = supabase
      .from('members')
      .select(`
        *,
        congregation:congregations(name)
      `)
      .eq('church_id', churchId);

    const membersScoped = resolveScopedCongregationFilter(req.church!, filters?.congregation_id, {
      includeNullAsChurchWide: false,
    });
    if (!membersScoped.ok) {
      return res.status(membersScoped.status).json({
        error: 'Filtro inválido',
        details: membersScoped.message,
      });
    }
    query = applyScopedCongregationFilter(query, 'congregation_id', membersScoped);

    // Aplicar filtros (mesma lógica do PDF)
    if (filters) {
      if (filters.search) {
        const safeSearch = filters.search.replace(/,/g, '');
        query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,whatsapp.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
      }
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          query = query.eq('active', true);
        } else if (filters.status === 'inactive') {
          query = query.eq('active', false);
        }
      }
      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }
      if (filters.marital_status) {
        query = query.eq('marital_status', filters.marital_status);
      }
      if (filters.nationality) {
        query = query.eq('nationality', filters.nationality);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.neighborhood) {
        query = query.eq('neighborhood', filters.neighborhood);
      }
      if (filters.age_from) {
        const today = new Date();
        const maxBirthDate = new Date(today.getFullYear() - filters.age_from, today.getMonth(), today.getDate());
        query = query.lte('birth', maxBirthDate.toISOString().split('T')[0]);
      }
      if (filters.age_to) {
        const today = new Date();
        const minBirthDate = new Date(today.getFullYear() - filters.age_to - 1, today.getMonth(), today.getDate());
        query = query.gte('birth', minBirthDate.toISOString().split('T')[0]);
      }
      if (filters.occupation) {
        query = query.eq('occupation', filters.occupation);
      }
      if (filters.birth_date_from) {
        query = query.gte('birth', filters.birth_date_from);
      }
      if (filters.birth_date_to) {
        query = query.lte('birth', filters.birth_date_to);
      }
      if (filters.baptism_date_from) {
        query = query.gte('baptism_date', filters.baptism_date_from);
      }
      if (filters.baptism_date_to) {
        query = query.lte('baptism_date', filters.baptism_date_to);
      }
      if (filters.admission_date_from) {
        query = query.gte('admission_date', filters.admission_date_from);
      }
      if (filters.admission_date_to) {
        query = query.lte('admission_date', filters.admission_date_to);
      }
    }

    // Aplicar ordenação
    if (filters?.sort_by) {
      query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      console.error('Erro ao buscar membros:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    if (!members || members.length === 0) {
      return res.status(404).json({
        error: 'Nenhum membro encontrado',
        details: 'Não há membros que correspondam aos filtros aplicados'
      });
    }

    await logAudit(req, {
      entity: 'church',
      entityId: churchId,
      action: 'export',
      changesAfter: {
        list_type: 'members',
        format: 'csv',
        exportedRows: members.length
      }
    });

    const escapeCSVValue = (value: string): string => {
      if (!value) return '';
      const stringValue = String(value);
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    let csvContent = '';
    if (includeHeaders) {
      csvContent += columns.map((col) => escapeCSVValue(col.label)).join(delimiter) + '\n';
    }

    members.forEach((member) => {
      const row = columns.map((col) => escapeCSVValue(memberCsvFieldValue(member, col.key)));
      csvContent += row.join(delimiter) + '\n';
    });

    const filename = `membros-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const BOM = '\uFEFF';
    res.send(BOM + csvContent);

  } catch (error) {
    console.error('Erro ao gerar CSV da lista de membros:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

export const exportMemberRegistrationFormPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    if (churchError || !churchData) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: churchError?.message || 'Não foi possível carregar os dados da igreja',
      });
    }

    renderBlankRegistrationPdf(res, churchData.name || 'Igreja');
    return;
  } catch (error) {
    console.error('❌ Erro ao gerar ficha de cadastro em branco:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
};
