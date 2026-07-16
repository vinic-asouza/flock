'use client';

import { Eye, Edit, UserMinus, UserPlus, Church, Users } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';
import { calculateAge } from '@/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CardHeader } from '@/components/ui/CardHeader';
import { ContactLinks } from '@/components/ui/ContactLinks';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    birth: string; // ISO date
    active: boolean;
    congregation?: { name: string; abbreviation?: string | null } | null;
    groups?: Array<{
      id: string;
      name: string;
      type: string;
      status: boolean;
    }>;
    gender: string;
    marital_status: string;
    whatsapp?: string | null;
    email?: string | null;
  };
  canEdit?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
}

export function MemberCard({ member, canEdit = true, onView, onEdit, onDeactivate, onReactivate }: MemberCardProps) {
  const readOnly = canEdit === false;
  const idade = calculateAge(member.birth);
  return (
    <div className={`flex flex-col gap-1 border border-gray-200 rounded-lg px-6 py-4 md:flex-row md:items-center md:justify-between ${!member.active ? 'bg-gray-100' : 'bg-white'}`}>
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome e selos */}
        <CardHeader
          title={formatMemberName(member.name)}
          badges={[
            <StatusBadge key="status" variant={member.active ? 'active' : 'inactive'} size="sm" />,
            <span key="congregation" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <Church size={12} className="text-gray-600" />
              {getCongregationDisplayName(member.congregation) || '—'}
            </span>,
            ...(member.groups && member.groups.length > 0
              ? member.groups
                  .filter(group => group.status)
                  .slice(0, 3)
                  .map((group) => (
                    <span
                      key={group.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                      title={`${group.type} - ${group.name}`}
                    >
                      <Users size={12} className="text-purple-600" />
                      <span className="text-purple-600">{group.type}</span>
                      <span className="text-purple-500">•</span>
                      <span>{group.name}</span>
                    </span>
                  ))
              : []),
            ...(member.groups && member.groups.filter(group => group.status).length > 3
              ? [
                  <span
                    key="more-groups"
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    +{member.groups.filter(group => group.status).length - 3}
                  </span>,
                ]
              : []),
          ]}
        />
        {/* Linha 2: Dados menores */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>{idade !== null ? `${idade} Anos` : '-'}</span>
          <ContactLinks
            whatsapp={member.whatsapp}
            email={member.email}
          />
        </div>
      </div>
      {/* Ações */}
      <div className="flex gap-2 mt-3 md:mt-0 md:ml-4">
        {member.active ? (
          <>
            <button
              title="Visualizar"
              onClick={onView}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
            <button
              title={readOnly ? READER_TOOLTIP : 'Editar'}
              onClick={onEdit}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Edit size={18} />
            </button>
            <button
              title={readOnly ? READER_TOOLTIP : 'Inativar'}
              onClick={onDeactivate}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserMinus size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              title="Visualizar"
              onClick={onView}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
            <button
              title={readOnly ? READER_TOOLTIP : 'Reativar'}
              onClick={onReactivate}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
} 