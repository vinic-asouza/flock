'use client';

import { Eye, Users, User, MapPin } from 'lucide-react';
import { Group } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InfoRow } from '@/components/ui/InfoRow';
import { getCongregationDisplayName } from '@/utils/congregation';

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex h-full min-w-0 cursor-pointer flex-col rounded-lg border bg-white px-4 py-4 transition-all hover:shadow-md sm:px-6 ${
        !group.status ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-primary'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary"
        title="Ver detalhes"
      >
        <Eye size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-2 pr-12">
          <div className="mb-2">
            <span className="block truncate text-base font-semibold text-gray-900" title={group.name}>
              {group.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={group.status ? 'active' : 'inactive'} size="sm" />
          </div>
        </div>

        <InfoRow
          icon={MapPin}
          value={getCongregationDisplayName(group.congregations) || '—'}
          className="mb-2"
          truncate
        />

        {group.members?.name && (
          <InfoRow
            icon={User}
            label="Responsável"
            value={group.members.name}
            className="mb-2"
            truncate
          />
        )}

        {group.description && (
          <div className="mb-3 text-sm text-gray-600 line-clamp-2">
            {group.description}
          </div>
        )}

        <InfoRow
          icon={Users}
          value={(group.memberCount ?? 0) === 0 ? 'Nenhum membro' : `${group.memberCount} membro${group.memberCount !== 1 ? 's' : ''}`}
          className="mb-3"
        />
      </div>
    </div>
  );
}
