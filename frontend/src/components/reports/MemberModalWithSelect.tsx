'use client';

import { useState, useEffect } from 'react';
import { X, Users, Loader2, ChevronLeft, ChevronRight, Download, XCircle, Search } from 'lucide-react';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { ExportMembersModal } from '@/components/members/ExportMembersModal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface SelectOption {
  value: string;
  label: string;
  count?: number;
}

interface SelectFilter {
  key: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  useSearch?: boolean; // Nova prop para usar busca ao invés de select
}

interface MemberModalWithSelectProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  filters: SelectFilter[];
  selectedValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  viewMode?: 'all' | 'congregation';
  selectedCongregationId?: string;
  itemsPerPage?: number;
}

export function MemberModalWithSelect({ 
  isOpen, 
  onClose, 
  title,
  icon,
  filters,
  selectedValues,
  onFilterChange,
  viewMode = 'all', 
  selectedCongregationId,
  itemsPerPage = 10
}: MemberModalWithSelectProps) {
  const [members, setMembers] = useState<{ id: string; [key: string]: unknown }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);

  // Buscar membros quando mudar filtros
  useEffect(() => {
    if (isOpen) {
      // Verificar se há filtros de busca
      const searchFilters = filters.filter(f => f.useSearch);
      const hasSearchValue = searchFilters.some(f => selectedValues[f.key] && selectedValues[f.key].trim() !== '');
      
      // Verificar se há filtros normais (não busca) com valores
      const normalFilters = filters.filter(f => !f.useSearch);
      const hasNormalFilterValue = normalFilters.some(f => selectedValues[f.key]);
      
      if (hasSearchValue) {
        // Se houver busca com valor, aguardar 500ms antes de buscar (debounce)
        const timeoutId = setTimeout(() => {
          fetchMembers();
        }, 500);
        return () => clearTimeout(timeoutId);
      } else if (hasNormalFilterValue) {
        // Se houver filtro normal com valor, buscar imediatamente
        fetchMembers();
      } else if (!hasSearchValue && searchFilters.length > 0 && normalFilters.length === 0) {
        // Se houver apenas filtros de busca mas sem valor, não buscar ainda
        setMembers([]);
        setPagination(null);
      } else {
        // Caso padrão: buscar imediatamente
        fetchMembers();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedValues, currentPage, viewMode, selectedCongregationId]);

  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedValues]);

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
      const params: Record<string, string | number | boolean | null | undefined> = {
        page: currentPage,
        limit: itemsPerPage,
        active: true // Filtrar apenas membros ativos
      };

      // Aplicar filtros selecionados
      filters.forEach(filter => {
        const value = selectedValues[filter.key];
        if (value) {
          // Se for um filtro de busca, usar ilike para busca parcial
          if (filter.useSearch) {
            params[filter.key] = value;
          } else {
            params[filter.key] = value;
          }
        }
      });

      // Aplicar filtro baseado no ViewSelector da página principal
      if (viewMode === 'congregation' && selectedCongregationId) {
        params.congregation_id = selectedCongregationId;
      }

      const response = await apiService.listMembers(params);
      setMembers(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar membros';
      toast.error(errorMessage);
      setMembers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    filters.forEach(filter => {
      onFilterChange(filter.key, '');
    });
  };

  const hasActiveFilters = Object.values(selectedValues).some(value => value !== '');

  const handleExport = async (selectedFields: string[]) => {
    try {
      // Construir filtros baseados nos valores selecionados
      const exportFilters: Record<string, string | number | boolean | null | undefined> = {
        status: 'active' // Apenas membros ativos
      };

      // Aplicar filtros selecionados
      filters.forEach(filter => {
        const value = selectedValues[filter.key];
        if (value) {
          exportFilters[filter.key] = value;
        }
      });

      // Aplicar filtro baseado no ViewSelector
      if (viewMode === 'congregation' && selectedCongregationId) {
        exportFilters.congregation_id = selectedCongregationId;
      }

      // Chamar API para exportar
      const blob = await apiService.exportMembersList(exportFilters, selectedFields);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Criar nome do arquivo baseado nos filtros ativos
      const activeFilterLabels = filters
        .map(filter => {
          const value = selectedValues[filter.key];
          if (!value) return null;
          const option = filter.options.find(opt => opt.value === value);
          return option?.label || value;
        })
        .filter(Boolean)
        .join('-');
      
      const fileName = activeFilterLabels 
        ? `membros-${activeFilterLabels.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
        : `membros-${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao exportar PDF';
      toast.error(errorMessage);
    }
  };

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
        className="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] h-[90vh] flex flex-col mx-4 max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#090725]/10">
              {icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
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

        {/* Filtros Horizontais */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="space-y-4">
            {/* Seletores e Campos de Busca */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                filter.useSearch ? (
                  // Campo de busca para ocupação
                  <div key={filter.key} className="space-y-1">
                    <Input
                      type="text"
                      label={filter.label}
                      value={selectedValues[filter.key] || ''}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      placeholder={filter.placeholder}
                      disabled={filter.disabled}
                      icon={<Search size={16} />}
                    />
                  </div>
                ) : (
                  // Select padrão para outros filtros
                  <Select
                    key={filter.key}
                    label={filter.label}
                    options={filter.options}
                    value={selectedValues[filter.key] || ''}
                    onChange={(value) => onFilterChange(filter.key, value)}
                    placeholder={filter.placeholder}
                    disabled={filter.disabled}
                    showCount={true}
                    searchable={true}
                  />
                )
              ))}
            </div>

            {/* Filtros ativos na mesma linha dos seletores */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-700">Filtros ativos:</span>
                  {filters.map((filter) => {
                    const value = selectedValues[filter.key];
                    if (!value) return null;
                    
                    // Se for busca, mostrar o valor digitado, senão buscar na lista de opções
                    const displayValue = filter.useSearch 
                      ? value 
                      : (filter.options.find(opt => opt.value === value)?.label || value);
                    
                    return (
                      <span key={filter.key as string} className="bg-white px-2 py-1 rounded border border-gray-300 text-xs text-gray-700">
                        {filter.label}: <span className="font-medium">{displayValue}</span>
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-white px-2 py-1 rounded border border-gray-300 transition-colors whitespace-nowrap"
                >
                  <XCircle size={12} />
                  Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 min-h-0 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 size={20} className="animate-spin" />
                Carregando membros...
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0">
                {members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <MemberCardCompact 
                        key={member.id} 
                        member={member as Parameters<typeof MemberCardCompact>[0]['member']} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1 text-gray-500">
                    <div className="text-center">
                      <Users size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>
                        {(() => {
                          const searchFilters = filters.filter(f => f.useSearch);
                          const hasOnlySearch = searchFilters.length === filters.length;
                          const searchHasValue = searchFilters.some(f => selectedValues[f.key] && selectedValues[f.key].trim() !== '');
                          
                          if (hasOnlySearch && !searchHasValue) {
                            return 'Digite uma ocupação para buscar membros';
                          }
                          return hasActiveFilters 
                            ? 'Nenhum membro encontrado para os filtros selecionados'
                            : 'Nenhum membro encontrado';
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paginação */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, pagination.total)} de {pagination.total} membro(s)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 transition-colors"
                        title="Página anterior"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-sm text-gray-700 font-medium">
                          {currentPage}
                        </span>
                        <span className="text-sm text-gray-400">
                          de
                        </span>
                        <span className="text-sm text-gray-700 font-medium">
                          {pagination.totalPages}
                        </span>
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                        disabled={currentPage === pagination.totalPages}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 transition-colors"
                        title="Próxima página"
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

      {/* Modal de Exportação */}
      <ExportMembersModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </div>
  );
}
