'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { GroupForm } from '@/components/groups/GroupForm';
import { GroupList } from '@/components/groups/GroupList';
import { GroupModal } from '@/components/groups/GroupModal';
import { GroupFiltersBar } from '@/components/groups/GroupFiltersBar';
import { GroupActiveFiltersChips } from '@/components/groups/GroupActiveFiltersChips';
import { GroupSummaryBar } from '@/components/groups/GroupSummaryBar';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { Group, GroupPayload, GroupFilters, GroupSorting } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

type GroupFormData = {
  name: string;
  description?: string;
  congregation_id: string;
  responsible_id?: string | null;
  status: boolean;
};

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

const initialFilters: GroupFilters = {
  search: '',
  congregationId: '',
  status: 'all',
};

const initialSorting: GroupSorting = {
  sort_by: 'name',
  sort_order: 'asc',
};

export default function MinistriesPage() {
  const { canEdit } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GroupFilters>(initialFilters);
  const [sorting, setSorting] = useState<GroupSorting>(initialSorting);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingGroups, setIsExportingGroups] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listGroups({
        congregation_id: filters.congregationId || undefined,
        status: filters.status,
        search: filters.search.trim() || undefined,
        sort_by: sorting.sort_by,
        sort_order: sorting.sort_order,
      });
      setGroups(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar ministérios';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters.congregationId, filters.status, filters.search, sorting.sort_by, sorting.sort_order]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleFilterChange = useCallback((changes: Partial<GroupFilters>) => {
    setFilters(prev => ({ ...prev, ...changes }));
  }, []);

  const handleSortingChange = useCallback((newSorting: GroupSorting) => {
    setSorting(newSorting);
  }, []);

  const handleRemoveFilter = useCallback((key: keyof GroupFilters) => {
    setFilters(prev => ({ ...prev, [key]: initialFilters[key] }));
  }, []);

  const handleRemoveSorting = useCallback(() => {
    setSorting(initialSorting);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(initialFilters);
    setSorting(initialSorting);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const handleCreateGroup = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      await apiService.createGroup(data as GroupPayload);
      toast.success('Ministério criado com sucesso!');
      setCreateModalOpen(false);
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar ministério';
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGroup = async (data: GroupFormData) => {
    if (!selectedGroupId) return;
    try {
      setIsSubmitting(true);
      await apiService.updateGroup(selectedGroupId, data as Partial<GroupPayload>);
      toast.success('Ministério atualizado com sucesso!');
      setEditModalOpen(false);
      setSelectedGroupId('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar ministério';
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    try {
      setIsSubmitting(true);
      await apiService.deleteGroup(selectedGroupId);
      toast.success('Ministério excluído com sucesso!');
      setDeleteModalOpen(false);
      setSelectedGroupId('');
      setSelectedGroupName('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir ministério';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewGroup = (id: string) => {
    setSelectedGroupId(id);
    setViewModalOpen(true);
  };

  const handleEditClick = (id: string) => {
    setSelectedGroupId(id);
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
    setViewModalOpen(false);
    setDeleteModalOpen(true);
  };

  const handleExportGroups = useCallback(async () => {
    try {
      setIsExportingGroups(true);

      const blob = await apiService.exportGroupsList({
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.congregationId ? { congregation_id: filters.congregationId } : {}),
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ministerios-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao exportar PDF. Tente novamente.';
      toast.error(msg);
    } finally {
      setIsExportingGroups(false);
    }
  }, [filters]);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.congregationId !== '' ||
    filters.status !== 'all' ||
    sorting.sort_by !== initialSorting.sort_by ||
    sorting.sort_order !== initialSorting.sort_order;

  const createFormId = 'create-ministry-form';
  const editFormId = 'edit-ministry-form';

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Ministérios"
        subtitle="Gerencie os ministérios da sua igreja"
        actions={
          <Button
            onClick={() => setCreateModalOpen(true)}
            disabled={canEdit === false}
            title={canEdit === false ? READER_TOOLTIP : undefined}
            className="inline-flex min-h-11 items-center justify-center"
          >
            <Plus size={18} className="mr-2 shrink-0" />
            <span className="sm:hidden">Criar</span>
            <span className="hidden sm:inline">Criar Ministério</span>
          </Button>
        }
      />

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[200px] sm:flex-1">
          <label htmlFor="ministries-search" className="block text-xs font-medium text-gray-600">
            Busca
          </label>
          <MemberSearchInput
            id="ministries-search"
            value={filters.search}
            onChange={handleSearchChange}
            isLoading={loading}
            placeholder="Busque por nome do ministério"
          />
        </div>
        <div className="w-full min-w-0 sm:w-auto sm:flex-shrink-0">
          <GroupFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />
        </div>
      </div>

      <GroupActiveFiltersChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        sorting={sorting}
        onRemoveSorting={handleRemoveSorting}
        defaultSorting={initialSorting}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadGroups}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <GroupSummaryBar
            congregationId={filters.congregationId}
            groups={groups}
            onRefreshClick={loadGroups}
            onExportClick={handleExportGroups}
            exporting={isExportingGroups}
          />
          <GroupList
            groups={groups}
            onGroupClick={handleViewGroup}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearAllFilters}
          />
        </>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Criar Novo Ministério"
        size="lg"
        closeOnOverlayClick={!isSubmitting}
        closeOnEscape={!isSubmitting}
        footer={
          <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting} className="min-h-11 w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" form={createFormId} isLoading={isSubmitting} disabled={isSubmitting} className="min-h-11 w-full sm:w-auto">Criar Ministério</Button>
          </div>
        }
      >
        <GroupForm formId={createFormId} showActions={false} mode="create" onSubmit={handleCreateGroup} onCancel={() => setCreateModalOpen(false)} isLoading={isSubmitting} selectedCongregationId={filters.congregationId} />
      </Modal>

      <GroupModal isOpen={viewModalOpen} onClose={() => { setViewModalOpen(false); setSelectedGroupId(''); }} groupId={selectedGroupId} canEdit={canEdit} onEdit={handleEditClick} onDelete={handleDeleteClick} onRefresh={loadGroups} />

      {selectedGroupId && (
        <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedGroupId(''); }} title="Editar Ministério" size="lg" closeOnOverlayClick={!isSubmitting} closeOnEscape={!isSubmitting} footer={<div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6"><Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedGroupId(''); }} disabled={isSubmitting} className="min-h-11 w-full sm:w-auto">Cancelar</Button><Button type="submit" form={editFormId} isLoading={isSubmitting} disabled={isSubmitting} className="min-h-11 w-full sm:w-auto">Salvar Alterações</Button></div>}>
          <GroupForm formId={editFormId} showActions={false} mode="edit" group={groups.find(g => g.id === selectedGroupId) || null} onSubmit={handleEditGroup} onCancel={() => { setEditModalOpen(false); setSelectedGroupId(''); }} isLoading={isSubmitting} selectedCongregationId={filters.congregationId} />
        </Modal>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setSelectedGroupId(''); setSelectedGroupName(''); }} title="Excluir Ministério" size="md" closeOnOverlayClick={!isSubmitting} closeOnEscape={!isSubmitting} footer={<div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6"><Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setSelectedGroupId(''); setSelectedGroupName(''); }} disabled={isSubmitting} className="min-h-11 w-full sm:w-auto">Cancelar</Button><Button variant="danger" onClick={handleDeleteGroup} isLoading={isSubmitting} className="min-h-11 w-full sm:w-auto"><Trash2 size={16} className="mr-2 shrink-0" />Excluir</Button></div>}>
        <div className="p-4 sm:p-6">
          <p className="break-words text-gray-700">
            Tem certeza que deseja excluir o ministério <strong>{selectedGroupName}</strong>?
            Esta ação não poderá ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  );
}
