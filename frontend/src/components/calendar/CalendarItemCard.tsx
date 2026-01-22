'use client';

import { Calendar, MapPin, Users, User, Clock, Repeat, Eye, Edit, Trash2, Church } from 'lucide-react';
import { CalendarItem } from '@/types/calendar';
import { typeColors } from '@/types/calendar';
import { format, isSameDay } from 'date-fns';
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

  const formatDateTime = (date: Date) => {
    return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const formatTime = (date: Date) => {
    return format(date, "HH:mm", { locale: ptBR });
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col h-full bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer transition-all hover:shadow-md ${
        item.status !== 'active' ? 'bg-gray-50 opacity-75' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        {/* Título e Congregação */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-base truncate flex-1 min-w-0" title={item.title}>
            {item.title}
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Church size={12} className="text-gray-600" />
            {item.congregation?.name || 'Sede'}
          </span>
        </div>

        {/* Tipo e Status */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
            {item.type}
          </span>
          {item.status !== 'active' && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
              {item.status === 'cancelled' ? 'Cancelado' : 'Adiado'}
            </span>
          )}
          {item.is_recurring && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
              <Repeat size={12} />
              {item.recurrenceDescription ? `Recorrente - ${item.recurrenceDescription}` : 'Recorrente'}
            </span>
          )}
        </div>

        {/* Data e Hora */}
        <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
          <Clock size={14} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {formatDate(startDate)} às {formatTime(startDate)}
            {endDate && (
              isSameDay(startDate, endDate)
                ? ` - ${formatTime(endDate)}`
                : ` até ${formatDate(endDate)} às ${formatTime(endDate)}`
            )}
          </span>
        </div>

        {/* Local */}
        {item.location && (
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}

        {/* Grupo */}
        {item.group && (
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
            <Users size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{item.group.type}: {item.group.name}</span>
          </div>
        )}

        {/* Responsável */}
        {item.responsible_member && (
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">Responsável: {item.responsible_member.name}</span>
          </div>
        )}
      </div>
      
      {/* Ações alinhadas à direita */}
      {(onView || onEdit || onDelete) && (
        <div className="flex gap-2 justify-end">
          {onView && (
            <button
              title="Visualizar"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
          )}
          {onEdit && (
            <button
              title="Editar"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Edit size={18} />
            </button>
          )}
          {onDelete && (
            <button
              title="Excluir"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
