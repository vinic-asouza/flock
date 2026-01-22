'use client';

import { useState, useMemo } from 'react';
import { CalendarItem } from '@/types/calendar';
import { typeColors } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CalendarMonthProps {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  onDayClick: (date: Date) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function CalendarMonth({
  items,
  onItemClick,
  onDayClick,
  currentDate = new Date(),
  onDateChange
}: CalendarMonthProps) {
  const [viewDate, setViewDate] = useState(currentDate);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const monthName = format(viewDate, 'MMMM yyyy', { locale: ptBR });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Agrupar itens por data, expandindo eventos multi-dia
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};
    
    items.forEach(item => {
      const startDate = startOfDay(new Date(item.start_date));
      const endDate = item.end_date ? endOfDay(new Date(item.end_date)) : startDate;
      
      // Se é um evento não recorrente com end_date, expandir para todos os dias do período
      if (!item.is_recurring && item.end_date) {
        const days = eachDayOfInterval({
          start: startDate,
          end: endDate
        });
        
        days.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(item);
        });
      } else {
        // Eventos recorrentes ou sem end_date: apenas no dia de início
        const dateKey = format(startDate, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(item);
      }
    });

    return grouped;
  }, [items]);

  const handlePreviousMonth = () => {
    const newDate = subMonths(viewDate, 1);
    setViewDate(newDate);
    onDateChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(viewDate, 1);
    setViewDate(newDate);
    onDateChange?.(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onDateChange?.(today);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">{capitalizedMonthName}</h2>
          <Button
            variant="secondary"
            onClick={handleToday}
            className="text-sm"
          >
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handlePreviousMonth}
            className="p-2"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="secondary"
            onClick={handleNextMonth}
            className="p-2"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}

        {/* Dias do calendário */}
        {calendarDays.map((day, dayIdx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isCurrentDay = isToday(day);
          const dayNumber = format(day, 'd');

          return (
            <div
              key={day.toISOString()}
              className={`bg-white p-1 flex flex-col group hover:bg-gray-50 transition-colors ${
                dayItems.length === 0 ? 'min-h-[60px]' : ''
              } ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isCurrentDay ? 'bg-blue-50' : ''}`}
            >
              {/* Número do dia */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    isCurrentDay
                      ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {dayNumber}
                </span>
                {isCurrentMonth && (
                  <button
                    onClick={() => onDayClick(day)}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
                    title="Adicionar evento"
                  >
                    <Plus size={14} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Itens do dia */}
              <div className="flex-1 space-y-1">
                {dayItems.map((item) => {
                  // Determinar se deve mostrar horário (apenas no primeiro dia do evento)
                  const itemStartDate = startOfDay(new Date(item.start_date));
                  const showTime = isSameDay(day, itemStartDate);
                  const timeDisplay = showTime ? `${format(new Date(item.start_date), 'HH:mm')} ` : '';

                  return (
                    <button
                      key={`${item.id}-${dateKey}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-medium truncate hover:opacity-80 transition-opacity ${typeColors[item.type]}`}
                      title={item.title}
                    >
                      {timeDisplay}{item.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
