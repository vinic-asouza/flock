import { IntegrationMember } from '@/types';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { Edit, UserPlus, Trash2, Eye } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';
import { calculateAge } from '@/utils';
import { CardHeader } from '@/components/ui/CardHeader';
import { ContactLinks } from '@/components/ui/ContactLinks';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface IntegrationCardProps {
  member: IntegrationMember;
  canEdit?: boolean;
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


const admissionLabels: Record<string, string> = {
  batismo: 'Batismo',
  transferencia: 'Transferência',
  'profissao de fe': 'Profissão de Fé',
  outro: 'Outro'
};


export function IntegrationCard({ member, canEdit = true, onEdit, onConvert, onDelete, onView }: IntegrationCardProps) {
  const readOnly = canEdit === false;
  const age = calculateAge(member.birth);
  const admissionLabel = member.expected_admission_type
    ? admissionLabels[member.expected_admission_type] || member.expected_admission_type
    : null;
  const canIntegrate = member.status === 'em_progresso';
  const canDelete = member.status !== 'integrado';
  const isIntegrated = member.status === 'integrado';

  return (
    <div
      className={`flex flex-col gap-2 border border-gray-200 rounded-lg px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between transition-shadow hover:shadow-sm ${statusBackground[member.status] ?? 'bg-white'
        }`}
    >
      <div className="flex-1 min-w-0">
        <CardHeader
          title={formatMemberName(member.name)}
          titleClassName="text-base break-words"
          badges={[
            <IntegrationStatusBadge key="status" status={member.status} />,
            <span key="congregation" className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 max-w-[12rem] truncate">
              {getCongregationDisplayName(member.expected_congregation) || 'Não definida'}
            </span>,
            ...(admissionLabel
              ? [
                  <span
                    key="admission"
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {admissionLabel}
                  </span>,
                ]
              : []),
          ]}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>{age !== null ? `${age} anos` : 'Idade não informada'}</span>
          </div>

          {member.gender && (
            <span>{member.gender === 'masculino' ? 'Masculino' : member.gender === 'feminino' ? 'Feminino' : member.gender}</span>
          )}

          <ContactLinks
            whatsapp={member.whatsapp}
            phone={member.phone}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0 md:ml-4 md:shrink-0">
        <button
          type="button"
          title="Visualizar"
          onClick={onView}
          className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
        >
          <Eye size={18} />
        </button>
        {!isIntegrated && (
          <>
            <button
              type="button"
              title={readOnly ? READER_TOOLTIP : 'Editar'}
              onClick={onEdit}
              disabled={readOnly}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Edit size={18} />
            </button>
            <button
              type="button"
              title={readOnly ? READER_TOOLTIP : 'Descartar'}
              onClick={onDelete}
              disabled={!canDelete || readOnly}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              title={readOnly ? READER_TOOLTIP : 'Integrar'}
              onClick={onConvert}
              disabled={!canIntegrate || readOnly}
              className={`inline-flex items-center justify-center gap-2 min-h-11 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-initial ${canIntegrate && !readOnly
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              <UserPlus size={18} className="shrink-0" />
              Integrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
