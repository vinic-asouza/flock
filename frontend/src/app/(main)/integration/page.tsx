'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FileText, LinkIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { IntegrationList } from '@/components/integration/IntegrationList';
import { CreateIntegrationModal } from '@/components/integration/CreateIntegrationModal';
import { EditIntegrationModal } from '@/components/integration/EditIntegrationModal';
import { DeleteIntegrationModal } from '@/components/integration/DeleteIntegrationModal';
import { ConvertIntegrationModal } from '@/components/integration/ConvertIntegrationModal';
import { IntegrationProvider, useIntegration } from '@/context/IntegrationContext';
import { useFiltersData } from '@/hooks/useFiltersData';
import { IntegrationFilters, IntegrationMember } from '@/types';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { IntegrationFiltersBar } from '@/components/integration/IntegrationFiltersBar';
import { IntegrationActiveFiltersChips } from '@/components/integration/IntegrationActiveFiltersChips';
import { MembersSkeleton } from '@/components/members/MembersSkeleton';
import { ViewIntegrationModal } from '@/components/integration/ViewIntegrationModal';
import { ExportIntegrationModal } from '@/components/integration/ExportIntegrationModal';
import { IntegrationLinksModal } from '@/components/integration/IntegrationLinksModal';
import apiService from '@/services/api';

const initialFilters: IntegrationFilters = {
  search: '',
  status: 'todos',
  expectedCongregationId: '',
  mentorId: '',
  sort_by: 'created_at',
  sort_order: 'desc'
};

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

