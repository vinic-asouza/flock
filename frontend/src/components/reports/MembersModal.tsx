'use client';

import { useState, useEffect } from 'react';
import { X, Users, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { apiService } from '@/services/api';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  tabs: { label: string; value: string; count: number; color: string }[];
  filterKey: string; // 'gender', 'marital_status', 'age_range', etc.
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
  itemsPerPage?: number;
  sideLayout?: boolean; // Para modais com muitas tabs (ex: faixa etária)
}

export function MembersModal({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  tabs, 
  filterKey, 
  viewMode = 'all', 
  selectedCongregationId,
  itemsPerPage = 6,
  sideLayout = false
}: MembersModalProps) {
  const [activeTab, setActiveTab] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Definir tab ativa inicial
  useEffect(() => {
    if (isOpen && tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].value);
    }
  }, [isOpen, tabs, activeTab]);

  // Buscar membros quando mudar a tab, página ou filtros do ViewSelector
  useEffect(() => {
    if (isOpen && activeTab) {
      fetchMembers();
    }
  }, [isOpen, activeTab, currentPage, viewMode, selectedCongregationId]);

  // Resetar página quando mudar de tab
  useEffect(() => {
    if (activeTab) {
      setCurrentPage(1);
    }
  }, [activeTab]);

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
        [filterKey]: activeTab,
        active: true // Filtrar apenas membros ativos
      };

      // Aplicar filtro baseado no ViewSelector da página principal
      if (viewMode === 'sede') {
        params.congregation_id = 'sede';
      } else if (viewMode === 'congregation' && selectedCongregationId) {
        params.congregation_id = selectedCongregationId;
      }
      // Se viewMode === 'all', não adiciona filtro de congregação

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop com blur padrão do sistema */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col mx-4 ${
          sideLayout ? 'max-w-6xl' : 'max-w-4xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
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

        {sideLayout ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar com Tabs */}
            <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900">Selecione a faixa etária:</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.value
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                          : 'text-gray-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tab.color }}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs opacity-75">{tab.count} membro(s)</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-hidden p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={20} className="animate-spin" />
                      Carregando membros...
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
                              para {tabs.find(t => t.value === activeTab)?.label || 'esta categoria'}
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
        ) : (
          <>
            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex-1 min-w-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ minWidth: '120px' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tab.color }}
                      />
                      <span className="trucate text-center leading-tight">
                        {tab.label} ({tab.count})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    Carregando membros...
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
                            para {tabs.find(t => t.value === activeTab)?.label || 'esta categoria'}
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
          </>
        )}
      </div>
    </div>
  );
}
