import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../types';
import { supabaseAdmin as supabase } from '../services/supabase';
import { getMemberReports } from './memberController';

/** Formata YYYY-MM-DD sem offset de fuso (America/Sao_Paulo). */
function formatDateSafe(date: string | null | undefined): string {
  if (!date) return '-';
  const raw = typeof date === 'string' ? date : String(date);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Calcula idade evitando timezone e retornando null se inválida. */
function calculateAgeSafe(birth: string | null | undefined): number | null {
  if (!birth) return null;
  try {
    const raw = birth.includes('T') ? birth.split('T')[0] : birth;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let date: Date;
    if (match) {
      const [, year, month, day] = match;
      date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    } else {
      date = new Date(birth);
    }
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

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
            name
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

    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=membro-${member.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    const formatDate = formatDateSafe;
    const calculateAge = calculateAgeSafe;

    // Helper para formatar telefone
    const formatPhone = (phone: string) => {
      if (!phone) return '-';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    };

    const ensureSpace = (needed = 80) => {
      if (doc.y + needed > doc.page.height - 50) {
        doc.addPage();
      }
    };

    const writeLabelValue = (label: string, value: string) => {
      doc
        .font('Helvetica-Bold')
        .text(label + ': ', { continued: true })
        .font('Helvetica')
        .text(value);
    };

    const memberIsMemberLabel = (value: 'sim' | 'nao' | 'falecido' | null | undefined, feminine = false) => {
      if (value === 'sim') return ' (Membro)';
      if (value === 'nao') return ' (Não membro)';
      if (value === 'falecido') return feminine ? ' (Falecida)' : ' (Falecido)';
      return '';
    };

    const baptismTypeLabels: Record<string, string> = {
      catolica: 'Na igreja católica',
      adulto_nesta_igreja: 'Adulto — nesta igreja',
      adulto_outra_igreja: 'Adulto — em outra igreja',
      crianca_nesta_igreja: 'Criança — nesta igreja',
      crianca_outra_igreja: 'Criança — em outra igreja',
      novo_convertido: 'Novo convertido',
      sem_religiao: 'Novo convertido — sem religião anterior',
    };

    const sundayAttendanceLabels: Record<string, string> = {
      todos_os_domingos: 'Todos os domingos',
      regularmente: 'Regularmente',
      as_vezes: 'Às vezes',
      nao: 'Não',
    };

    // Cabeçalho
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(churchData?.name, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica')
      .text('Ficha de Membro', { align: 'center' })
      .moveDown(1);

    // Status
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(member.active ? '#059669' : '#6B7280')
      .text(member.active ? 'ATIVO' : 'INATIVO', { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    // Nome do membro
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(member.name.toUpperCase(), { align: 'center' })
      .moveDown(1);

    // Linha separadora
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    // Informações Pessoais
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Informações Pessoais')
      .moveDown(0.5);

    const idade = calculateAge(member.birth);
    const weddingDateLabel =
      member.marital_status === 'União Estável' ? 'Data da União' : 'Data do Casamento';

    const personalInfo: Array<{ label: string; value: string; always?: boolean }> = [
      { label: 'Gênero', value: member.gender || '-', always: true },
      { label: 'Idade', value: idade !== null ? `${idade} anos` : '-', always: true },
      { label: 'Data de Nascimento', value: formatDate(member.birth), always: true },
      { label: 'Natural de', value: member.hometown || '-' },
      { label: 'Estado Civil', value: member.marital_status || '-', always: true },
      { label: weddingDateLabel, value: formatDate(member.wedding_date) },
      { label: 'Profissão', value: member.occupation || '-' },
      { label: 'Nacionalidade', value: member.nationality || '-' },
      { label: 'CPF', value: member.document || '-' },
    ];

    doc.fontSize(11).font('Helvetica');
    personalInfo.forEach(info => {
      if (info.always || info.value !== '-') {
        writeLabelValue(info.label, info.value);
      }
    });

    // Família
    const hasChildren = member.children && Array.isArray(member.children) && member.children.length > 0;
    const hasFamily = member.spouse || member.father_name || member.mother_name || hasChildren;

    if (hasFamily) {
      ensureSpace(100);
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Família')
        .moveDown(0.3);

      doc.fontSize(11).font('Helvetica');

      if (member.spouse) {
        let spouseText = member.spouse;
        if (member.spouse_is_member === true) spouseText += ' (Membro)';
        else if (member.spouse_is_member === false) spouseText += ' (Não membro)';
        writeLabelValue('Cônjuge', spouseText);
      }

      if (member.father_name) {
        writeLabelValue(
          'Nome do Pai',
          member.father_name + memberIsMemberLabel(member.father_is_member)
        );
      }

      if (member.mother_name) {
        writeLabelValue(
          'Nome da Mãe',
          member.mother_name + memberIsMemberLabel(member.mother_is_member, true)
        );
      }

      if (hasChildren) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Filhos:');
        member.children.forEach((child: any) => {
          const childAge = child.birth ? calculateAge(child.birth) : null;
          let childText = `  • ${child.name}`;
          if (childAge !== null) {
            childText += ` (${childAge} ${childAge === 1 ? 'ano' : 'anos'})`;
          }
          if (child.dependent === true) {
            childText += ' - Reside junto';
          } else if (child.dependent === false) {
            childText += ' - Não reside junto';
          }
          doc.font('Helvetica').text(childText);
        });
      }
    }

    doc.moveDown(1);

    // Contato
    ensureSpace(80);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contato')
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');

    if (member.email) {
      doc
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Email: ', { continued: true })
        .font('Helvetica')
        .fillColor('#3B82F6')
        .text(member.email, {
          link: `mailto:${member.email}`,
          underline: true
        })
        .fillColor('#000000');
    }

    if (member.phone) {
      writeLabelValue('Telefone', formatPhone(member.phone));
    }

    if (member.whatsapp) {
      const whatsappNumber = member.whatsapp.replace(/\D/g, '');
      doc
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('WhatsApp: ', { continued: true })
        .font('Helvetica')
        .fillColor('#25D366')
        .text(formatPhone(member.whatsapp), {
          link: `https://wa.me/${whatsappNumber}`,
          underline: true
        })
        .fillColor('#000000');
    }

    if (!member.email && !member.phone && !member.whatsapp) {
      doc.font('Helvetica').text('-');
    }

    doc.moveDown(1);

    // Endereço
    ensureSpace(80);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Endereço')
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    if (member.address) {
      const addressLine = member.address_number
        ? `${member.address}, ${member.address_number}`
        : member.address;
      doc.text(addressLine);
    }
    if (member.complement) {
      doc.text(member.complement);
    }
    if (member.neighborhood || member.city || member.state) {
      const locationParts = [
        member.neighborhood,
        [member.city, member.state].filter(Boolean).join('/')
      ].filter(Boolean);
      doc.text(locationParts.join(' - '));
    }
    if (member.cep) {
      doc.text(`CEP: ${member.cep}`);
    }
    if (!member.address && !member.complement && !member.neighborhood && !member.city && !member.state && !member.cep) {
      doc.text('-');
    }

    doc.moveDown(1);

    // Informações Eclesiásticas (recebimento)
    ensureSpace(100);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Informações Eclesiásticas')
      .moveDown(0.5);

    const churchInfo = [
      { label: 'Congregação', value: member.congregation?.name || 'Sede' },
      { label: 'Data de Batismo', value: formatDate(member.baptism_date) },
      { label: 'Data de Recebimento', value: formatDate(member.admission_date) },
      { label: 'Tipo de Recebimento', value: member.admission || '-' },
    ];

    doc.fontSize(11).font('Helvetica');
    churchInfo.forEach(info => {
      if (info.value !== '-' || info.label === 'Congregação') {
        writeLabelValue(info.label, info.value);
      }
    });

    // Grupos/Ministérios
    if (member.groups && Array.isArray(member.groups) && member.groups.length > 0) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .text('Grupos / Ministérios:');

      const activeGroups = member.groups.filter((g: any) => g.status);
      const inactiveGroups = member.groups.filter((g: any) => !g.status);

      if (activeGroups.length > 0) {
        activeGroups.forEach((group: any) => {
          doc
            .font('Helvetica')
            .text(`  • ${group.type} - ${group.name}`);
        });
      }

      if (inactiveGroups.length > 0) {
        doc
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('  Grupos Inativos:');
        inactiveGroups.forEach((group: any) => {
          doc
            .font('Helvetica')
            .text(`  • ${group.type} - ${group.name}`);
        });
        doc.fillColor('#000000');
      }
    } else {
      doc.moveDown(0.3);
      writeLabelValue('Grupos / Ministérios', 'Nenhum grupo vinculado');
    }

    // Histórico Eclesiástico
    const hasEcclesiasticalHistory =
      !!member.years_evangelical ||
      (member.evangelical_family !== undefined && member.evangelical_family !== null) ||
      (member.is_baptized !== undefined && member.is_baptized !== null) ||
      !!member.reason_joining ||
      !!member.time_attending ||
      !!member.sunday_attendance ||
      (member.weekly_activities !== undefined && member.weekly_activities !== null) ||
      (member.previous_church_active !== undefined && member.previous_church_active !== null);

    if (hasEcclesiasticalHistory) {
      ensureSpace(120);
      doc.moveDown(1);
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Histórico Eclesiástico')
        .moveDown(0.5);

      doc.fontSize(11).font('Helvetica');

      if (member.years_evangelical) {
        const yearsLabel = member.years_evangelical === '1' ? 'ano' : 'anos';
        writeLabelValue('Cristão evangélico há', `${member.years_evangelical} ${yearsLabel}`);
      }

      if (member.evangelical_family !== undefined && member.evangelical_family !== null) {
        writeLabelValue('Família cristã evangélica', member.evangelical_family ? 'Sim' : 'Não');
      }

      if (member.is_baptized !== undefined && member.is_baptized !== null) {
        let baptizedText = member.is_baptized ? 'Sim' : 'Não';
        if (member.is_baptized && member.baptism_type) {
          baptizedText += ` — ${baptismTypeLabels[member.baptism_type] || member.baptism_type}`;
        }
        writeLabelValue('Batizado(a)', baptizedText);
        if (member.baptism_other_church_name) {
          writeLabelValue('Igreja anterior', member.baptism_other_church_name);
        }
        if (member.previous_religion) {
          writeLabelValue('Religião anterior', member.previous_religion);
        }
      }

      if (member.previous_church_active !== undefined && member.previous_church_active !== null) {
        writeLabelValue(
          'Era membro ativo da igreja anterior',
          member.previous_church_active ? 'Sim' : 'Não'
        );
      }

      if (member.time_attending) {
        writeLabelValue('Frequenta a igreja há', member.time_attending);
      }

      if (member.sunday_attendance) {
        writeLabelValue(
          'Cultos',
          sundayAttendanceLabels[member.sunday_attendance] || member.sunday_attendance
        );
      }

      if (member.weekly_activities !== undefined && member.weekly_activities !== null) {
        const activitiesText = member.weekly_activities
          ? `Sim${member.weekly_activities_which ? ` — ${member.weekly_activities_which}` : ''}`
          : 'Não';
        writeLabelValue('Atividades semanais', activitiesText);
      }

      if (member.reason_joining) {
        writeLabelValue('Motivo de tornar-se membro', member.reason_joining);
      }
    }

    doc.moveDown(2);

    // Rodapé
    ensureSpace(40);
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(
        `Documento gerado em ${new Date().toLocaleString('pt-BR')}`,
        { align: 'center' }
      );

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar PDF do membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

const integrationStatusLabels: Record<string, string> = {
  em_progresso: 'Em progresso',
  integrado: 'Integrado',
  descartado: 'Descartado'
};

const integrationAdmissionLabels: Record<string, string> = {
  batismo: 'Batismo',
  transferencia: 'Transferência',
  'profissao de fe': 'Profissão de Fé',
  outro: 'Outro'
};

const integrationGenderLabels: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino'
};

const integrationMaritalLabels: Record<string, string> = {
  solteiro: 'Solteiro',
  casado: 'Casado',
  divorciado: 'Divorciado',
  viuvo: 'Viúvo',
  outro: 'Outro'
};

const formatIntegrationDate = (date: string | null | undefined) => {
  if (!date) return '-';
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
};

const formatIntegrationPhone = (phone: string | null | undefined) => {
  if (!phone) return '-';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

const formatIntegrationNotes = (notes: string | null | undefined) => {
  if (!notes) return 'Nenhuma anotação registrada.';
  return notes;
};

const getIntegrationSelect = () => `
  *,
  expected_congregation:congregations!integration_members_expected_congregation_id_fkey (
    name,
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

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=integrante-${integrationMember.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(churchData?.name, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica')
      .text('Ficha de Integração', { align: 'center' })
      .moveDown(1);

    const statusLabel = integrationStatusLabels[integrationMember.status] ?? integrationMember.status;
    const statusColor =
      integrationMember.status === 'integrado'
        ? '#047857'
        : integrationMember.status === 'descartado'
          ? '#6B7280'
          : '#2563EB';

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(statusColor)
      .text(statusLabel.toUpperCase(), { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(integrationMember.name.toUpperCase(), { align: 'center' })
      .moveDown(1);

    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Informações Pessoais')
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');

    const personalInfo = [
      { label: 'Data de Nascimento', value: formatIntegrationDate(integrationMember.birth) },
      {
        label: 'Gênero',
        value: integrationMember.gender ? integrationGenderLabels[integrationMember.gender] ?? integrationMember.gender : '-'
      },
      {
        label: 'Estado Civil',
        value: integrationMember.marital_status
          ? integrationMaritalLabels[integrationMember.marital_status] ?? integrationMember.marital_status
          : '-'
      }
    ];

    personalInfo.forEach(info => {
      doc
        .font('Helvetica-Bold')
        .text(info.label + ': ', { continued: true })
        .font('Helvetica')
        .text(info.value ?? '-');
    });

    doc.moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Processo de Integração')
      .moveDown(0.5);

    const processInfo = [
      {
        label: 'Tipo de Recebimento Previsto',
        value: integrationMember.expected_admission_type
          ? integrationAdmissionLabels[integrationMember.expected_admission_type] ?? integrationMember.expected_admission_type
          : '-'
      },
      {
        label: 'Congregação Prevista',
        value: integrationMember.expected_congregation?.name || 'Sede'
      },
      {
        label: 'Responsável/Discipulador',
        value: integrationMember.mentor?.name || '-'
      }
    ];

    processInfo.forEach(info => {
      doc
        .font('Helvetica-Bold')
        .text(info.label + ': ', { continued: true })
        .font('Helvetica')
        .text(info.value ?? '-');
    });

    doc.moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contato')
      .moveDown(0.5);

    if (integrationMember.phone) {
      doc
        .font('Helvetica-Bold')
        .text('Telefone: ', { continued: true })
        .font('Helvetica')
        .text(formatIntegrationPhone(integrationMember.phone));
    }

    if (integrationMember.whatsapp) {
      const whatsappNumber = integrationMember.whatsapp.replace(/\D/g, '');
      doc
        .font('Helvetica-Bold')
        .text('WhatsApp: ', { continued: true })
        .font('Helvetica')
        .fillColor('#25D366')
        .text(formatIntegrationPhone(integrationMember.whatsapp), {
          link: `https://wa.me/${whatsappNumber}`,
          underline: true
        })
        .fillColor('#000000');
    }

    if (integrationMember.mentor) {
      const mentorContacts = [integrationMember.mentor.phone, integrationMember.mentor.whatsapp]
        .filter(Boolean)
        .map(contact => formatIntegrationPhone(contact!))
        .join(' | ');

      doc
        .font('Helvetica-Bold')
        .text('Contato do Responsável: ', { continued: true })
        .font('Helvetica')
        .text(mentorContacts || '-');
    }

    doc.moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Notas')
      .moveDown(0.5);

    doc.font('Helvetica').text(formatIntegrationNotes(integrationMember.notes), {
      align: 'justify'
    });

    doc.moveDown(2);

    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
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

    if (filters) {
      if (filters.search) {
        const safeSearch = filters.search.replace(/,/g, '');
        query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,whatsapp.ilike.%${safeSearch}%`);
      }
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters.expectedCongregationId) {
        if (filters.expectedCongregationId === 'sede') {
          query = query.is('expected_congregation_id', null);
        } else {
          query = query.eq('expected_congregation_id', filters.expectedCongregationId);
        }
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

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    const filename = `lista-integrantes-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      birth: 'Data de Nascimento',
      gender: 'Gênero',
      marital_status: 'Estado Civil',
      phone: 'Telefone',
      whatsapp: 'WhatsApp',
      expected_admission_type: 'Recebimento Previsto',
      expected_congregation: 'Congregação Prevista',
      mentor: 'Responsável',
      mentor_contact: 'Contato do Responsável',
      status: 'Status',
      notes: 'Notas',
      created_at: 'Criado em',
      updated_at: 'Atualizado em'
    };

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(churchData?.name, { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font('Helvetica')
      .text('Lista de Integrantes', { align: 'center' })
      .moveDown(0.2);

    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' })
      .text(`Total: ${integrationMembers.length} integrantes`, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke()
      .moveDown(0.5);

    const pageWidth = doc.page.width - 80;
    const columnWidth = pageWidth / fields.length;
    const rowHeight = 25;
    const headerHeight = 30;
    let currentY = doc.y;

    const drawHeader = () => {
      doc.fontSize(8).font('Helvetica-Bold');
      fields.forEach((field, index) => {
        const x = 40 + index * columnWidth;
        doc.rect(x, currentY, columnWidth, headerHeight).fillAndStroke('#F3F4F6', '#E5E7EB');
        doc
          .fillColor('#000000')
          .text(fieldLabels[field] || field, x + 5, currentY + 8, {
            width: columnWidth - 10,
            align: 'left'
          });
      });
      currentY += headerHeight;
      doc.fontSize(7).font('Helvetica');
    };

    drawHeader();

    integrationMembers.forEach((member: any, rowIndex: number) => {
      if (currentY + rowHeight > doc.page.height - 60) {
        doc.addPage();
        currentY = 40;
        drawHeader();
      }

      if (rowIndex % 2 === 0) {
        doc.rect(40, currentY, pageWidth, rowHeight).fillAndStroke('#FAFAFA', '#E5E7EB');
      } else {
        doc.rect(40, currentY, pageWidth, rowHeight).stroke('#E5E7EB');
      }

      fields.forEach((field, colIndex) => {
        const x = 40 + colIndex * columnWidth;
        let value = '';

        switch (field) {
          case 'name':
            value = member.name ? member.name.toUpperCase() : '-';
            break;
          case 'birth':
            value = formatIntegrationDate(member.birth);
            break;
          case 'gender':
            value = member.gender ? integrationGenderLabels[member.gender] ?? member.gender : '-';
            break;
          case 'marital_status':
            value = member.marital_status
              ? integrationMaritalLabels[member.marital_status] ?? member.marital_status
              : '-';
            break;
          case 'phone':
            value = formatIntegrationPhone(member.phone);
            break;
          case 'whatsapp':
            value = formatIntegrationPhone(member.whatsapp);
            break;
          case 'expected_admission_type':
            value = member.expected_admission_type
              ? integrationAdmissionLabels[member.expected_admission_type] ?? member.expected_admission_type
              : '-';
            break;
          case 'expected_congregation':
            value = member.expected_congregation?.name || 'Sede';
            break;
          case 'mentor':
            value = member.mentor?.name || '-';
            break;
          case 'mentor_contact':
            value = [member.mentor?.phone, member.mentor?.whatsapp].filter(Boolean).join(' | ') || '-';
            break;
          case 'status':
            value = integrationStatusLabels[member.status] ?? member.status;
            break;
          case 'notes':
            value = member.notes ? (member.notes.length > 80 ? `${member.notes.slice(0, 77)}...` : member.notes) : '-';
            break;
          case 'created_at':
            value = formatIntegrationDate(member.created_at);
            break;
          case 'updated_at':
            value = formatIntegrationDate(member.updated_at);
            break;
          default:
            value = '-';
        }

        doc
          .fillColor('#000000')
          .text(value, x + 5, currentY + 8, {
            width: columnWidth - 10,
            align: 'left',
            ellipsis: true
          });
      });

      currentY += rowHeight;
    });

    doc
      .fontSize(7)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );

    doc.end();
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
    console.log('📊 Iniciando exportação de dashboard PDF...');

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

    console.log('✅ Igreja encontrada:', churchData?.name);

    // Obter filtros da query string
    const { congregation_id } = req.query;
    const filters: any = {};

    if (congregation_id) {
      filters.congregation_id = congregation_id as string;
    }

    console.log('🔍 Filtros aplicados:', filters);

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
    console.log('📡 Buscando dados dos relatórios...');
    await getMemberReports(mockReq, mockRes);

    console.log('📊 Status da resposta:', statusCode);
    console.log('📊 Dados recebidos:', reportsData ? 'Sim' : 'Não');

    if (!reportsData || statusCode !== 200) {
      console.error('❌ Erro ao buscar dados dos relatórios');
      return res.status(500).json({
        error: 'Erro ao buscar dados',
        details: 'Não foi possível obter dados dos relatórios'
      });
    }

    console.log('✅ Dados dos relatórios obtidos com sucesso');

    // Determinar título do relatório baseado nos filtros
    let reportTitle = 'Relatório Geral';
    let reportSubtitle = 'Todos os membros da igreja';

    if (congregation_id === 'sede') {
      reportTitle = 'Relatório da Sede';
      reportSubtitle = 'Membros da igreja sede';
    } else if (congregation_id && congregation_id !== 'sede') {
      // Buscar nome da congregação
      const { data: congregation } = await supabase
        .from('congregations')
        .select('name')
        .eq('id', congregation_id)
        .eq('church_id', churchId)
        .single();

      if (congregation) {
        reportTitle = `Relatório - ${congregation.name}`;
        reportSubtitle = `Membros da congregação ${congregation.name}`;
      }
    }

    console.log('📄 Iniciando geração do PDF...');

    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Configurar headers para download
    const filename = `relatorio-${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    console.log('📝 Nome do arquivo:', filename);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    // Handler para erros no stream do PDF
    doc.on('error', (err) => {
      console.error('❌ Erro no stream do PDF:', err);
    });

    // ===== CABEÇALHO =====
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(churchData?.name, { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(16)
      .font('Helvetica')
      .text(reportTitle, { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .fillColor('#6B7280')
      .text(reportSubtitle, { align: 'center' })
      .fillColor('#000000')
      .moveDown(0.5);

    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    // Linha separadora
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    // ===== RESUMO GERAL =====
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Resumo Geral')
      .moveDown(0.5);

    const summary = reportsData.summary;

    // Membros Ativos e Inativos
    doc.fontSize(11).font('Helvetica');
    doc
      .font('Helvetica-Bold')
      .text('Total de Membros: ', { continued: true })
      .font('Helvetica')
      .text(summary.totalMembers.toString());

    doc
      .font('Helvetica-Bold')
      .fillColor('#059669')
      .text('Membros Ativos: ', { continued: true })
      .font('Helvetica')
      .text(`${summary.activeMembers} (${summary.activePercentage}%)`)
      .fillColor('#000000');

    doc
      .font('Helvetica-Bold')
      .fillColor('#DC2626')
      .text('Membros Inativos: ', { continued: true })
      .font('Helvetica')
      .text(`${summary.inactiveMembers} (${100 - summary.activePercentage}%)`)
      .fillColor('#000000');

    doc.moveDown(1);

    // ===== ESTATÍSTICAS DO ANO =====
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Estatísticas do Ano Atual')
      .moveDown(0.5);

    const currentYear = new Date().getFullYear();
    const baptismsThisYear = (reportsData.timeline?.baptismsByYear && typeof reportsData.timeline.baptismsByYear === 'object')
      ? (reportsData.timeline.baptismsByYear[currentYear] || 0)
      : 0;
    const admissionsThisYear = (reportsData.timeline?.admissionsByYear && typeof reportsData.timeline.admissionsByYear === 'object')
      ? (reportsData.timeline.admissionsByYear[currentYear] || 0)
      : 0;

    doc.fontSize(11).font('Helvetica');
    doc
      .font('Helvetica-Bold')
      .text(`Batismos em ${currentYear}: `, { continued: true })
      .font('Helvetica')
      .text(baptismsThisYear.toString());

    doc
      .font('Helvetica-Bold')
      .text(`Recebimento em ${currentYear}: `, { continued: true })
      .font('Helvetica')
      .text(admissionsThisYear.toString());

    doc.moveDown(1);

    // ===== DISTRIBUIÇÃO POR GÊNERO =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Gênero')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.demographics?.gender && typeof reportsData.demographics.gender === 'object') {
      const genderEntries = Object.entries(reportsData.demographics.gender);
      if (genderEntries.length > 0) {
        const total = genderEntries.reduce((sum, [_, count]) => sum + (count as number), 0);

        doc.fontSize(11).font('Helvetica');
        genderEntries.forEach(([gender, count]) => {
          const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${gender}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
    }

    doc.fillColor('#000000').moveDown(1);

    // ===== DISTRIBUIÇÃO POR ESTADO CIVIL =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Estado Civil')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.demographics?.maritalStatus && typeof reportsData.demographics.maritalStatus === 'object') {
      const maritalEntries = Object.entries(reportsData.demographics.maritalStatus)
        .sort(([_, a], [__, b]) => (b as number) - (a as number));

      if (maritalEntries.length > 0) {
        const total = maritalEntries.reduce((sum, [_, count]) => sum + (count as number), 0);

        doc.fontSize(11).font('Helvetica');
        maritalEntries.forEach(([status, count]) => {
          const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${status}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
    }

    doc.fillColor('#000000').moveDown(1);

    // ===== DISTRIBUIÇÃO POR FAIXA ETÁRIA =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Faixa Etária')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.demographics?.ageRanges && typeof reportsData.demographics.ageRanges === 'object') {
      // Ordenar faixas etárias
      const ageOrder = ['0-12', '13-17', '18-25', '26-35', '36-50', '51-65', '65+'];
      const ageEntries = Object.entries(reportsData.demographics.ageRanges)
        .sort(([a], [b]) => ageOrder.indexOf(a) - ageOrder.indexOf(b));

      if (ageEntries.length > 0) {
        const total = ageEntries.reduce((sum, [_, count]) => sum + (count as number), 0);

        doc.fontSize(11).font('Helvetica');
        ageEntries.forEach(([range, count]) => {
          const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${range} anos: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum dado disponível');
    }

    doc.fillColor('#000000').moveDown(1);

    // ===== DISTRIBUIÇÃO POR CONGREGAÇÕES (somente para dados gerais) =====
    if (!congregation_id) {
      if (doc.y > 600) {
        doc.addPage();
      }

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1F2937')
        .text('Distribuição por Congregações')
        .fillColor('#000000')
        .moveDown(0.3);

      if (reportsData.churchStructure?.congregations && typeof reportsData.churchStructure.congregations === 'object') {
        const congEntries = Object.entries(reportsData.churchStructure.congregations)
          .sort(([_, a], [__, b]) => ((b as any).count || 0) - ((a as any).count || 0));

        if (congEntries.length > 0) {
          const total = congEntries.reduce((sum, [_, data]) => sum + ((data as any).count || 0), 0);

          doc.fontSize(11).font('Helvetica');
          congEntries.forEach(([congregation, data]) => {
            const count = (data as any).count || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            doc
              .fillColor('#374151')
              .font('Helvetica-Bold')
              .text(`  • ${congregation}: `, { continued: true })
              .font('Helvetica')
              .fillColor('#6B7280')
              .text(`${count} membros (${percentage}%)`);
          });
          doc.fillColor('#000000');
        } else {
          doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhuma congregação registrada');
        }
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhuma congregação registrada');
      }

      doc.fillColor('#000000').moveDown(1);
    }

    // ===== DISTRIBUIÇÃO POR CIDADES (TOP 10) =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Cidades (Top 10)')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.demographics?.cities && typeof reportsData.demographics.cities === 'object') {
      const cityEntries = Object.entries(reportsData.demographics.cities)
        .sort(([_, a], [__, b]) => (b as number) - (a as number))
        .slice(0, 10);

      if (cityEntries.length > 0) {
        const total = Object.values(reportsData.demographics.cities).reduce((sum: number, count) => sum + (count as number), 0);

        doc.fontSize(11).font('Helvetica');
        cityEntries.forEach(([city, count]) => {
          const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${city}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhuma cidade registrada');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhuma cidade registrada');
    }

    doc.fillColor('#000000').moveDown(1);

    // ===== DISTRIBUIÇÃO POR ESTADOS =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Estados')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.demographics?.states && typeof reportsData.demographics.states === 'object') {
      const stateEntries = Object.entries(reportsData.demographics.states)
        .sort(([_, a], [__, b]) => (b as number) - (a as number));

      if (stateEntries.length > 0) {
        const total = Object.values(reportsData.demographics.states).reduce((sum: number, count) => sum + (count as number), 0);

        doc.fontSize(11).font('Helvetica');
        stateEntries.forEach(([state, count]) => {
          const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${state}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum estado registrado');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum estado registrado');
    }

    doc.fillColor('#000000').moveDown(1);

    // ===== OCUPAÇÕES (TOP 10) =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Principais Ocupações (Top 10)')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.topOccupations && Array.isArray(reportsData.topOccupations) && reportsData.topOccupations.length > 0) {
      const total = reportsData.topOccupations.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

      doc.fontSize(11).font('Helvetica');
      reportsData.topOccupations.forEach((item: any) => {
        const count = item.count || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        doc
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .text(`  • ${item.occupation}: `, { continued: true })
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(`${count} membros (${percentage}%)`);
      });
      doc.fillColor('#000000');
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhuma ocupação registrada');
    }

    doc.fillColor('#000000').moveDown(2);

    // ===== GRUPOS/MINISTÉRIOS =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Grupos/Ministérios')
      .fillColor('#000000')
      .moveDown(0.5);

    // Buscar grupos da igreja
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

    // Aplicar filtro de congregação se necessário
    if (congregation_id) {
      if (congregation_id === 'sede') {
        groupsQuery = groupsQuery.is('congregation_id', null);
      } else {
        groupsQuery = groupsQuery.eq('congregation_id', congregation_id);
      }
    }

    const { data: groups, error: groupsError } = await groupsQuery;

    if (!groupsError && groups && groups.length > 0) {
      // Contar membros em cada grupo
      const groupsWithCounts = await Promise.all(
        groups.map(async (group: any) => {
          const { count: memberCount } = await supabase
            .from('member_groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            memberCount: memberCount || 0
          };
        })
      );

      // Agrupar por tipo
      const groupsByType: Record<string, typeof groupsWithCounts> = {};
      groupsWithCounts.forEach((group: any) => {
        const type = group.type || 'Outros';
        if (!groupsByType[type]) {
          groupsByType[type] = [];
        }
        groupsByType[type].push(group);
      });

      // Ordenar tipos e grupos dentro de cada tipo
      const typeOrder = [
        'Ministério', 'Departamento', 'Grupo', 'Equipe', 'Time', 'Comissão',
        'Célula', 'Grupo de Crescimento', 'Pequeno Grupo', 'Discipulado',
        'Classe', 'Núcleo', 'Região'
      ];

      const sortedTypes = Object.keys(groupsByType).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      doc.fontSize(11).font('Helvetica');

      sortedTypes.forEach((type) => {
        const typeGroups = groupsByType[type]
          .sort((a: any, b: any) => (b.memberCount || 0) - (a.memberCount || 0));

        const totalMembersInType = typeGroups.reduce((sum: number, g: any) => sum + (g.memberCount || 0), 0);
        const totalMembersForPercentage = summary.totalMembers;

        // Verificar se precisa de nova página
        if (doc.y > 550) {
          doc.addPage();
        }

        // Título do tipo
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text(type)
          .moveDown(0.3);

        // Informação do total do tipo
        if (totalMembersForPercentage > 0) {
          const typePercentage = ((totalMembersInType / totalMembersForPercentage) * 100).toFixed(1);
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`  Total: ${totalMembersInType} membros de ${totalMembersForPercentage} (${typePercentage}%)`)
            .moveDown(0.2);
        }

        doc.fontSize(11).font('Helvetica');

        // Listar grupos do tipo
        typeGroups.forEach((group: any) => {
          const groupPercentage = totalMembersInType > 0
            ? ((group.memberCount / totalMembersInType) * 100).toFixed(1)
            : '0.0';

          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`    • ${group.name}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${group.memberCount} membros (${groupPercentage}%)`);
        });

        doc.fillColor('#000000').moveDown(0.5);
      });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum grupo registrado');
    }

    doc.fillColor('#000000').moveDown(2);

    // Rodapé
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
        { align: 'center' }
      );

    console.log('✅ PDF gerado com sucesso');

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('❌ Erro ao gerar PDF do dashboard:', error);

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
    console.log('📊 Iniciando exportação de lista de membros...');

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

    console.log('✅ Igreja encontrada:', churchData?.name);
    console.log('🔍 Filtros recebidos:', filters);
    console.log('📋 Campos selecionados:', fields);

    // Construir query para buscar membros
    let query = supabase
      .from('members')
      .select(`
        *,
        congregation:congregations(name)
      `)
      .eq('church_id', churchId);

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('active', filters.status === 'active');
      }
      if (filters.congregation_id) {
        if (filters.congregation_id === 'sede') {
          query = query.is('congregation_id', null);
        } else {
          query = query.eq('congregation_id', filters.congregation_id);
        }
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
      console.error('❌ Erro ao buscar membros:', membersError);
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

    console.log(`✅ ${members.length} membros encontrados`);

    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape', // Paisagem para melhor visualização de tabelas
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    // Configurar headers para download
    const filename = `lista-membros-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    console.log('📝 Nome do arquivo:', filename);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    // Handler para erros no stream do PDF
    doc.on('error', (err) => {
      console.error('❌ Erro no stream do PDF:', err);
    });

    const calculateAge = calculateAgeSafe;
    const formatDate = formatDateSafe;

    // Helper para formatar telefone
    const formatPhone = (phone: string) => {
      if (!phone) return '-';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    };

    // Mapear campos para labels
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      age: 'Idade',
      birth: 'Nascimento',
      gender: 'Gênero',
      marital_status: 'Estado Civil',
      hometown: 'Natural de',
      nationality: 'Nacionalidade (legado)',
      wedding_date: 'Data do Casamento',
      spouse: 'Cônjuge',
      father_name: 'Nome do Pai',
      mother_name: 'Nome da Mãe',
      occupation: 'Profissão',
      children: 'Filhos',
      phone: 'Telefone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      active: 'Status',
      congregation: 'Congregação',
      baptism_date: 'Batismo',
      admission: 'Recebimento',
      admission_date: 'Data Recebimento',
      address: 'Endereço',
      address_number: 'Número',
      complement: 'Complemento',
      neighborhood: 'Bairro',
      city: 'Cidade',
      state: 'Estado',
      cep: 'CEP'
    };

    // ===== CABEÇALHO =====
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(churchData?.name, { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font('Helvetica')
      .text('Lista de Membros', { align: 'center' })
      .moveDown(0.2);

    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' })
      .text(`Total: ${members.length} membros`, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    // Linha separadora
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke()
      .moveDown(0.5);

    // ===== TABELA =====
    const pageWidth = doc.page.width - 80; // Margem esquerda + direita
    const columnWidth = pageWidth / fields.length;
    const rowHeight = 25;
    const headerHeight = 30;
    let currentY = doc.y;

    // Cabeçalho da tabela
    doc.fontSize(8).font('Helvetica-Bold');

    fields.forEach((field, index) => {
      const x = 40 + (index * columnWidth);

      // Fundo do cabeçalho
      doc
        .rect(x, currentY, columnWidth, headerHeight)
        .fillAndStroke('#F3F4F6', '#E5E7EB');

      // Texto do cabeçalho
      doc
        .fillColor('#000000')
        .text(
          fieldLabels[field] || field,
          x + 5,
          currentY + 8,
          { width: columnWidth - 10, align: 'left' }
        );
    });

    currentY += headerHeight;

    // Linhas de dados
    doc.fontSize(7).font('Helvetica');

    members.forEach((member, rowIndex) => {
      // Verificar se precisa de nova página
      if (currentY + rowHeight > doc.page.height - 60) {
        doc.addPage();
        currentY = 40;

        // Repetir cabeçalho
        doc.fontSize(8).font('Helvetica-Bold');
        fields.forEach((field, index) => {
          const x = 40 + (index * columnWidth);
          doc
            .rect(x, currentY, columnWidth, headerHeight)
            .fillAndStroke('#F3F4F6', '#E5E7EB');
          doc
            .fillColor('#000000')
            .text(
              fieldLabels[field] || field,
              x + 5,
              currentY + 8,
              { width: columnWidth - 10, align: 'left' }
            );
        });
        currentY += headerHeight;
        doc.fontSize(7).font('Helvetica');
      }

      // Fundo alternado das linhas
      if (rowIndex % 2 === 0) {
        doc
          .rect(40, currentY, pageWidth, rowHeight)
          .fillAndStroke('#FAFAFA', '#E5E7EB');
      } else {
        doc
          .rect(40, currentY, pageWidth, rowHeight)
          .stroke('#E5E7EB');
      }

      // Dados das células
      fields.forEach((field, colIndex) => {
        const x = 40 + (colIndex * columnWidth);
        let value = '';

        switch (field) {
          case 'name':
            value = member.name ? member.name.toUpperCase() : '-';
            break;
          case 'age':
            const age = calculateAge(member.birth);
            value = age !== null ? `${age}` : '-';
            break;
          case 'birth':
            value = formatDate(member.birth);
            break;
          case 'gender':
            value = member.gender || '-';
            break;
          case 'marital_status':
            value = member.marital_status || '-';
            break;
          case 'hometown':
            value = member.hometown || '-';
            break;
          case 'nationality':
            value = member.nationality || '-';
            break;
          case 'document':
            value = member.document || '-';
            break;
          case 'wedding_date':
            value = formatDate(member.wedding_date);
            break;
          case 'spouse':
            value = member.spouse || '-';
            break;
          case 'father_name':
            value = member.father_name || '-';
            break;
          case 'mother_name':
            value = member.mother_name || '-';
            break;
          case 'occupation':
            value = member.occupation || '-';
            break;
          case 'children':
            if (member.children && Array.isArray(member.children) && member.children.length > 0) {
              const childrenText = member.children.map((child: any) => {
                const childAge = child.birth ? calculateAge(child.birth) : null;
                let text = child.name;
                if (childAge !== null) {
                  text += ` (${childAge} ${childAge === 1 ? 'ano' : 'anos'})`;
                }
                if (child.dependent === true) {
                  text += ' - Reside junto';
                } else if (child.dependent === false) {
                  text += ' - Não reside junto';
                }
                return text;
              }).join('; ');
              value = childrenText;
            } else {
              value = '-';
            }
            break;
          case 'phone':
            value = formatPhone(member.phone);
            break;
          case 'whatsapp':
            value = formatPhone(member.whatsapp);
            break;
          case 'email':
            value = member.email || '-';
            break;
          case 'active':
            value = member.active ? 'Ativo' : 'Inativo';
            break;
          case 'congregation':
            value = member.congregation?.name || 'Sede';
            break;
          case 'baptism_date':
            value = formatDate(member.baptism_date);
            break;
          case 'admission':
            value = member.admission || '-';
            break;
          case 'admission_date':
            value = formatDate(member.admission_date);
            break;
          case 'address':
            value = member.address || '-';
            break;
          case 'address_number':
            value = member.address_number || '-';
            break;
          case 'complement':
            value = member.complement || '-';
            break;
          case 'neighborhood':
            value = member.neighborhood || '-';
            break;
          case 'city':
            value = member.city || '-';
            break;
          case 'state':
            value = member.state || '-';
            break;
          case 'cep':
            value = member.cep || '-';
            break;
          default:
            value = '-';
        }

        doc
          .fillColor('#000000')
          .text(
            value,
            x + 5,
            currentY + 8,
            { width: columnWidth - 10, align: 'left', ellipsis: true }
          );
      });

      currentY += rowHeight;
    });

    // Rodapé
    doc
      .fontSize(7)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );

    console.log('✅ PDF gerado com sucesso');

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('❌ Erro ao gerar PDF da lista de membros:', error);

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

    const { filters } = req.body;

    // Campos fixos: nome, congregação, responsável, quantidade de membros
    const fields = ['name', 'congregation', 'responsible_name', 'member_count'] as const;

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
          name
        ),
        members!groups_responsible_id_fkey (
          id,
          name,
          email,
          phone,
          whatsapp
        )
      `)
      .eq('church_id', churchId);

    // Aplicar filtros (mesma lógica de listGroups)
    if (filters) {
      if (filters.congregation_id) {
        if (filters.congregation_id === 'sede') {
          query = query.is('congregation_id', null);
        } else {
          query = query.eq('congregation_id', filters.congregation_id);
        }
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status === 'active');
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
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

    // Helpers
    const formatPhone = (phone: string | null) => {
      if (!phone) return '-';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    };

    const fieldLabels: Record<string, string> = {
      name: 'Nome do grupo',
      congregation: 'Congregação',
      responsible_name: 'Responsável',
      member_count: 'Qtd. membros',
    };

    const getGroupValue = (group: any, field: string) => {
      switch (field) {
        case 'name':
          return group.name || '-';
        case 'congregation':
          return group.congregations?.name || 'Sede';
        case 'responsible_name':
          return group.members?.name || '-';
        case 'member_count':
          return String(memberCounts[group.id] ?? 0);
        default:
          return '-';
      }
    };

    const groupIds = (groups as any[]).map(g => g.id);
    const memberCounts: Record<string, number> = {};

    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        const { count } = await supabase
          .from('member_groups')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId);

        memberCounts[groupId] = count || 0;
      }
    }

    // Criar PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const filename = `lista-grupos-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Cabeçalho
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(churchData?.name || '', { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font('Helvetica')
      .text('Lista de Grupos', { align: 'center' })
      .moveDown(0.2);

    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        { align: 'center' },
      )
      .text(`Total: ${groups.length} grupo(s)`, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    const pageWidth = doc.page.width - 80;
    const columnWidth = pageWidth / fields.length;
    const rowHeight = 25;
    const headerHeight = 30;
    let currentY = doc.y;

    let lastType: string | null = null;

    // Para cada grupo (já ordenados por type, name)
    (groups as any[]).forEach((group, index) => {
      // Quebra por tipo: quando muda o type, desenha cabeçalho de seção + header da tabela
      if (group.type !== lastType) {
        lastType = group.type;

        // Espaço + título da seção
        doc
          .moveDown(0.8)
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text(`Tipo: ${group.type}`, 40)
          .moveDown(0.3);

        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }

        // Cabeçalho da tabela para esse tipo
        currentY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold');
        fields.forEach((field: string, colIndex: number) => {
          const x = 40 + colIndex * columnWidth;
          doc
            .rect(x, currentY, columnWidth, headerHeight)
            .fillAndStroke('#F3F4F6', '#E5E7EB');
          doc
            .fillColor('#000000')
            .text(fieldLabels[field] || field, x + 5, currentY + 8, {
              width: columnWidth - 10,
              align: 'left',
            });
        });
        currentY += headerHeight;
        doc.fontSize(7).font('Helvetica');
      }

      // Nova página se necessário
      if (currentY + rowHeight > doc.page.height - 60) {
        doc.addPage();
        currentY = 40;

        // Repetir cabeçalho da tabela
        doc.fontSize(8).font('Helvetica-Bold');
        fields.forEach((field: string, colIndex: number) => {
          const x = 40 + colIndex * columnWidth;
          doc
            .rect(x, currentY, columnWidth, headerHeight)
            .fillAndStroke('#F3F4F6', '#E5E7EB');
          doc
            .fillColor('#000000')
            .text(fieldLabels[field] || field, x + 5, currentY + 8, {
              width: columnWidth - 10,
              align: 'left',
            });
        });
        currentY += headerHeight;
        doc.fontSize(7).font('Helvetica');
      }

      // Fundo alternado
      if (index % 2 === 0) {
        doc.rect(40, currentY, pageWidth, rowHeight).fillAndStroke('#FAFAFA', '#E5E7EB');
      } else {
        doc.rect(40, currentY, pageWidth, rowHeight).stroke('#E5E7EB');
      }

      // Células
      fields.forEach((field: string, colIndex: number) => {
        const x = 40 + colIndex * columnWidth;
        const value = getGroupValue(group, field);
        doc
          .fillColor('#000000')
          .text(value, x + 5, currentY + 8, {
            width: columnWidth - 10,
            align: 'left',
            ellipsis: true,
          });
      });

      currentY += rowHeight;
    });

    // Rodapé
    doc
      .fontSize(7)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: pageWidth },
      );

    doc.end();
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

    const formatPhone = (phone: string | null) => {
      if (!phone) return '-';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    };

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const filename = `lista-congregacoes-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(churchData?.name || '', { align: 'center' })
      .moveDown(0.3);
    doc
      .fontSize(14)
      .font('Helvetica')
      .text('Lista de Congregações', { align: 'center' })
      .moveDown(0.2);
    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        { align: 'center' },
      )
      .text(`Total: ${congregations.length} congregação(ões)`, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);

    const pageWidth = doc.page.width - 80;
    const fields = ['name', 'address', 'city_state', 'leader', 'phone', 'member_count'];
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      address: 'Endereço',
      city_state: 'Cidade / Estado',
      leader: 'Líder',
      phone: 'Telefone',
      member_count: 'Qtd. membros',
    };
    const columnWidth = pageWidth / fields.length;
    const rowHeight = 22;
    const headerHeight = 28;
    let currentY = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    fields.forEach((field: string, colIndex: number) => {
      const x = 40 + colIndex * columnWidth;
      doc.rect(x, currentY, columnWidth, headerHeight).fillAndStroke('#F3F4F6', '#E5E7EB');
      doc
        .fillColor('#000000')
        .text(fieldLabels[field] || field, x + 5, currentY + 8, { width: columnWidth - 10, align: 'left' });
    });
    currentY += headerHeight;
    doc.fontSize(7).font('Helvetica');

    (congregations as any[]).forEach((c: any, index: number) => {
      if (currentY + rowHeight > doc.page.height - 60) {
        doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
        currentY = 40;
        doc.fontSize(8).font('Helvetica-Bold');
        fields.forEach((field: string, colIndex: number) => {
          const x = 40 + colIndex * columnWidth;
          doc.rect(x, currentY, columnWidth, headerHeight).fillAndStroke('#F3F4F6', '#E5E7EB');
          doc
            .fillColor('#000000')
            .text(fieldLabels[field] || field, x + 5, currentY + 8, { width: columnWidth - 10, align: 'left' });
        });
        currentY += headerHeight;
        doc.fontSize(7).font('Helvetica');
      }

      if (index % 2 === 0) {
        doc.rect(40, currentY, pageWidth, rowHeight).fillAndStroke('#FAFAFA', '#E5E7EB');
      } else {
        doc.rect(40, currentY, pageWidth, rowHeight).stroke('#E5E7EB');
      }

      const cityState = [c.city, c.state].filter(Boolean).join(' / ') || '-';
      const values: Record<string, string> = {
        name: c.name || '-',
        address: (c.address || '-').substring(0, 35),
        city_state: cityState,
        leader: c.leader || '-',
        phone: formatPhone(c.phone),
        member_count: String(memberCountByCongregation[c.id] ?? 0),
      };
      fields.forEach((field: string, colIndex: number) => {
        const x = 40 + colIndex * columnWidth;
        doc
          .fillColor('#000000')
          .text(values[field] || '-', x + 5, currentY + 6, {
            width: columnWidth - 10,
            align: 'left',
            ellipsis: true,
          });
      });
      currentY += rowHeight;
    });

    doc
      .fontSize(7)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: pageWidth },
      );

    doc.end();
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
        congregations ( id, name ),
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

    const { data: memberGroups } = await supabase
      .from('member_groups')
      .select('member_id')
      .eq('group_id', groupId);

    const memberIds = (memberGroups || []).map((mg: { member_id: string }) => mg.member_id);

    let members: any[] = [];
    if (memberIds.length > 0) {
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
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    const filename = `grupo-${(group.name || 'grupo').replace(/\s+/g, '-')}-membros-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    doc.on('error', (err) => {
      console.error('Erro no stream do PDF:', err);
    });

    const calculateAge = (birth: string) => {
      if (!birth) return null;
      const birthDate = new Date(birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const formatDate = (date: string | null) => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('pt-BR');
    };

    const formatPhone = (phone: string) => {
      if (!phone) return '-';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 10) return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      if (numbers.length === 11) return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      return phone;
    };

    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      age: 'Idade',
      birth: 'Nascimento',
      gender: 'Gênero',
      marital_status: 'Estado Civil',
      nationality: 'Nacionalidade',
      spouse: 'Cônjuge',
      father_name: 'Nome do Pai',
      mother_name: 'Nome da Mãe',
      occupation: 'Profissão',
      children: 'Filhos',
      phone: 'Telefone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      active: 'Status',
      congregation: 'Congregação',
      baptism_date: 'Batismo',
      admission: 'Recebimento',
      admission_date: 'Data Recebimento',
      address: 'Endereço',
      complement: 'Complemento',
      neighborhood: 'Bairro',
      city: 'Cidade',
      state: 'Estado',
      cep: 'CEP'
    };

    const groupData = group as any;
    const congregationName = groupData.congregations?.name || 'Sede';
    const responsible = groupData.members || null;

    doc.fontSize(18).font('Helvetica-Bold').text(churchData?.name || '', { align: 'center' }).moveDown(0.3);
    doc.fontSize(14).font('Helvetica').text('Lista de membros do grupo', { align: 'center' }).moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Grupo', 40, doc.y).moveDown(0.2);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Nome: ${groupData.name || '-'}`, 40, doc.y).moveDown(0.15);
    doc.text(`Tipo: ${groupData.type || '-'}`, 40, doc.y).moveDown(0.15);
    doc.text(`Congregação: ${congregationName}`, 40, doc.y).moveDown(0.15);
    if (responsible) {
      doc.text(`Responsável: ${responsible.name || '-'}`, 40, doc.y).moveDown(0.15);
      if (responsible.email || responsible.phone || responsible.whatsapp) {
        const contact: string[] = [];
        if (responsible.email) contact.push(`E-mail: ${responsible.email}`);
        if (responsible.phone) contact.push(`Telefone: ${formatPhone(responsible.phone)}`);
        if (responsible.whatsapp) contact.push(`WhatsApp: ${formatPhone(responsible.whatsapp)}`);
        doc.text(contact.join('  |  '), 40, doc.y).moveDown(0.15);
      }
    }
    doc.moveDown(0.5);

    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke().moveDown(0.5);

    doc.fontSize(9).fillColor('#6B7280').text(`Total: ${members.length} membro(s)  •  Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 40, doc.y).fillColor('#000000').moveDown(0.8);

    const pageWidth = doc.page.width - 80;
    const columnWidth = pageWidth / fields.length;
    const rowHeight = 25;
    const headerHeight = 30;
    let currentY = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    fields.forEach((field: string, index: number) => {
      const x = 40 + index * columnWidth;
      doc.rect(x, currentY, columnWidth, headerHeight).fillAndStroke('#F3F4F6', '#E5E7EB');
      doc.fillColor('#000000').text(fieldLabels[field] || field, x + 5, currentY + 8, { width: columnWidth - 10, align: 'left' });
    });
    currentY += headerHeight;

    doc.fontSize(7).font('Helvetica');

    const getMemberValue = (member: any, field: string) => {
      switch (field) {
        case 'name': return member.name ? member.name.toUpperCase() : '-';
        case 'age': {
          const age = calculateAge(member.birth);
          return age !== null ? `${age}` : '-';
        }
        case 'birth': return formatDate(member.birth);
        case 'gender': return member.gender || '-';
        case 'marital_status': return member.marital_status || '-';
        case 'nationality': return member.nationality || '-';
        case 'spouse': return member.spouse || '-';
        case 'father_name': return member.father_name || '-';
        case 'mother_name': return member.mother_name || '-';
        case 'occupation': return member.occupation || '-';
        case 'children':
          if (member.children && Array.isArray(member.children) && member.children.length > 0) {
            return member.children.map((c: any) => c.name).join('; ') || '-';
          }
          return '-';
        case 'phone': return formatPhone(member.phone);
        case 'whatsapp': return formatPhone(member.whatsapp);
        case 'email': return member.email || '-';
        case 'active': return member.active ? 'Ativo' : 'Inativo';
        case 'congregation': return member.congregation?.name || 'Sede';
        case 'baptism_date': return formatDate(member.baptism_date);
        case 'admission': return member.admission || '-';
        case 'admission_date': return formatDate(member.admission_date);
        case 'address': return member.address || '-';
        case 'complement': return member.complement || '-';
        case 'neighborhood': return member.neighborhood || '-';
        case 'city': return member.city || '-';
        case 'state': return member.state || '-';
        case 'cep': return member.cep || '-';
        default: return '-';
      }
    };

    members.forEach((member, rowIndex) => {
      if (currentY + rowHeight > doc.page.height - 60) {
        doc.addPage();
        currentY = 40;
        doc.fontSize(8).font('Helvetica-Bold');
        fields.forEach((field: string, index: number) => {
          const x = 40 + index * columnWidth;
          doc.rect(x, currentY, columnWidth, headerHeight).fillAndStroke('#F3F4F6', '#E5E7EB');
          doc.fillColor('#000000').text(fieldLabels[field] || field, x + 5, currentY + 8, { width: columnWidth - 10, align: 'left' });
        });
        currentY += headerHeight;
        doc.fontSize(7).font('Helvetica');
      }

      if (rowIndex % 2 === 0) {
        doc.rect(40, currentY, pageWidth, rowHeight).fillAndStroke('#FAFAFA', '#E5E7EB');
      } else {
        doc.rect(40, currentY, pageWidth, rowHeight).stroke('#E5E7EB');
      }

      fields.forEach((field: string, colIndex: number) => {
        const x = 40 + colIndex * columnWidth;
        const value = getMemberValue(member, field);
        doc.fillColor('#000000').text(value, x + 5, currentY + 8, { width: columnWidth - 10, align: 'left', ellipsis: true });
      });
      currentY += rowHeight;
    });

    doc.fontSize(7).fillColor('#6B7280').text(
      `Relatório gerado pelo sistema de gestão eclesiástica - ${churchData?.name}`,
      40,
      doc.page.height - 30,
      { align: 'center', width: pageWidth }
    );

    doc.end();
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
    console.log('📊 Iniciando exportação de lista de membros em CSV...');

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

    const churchId = req.church!.churchId;
    const { data: churchData } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    console.log('✅ Igreja encontrada:', churchData?.name);
    console.log('🔍 Filtros recebidos:', filters);
    console.log('📋 Campos selecionados:', fields);
    console.log('🔧 Delimitador:', delimiter);
    console.log('📑 Incluir cabeçalho:', includeHeaders);

    // Construir query para buscar membros (mesma lógica do PDF)
    let query = supabase
      .from('members')
      .select(`
        *,
        congregation:congregations(name)
      `)
      .eq('church_id', churchId);

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
      if (filters.congregation_id) {
        if (filters.congregation_id === 'sede') {
          query = query.is('congregation_id', null);
        } else {
          query = query.eq('congregation_id', filters.congregation_id);
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
      console.error('❌ Erro ao buscar membros:', membersError);
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

    console.log(`✅ ${members.length} membros encontrados`);

    // Helper para calcular idade
    const calculateAge = (birth: string) => {
      if (!birth) return null;
      const birthDate = new Date(birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Helper para formatar data
    const formatDate = (date: string | null) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('pt-BR');
    };

    // Helper para escapar valores CSV (tratar vírgulas, aspas, quebras de linha)
    const escapeCSVValue = (value: string): string => {
      if (!value) return '';
      const stringValue = String(value);
      // Se contém delimitador, aspas ou quebra de linha, precisa ser envolvido em aspas
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Escapar aspas duplicando-as
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Mapear campos para labels
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      age: 'Idade',
      birth: 'Data de Nascimento',
      gender: 'Gênero',
      marital_status: 'Estado Civil',
      nationality: 'Nacionalidade',
      document: 'Documento',
      spouse: 'Cônjuge',
      occupation: 'Profissão',
      father_name: 'Nome do Pai',
      mother_name: 'Nome da Mãe',
      phone: 'Telefone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      active: 'Status',
      congregation: 'Congregação',
      baptism_date: 'Data de Batismo',
      admission: 'Tipo de Recebimento',
      admission_date: 'Data de Recebimento',
      address: 'Endereço',
      complement: 'Complemento',
      neighborhood: 'Bairro',
      city: 'Cidade',
      state: 'Estado',
      cep: 'CEP',
      children: 'Filhos'
    };

    // Construir CSV
    let csvContent = '';

    // Cabeçalho (se solicitado)
    if (includeHeaders) {
      const headers = fields.map(field => escapeCSVValue(fieldLabels[field] || field));
      csvContent += headers.join(delimiter) + '\n';
    }

    // Linhas de dados
    members.forEach((member) => {
      const row: string[] = [];

      fields.forEach((field) => {
        let value = '';

        switch (field) {
          case 'name':
            value = member.name || '';
            break;
          case 'age':
            const age = calculateAge(member.birth);
            value = age !== null ? String(age) : '';
            break;
          case 'birth':
            value = formatDate(member.birth);
            break;
          case 'gender':
            value = member.gender || '';
            break;
          case 'marital_status':
            value = member.marital_status || '';
            break;
          case 'nationality':
            value = member.nationality || '';
            break;
          case 'document':
            value = member.document || '';
            break;
          case 'spouse':
            value = member.spouse || '';
            break;
          case 'occupation':
            value = member.occupation || '';
            break;
          case 'father_name':
            value = member.father_name || '';
            break;
          case 'mother_name':
            value = member.mother_name || '';
            break;
          case 'phone':
            value = member.phone || '';
            break;
          case 'whatsapp':
            value = member.whatsapp || '';
            break;
          case 'email':
            value = member.email || '';
            break;
          case 'active':
            value = member.active ? 'Ativo' : 'Inativo';
            break;
          case 'congregation':
            value = member.congregation?.name || 'Sede';
            break;
          case 'baptism_date':
            value = formatDate(member.baptism_date);
            break;
          case 'admission':
            value = member.admission || '';
            break;
          case 'admission_date':
            value = formatDate(member.admission_date);
            break;
          case 'address':
            value = member.address || '';
            break;
          case 'complement':
            value = member.complement || '';
            break;
          case 'neighborhood':
            value = member.neighborhood || '';
            break;
          case 'city':
            value = member.city || '';
            break;
          case 'state':
            value = member.state || '';
            break;
          case 'cep':
            value = member.cep || '';
            break;
          case 'children':
            // Formato: "Nome1|Data1|Dependente1;Nome2|Data2|Dependente2"
            if (member.children && Array.isArray(member.children) && member.children.length > 0) {
              const childrenParts = member.children.map((child: any) => {
                const parts = [child.name || ''];
                if (child.birth) {
                  const birthDate = formatDate(child.birth);
                  parts.push(birthDate);
                }
                if (child.dependent !== undefined) {
                  parts.push(child.dependent ? 'Sim' : 'Não');
                }
                return parts.join('|');
              });
              value = childrenParts.join(';');
            } else {
              value = '';
            }
            break;
          default:
            value = '';
        }

        row.push(escapeCSVValue(value));
      });

      csvContent += row.join(delimiter) + '\n';
    });

    // Configurar headers para download
    const filename = `membros-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Adicionar BOM para UTF-8 (ajuda Excel a reconhecer corretamente)
    const BOM = '\uFEFF';
    res.send(BOM + csvContent);

    console.log('✅ CSV gerado com sucesso');

  } catch (error) {
    console.error('❌ Erro ao gerar CSV da lista de membros:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};
