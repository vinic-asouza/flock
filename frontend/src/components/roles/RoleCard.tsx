'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Role } from '@/types/role';

interface RoleCardProps {
  role: Role;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-lg px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome do cargo */}
               <div className="flex flex-wrap items-center gap-2 mb-2">
                 <span className="font-semibold text-gray-900 text-base truncate max-w-xs md:max-w-sm" title={role.name}>
                   {role.name}
                 </span>
                 {role.activeMembersCount !== undefined && role.activeMembersCount > 0 && (
                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                     {role.activeMembersCount} ativo{role.activeMembersCount !== 1 ? 's' : ''}
                   </span>
                 )}
               </div>
        
        {/* Linha 2: Descrição completa */}
        {role.description && (
          <div className="mb-3">
            <p className="text-gray-700 text-sm leading-relaxed">
              {role.description}
            </p>
          </div>
        )}
        
        {/* Linha 3: Datas com menos destaque */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <span>Criado em: {formatDate(role.created_at)}</span>
          {role.updated_at !== role.created_at && (
            <span>Atualizado em: {formatDate(role.updated_at)}</span>
          )}
        </div>
      </div>
      
      {/* Ações */}
      <div className="flex gap-2 mt-3 md:mt-0 md:ml-4 md:items-center md:justify-center">
        <button
          title="Editar"
          onClick={onEdit}
          className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
        >
          <Edit size={18} />
        </button>
        <button
          title="Excluir"
          onClick={onDelete}
          className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