function IntegrationPageContent() {
  const { canEdit } = useAuth();
  const {
    loading,
    loadIntegrationMembers,
    addIntegrationMemberOptimistic,
    updateIntegrationMemberOptimistic,
    removeIntegrationMemberOptimistic
  } = useIntegration();

  const { congregations, loading: filtersLoading, error: filtersError } = useFiltersData();

  const [filters, setFilters] = useState<IntegrationFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<IntegrationMember | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingList, setExportingList] = useState(false);
  const [preRegistrationLoading, setPreRegistrationLoading] = useState(false);
  const [integrationLinksModalOpen, setIntegrationLinksModalOpen] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await loadIntegrationMembers(filters, 1);
      setIsInitializing(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (!isInitializing) {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        return;
      }
      loadIntegrationMembers(filters, currentPage);
    }
  }, [filters, currentPage, loadIntegrationMembers, isInitializing]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (changes: Partial<IntegrationFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...changes
    }));
    setCurrentPage(1);
  };

  const handleRemoveFilter = (key: keyof IntegrationFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: initialFilters[key]
    }));
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCreateSuccess = (member: IntegrationMember) => {
    addIntegrationMemberOptimistic(member);
    setCreateModalOpen(false);
  };

  const handleEditSuccess = (member: IntegrationMember) => {
    updateIntegrationMemberOptimistic(member.id, member);
    setEditModalOpen(false);
    setSelectedMember(null);
  };

  const handleDeleteSuccess = () => {
    if (selectedMember) {
      removeIntegrationMemberOptimistic(selectedMember.id);
    }
    setDeleteModalOpen(false);
    setSelectedMember(null);
  };

  const handleConvertSuccess = (result: { member: unknown; integrationMember: IntegrationMember }) => {
    updateIntegrationMemberOptimistic(result.integrationMember.id, result.integrationMember);
    setConvertModalOpen(false);
    setSelectedMember(null);
  };

  const handleDownloadPreRegistrationForm = useCallback(async () => {
    try {
      setPreRegistrationLoading(true);
      const { blob, filename } = await apiService.exportIntegrationRegistrationFormPDF();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Ficha de pré-cadastro baixada com sucesso!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao baixar ficha de pré-cadastro.';
      toast.error(errorMessage);
    } finally {
      setPreRegistrationLoading(false);
    }
  }, []);

  const handleExportIntegrationList = async (selectedFields: string[]) => {
    try {
      setExportingList(true);
      const blob = await apiService.exportIntegrationList(filters, selectedFields);

      // Verificar se a resposta é um JSON de erro disfarçado de blob
      if (blob.type === 'application/json') {
        const text = await blob.text();
        let errorMsg = 'Erro ao gerar PDF. Tente novamente.';
        try {
          const json = JSON.parse(text) as { error?: string; details?: string };
          const detail = Array.isArray(json.details) ? (json.details as string[]).join('; ') : json.details;
          errorMsg = detail ? `${json.error}: ${detail}` : (json.error || errorMsg);
        } catch {
          // parse falhou — manter mensagem genérica
        }
        throw new Error(errorMsg);
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-integrantes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao exportar lista. Tente novamente.';
      throw new Error(errorMessage);
    } finally {
      setExportingList(false);
    }
  };

  const isPageReady = !isInitializing && !filtersLoading;
  if (!isPageReady) {
    return <MembersSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integração"
        subtitle="Gerencie integrantes em processo de integração e converta-os em membros."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="secondary"
              onClick={handleDownloadPreRegistrationForm}
              className="inline-flex items-center justify-center gap-2 min-h-11"
              isLoading={preRegistrationLoading}
              title="Baixar ficha em branco para impressão e preenchimento manual"
            >
              <FileText size={18} className="shrink-0" />
              <span className="hidden sm:inline">Ficha de pré-cadastro</span>
              <span className="sm:hidden">Ficha</span>
            </Button>
            <Button
              onClick={() => setIntegrationLinksModalOpen(true)}
              variant="secondary"
              className="inline-flex items-center justify-center gap-2 min-h-11"
              title={canEdit === false ? 'Visualizar e copiar links de autocadastro' : undefined}
            >
              <LinkIcon size={18} className="shrink-0" />
              <span className="hidden sm:inline">Links de Autocadastro</span>
              <span className="sm:hidden">Links</span>
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 min-h-11"
              disabled={canEdit === false}
              title={canEdit === false ? READER_TOOLTIP : undefined}
            >
              <Plus size={18} className="shrink-0" />
              <span className="hidden sm:inline">Novo integrante</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:min-w-[200px] sm:flex-1 flex flex-col gap-1">
          <label htmlFor="integration-search" className="block text-xs font-medium text-gray-600">
            Busca
          </label>
          <MemberSearchInput
            id="integration-search"
            value={filters.search}
            onChange={handleSearchChange}
            isLoading={loading}
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto sm:flex-shrink-0">
          <IntegrationFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            congregations={congregations}
            filtersLoading={filtersLoading}
            filtersError={filtersError}
          />
        </div>
      </div>

      <IntegrationActiveFiltersChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        congregations={congregations}
      />

      <IntegrationList
        canEdit={canEdit}
        onEdit={(member) => {
          setSelectedMember(member);
          setEditModalOpen(true);
        }}
        onConvert={(member) => {
          setSelectedMember(member);
          setConvertModalOpen(true);
        }}
        onDelete={(member) => {
          setSelectedMember(member);
          setDeleteModalOpen(true);
        }}
        onView={(member) => {
          setSelectedMember(member);
          setViewModalOpen(true);
        }}
        onPageChange={handlePageChange}
        onExport={() => setExportModalOpen(true)}
        onRetry={() => loadIntegrationMembers(filters, currentPage)}
        isExporting={exportingList}
        filters={filters}
        currentPage={currentPage}
      />

      <CreateIntegrationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditIntegrationModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember ?? undefined}
        onSuccess={handleEditSuccess}
      />

      <DeleteIntegrationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedMember(null);
        }}
        memberId={selectedMember?.id}
        memberName={selectedMember?.name}
        onSuccess={handleDeleteSuccess}
      />

      <ConvertIntegrationModal
        isOpen={convertModalOpen}
        onClose={() => {
          setConvertModalOpen(false);
          setSelectedMember(null);
        }}
        integrationMember={selectedMember ?? undefined}
        onSuccess={handleConvertSuccess}
      />

      <ViewIntegrationModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedMember(null);
        }}
        integrationMemberId={selectedMember?.id || null}
        canEdit={canEdit}
        onDelete={() => {
          if (selectedMember) {
            removeIntegrationMemberOptimistic(selectedMember.id);
          }
          setViewModalOpen(false);
          setSelectedMember(null);
        }}
        onConvert={() => {
          setViewModalOpen(false);
          // Não limpar selectedMember aqui, pois o ConvertIntegrationModal precisa dele
          setConvertModalOpen(true);
        }}
        onDiscard={() => {
          if (selectedMember) {
            updateIntegrationMemberOptimistic(selectedMember.id, {
              ...selectedMember,
              status: 'descartado'
            });
          }
          setViewModalOpen(false);
          setSelectedMember(null);
        }}
      />

      <ExportIntegrationModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportIntegrationList}
      />

      <IntegrationLinksModal
        isOpen={integrationLinksModalOpen}
        onClose={() => setIntegrationLinksModalOpen(false)}
        canEdit={canEdit}
      />
    </div>
  );
}

export default function IntegrationPage() {
  return (
    <IntegrationProvider>
      <IntegrationPageContent />
    </IntegrationProvider>
  );
}

