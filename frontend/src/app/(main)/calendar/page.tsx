'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CalendarItemForm } from '@/components/calendar/CalendarItemForm';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { CalendarListView } from '@/components/calendar/CalendarListView';
import { CalendarFiltersHorizontal } from '@/components/calendar/CalendarFiltersHorizontal';
import { Tabs } from '@/components/ui/Tabs';
import { CalendarItem, CreateCalendarItemData, CalendarFilters as CalendarFiltersType, typeColors } from '@/types/calendar';
import { apiService } from '@/services/api';
import { Plus, Loader2, Calendar as CalendarIcon, Edit, Trash2, List, Clock, MapPin, Users, User, Repeat, FileText, Church, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CalendarFiltersType>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate: string;
      let endDate: string;

      if (filters.start_date && filters.end_date) {
        // Se há filtros de data específicos, usar eles
        startDate = filters.start_date;
        endDate = filters.end_date;
      } else if (activeTab === 'list') {
        // Para visualização de lista, carregar o ano inteiro
        const yearStart = startOfYear(new Date(currentYear, 0, 1));
        const yearEnd = endOfYear(new Date(currentYear, 11, 31));
        startDate = yearStart.toISOString();
        endDate = yearEnd.toISOString();
      } else {
        // Para visualização de calendário, usar apenas o mês atual
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        startDate = monthStart.toISOString();
        endDate = monthEnd.toISOString();
      }

      const response = await apiService.listCalendarItems({
        ...filters,
        start_date: startDate,
        end_date: endDate,
        limit: activeTab === 'list' ? 1000 : 50, // Aumentar limite para lista
      });

      setItems(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar itens do calendário:', err);
      setError(err.response?.data?.error || 'Erro ao carregar itens do calendário');
      toast.error(err.response?.data?.error || 'Erro ao carregar itens do calendário');
    } finally {
      setLoading(false);
    }
  }, [filters, currentMonth, currentYear, activeTab]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreateItem = async (data: CreateCalendarItemData) => {
    try {
      setIsSubmitting(true);
      await apiService.createCalendarItem(data);
      toast.success('Item do calendário criado com sucesso!');
      setCreateModalOpen(false);
      setDefaultStartDate(undefined);
      await loadItems();
    } catch (err: any) {
      console.error('Erro ao criar item:', err);
      toast.error(err.response?.data?.error || 'Erro ao criar item do calendário');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (data: CreateCalendarItemData) => {
    if (!selectedItem) return;

    try {
      setIsSubmitting(true);
      await apiService.updateCalendarItem(selectedItem.id, data);
      toast.success('Item do calendário atualizado com sucesso!');
      setEditModalOpen(false);
      setSelectedItem(null);
      await loadItems();
    } catch (err: any) {
      console.error('Erro ao atualizar item:', err);
      toast.error(err.response?.data?.error || 'Erro ao atualizar item do calendário');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      setIsSubmitting(true);
      await apiService.deleteCalendarItem(selectedItem.id);
      toast.success('Item do calendário excluído com sucesso!');
      setDeleteModalOpen(false);
      setSelectedItem(null);
      await loadItems();
    } catch (err: any) {
      console.error('Erro ao deletar item:', err);
      toast.error(err.response?.data?.error || 'Erro ao deletar item do calendário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewItem = (item: CalendarItem) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const handleEditClick = () => {
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    setViewModalOpen(false);
    setDeleteModalOpen(true);
  };

  const handleCreateQuick = (date?: Date) => {
    if (date) {
      // Formatar data para datetime-local (YYYY-MM-DDTHH:mm)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDefaultStartDate(`${year}-${month}-${day}T09:00`);
    }
    setCreateModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
          <p className="text-sm text-gray-600">Gerencie programações, eventos, encontros e reuniões</p>
        </div>
        <Button
          variant="primary"
          onClick={() => handleCreateQuick()}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Item
        </Button>
      </div>

      {/* Filtros Horizontais */}
      <div className="mb-6">
        <CalendarFiltersHorizontal
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'calendar', label: 'Calendário', icon: <CalendarIcon size={18} /> },
            { id: 'list', label: 'Listas', icon: <List size={18} /> }
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'calendar' | 'list')}
        />
      </div>

      {/* Conteúdo baseado na tab ativa */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadItems}>Tentar novamente</Button>
          </div>
        ) : activeTab === 'calendar' ? (
          <CalendarMonth
            items={items}
            onItemClick={handleViewItem}
            onDayClick={handleCreateQuick}
            currentDate={currentMonth}
            onDateChange={setCurrentMonth}
          />
        ) : (
          <div className="space-y-4">
            <CalendarListView
              items={items}
              currentYear={currentYear}
              onItemClick={handleViewItem}
              onEditClick={(item) => {
                setSelectedItem(item);
                setEditModalOpen(true);
              }}
              onDeleteClick={(item) => {
                setSelectedItem(item);
                setDeleteModalOpen(true);
              }}
            />

            {/* Controles de navegação de ano */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentYear(currentYear - 1)}
                className="px-2 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
                title="Ano anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <span className="text-sm font-medium text-gray-700">{currentYear}</span>
                {currentYear !== new Date().getFullYear() && (
                  <button
                    onClick={() => setCurrentYear(new Date().getFullYear())}
                    className="text-xs text-gray-500 hover:text-primary underline"
                    title="Ir para o ano atual"
                  >
                    Hoje
                  </button>
                )}
              </div>
              <button
                onClick={() => setCurrentYear(currentYear + 1)}
                className="px-2 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
                title="Próximo ano"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setDefaultStartDate(undefined);
        }}
        title="Criar Novo Item do Calendário"
        size="lg"
      >
        <CalendarItemForm
          mode="create"
          onSubmit={handleCreateItem}
          onCancel={() => {
            setCreateModalOpen(false);
            setDefaultStartDate(undefined);
          }}
          isLoading={isSubmitting}
          defaultStartDate={defaultStartDate}
        />
      </Modal>

      {/* Modal de Visualização */}
      {selectedItem && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedItem(null);
          }}
          title={selectedItem.title}
          size="lg"
        >
          <div className="p-6 space-y-6">
            {/* Header com badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors[selectedItem.type]}`}>
                {selectedItem.type}
              </span>
              {selectedItem.is_recurring && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5">
                  <Repeat size={14} />
                  Recorrente
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                <Church size={14} />
                {selectedItem.congregation?.name || 'Sede'}
              </span>
            </div>

            {/* Seção: Informações Principais */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-500" />
                Informações Principais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data e Hora de Início */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">Data e Hora de Início</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedItem.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedItem.start_date), "'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Data e Hora de Fim */}
                {selectedItem.end_date && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <Clock size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 mb-1">Data e Hora de Fim</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(selectedItem.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedItem.end_date), "'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recorrência */}
              {selectedItem.is_recurring && (
                <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <Repeat size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">Padrão de Recorrência</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedItem.recurrence_pattern === 'weekly' && selectedItem.recurrence_day_of_week !== null && selectedItem.recurrence_day_of_week !== undefined && (
                        <>Semanal - {
                          ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedItem.recurrence_day_of_week]
                        }</>
                      )}
                      {selectedItem.recurrence_pattern === 'monthly' && (
                        <>
                          {selectedItem.recurrence_day_of_month !== null && selectedItem.recurrence_day_of_month !== undefined && (
                            <>Mensal - Todo dia {selectedItem.recurrence_day_of_month}</>
                          )}
                          {selectedItem.recurrence_week_of_month !== null && selectedItem.recurrence_week_of_month !== undefined && selectedItem.recurrence_day_of_week !== null && selectedItem.recurrence_day_of_week !== undefined && (
                            <>
                              Mensal - Toda {
                                selectedItem.recurrence_week_of_month === -1 
                                  ? 'última' 
                                  : ['primeira', 'segunda', 'terceira', 'quarta'][selectedItem.recurrence_week_of_month - 1] || ''
                              } {
                                ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedItem.recurrence_day_of_week]
                              } do mês
                            </>
                          )}
                        </>
                      )}
                    </p>

                    {selectedItem.recurrence_end_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Até {format(new Date(selectedItem.recurrence_end_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Seção: Localização e Organização */}
            {(selectedItem.location || selectedItem.congregation || selectedItem.group || selectedItem.responsible_member) && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  Localização e Organização
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local */}
                  {selectedItem.location && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <MapPin size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">Local</p>
                        <p className="text-sm text-gray-900">{selectedItem.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Congregação */}
                  {selectedItem.congregation && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <Church size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">Congregação</p>
                        <p className="text-sm text-gray-900">{selectedItem.congregation.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Grupo / Ministério */}
                  {selectedItem.group && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <Users size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">Grupo / Ministério</p>
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{selectedItem.group.type}</span>: {selectedItem.group.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Responsável */}
                  {selectedItem.responsible_member && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">Responsável</p>
                        <p className="text-sm text-gray-900">{selectedItem.responsible_member.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seção: Descrição */}
            {selectedItem.description && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  Descrição
                </h3>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedItem.description}</p>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setViewModalOpen(false);
                }}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={handleEditClick}
                className="flex items-center gap-2"
              >
                <Edit size={16} />
                Editar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteClick}
                className="flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Edição */}
      {selectedItem && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedItem(null);
          }}
          title="Editar Item do Calendário"
          size="lg"
        >
          <CalendarItemForm
            mode="edit"
            item={selectedItem}
            onSubmit={handleUpdateItem}
            onCancel={() => {
              setEditModalOpen(false);
              setSelectedItem(null);
            }}
            isLoading={isSubmitting}
          />
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {selectedItem && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedItem(null);
          }}
          title="Excluir Item do Calendário"
          size="md"
        >
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja excluir o item <strong>{selectedItem.title}</strong>? 
              Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedItem(null);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteItem}
                isLoading={isSubmitting}
                className="flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
