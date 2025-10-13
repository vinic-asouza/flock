import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../types';
import supabase from '../services/supabase';
import { getMemberReports } from './memberController';

export const exportMemberPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Buscar church_id do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar dados do membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        role:roles(name),
        congregation:congregations(name)
      `)
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: memberError?.message || 'Membro não existe ou não pertence a esta igreja'
      });
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

    // Helper para formatar data
    const formatDate = (date: string | null) => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('pt-BR');
    };

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

    // Cabeçalho
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(church.name, { align: 'center' })
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
      .text(member.name, { align: 'center' })
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
    const personalInfo = [
      { label: 'Idade', value: idade !== null ? `${idade} anos` : '-' },
      { label: 'Gênero', value: member.gender || '-' },
      { label: 'Estado Civil', value: member.marital_status || '-' },
      { label: 'Nacionalidade', value: member.nationality || '-' },
      { label: 'Documento', value: member.document || '-' },
      { label: 'Cônjuge', value: member.spouse || '-' },
      { label: 'Profissão', value: member.occupation || '-' },
    ];

    doc.fontSize(11).font('Helvetica');
    personalInfo.forEach(info => {
      if (info.value !== '-' || ['Idade', 'Gênero', 'Estado Civil', 'Profissão'].includes(info.label)) {
        doc
          .font('Helvetica-Bold')
          .text(info.label + ': ', { continued: true })
          .font('Helvetica')
          .text(info.value);
      }
    });

    doc.moveDown(1);

    // Informações Eclesiásticas
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Informações Eclesiásticas')
      .moveDown(0.5);

    const churchInfo = [
      { label: 'Congregação', value: member.congregation?.name || 'Sede' },
      { label: 'Cargo', value: member.role?.name || '-' },
      { label: 'Data de Batismo', value: formatDate(member.baptism_date) },
      { label: 'Data de Admissão', value: formatDate(member.admission_date) },
      { label: 'Tipo de Admissão', value: member.admission || '-' },
    ];

    doc.fontSize(11).font('Helvetica');
    churchInfo.forEach(info => {
      if (info.value !== '-') {
        doc
          .font('Helvetica-Bold')
          .text(info.label + ': ', { continued: true })
          .font('Helvetica')
          .text(info.value);
      }
    });

    doc.moveDown(1);

    // Contato
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contato')
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    
    // Email (com link)
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

    // Telefone (sem link)
    if (member.phone) {
      doc
        .font('Helvetica-Bold')
        .text('Telefone: ', { continued: true })
        .font('Helvetica')
        .text(formatPhone(member.phone));
    }

    // WhatsApp (com link clicável)
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

    doc.moveDown(1);

    // Endereço
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Endereço')
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(member.address || '-');
    if (member.complement) {
      doc.text(member.complement);
    }
    doc.text(`${member.neighborhood} - ${member.city}/${member.state}`);
    if (member.cep) {
      doc.text(`CEP: ${member.cep}`);
    }

    doc.moveDown(2);

    // Rodapé
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

export const exportDashboardPDF = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Iniciando exportação de dashboard PDF...');
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar church_id do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    console.log('✅ Igreja encontrada:', church.name);

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
        .eq('church_id', church.id)
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
      .text(church.name, { align: 'center' })
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
      .text(`Admissões em ${currentYear}: `, { continued: true })
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

    // ===== DISTRIBUIÇÃO POR CARGOS =====
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Distribuição por Cargos')
      .fillColor('#000000')
      .moveDown(0.3);

    if (reportsData.churchStructure?.roles && typeof reportsData.churchStructure.roles === 'object') {
      const roleEntries = Object.entries(reportsData.churchStructure.roles)
        .sort(([_, a], [__, b]) => ((b as any).count || 0) - ((a as any).count || 0));
      
      if (roleEntries.length > 0) {
        const total = roleEntries.reduce((sum, [_, data]) => sum + ((data as any).count || 0), 0);
        
        doc.fontSize(11).font('Helvetica');
        roleEntries.forEach(([role, data]) => {
          const count = (data as any).count || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          
          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .text(`  • ${role}: `, { continued: true })
            .font('Helvetica')
            .fillColor('#6B7280')
            .text(`${count} membros (${percentage}%)`);
        });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum cargo registrado');
      }
    } else {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Nenhum cargo registrado');
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

    // Rodapé
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado pelo sistema de gestão eclesiástica - ${church.name}`,
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

    // Buscar church_id do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    console.log('✅ Igreja encontrada:', church.name);
    console.log('🔍 Filtros recebidos:', filters);
    console.log('📋 Campos selecionados:', fields);

    // Construir query para buscar membros
    let query = supabase
      .from('members')
      .select(`
        *,
        role:roles(name),
        congregation:congregations(name)
      `)
      .eq('church_id', church.id);

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('active', filters.status === 'active');
      }
      if (filters.role_id) {
        query = query.eq('role_id', filters.role_id);
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
      if (!date) return '-';
      return new Date(date).toLocaleDateString('pt-BR');
    };

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
      nationality: 'Nacionalidade',
      document: 'Documento',
      spouse: 'Cônjuge',
      occupation: 'Profissão',
      phone: 'Telefone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      active: 'Status',
      congregation: 'Congregação',
      role: 'Cargo',
      baptism_date: 'Batismo',
      admission: 'Admissão',
      admission_date: 'Data Admissão',
      address: 'Endereço',
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
      .text(church.name, { align: 'center' })
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
            value = member.name || '-';
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
          case 'nationality':
            value = member.nationality || '-';
            break;
          case 'document':
            value = member.document || '-';
            break;
          case 'spouse':
            value = member.spouse || '-';
            break;
          case 'occupation':
            value = member.occupation || '-';
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
          case 'role':
            value = member.role?.name || '-';
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
        `Relatório gerado pelo sistema de gestão eclesiástica - ${church.name}`,
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

