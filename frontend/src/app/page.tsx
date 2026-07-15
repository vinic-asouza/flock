'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService, formatApiError } from '@/services/api';
import { MemberReports, ReportFilters } from '@/types';
import { Loader, RefreshCw, Download, Building } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/main/Sidebar';
import { Header } from '@/components/main/Header';
import toast from 'react-hot-toast';

import { SummaryCards } from '@/components/reports/SummaryCards';
import { DemographicsCharts } from '@/components/reports/DemographicsCharts';
import { GroupsCharts } from '@/components/reports/GroupsCharts';
import { ChurchStructureCharts } from '@/components/reports/ChurchStructureCharts';
import { TimelineCharts } from '@/components/reports/TimelineCharts';
import { GeographySection } from '@/components/reports/GeographySection';
import { OccupationsTable } from '@/components/reports/OccupationsTable';
import { ViewSelector, ViewMode } from '@/components/reports/ViewSelector';
import { ReportsSkeleton } from '@/components/reports/ReportsSkeleton';

export default function HomePage() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [reportsData, setReportsData] = useState<MemberReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | undefined>();
  const [selectedCongregationName, setSelectedCongregationName] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [waitingForCongregation, setWaitingForCongregation] = useState(false);
  const [exporting, setExporting] = useState(false);
  const loadReportsRequestIdRef = useRef(0);

  const isExportBlocked =
    waitingForCongregation || (viewMode === 'congregation' && !selectedCongregationId);

  const loadReports = async (view: ViewMode, congregationId?: string) => {
    const requestId = ++loadReportsRequestIdRef.current;
    try {
      setLoading(true);
      setReportsError(null);

      const filters: ReportFilters = {};

      if (view === 'congregation' && congregationId) {
        filters.congregation_id = congregationId;
      }

      const data = await apiService.getMemberReports(filters);
      if (requestId !== loadReportsRequestIdRef.current) {
        return;
      }
      setReportsData(data);
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    } catch (err: unknown) {
      if (requestId !== loadReportsRequestIdRef.current) {
        return;
      }
      const errorWithStatus = err as Error & { status?: number };
      if (errorWithStatus.status === 401) {
        setReportsError(null);
        return;
      }

      const errorMessage = formatApiError(err);
      toast.error(errorMessage);
      setReportsError(errorMessage);
    } finally {
      if (requestId === loadReportsRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      setReportsError(null);
      return;
    }

    if (viewMode === 'congregation' && !selectedCongregationId) {
      setWaitingForCongregation(true);
      setLoading(false);
      setReportsData(null);
      return;
    }

    setWaitingForCongregation(false);
    loadReports(viewMode, selectedCongregationId);
  }, [viewMode, selectedCongregationId, isAuthLoading, isAuthenticated]);

  const handleViewChange = (view: ViewMode, congregationId?: string, congregationName?: string) => {
    setViewMode(view);
    setSelectedCongregationId(congregationId);
    setSelectedCongregationName(congregationName);
  };

  const handleRefresh = () => {
    loadReports(viewMode, selectedCongregationId);
  };

  const handleExportPDF = async () => {
    if (viewMode === 'congregation' && !selectedCongregationId) {
      toast.error('Selecione uma congregação antes de exportar o relatório.');
      return;
    }

    try {
      setExporting(true);

      const congregationParam =
        viewMode === 'congregation' && selectedCongregationId ? selectedCongregationId : undefined;

      const blob = await apiService.exportDashboardPDF(congregationParam);

      let filename = 'relatorio-geral';
      if (viewMode === 'congregation' && selectedCongregationName) {
        filename = `relatorio-${selectedCongregationName.toLowerCase().replace(/\s+/g, '-')}`;
      }
      filename += `-${new Date().toISOString().split('T')[0]}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const showShell = isAuthenticated && !isAuthLoading;
  const showInitialSkeleton = loading && !reportsData && !reportsError && !waitingForCongregation;
  const showDashboardContent =
    reportsData || waitingForCongregation || (loading && reportsData);

  return (
    <ProtectedRoute>
      {showShell && (
        <div className="h-screen bg-app flex flex-col">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar churchName={user?.name || ''} />
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
              {showInitialSkeleton ? (
                <ReportsSkeleton />
              ) : (
                <>
                  <div className="px-6">
                    <h1 className="text-xl font-semibold text-gray-900">Relatórios</h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Análise detalhada dos membros da igreja
                      {lastUpdated && (
                        <span className="ml-2">• Atualizado em {lastUpdated}</span>
                      )}
                    </p>
                  </div>

                  {reportsError && !reportsData && (
                    <div className="px-6 py-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
                        <h3 className="text-lg font-medium text-red-800 mb-2">
                          Erro ao carregar relatórios
                        </h3>
                        <p className="text-red-600 mb-4">{reportsError}</p>
                        <Button onClick={handleRefresh} variant="secondary">
                          <RefreshCw size={16} className="mr-2" />
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  )}

                  {!reportsError && !reportsData && !loading && !waitingForCongregation && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600">Nenhum dado disponível</p>
                    </div>
                  )}

                  {showDashboardContent && (
                    <>
                      <div className="px-6 py-4">
                        <div className="bg-white rounded-lg border border-[#090725]/10 px-6 py-4">
                          <div className="flex flex-col lg:flex-row gap-4 items-start">
                            <div className="flex-1 min-w-0">
                              <ViewSelector
                                selectedView={viewMode}
                                selectedCongregationId={selectedCongregationId}
                                onViewChange={handleViewChange}
                              />
                            </div>

                            <div className="flex items-center justify-end flex-shrink-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleRefresh}
                                  disabled={loading || waitingForCongregation}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    loading || waitingForCongregation
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                  Atualizar
                                </button>

                                <button
                                  onClick={handleExportPDF}
                                  disabled={exporting || loading || isExportBlocked}
                                  title={
                                    isExportBlocked
                                      ? 'Selecione uma congregação para exportar'
                                      : undefined
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    exporting || loading || isExportBlocked
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : 'bg-primary text-white hover:bg-primary/90'
                                  }`}
                                >
                                  {exporting ? (
                                    <>
                                      <Loader size={12} className="animate-spin" />
                                      Exportando...
                                    </>
                                  ) : (
                                    <>
                                      <Download size={12} />
                                      Exportar PDF
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {loading && reportsData ? (
                          <ReportsSkeleton />
                        ) : waitingForCongregation ? (
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
                                  Escolha uma congregação específica para visualizar os relatórios
                                  detalhados.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          reportsData && (
                            <>
                              <SummaryCards
                                data={reportsData.summary}
                                loading={loading}
                                filterInfo={reportsData.filters}
                                congregationName={selectedCongregationName}
                                integrationInProgress={
                                  reportsData.integration?.totals.inProgress ?? 0
                                }
                                integrationUnavailable={
                                  reportsData.integrationMeta?.available === false
                                }
                                integrationErrorMessage={reportsData.integrationMeta?.error}
                              />

                              <div className="border-t border-gray-200" />

                              <TimelineCharts
                                data={reportsData.timeline}
                                loading={loading}
                                showCongregationColumn={viewMode === 'all'}
                                integrationTimeline={reportsData.integration?.timeline}
                                integrationUnavailable={
                                  reportsData.integrationMeta?.available === false
                                }
                                integrationErrorMessage={reportsData.integrationMeta?.error}
                              />

                              <div className="border-t border-gray-200" />

                              <DemographicsCharts
                                data={reportsData.demographics}
                                loading={loading}
                                viewMode={viewMode}
                                selectedCongregationId={selectedCongregationId}
                              />

                              <div className="border-t border-gray-200" />

                              <GroupsCharts
                                loading={loading}
                                viewMode={viewMode}
                                selectedCongregationId={selectedCongregationId}
                                totalMembers={reportsData.summary.totalMembers}
                              />

                              <div className="border-t border-gray-200" />

                              <ChurchStructureCharts
                                data={reportsData.churchStructure}
                                loading={loading}
                                hideCongregations={viewMode === 'congregation'}
                              />

                              <div className="border-t border-gray-200" />

                              <GeographySection
                                cities={reportsData.demographics.cities}
                                states={reportsData.demographics.states}
                                loading={loading}
                                viewMode={viewMode}
                                selectedCongregationId={selectedCongregationId}
                              />

                              <div className="border-t border-gray-200" />

                              <OccupationsTable
                                data={reportsData.topOccupations}
                                loading={loading}
                                viewMode={viewMode}
                                selectedCongregationId={selectedCongregationId}
                              />
                            </>
                          )
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
