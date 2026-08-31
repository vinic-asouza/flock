import { Response } from 'express';
import {
  beginPdfResponse,
  drawBulletList,
  drawChipRow,
  drawHeroName,
  drawKeyValueGrid,
  drawSectionTitle,
  drawStatusBadge,
  endPdfResponse,
} from './index';
import { calculateAgeSafe, dash, formatDateSafe, formatPhoneBR } from './format';

function memberIsMemberLabel(
  value: 'sim' | 'nao' | 'falecido' | boolean | null | undefined,
  feminine = false
): string {
  if (value === true || value === 'sim') return ' (Membro)';
  if (value === false || value === 'nao') return ' (Não membro)';
  if (value === 'falecido') return feminine ? ' (Falecida)' : ' (Falecido)';
  return '';
}

export function renderMemberProfilePdf(
  res: Response,
  churchName: string,
  member: any
): void {
  const filename = `membro-${String(member.name || 'desconhecido')
    .replace(/\s+/g, '-')
    .toLowerCase()}.pdf`;

  const ctx = beginPdfResponse(res, filename, {
    orientation: 'portrait',
    churchName,
    title: 'Ficha de Membro',
  });

  drawStatusBadge(ctx, member.active ? 'Ativo' : 'Inativo', member.active ? 'success' : 'muted', {
    align: 'center',
  });
  drawHeroName(ctx, member.name || 'Sem nome');

  const idade = calculateAgeSafe(member.birth);
  const weddingDateLabel =
    member.marital_status === 'União Estável' ? 'Data da União' : 'Data do Casamento';

  drawSectionTitle(ctx, 'Informações Pessoais');
  drawKeyValueGrid(ctx, [
    { label: 'Gênero', value: dash(member.gender) },
    { label: 'Idade', value: idade !== null ? `${idade} anos` : '—' },
    { label: 'Data de Nascimento', value: formatDateSafe(member.birth) },
    { label: 'Natural de', value: dash(member.hometown) },
    { label: 'Estado Civil', value: dash(member.marital_status) },
    { label: weddingDateLabel, value: formatDateSafe(member.wedding_date) },
    { label: 'Profissão', value: dash(member.occupation) },
    { label: 'Nacionalidade', value: dash(member.nationality) },
  ]);

  const hasChildren = Array.isArray(member.children) && member.children.length > 0;
  const hasFamily = member.spouse || member.father_name || member.mother_name || hasChildren;

  if (hasFamily) {
    drawSectionTitle(ctx, 'Família');
    const familyPairs = [];
    if (member.spouse) {
      let spouseText = member.spouse;
      if (member.spouse_is_member === true) spouseText += ' (Membro)';
      else if (member.spouse_is_member === false) spouseText += ' (Não membro)';
      familyPairs.push({ label: 'Cônjuge', value: spouseText, fullWidth: true });
    }
    if (member.father_name) {
      familyPairs.push({
        label: 'Nome do Pai',
        value: member.father_name + memberIsMemberLabel(member.father_is_member),
        fullWidth: true,
      });
    }
    if (member.mother_name) {
      familyPairs.push({
        label: 'Nome da Mãe',
        value: member.mother_name + memberIsMemberLabel(member.mother_is_member, true),
        fullWidth: true,
      });
    }
    if (familyPairs.length) drawKeyValueGrid(ctx, familyPairs, { columns: 1 });

    if (hasChildren) {
      const childLines = member.children.map((child: any) => {
        const childAge = child.birth ? calculateAgeSafe(child.birth) : null;
        let text = child.name || '—';
        if (childAge !== null) text += ` (${childAge} ${childAge === 1 ? 'ano' : 'anos'})`;
        if (child.dependent === true) text += ' — Reside junto';
        else if (child.dependent === false) text += ' — Não reside junto';
        return text;
      });
      drawBulletList(ctx, childLines, 'Filhos');
    }
  }

  drawSectionTitle(ctx, 'Contato');
  drawKeyValueGrid(ctx, [
    { label: 'E-mail', value: dash(member.email), fullWidth: true },
    { label: 'Telefone', value: formatPhoneBR(member.phone) },
    { label: 'WhatsApp', value: formatPhoneBR(member.whatsapp) },
  ]);

  drawSectionTitle(ctx, 'Endereço');
  const addressLine = member.address
    ? member.address_number
      ? `${member.address}, ${member.address_number}`
      : member.address
    : '—';
  const cityState = [member.city, member.state].filter(Boolean).join(' / ') || '—';
  drawKeyValueGrid(ctx, [
    { label: 'Logradouro', value: addressLine, fullWidth: true },
    { label: 'Complemento', value: dash(member.complement) },
    { label: 'Bairro', value: dash(member.neighborhood) },
    { label: 'Cidade / UF', value: cityState },
    { label: 'CEP', value: dash(member.cep) },
  ]);

  drawSectionTitle(ctx, 'Vínculo na igreja');
  drawKeyValueGrid(ctx, [
    { label: 'Congregação', value: member.congregation?.name || '—' },
    { label: 'Data de Recebimento', value: formatDateSafe(member.admission_date) },
    { label: 'Tipo de Recebimento', value: dash(member.admission) },
  ]);

  if (Array.isArray(member.groups) && member.groups.length > 0) {
    const active = member.groups
      .filter((g: any) => g.status)
      .map((g: any) => `${g.type} — ${g.name}`);
    const inactive = member.groups
      .filter((g: any) => !g.status)
      .map((g: any) => `${g.type} — ${g.name} (inativo)`);
    drawChipRow(ctx, [...active, ...inactive]);
  } else {
    drawKeyValueGrid(ctx, [{ label: 'Grupos / Ministérios', value: 'Nenhum grupo vinculado', fullWidth: true }], {
      columns: 1,
    });
  }

  endPdfResponse(ctx);
}
