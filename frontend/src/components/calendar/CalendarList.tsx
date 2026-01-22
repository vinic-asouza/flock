'use client';

import { CalendarItem } from '@/types/calendar';
import { CalendarItemCard } from './CalendarItemCard';

interface CalendarListProps {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
}

export function CalendarList({ items, onItemClick }: CalendarListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</p>
        <p className="text-sm text-gray-500">Não há itens do calendário para exibir com os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <CalendarItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
}
