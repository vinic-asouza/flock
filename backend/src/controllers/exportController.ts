import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../types';
import supabase from '../services/supabase';

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

    const contactInfo = [
      { label: 'Email', value: member.email || '-' },
      { label: 'Telefone', value: formatPhone(member.phone) },
      { label: 'WhatsApp', value: formatPhone(member.whatsapp) },
    ];

    doc.fontSize(11).font('Helvetica');
    contactInfo.forEach(info => {
      if (info.value !== '-') {
        doc
          .font('Helvetica-Bold')
          .text(info.label + ': ', { continued: true })
          .font('Helvetica')
          .text(info.value);
      }
    });

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

