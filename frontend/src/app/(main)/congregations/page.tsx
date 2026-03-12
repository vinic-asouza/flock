'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CongregationList } from '@/components/congregations/CongregationList';
import { CongregationModal } from '@/components/congregations/CongregationModal';
import { CreateCongregationModal } from '@/components/congregations/CreateCongregationModal';
import { EditCongregationModal } from '@/components/congregations/EditCongregationModal';
import { DeleteCongregationModal } from '@/components/congregations/DeleteCongregationModal';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

export default function CongregationsPage() {
  const { canEdit } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // Estados dos modais
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('');
  const [selectedCongregationName, setSelectedCongregationName] = useState<string>('');
  const [selectedCongregationMembersCount, setSelectedCongregationMembersCount] = useState<number>(0);

  const handleViewCongregation = (id: string) => {
    setSelectedCongregationId(id);
    setDetailModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setCreateModalOpen(false);
  };

  const handleEditCongregation = (id: string) => {
    setSelectedCongregationId(id);
    setEditModalOpen(true);
  };

  const handleDeleteCongregation = (id: string, name: string, activeMembersCount: number = 0) => {
    setSelectedCongregationId(id);
    setSelectedCongregationName(name);
    setSelectedCongregationMembersCount(activeMembersCount);
    setDeleteModalOpen(true);
  };

  const handleEditSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setEditModalOpen(false);
  };

  const handleDeleteSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setDeleteModalOpen(false);
  };

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const filters = search.trim() ? { search: search.trim() } : {};
      const blob = await apiService.exportCongregationsList(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `congregacoes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao exportar PDF. Tente novamente.';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }, [search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Congregações"
        subtitle="Organize as congregações e acompanhe suas informações."
        actions={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2"
            disabled={canEdit === false}
            title={canEdit === false ? READER_TOOLTIP : undefined}
          >
            <Plus size={18} />
            Adicionar Congregação
          </Button>
        }
      />

      <MemberSearchInput
        value={search}
        onChange={setSearch}
        isLoading={false}
        placeholder="Busque por nome da congregação"
      />

      <CongregationList 
        search={search}
        canEdit={canEdit}
        onView={handleViewCongregation}
        onEdit={handleEditCongregation}
        onDelete={handleDeleteCongregation}
        onExport={handleExport}
        exporting={exporting}
        refreshTrigger={refreshTrigger}
      />

      {/* Modal de detalhes da congregação */}
      <CongregationModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        congregationId={detailModalOpen ? selectedCongregationId : null}
        canEdit={canEdit}
        onEdit={(id) => {
          setDetailModalOpen(false);
          handleEditCongregation(id);
        }}
        onDelete={(id, name) => {
          setDetailModalOpen(false);
          handleDeleteCongregation(id, name);
        }}
        onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Modais */}
      <CreateCongregationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditCongregationModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        congregationId={selectedCongregationId}
        onSuccess={handleEditSuccess}
      />

      <DeleteCongregationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        congregationId={selectedCongregationId}
        congregationName={selectedCongregationName}
        activeMembersCount={selectedCongregationMembersCount}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
