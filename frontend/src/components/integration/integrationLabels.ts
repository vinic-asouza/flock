import { IntegrationMember } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

export const statusLabels: Record<string, string> = {
  em_progresso: 'Em progresso',
  integrado: 'Integrado',
  descartado: 'Descartado'
};

export const statusClasses: Record<string, string> = {
  em_progresso: 'bg-blue-100 text-blue-700',
  integrado: 'bg-emerald-100 text-emerald-700',
  descartado: 'bg-gray-200 text-gray-600'
};

export const genderLabels: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino'
};

export const maritalLabels: Record<string, string> = {
  solteiro: 'Solteiro',
  casado: 'Casado',
  divorciado: 'Divorciado',
  viuvo: 'Viúvo',
  outro: 'Outro'
};

export const admissionLabels: Record<string, string> = {
  batismo: 'Batismo',
  transferencia: 'Transferência',
  'profissao de fe': 'Profissão de Fé',
  outro: 'Outro'
};

export const sundayAttendanceLabels: Record<string, string> = {
  todos_os_domingos: 'Todos os domingos',
  regularmente: 'Regularmente',
  as_vezes: 'Às vezes',
  nao: 'Não'
};

export const baptismTypeLabels: Record<string, string> = {
  catolica: 'Na igreja católica',
  adulto_nesta_igreja: 'Adulto — nesta igreja',
  adulto_outra_igreja: 'Adulto — em outra igreja',
  crianca_nesta_igreja: 'Criança — nesta igreja',
  crianca_outra_igreja: 'Criança — em outra igreja',
  novo_convertido: 'Novo convertido',
  sem_religiao: 'Novo convertido — sem religião anterior'
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function simNao(value: boolean | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value ? 'Sim' : 'Não';
}

export function buildEcclesiasticalItems(
  member: IntegrationMember
): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];

  if (member.expected_admission_type) {
    items.push({
      label: 'Tipo de recebimento previsto',
      value: admissionLabels[member.expected_admission_type] || member.expected_admission_type
    });
  }
  if (member.expected_congregation || member.expected_congregation_id) {
    items.push({
      label: 'Congregação prevista',
      value: getCongregationDisplayName(member.expected_congregation) || 'Não definida'
    });
  }
  if (hasValue(member.years_evangelical)) {
    const yearsLabel = member.years_evangelical === '1' ? 'ano' : 'anos';
    items.push({ label: 'Cristão evangélico há', value: `${member.years_evangelical} ${yearsLabel}` });
  }
  const evangelicalFamily = simNao(member.evangelical_family);
  if (evangelicalFamily) items.push({ label: 'Família cristã evangélica', value: evangelicalFamily });
  if (member.is_baptized !== undefined && member.is_baptized !== null) {
    let baptized = member.is_baptized ? 'Sim' : 'Não';
    if (member.is_baptized && member.baptism_type) {
      baptized += ` — ${baptismTypeLabels[member.baptism_type] || member.baptism_type}`;
    }
    items.push({ label: 'Batizado(a)', value: baptized });
  }
  if (hasValue(member.baptism_other_church_name)) {
    items.push({ label: 'Igreja em que foi batizado(a)', value: member.baptism_other_church_name as string });
  }
  if (hasValue(member.previous_religion)) {
    items.push({ label: 'Religião anterior', value: member.previous_religion as string });
  }
  const previousActive = simNao(member.previous_church_active);
  if (previousActive) items.push({ label: 'Era membro ativo da igreja anterior', value: previousActive });
  if (hasValue(member.time_attending)) {
    items.push({ label: 'Frequenta a igreja há', value: member.time_attending as string });
  }
  if (hasValue(member.sunday_attendance)) {
    items.push({
      label: 'Cultos',
      value: sundayAttendanceLabels[member.sunday_attendance as string] || (member.sunday_attendance as string)
    });
  }
  if (member.weekly_activities !== undefined && member.weekly_activities !== null) {
    items.push({
      label: 'Atividades semanais',
      value: member.weekly_activities
        ? `Sim${member.weekly_activities_which ? ` — ${member.weekly_activities_which}` : ''}`
        : 'Não'
    });
  }
  if (hasValue(member.reason_joining)) {
    items.push({ label: 'Motivo de tornar-se membro', value: member.reason_joining as string });
  }

  return items;
}
