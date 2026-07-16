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
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Ministério': 'bg-blue-100 text-blue-700',
      'Departamento': 'bg-purple-100 text-purple-700',
      'Grupo': 'bg-green-100 text-green-700',
      'Equipe': 'bg-yellow-100 text-yellow-700',
      'Time': 'bg-orange-100 text-orange-700',
      'Comissão': 'bg-pink-100 text-pink-700',
      'Célula': 'bg-indigo-100 text-indigo-700',
      'Grupo de Crescimento': 'bg-teal-100 text-teal-700',
      'Pequeno Grupo': 'bg-cyan-100 text-cyan-700',
      'Discipulado': 'bg-amber-100 text-amber-700',
      'Classe': 'bg-rose-100 text-rose-700',
      'Núcleo': 'bg-violet-100 text-violet-700',
      'Região': 'bg-slate-100 text-slate-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col bg-white border rounded-lg px-6 py-4 h-full cursor-pointer transition-all hover:shadow-md ${
        !group.status ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-primary'
      }`}
    >
      {/* Ícone de visualizar no canto superior direito */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
        title="Ver detalhes"
      >
        <Eye size={18} />
      </button>

      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome do grupo */}
        <div className="mb-2 pr-8">
          <div className="mb-2">
            <span className="font-semibold text-gray-900 text-base truncate block" title={group.name}>
              {group.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(group.type)}`}>
              {group.type}
            </span>
            <StatusBadge variant={group.status ? 'active' : 'inactive'} size="sm" />
          </div>
        </div>
        
        {/* Linha 2: Tipo e Congregação */}
        <InfoRow
          icon={MapPin}
          value={getCongregationDisplayName(group.congregations) || '—'}
          className="mb-2"
          truncate
        />
        
        {/* Linha 3: Responsável */}
        {group.members?.name && (
          <InfoRow
            icon={User}
            label="Responsável"
            value={group.members.name}
            className="mb-2"
            truncate
          />
        )}
        
        {/* Linha 4: Descrição */}
        {group.description && (
          <div className="mb-3 text-sm text-gray-600 line-clamp-2">
            {group.description}
          </div>
        )}
        
        {/* Linha 5: Contador de membros */}
        <InfoRow
          icon={Users}
          value={(group.memberCount ?? 0) === 0 ? 'Nenhum membro' : `${group.memberCount} membro${group.memberCount !== 1 ? 's' : ''}`}
          className="mb-3"
        />
      </div>
    </div>
  );
}
