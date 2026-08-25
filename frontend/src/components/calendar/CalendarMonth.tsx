'use client';

import { useState, useMemo, useEffect } from 'react';
import { CalendarItem, typeColors, typeDotColors } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarCheck, Users, Handshake, Cake, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BirthdaysModal, Birthday } from './BirthdaysModal';
import { CalendarPdfButton } from './CalendarPdfButton';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { getCalendarItemDisplayDate } from '@/utils/calendarDate';

interface CalendarMonthProps {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  onDayClick: (date: Date) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  birthdayCount?: number;
  loadingBirthdays?: boolean;
  birthdayCountError?: string | null;
  onRetryBirthdays?: () => void;
  congregationId?: string;
  canEdit?: boolean;
  onExportPdf?: () => void;
  exportingPdf?: boolean;
}

interface DaySheetState {
  date: Date;
  items: CalendarItem[];
}

export function CalendarMonth({
  items,
  onItemClick,
  onDayClick,
  currentDate = new Date(),
  onDateChange,
  birthdayCount = 0,
  loadingBirthdays = false,
  birthdayCountError = null,
  onRetryBirthdays,
  congregationId,
  canEdit = true,
  onExportPdf,
  exportingPdf = false,
}: CalendarMonthProps) {
  const readOnly = canEdit === false;
  const [viewDate, setViewDate] = useState(currentDate);
  const [birthdaysModalOpen, setBirthdaysModalOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loadingBirthdaysList, setLoadingBirthdaysList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [daySheet, setDaySheet] = useState<DaySheetState | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const monthName = format(viewDate, 'MMMM yyyy', { locale: ptBR });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

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

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};

    items.forEach(item => {
      const startDate = startOfDay(new Date(item.start_date));
      const endDate = item.end_date ? endOfDay(new Date(item.end_date)) : startDate;

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
    } catch {
      toast.error('Erro ao carregar lista de aniversariantes');
      setBirthdays([]);
    } finally {
      setLoadingBirthdaysList(false);
    }
  };

  const handleDayCellClick = (day: Date, dayItems: CalendarItem[], isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    if (isMobile) {
      if (dayItems.length > 0) {
        setDaySheet({ date: day, items: dayItems });
        return;
      }
      if (!readOnly) {
        onDayClick(day);
      }
    }
  };

  const weekDaysFull = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDaysShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const daySheetTitle = daySheet
    ? format(daySheet.date, "dd 'de' MMMM", { locale: ptBR })
    : '';

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">

      {/* Header do Calendário */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate capitalize">
            {capitalizedMonthName}
          </h2>
          <Button
            variant="secondary"
            onClick={handleToday}
            className="text-sm min-h-11 shrink-0"
          >
            Hoje
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handlePreviousMonth}
            className="p-2 min-h-11 min-w-11"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="secondary"
            onClick={handleNextMonth}
            className="p-2 min-h-11 min-w-11"
            aria-label="Próximo mês"
          >
            <ChevronRight size={20} />
          </Button>
          {onExportPdf && (
            <CalendarPdfButton
              onClick={onExportPdf}
              isLoading={exportingPdf}
              ariaLabel={`Exportar PDF de ${capitalizedMonthName}`}
              title={`Exportar PDF dos eventos de ${capitalizedMonthName}`}
            />
          )}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {loadingBirthdays ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-[#090725]/10 p-3 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-[#090725]/10 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3 bg-[#090725]/10 rounded w-20"></div>
                  <div className="h-5 bg-[#090725]/10 rounded w-10"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            const isBirthdayCard = stat.title === 'Aniversariantes';

            return (
              <div
                key={index}
                className="bg-white rounded-lg border border-[#090725]/10 p-2.5 sm:p-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group min-w-0"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                    <Icon size={16} className={stat.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-[#090725] mb-0.5 leading-tight truncate">
                      {stat.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-bold text-[#090725] leading-none">
                        {isBirthdayCard && birthdayCountError ? '-' : stat.value.toLocaleString('pt-BR')}
                      </span>
                      {isBirthdayCard && stat.value > 0 && (
                        <button
                          onClick={handleViewBirthdays}
                          className="px-2 py-1 min-h-8 text-[10px] sm:text-xs font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 rounded transition-colors inline-flex items-center gap-1"
                          title="Ver aniversariantes"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                      )}
                      {isBirthdayCard && birthdayCountError && onRetryBirthdays && (
                        <button
                          onClick={onRetryBirthdays}
                          className="px-2 py-1 min-h-8 text-[10px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
                          title={birthdayCountError}
                        >
                          Tentar
                        </button>
                      )}
                    </div>
                    {isBirthdayCard && birthdayCountError && (
                      <p className="text-[10px] text-amber-700 mt-1 line-clamp-2" title={birthdayCountError}>
                        Falha ao carregar contagem
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Grid do Calendário */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden min-w-0">
        {weekDaysFull.map((day, index) => (
          <div
            key={day}
            className="bg-gray-50 p-1 sm:p-2 text-center text-[10px] sm:text-sm font-semibold text-gray-700"
          >
            <span className="md:hidden">{weekDaysShort[index]}</span>
            <span className="hidden md:inline">{day}</span>
          </div>
        ))}

        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isCurrentDay = isToday(day);
          const dayNumber = format(day, 'd');
          const visibleDots = dayItems.slice(0, 3);
          const extraCount = dayItems.length - visibleDots.length;

          return (
            <div
              key={day.toISOString()}
              role={isMobile && isCurrentMonth ? 'button' : undefined}
              tabIndex={isMobile && isCurrentMonth ? 0 : undefined}
              onClick={() => handleDayCellClick(day, dayItems, isCurrentMonth)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && isMobile) {
                  e.preventDefault();
                  handleDayCellClick(day, dayItems, isCurrentMonth);
                }
              }}
              className={`bg-white p-1 sm:p-2 md:p-3 flex flex-col group hover:bg-gray-50 transition-colors min-w-0 ${
                dayItems.length === 0 ? 'min-h-[48px] sm:min-h-[60px]' : 'min-h-[52px] sm:min-h-[72px]'
              } ${!isCurrentMonth ? 'opacity-40' : ''} ${isCurrentDay ? 'bg-blue-50' : ''} ${
                isMobile && isCurrentMonth ? 'cursor-pointer active:bg-gray-100' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-0.5">
                <span
                  className={`text-xs sm:text-sm font-medium shrink-0 ${
                    isCurrentDay
                      ? 'bg-blue-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[11px] sm:text-sm'
                      : isCurrentMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                  }`}
                >
                  {dayNumber}
                </span>
                {isCurrentMonth && !readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDayClick(day);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 sm:p-1 hover:bg-gray-100 rounded transition-opacity min-h-7 min-w-7 inline-flex items-center justify-center touch-manipulation"
                    title="Adicionar evento"
                    aria-label="Adicionar evento"
                  >
                    <Plus size={14} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Mobile: dots */}
              <div className="flex-1 flex items-end md:hidden min-w-0">
                {dayItems.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {visibleDots.map((item) => (
                      <span
                        key={`${item.id}-${dateKey}-dot`}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDotColors[item.type]}`}
                        title={item.title}
                      />
                    ))}
                    {extraCount > 0 && (
                      <span className="text-[9px] font-medium text-gray-500 leading-none">
                        +{extraCount}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop: chips com título */}
              <div className="hidden md:block flex-1 space-y-1 min-w-0">
                {dayItems.map((item) => {
                  const displayDate = getCalendarItemDisplayDate(item);
                  const itemStartDate = startOfDay(displayDate);
                  const showTime = isSameDay(day, itemStartDate);
                  const timeDisplay = showTime ? `${format(displayDate, 'HH:mm')} ` : '';

                  return (
                    <button
                      key={`${item.id}-${dateKey}`}
                      type="button"
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

      {/* Modal leve: itens do dia (mobile) */}
      <Modal
        isOpen={!!daySheet}
        onClose={() => setDaySheet(null)}
        title={daySheetTitle ? `Itens — ${daySheetTitle}` : 'Itens do dia'}
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDaySheet(null)}
              className="min-h-11 w-full sm:w-auto"
            >
              Fechar
            </Button>
            {!readOnly && daySheet && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const date = daySheet.date;
                  setDaySheet(null);
                  onDayClick(date);
                }}
                className="min-h-11 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Novo item
              </Button>
            )}
          </div>
        }
      >
        <div className="p-4 sm:p-6 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {daySheet && daySheet.items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nenhum item neste dia.</p>
          ) : (
            daySheet?.items.map((item, index) => {
              const displayDate = getCalendarItemDisplayDate(item);
              return (
                <button
                  key={`${item.id}-${format(daySheet.date, 'yyyy-MM-dd')}-${index}`}
                  type="button"
                  onClick={() => {
                    setDaySheet(null);
                    onItemClick(item);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium border min-h-11 touch-manipulation ${typeColors[item.type]}`}
                >
                  <span className="block truncate">{item.title}</span>
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    {item.type}
                    {' · '}
                    {format(displayDate, 'HH:mm')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Modal>

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
