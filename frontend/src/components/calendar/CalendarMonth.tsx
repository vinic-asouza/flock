'use client';

import { useState, useMemo } from 'react';
import { CalendarItem } from '@/types/calendar';
import { typeColors } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarCheck, Users, Handshake, Cake, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BirthdaysModal } from './BirthdaysModal';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface CalendarMonthProps {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  onDayClick: (date: Date) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  birthdayCount?: number;
  loadingBirthdays?: boolean;
  congregationId?: string;
}

export function CalendarMonth({
  items,
  onItemClick,
  onDayClick,
  currentDate = new Date(),
  onDateChange,
  birthdayCount = 0,
  loadingBirthdays = false,
  congregationId
}: CalendarMonthProps) {
  const [viewDate, setViewDate] = useState(currentDate);
  const [birthdaysModalOpen, setBirthdaysModalOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loadingBirthdaysList, setLoadingBirthdaysList] = useState(false);

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

  // Calcular estatísticas do mês
  const stats = useMemo(() => {
    const totalEvents = items.length;
    const programmingCount = items.filter(item => item.type === 'Programação').length;
    const eventsCount = items.filter(item => item.type === 'Evento').length;
    const meetingsCount = items.filter(item => item.type === 'Encontro').length;
    const reunionsCount = items.filter(item => item.type === 'Reunião').length;

    return [
      {
        title: 'Total de Itens',
        value: totalEvents,
        icon: Calendar,
        iconBg: 'bg-[#e9d5ff]',
        iconColor: 'text-[#7c3aed]',
      },
      {
        title: 'Programações',
        value: programmingCount,
        icon: CalendarCheck,
        iconBg: 'bg-[#dbeafe]',
        iconColor: 'text-[#1d4ed8]',
      },
      {
        title: 'Eventos',
        value: eventsCount,
        icon: Calendar,
        iconBg: 'bg-[#dcfce7]',
        iconColor: 'text-[#008236]',
      },
      {
        title: 'Encontros',
        value: meetingsCount,
        icon: Users,
        iconBg: 'bg-[#fef3c7]',
        iconColor: 'text-[#b45309]',
      },
      {
        title: 'Reuniões',
        value: reunionsCount,
        icon: Handshake,
        iconBg: 'bg-[#dbeafe]',
        iconColor: 'text-[#0284c7]',
      },
      {
        title: 'Aniversariantes',
        value: birthdayCount,
        icon: Cake,
        iconBg: 'bg-[#fce7f3]',
        iconColor: 'text-[#be185d]',
      },
    ];
  }, [items, birthdayCount]);

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

  const handleViewBirthdays = async () => {
    try {
      setLoadingBirthdaysList(true);
      setBirthdaysModalOpen(true);
      const response = await apiService.getBirthdaysList({
        month: viewDate.getMonth() + 1,
        year: viewDate.getFullYear(),
        congregation_id: congregationId
      });
      setBirthdays(response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar aniversariantes:', error);
      toast.error('Erro ao carregar lista de aniversariantes');
      setBirthdays([]);
    } finally {
      setLoadingBirthdaysList(false);
    }
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">

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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {loadingBirthdays ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-[#090725]/10 p-3 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-[#090725]/10 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-[#090725]/10 rounded w-20"></div>
                  <div className="h-2.5 bg-[#090725]/10 rounded w-14"></div>
                  <div className="h-5 bg-[#090725]/10 rounded w-10"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Cards reais
          stats.map((stat, index) => {
            const Icon = stat.icon;
            const isBirthdayCard = stat.title === 'Aniversariantes';
            
            return (
              <div
                key={index}
                className="bg-white rounded-lg border border-[#090725]/10 p-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
              >
                <div className="flex items-center gap-2">
                  {/* Ícone */}
                  <div className={`p-1.5 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                    <Icon size={16} className={stat.iconColor} />
                  </div>

                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#090725] mb-0.5 leading-tight">
                      {stat.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#090725] leading-none">
                        {stat.value.toLocaleString('pt-BR')}
                      </span>
                      {isBirthdayCard && stat.value > 0 && (
                        <button
                          onClick={handleViewBirthdays}
                          className="px-2 py-0.5 text-[10px] font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 rounded transition-colors flex items-center gap-1"
                          title="Ver aniversariantes"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Calendário */}

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
              className={`bg-white p-3 flex flex-col group hover:bg-gray-50 transition-colors ${dayItems.length === 0 ? 'min-h-[60px]' : ''
                } ${!isCurrentMonth ? 'opacity-40' : ''
                } ${isCurrentDay ? 'bg-blue-50' : ''}`}
            >
              {/* Número do dia */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${isCurrentDay
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

      {/* Modal de Aniversariantes */}
      <BirthdaysModal
        isOpen={birthdaysModalOpen}
        onClose={() => setBirthdaysModalOpen(false)}
        birthdays={birthdays}
        loading={loadingBirthdaysList}
        month={viewDate.getMonth() + 1}
        year={viewDate.getFullYear()}
      />
    </div>
  );
}
