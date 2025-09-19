'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { MemberReports, ReportFilters } from '@/types';
import { Loader, RefreshCw, Download, Building, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Componentes que serão criados
import { SummaryCards } from '@/components/reports/SummaryCards';
import { DemographicsCharts } from '@/components/reports/DemographicsCharts';
import { ChurchStructureCharts } from '@/components/reports/ChurchStructureCharts';
import { TimelineCharts } from '@/components/reports/TimelineCharts';
import { GeographySection } from '@/components/reports/GeographySection';
import { OccupationsTable } from '@/components/reports/OccupationsTable';
import { ViewSelector, ViewMode } from '@/components/reports/ViewSelector';
import { ExportModal } from '@/components/reports/ExportModal';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportsData, setReportsData] = useState<MemberReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | undefined>();
  const [selectedCongregationName, setSelectedCongregationName] = useState<string | undefined>();
  const [showExportModal, setShowExportModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [waitingForCongregation, setWaitingForCongregation] = useState(false);

  // Carregar dados dos relatórios
  const loadReports = async (view: ViewMode, congregationId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir filtros baseados na visualização selecionada
      const filters: ReportFilters = {};
      
      if (view === 'sede') {
        filters.congregation_id = 'sede';
      } else if (view === 'congregation' && congregationId) {
        filters.congregation_id = congregationId;
      }
      
      const data = await apiService.getMemberReports(filters);
      setReportsData(data);
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    } catch (err: any) {
      console.error('Erro ao carregar relatórios:', err);
      setError(err.message || 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    // Não carregar dados se for congregação específica mas nenhuma congregação estiver selecionada
    if (viewMode === 'congregation' && !selectedCongregationId) {
      setWaitingForCongregation(true);
      setLoading(false);
      return;
    }
    
    setWaitingForCongregation(false);
    loadReports(viewMode, selectedCongregationId);
  }, [viewMode, selectedCongregationId]);


  // Mudar visualização
  const handleViewChange = (view: ViewMode, congregationId?: string, congregationName?: string) => {
    setViewMode(view);
    setSelectedCongregationId(congregationId);
    setSelectedCongregationName(congregationName);
  };

  // Atualizar dados
  const handleRefresh = () => {
    loadReports(viewMode, selectedCongregationId);
  };

  // Exportar relatórios
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Implementar exportação
    console.log('Exportar em formato:', format);
    // Aqui você pode implementar a lógica de exportação
    // Por exemplo, gerar PDF com jsPDF, Excel com xlsx, etc.
  };

  if (loading && !reportsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin text-primary mx-auto mb-4" size={48} />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Erro ao carregar relatórios</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw size={16} className="mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Título da Página */}
      <div className="px-6 pt-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Relatórios
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Análise detalhada dos membros da igreja
          {lastUpdated && (
            <span className="ml-2">
              • Atualizado em {lastUpdated}
            </span>
          )}
        </p>
      </div>

      {/* Header com Controles */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border border-[#090725]/10 px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Coluna 1: Seletor de Visualização */}
            <div className="flex-1">
              <ViewSelector
                selectedView={viewMode}
                selectedCongregationId={selectedCongregationId}
                onViewChange={handleViewChange}
              />
            </div>
            
            {/* Coluna 2: Botões de Ação */}
            <div className="flex items-center justify-end lg:justify-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
                
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-primary text-white hover:bg-primary/90"
                >
                  <Download size={12} />
                  Exportar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 space-y-6">
        {/* Aguardando seleção de congregação */}
        {waitingForCongregation ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Building size={32} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Selecione uma Congregação
                </h3>
                <p className="text-blue-700">
                  Escolha uma congregação específica para visualizar os relatórios detalhados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <SummaryCards 
              data={reportsData.summary} 
              loading={loading}
              filterInfo={reportsData.filters}
              congregationName={selectedCongregationName}
            />

            {/* Divisória */}
            <div className="border-t border-gray-200"></div>

            {/* Timeline */}
            <TimelineCharts 
              data={reportsData.timeline} 
              loading={loading}
              showCongregationColumn={viewMode === 'all'}
            />

            {/* Divisória */}
            <div className="border-t border-gray-200"></div>

            {/* Gráficos de Demografia */}
            <DemographicsCharts 
              data={reportsData.demographics} 
              loading={loading}
              viewMode={viewMode}
              selectedCongregationId={selectedCongregationId}
            />

            {/* Divisória */}
            <div className="border-t border-gray-200"></div>

            {/* Estrutura da Igreja */}
            <ChurchStructureCharts 
              data={reportsData.churchStructure} 
              loading={loading}
              hideCongregations={viewMode === 'sede' || viewMode === 'congregation'}
              viewMode={viewMode}
              selectedCongregationId={selectedCongregationId}
            />

            {/* Divisória */}
            <div className="border-t border-gray-200"></div>

            {/* Geografia */}
            <GeographySection 
              cities={reportsData.demographics.cities}
              states={reportsData.demographics.states}
              loading={loading}
              viewMode={viewMode}
              selectedCongregationId={selectedCongregationId}
            />

            {/* Divisória */}
            <div className="border-t border-gray-200"></div>

            {/* Ocupações */}
            <OccupationsTable data={reportsData.topOccupations} loading={loading} />
          </>
        )}
      </div>

      {/* Modal de Exportação */}
      {reportsData && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={reportsData}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
