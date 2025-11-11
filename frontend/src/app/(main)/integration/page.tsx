'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IntegrationList } from '@/components/integration/IntegrationList';
import { CreateIntegrationModal } from '@/components/integration/CreateIntegrationModal';
import { EditIntegrationModal } from '@/components/integration/EditIntegrationModal';
import { DeleteIntegrationModal } from '@/components/integration/DeleteIntegrationModal';
import { ConvertIntegrationModal } from '@/components/integration/ConvertIntegrationModal';
import { IntegrationProvider, useIntegration } from '@/context/IntegrationContext';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import { IntegrationFilters, IntegrationMember } from '@/types';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { IntegrationFiltersBar } from '@/components/integration/IntegrationFiltersBar';
import { IntegrationActiveFiltersChips } from '@/components/integration/IntegrationActiveFiltersChips';
import { MembersSkeleton } from '@/components/members/MembersSkeleton';
import { ViewIntegrationModal } from '@/components/integration/ViewIntegrationModal';
import { ExportIntegrationModal } from '@/components/integration/ExportIntegrationModal';
import apiService from '@/services/api';

const initialFilters: IntegrationFilters = {
  search: '',
  status: 'todos',
  expectedCongregationId: '',
  mentorId: '',
  sort_by: 'created_at',
  sort_order: 'desc'
};

function IntegrationPageContent() {
  const {
    loading,
    loadIntegrationMembers,
    addIntegrationMemberOptimistic,
    updateIntegrationMemberOptimistic,
    removeIntegrationMemberOptimistic
  } = useIntegration();

  const { congregations } = useFiltersData();
  const { options: mentorOptions, loading: mentorsLoading } = useMemberOptions();

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

  useEffect(() => {
    const initialize = async () => {
      await loadIntegrationMembers(filters, 1);
      setIsInitializing(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
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

  const handleConvertSuccess = (result: { member: any; integrationMember: IntegrationMember }) => {
    updateIntegrationMemberOptimistic(result.integrationMember.id, result.integrationMember);
    setConvertModalOpen(false);
    setSelectedMember(null);
  };

  const handleExportIntegrationList = async (selectedFields: string[]) => {
    try {
      setExportingList(true);
      const blob = await apiService.exportIntegrationList(filters, selectedFields);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-integrantes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar lista de integrantes:', error);
      alert('Erro ao exportar lista. Tente novamente.');
    } finally {
      setExportingList(false);
    }
  };

  if (isInitializing) {
    return <MembersSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Integração</h1>
        <Button onClick={() => setCreateModalOpen(true)} className="inline-flex items-center gap-2">
          <Plus size={18} />
          Novo integrante
        </Button>
      </div>

      <MemberSearchInput value={filters.search} onChange={handleSearchChange} isLoading={loading} />

      <IntegrationFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        congregations={congregations}
        mentors={mentorOptions}
        loadingMentors={mentorsLoading}
      />

      <IntegrationActiveFiltersChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        congregations={congregations}
        mentors={mentorOptions}
      />

      <IntegrationList
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
        isExporting={exportingList}
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
      />

      <ExportIntegrationModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportIntegrationList}
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

