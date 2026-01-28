'use client';

import { MapPin, Users, User, Repeat, Church, Info } from 'lucide-react';
import { CalendarItem } from '@/types/calendar';
import { typeColors } from '@/types/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarItemCardProps {
  item: CalendarItem & { recurrenceDescription?: string };
  onClick?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CalendarItemCard({ item, onClick, onView, onEdit, onDelete }: CalendarItemCardProps) {
  const startDate = new Date(item.start_date);
  const endDate = item.end_date ? new Date(item.end_date) : null;

  const formatDate = (date: Date) => {
    return format(date, "dd/MM", { locale: ptBR });
  };

  const formatTime = (date: Date) => {
    return format(date, "HH:mm", { locale: ptBR });
  };

  // Para itens recorrentes, mostrar descrição ao invés da data
  const getRecurrenceLabel = () => {
    if (!item.is_recurring) return null;
    return item.recurrenceDescription || 'Recorrente';
  };

  const recurrenceLabel = getRecurrenceLabel();

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        item.status !== 'active' ? 'opacity-75' : ''
      }`}
    >
      {/* Header com todas as badges e congregação */}
      <div className="px-4 py-3">
        {/* Todas as Badges no topo */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Data/Hora ou Recorrência - PRIMEIRO */}
          {item.is_recurring && recurrenceLabel ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {recurrenceLabel}
            </span>
          ) : (
            <>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {formatDate(startDate)}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {formatTime(startDate)}

              </span>
            </>
          )}
          
          {/* Tipo */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
            {item.type}
          </span>
          
          {/* Status */}
          {item.status !== 'active' && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
              {item.status === 'cancelled' ? 'Cancelado' : 'Adiado'}
            </span>
          )}
          
          {/* Recorrente */}
          {item.is_recurring && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
              <Repeat size={12} />
              Recorrente
            </span>
          )}
          
          {/* Congregação - alinhada à direita */}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Church size={12} className="text-gray-600" />
            {item.congregation?.name || 'Sede'}
          </span>
        </div>

        {/* Título */}
        <h3 className="font-semibold text-gray-900 text-base truncate" title={item.title}>
          {item.title}
        </h3>
      </div>

      {/* Corpo com fundo cinza */}
      <div className="mx-4 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
        {/* Local */}
        {item.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}

        {/* Grupo */}
        {item.group && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{item.group.type}: {item.group.name}</span>
          </div>
        )}

        {/* Responsável */}
        {item.responsible_member && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">Responsável: {item.responsible_member.name}</span>
          </div>
        )}

        {/* Mensagem quando não houver informações */}
        {!item.location && !item.group && !item.responsible_member && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info size={14} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">Nenhuma informação adicionada</span>
        </div>
        )}
      </div>
    </div>
  );
}
