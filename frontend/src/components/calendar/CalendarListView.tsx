'use client';

import { useMemo, useState, useRef } from 'react';
import { CalendarItem } from '@/types/calendar';
import { format, startOfMonth, parseISO, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarItemCard } from './CalendarItemCard';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUp } from 'lucide-react';

interface CalendarListViewProps {
  items: CalendarItem[];
  currentYear: number;
  onItemClick: (item: CalendarItem) => void;
  onEditClick: (item: CalendarItem) => void;
  onDeleteClick: (item: CalendarItem) => void;
}

export function CalendarListView({
  items,
  currentYear,
  onItemClick,
  onEditClick,
  onDeleteClick
}: CalendarListViewProps) {
  const itemsPerPage = 6;
  
  // Estado para controlar a página atual de cada mês
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  
  // Refs para os containers dos meses
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Função para obter a página atual de um mês
  const getCurrentPage = (monthKey: string) => {
    return currentPages[monthKey] || 1;
  };

  // Função para mudar a página de um mês específico
  const setMonthPage = (monthKey: string, page: number) => {
    setCurrentPages(prev => ({
      ...prev,
      [monthKey]: page
    }));
  };

  // Função para scroll ao topo
  const scrollToTop = () => {
    // Tentar encontrar o container de scroll (pode ser diferente em Next.js)
    const scrollContainers = [
      window,
      document.documentElement,
      document.body,
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
    ];
    
    // Tentar scroll suave em todos os containers possíveis
    scrollContainers.forEach(container => {
      if (container) {
        try {
          if (container === window) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
          } else if ('scrollTo' in container && typeof container.scrollTo === 'function') {
            container.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (e) {
          // Ignorar erros silenciosamente
        }
      }
    });
  };

  // Função para scroll ao mês atual
  const scrollToCurrentMonth = () => {
    const currentDate = new Date();
    const currentMonthKey = format(currentDate, 'yyyy-MM');
    
    console.log('Procurando mês:', currentMonthKey);
    console.log('Refs disponíveis:', Object.keys(monthRefs.current));
    
    const monthElement = monthRefs.current[currentMonthKey];
    
    if (monthElement) {
      // Usar scrollIntoView para melhor compatibilidade
      monthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Ajustar um pouco para compensar o header
      setTimeout(() => {
        window.scrollBy({ top: -100, behavior: 'smooth' });
      }, 100);
    } else {
      console.log('Mês atual não encontrado na lista do ano selecionado');
      // Se o mês atual não existe no ano selecionado, scroll para o topo
      scrollToTop();
    }
  };

  // Função para formatar descrição da recorrência
  const getRecurrenceDescription = (item: CalendarItem): string => {
    if (!item.is_recurring || !item.recurrence_pattern) return '';

    if (item.recurrence_pattern === 'weekly' && item.recurrence_day_of_week !== null && item.recurrence_day_of_week !== undefined) {
      const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return `${daysOfWeek[item.recurrence_day_of_week]}`;
    }

    if (item.recurrence_pattern === 'monthly') {
      if (item.recurrence_day_of_month !== null && item.recurrence_day_of_month !== undefined) {
        return `Todo dia ${item.recurrence_day_of_month}`;
      }
      if (item.recurrence_week_of_month !== null && item.recurrence_week_of_month !== undefined && item.recurrence_day_of_week !== null && item.recurrence_day_of_week !== undefined) {
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const weeks = ['Primeira', 'Segunda', 'Terceira', 'Quarta', 'Última'];
        const weekLabel = item.recurrence_week_of_month === -1 ? 'Última' : weeks[item.recurrence_week_of_month - 1] || '';
        return `Toda ${weekLabel} ${daysOfWeek[item.recurrence_day_of_week]} do mês`;
      }
    }

    return '';
  };

  // Agrupar itens por ano e mês, deduplicando itens recorrentes apenas dentro de cada mês
  const itemsByYearAndMonth = useMemo(() => {
    // Filtrar apenas itens do ano atual
    const yearItems = items.filter((item) => {
      const itemDate = parseISO(item.start_date);
      return getYear(itemDate) === currentYear;
    });

    // Agrupar por mês
    const grouped: Record<string, CalendarItem[]> = {};

    yearItems.forEach((item) => {
      const itemDate = parseISO(item.start_date);
      const monthKey = format(startOfMonth(itemDate), 'yyyy-MM', { locale: ptBR });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(item);
    });

    // Ordenar meses (janeiro primeiro)
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedMonths.map((monthKey) => {
      const monthItems = grouped[monthKey];
      
      // Deduplicar itens recorrentes dentro deste mês (mesmo id = mesmo item recorrente)
      const seenRecurringIds = new Set<string>();
      const uniqueItems: CalendarItem[] = [];

      monthItems.forEach((item) => {
        if (item.is_recurring) {
          // Se é recorrente e já vimos este id neste mês, pular
          if (seenRecurringIds.has(item.id)) {
            return;
          }
          seenRecurringIds.add(item.id);
        }
        uniqueItems.push(item);
      });

      const monthDate = parseISO(`${monthKey}-01`);
      return {
        monthKey,
        monthName: format(monthDate, "MMMM", { locale: ptBR }),
        monthDate,
        items: uniqueItems.sort((a, b) => {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        })
      };
    });
  }, [items, currentYear]);

  if (itemsByYearAndMonth.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</p>
        <p className="text-sm text-gray-500">Não há itens do calendário para exibir no ano {currentYear} com os filtros selecionados.</p>
      </div>
    );
  }

  const currentDate = new Date();
  const currentYearNum = getYear(currentDate);
  const currentMonthNum = getMonth(currentDate);

  return (
    <>
      <div className="space-y-8">
        {itemsByYearAndMonth.map(({ monthKey, monthName, monthDate, items: monthItems }, index) => {
        const monthYearNum = getYear(monthDate);
        const monthMonthNum = getMonth(monthDate);
        const isCurrentMonth = currentYearNum === monthYearNum && currentMonthNum === monthMonthNum;
        
        // Paginação para este mês
        const currentPage = getCurrentPage(monthKey);
        const totalPages = Math.ceil(monthItems.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = monthItems.slice(startIndex, endIndex);
        
        const isLastMonth = index === itemsByYearAndMonth.length - 1;
        
        return (
          <div 
            key={monthKey}
            ref={(el) => {
              monthRefs.current[monthKey] = el;
            }}
            className={`space-y-4 pb-8 ${!isLastMonth ? 'border-b border-gray-200' : ''}`}
          >
            {/* Cabeçalho do mês */}
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {monthName} {currentYear}
              </h2>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                {monthItems.length} {monthItems.length === 1 ? 'item' : 'itens'}
              </span>
              {isCurrentMonth && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-white">
                  Mês Atual
                </span>
              )}
            </div>

          {/* Lista de itens do mês */}
          {paginatedItems.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {paginatedItems.map((item) => {
                  // Criar uma versão do item com descrição de recorrência customizada
                  const itemWithRecurrence = item.is_recurring ? {
                    ...item,
                    recurrenceDescription: getRecurrenceDescription(item)
                  } : item;

                  return (
                    <CalendarItemCard
                      key={item.id}
                      item={itemWithRecurrence as CalendarItem & { recurrenceDescription?: string }}
                      onClick={() => onItemClick(item)}
                      onView={() => onItemClick(item)}
                      onEdit={() => onEditClick(item)}
                      onDelete={() => onDeleteClick(item)}
                    />
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, monthItems.length)} de {monthItems.length} {monthItems.length === 1 ? 'item' : 'itens'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMonthPage(monthKey, Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
                    >
                      <ChevronLeft size={18} className="text-gray-700" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setMonthPage(monthKey, Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
                    >
                      <ChevronRight size={18} className="text-gray-700" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        );
      })}
      </div>

      {/* Botões flutuantes de navegação - sempre visíveis */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {/* Botão: Ir para o mês atual */}
        <button
          onClick={scrollToCurrentMonth}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <CalendarDays size={20} className="text-gray-700" />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Ir até o mês atual
          </span>
        </button>

        {/* Botão: Voltar ao topo */}
        <button
          onClick={scrollToTop}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <ArrowUp size={20} className="text-gray-700" />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Voltar ao topo
          </span>
        </button>
      </div>
    </>
  );
}
