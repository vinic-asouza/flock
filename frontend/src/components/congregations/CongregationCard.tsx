'use client';

import { Edit, Trash2, MapPin, Phone, User } from 'lucide-react';
import { Congregation } from '@/types/congregation';

interface CongregationCardProps {
  congregation: Congregation;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CongregationCard({ congregation, onEdit, onDelete }: CongregationCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg px-6 py-4 h-full">
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome da congregação */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-semibold text-gray-900 text-base truncate" title={congregation.name}>
            {congregation.name}
          </span>
          {congregation.activeMembersCount !== undefined && congregation.activeMembersCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              {congregation.activeMembersCount} ativo{congregation.activeMembersCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {/* Linha 2: Endereço */}
        <div className="flex items-start gap-2 mb-2">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600 line-clamp-2">
            {congregation.address}, {congregation.city} - {congregation.state}
          </span>
        </div>
        
        {/* Linha 3: Líder */}
        {congregation.leader && (
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              Líder: {congregation.leader}
            </span>
          </div>
        )}
        
        {/* Linha 4: Telefone */}
        {congregation.phone && (
          <div className="flex items-center gap-2 mb-4">
            <Phone size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600">
              {congregation.phone}
            </span>
          </div>
        )}
      </div>
      
      {/* Ações e Datas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-4 text-xs text-gray-400">
          <span>Criado em: {formatDate(congregation.created_at)}</span>
          {congregation.updated_at !== congregation.created_at && (
            <span>Atualizado em: {formatDate(congregation.updated_at)}</span>
          )}
        </div>
        <div className="flex gap-2">
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
    </div>
  );
}
