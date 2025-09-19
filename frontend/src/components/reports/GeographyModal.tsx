'use client';

import { useState, useEffect } from 'react';
import { X, Users, Loader2, ChevronLeft, ChevronRight, Download, MapPin } from 'lucide-react';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { useGeographyData } from '@/hooks/useGeographyData';
import { getStateName } from '@/utils';

interface GeographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cities: Record<string, number>;
  states: Record<string, number>;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
  itemsPerPage?: number;
}

export function GeographyModal({ 
  isOpen, 
  onClose, 
  title,
  cities,
  states,
  viewMode = 'all', 
  selectedCongregationId,
  itemsPerPage = 6
}: GeographyModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Usar hook personalizado para gerenciar dados geográficos
  const {
    states: statesOptions,
    filteredCities: citiesOptions,
    selectedState,
    selectedCity,
    setSelectedState,
    setSelectedCity,
    loading: geographyLoading
  } = useGeographyData(cities, states);

  // O hook useGeographyData já gerencia o estado inicial

  // Buscar membros quando mudar filtros
  useEffect(() => {
    if (isOpen && (selectedState || selectedCity)) {
      fetchMembers();
    }
  }, [isOpen, selectedState, selectedCity, currentPage, viewMode, selectedCongregationId]);

  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedCity]);

  // O hook useGeographyData já gerencia a limpeza da cidade

  // Fechar modal com Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        active: true // Filtrar apenas membros ativos
      };

      // Aplicar filtros de localização
      if (selectedState) {
        params.state = selectedState;
      }
      if (selectedCity) {
        params.city = selectedCity;
      }

      // Aplicar filtro baseado no ViewSelector da página principal
      if (viewMode === 'sede') {
        params.congregation_id = 'sede';
      } else if (viewMode === 'congregation' && selectedCongregationId) {
        params.congregation_id = selectedCongregationId;
      }

      const response = await apiService.listMembers(params);
      setMembers(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      setMembers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // Os handlers são gerenciados pelo hook useGeographyData

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col mx-4 max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#090725]/10">
              <MapPin size={20} className="text-[#090725]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-primary text-white hover:bg-primary/90"
            >
              <Download size={12} />
              Exportar
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar com Filtros */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {/* Filtro por Estado */}
              <Select
                label="Estado"
                options={statesOptions.map(state => ({
                  value: state.code,
                  label: state.name,
                  count: state.count
                }))}
                value={selectedState}
                onChange={setSelectedState}
                placeholder="Selecione um estado"
                showCount={true}
                searchable={true}
              />

              {/* Filtro por Cidade */}
              <Select
                label={`Cidade ${selectedState ? `(${getStateName(selectedState)})` : ''}`}
                options={citiesOptions.map(city => ({
                  value: city.name,
                  label: city.name,
                  count: city.count
                }))}
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder={selectedState ? "Selecione uma cidade" : "Primeiro selecione um estado"}
                disabled={!selectedState}
                showCount={true}
                searchable={true}
              />

              {/* Resumo dos filtros ativos */}
              {(selectedState || selectedCity) && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Filtros ativos:</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    {selectedState && (
                      <div>Estado: <span className="font-medium">{getStateName(selectedState)}</span></div>
                    )}
                    {selectedCity && (
                      <div>Cidade: <span className="font-medium">{selectedCity}</span></div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedState('');
                      setSelectedCity('');
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden p-6">
              {loading || geographyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    {loading ? 'Carregando membros...' : 'Carregando dados geográficos...'}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    {members.length > 0 ? (
                      <div className="space-y-3">
                        {members.map((member) => (
                          <MemberCardCompact key={member.id} member={member} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                          <Users size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>Nenhum membro encontrado</p>
                          <p className="text-sm text-gray-400">
                            {selectedState || selectedCity 
                              ? `para os filtros selecionados`
                              : 'Selecione um estado para visualizar os membros'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Paginação */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Página {pagination.page} de {pagination.totalPages} 
                          ({pagination.total} membro(s) total)
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>
                          <span className="text-sm text-gray-600 px-2">
                            {currentPage}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
