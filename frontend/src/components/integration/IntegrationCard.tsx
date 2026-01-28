import { IntegrationMember } from '@/types';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { Edit, UserPlus, Trash2, MessageCircle, Eye, Phone } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';

interface IntegrationCardProps {
  member: IntegrationMember;
  onEdit?: () => void;
  onConvert?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

const statusBackground: Record<string, string> = {
  em_progresso: 'bg-white',
  integrado: 'bg-gray-50',
  descartado: 'bg-gray-100'
};

function calculateAge(birth?: string | null): number | null {
  if (!birth) return null;

  // Tentar extrair data no formato YYYY-MM-DD (ou ISO) de forma segura
  const raw = birth.includes('T') ? birth.split('T')[0] : birth;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let date: Date;

  if (match) {
    const [, year, month, day] = match;
    // Cria Date usando componentes locais para evitar problemas de timezone
    date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  } else {
    // Fallback para outros formatos
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
}

const admissionLabels: Record<string, string> = {
  batismo: 'Batismo',
  transferencia: 'Transferência',
  'profissao de fe': 'Profissão de Fé',
  outro: 'Outro'
};

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

export function IntegrationCard({ member, onEdit, onConvert, onDelete, onView }: IntegrationCardProps) {
  const age = calculateAge(member.birth);
  const admissionLabel = member.expected_admission_type
    ? admissionLabels[member.expected_admission_type] || member.expected_admission_type
    : null;
  const canIntegrate = member.status === 'em_progresso';
  const canDelete = member.status !== 'integrado';
  const isIntegrated = member.status === 'integrado';

  return (
    <div
      className={`flex flex-col gap-2 border border-gray-200 rounded-lg px-6 py-4 md:flex-row md:items-center md:justify-between transition-shadow hover:shadow-sm ${statusBackground[member.status] ?? 'bg-white'
        }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className="font-semibold text-gray-900 text-base truncate max-w-xs md:max-w-sm uppercase"
            title={member.name}
          >
            {formatMemberName(member.name)}
          </span>
          <IntegrationStatusBadge status={member.status} />
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {member.expected_congregation?.name || 'Sede'}
          </span>
          {admissionLabel && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {admissionLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>{age !== null ? `${age} anos` : 'Idade não informada'}</span>
          </div>

          {member.gender && (
            <span>{member.gender === 'masculino' ? 'Masculino' : member.gender === 'feminino' ? 'Feminino' : member.gender}</span>
          )}

          {member.whatsapp ? (
            <a
              href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition-colors"
            >
              <MessageCircle size={16} />
              {formatPhone(member.whatsapp)}
            </a>
          ) : member.phone ? (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone size={16} className="text-gray-400" />
              <span>{formatPhone(member.phone)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mt-3 md:mt-0 md:ml-4">
        <button
          title="Visualizar"
          onClick={onView}
          className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
        >
          <Eye size={18} />
        </button>
        {!isIntegrated && (
          <>
            <button
              title="Editar"
              onClick={onEdit}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Edit size={18} />
            </button>
            <button
              title="Descartar"
              onClick={onDelete}
              disabled={!canDelete}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
            </button>
            {!isIntegrated && (
              <button
                title="Integrar"
                onClick={onConvert}
                disabled={!canIntegrate}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${canIntegrate
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                <span>
                  <UserPlus size={18} />
                </span>
                Integrar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

