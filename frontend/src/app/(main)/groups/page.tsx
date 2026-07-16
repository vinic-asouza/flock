'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { GroupForm } from '@/components/groups/GroupForm';
import { GroupList } from '@/components/groups/GroupList';
import { GroupModal } from '@/components/groups/GroupModal';
import { GroupFiltersBar } from '@/components/groups/GroupFiltersBar';
import { GroupActiveFiltersChips } from '@/components/groups/GroupActiveFiltersChips';
import { GroupSummaryBar } from '@/components/groups/GroupSummaryBar';
import {
  ExportGroupsTypesModal,
  GROUP_TYPES,
} from '@/components/groups/ExportGroupsTypesModal';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { Group, GroupPayload, GroupFilters, GroupSorting, GroupType } from '@/types';

// Tipo do formulário de grupo (mesmo do GroupForm)
type GroupFormData = {
  name: string;
  type: Group['type'];
  description?: string;
  congregation_id: string;
  responsible_id?: string | null;
  status: boolean;
};
import { apiService } from '@/services/api';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

const initialFilters: GroupFilters = {
  search: '',
  congregationId: '',
  type: '',
  status: 'all'
};

const initialSorting: GroupSorting = {
  sort_by: 'name',
  sort_order: 'asc'
};

export default function GroupsPage() {
  const { canEdit } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GroupFilters>(initialFilters);
  const [sorting, setSorting] = useState<GroupSorting>(initialSorting);

  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingGroups, setIsExportingGroups] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listGroups({
        congregation_id: filters.congregationId || undefined,
        type: filters.type || undefined,
        status: filters.status,
        search: filters.search.trim() || undefined,
        sort_by: sorting.sort_by,
        sort_order: sorting.sort_order
      });
      setGroups(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar grupos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters.congregationId, filters.type, filters.status, filters.search, sorting.sort_by, sorting.sort_order]);

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
      toast.success('Grupo criado com sucesso!');
      setCreateModalOpen(false);
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar grupo';
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
      toast.success('Grupo atualizado com sucesso!');
      setEditModalOpen(false);
      setSelectedGroupId('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar grupo';
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
      toast.success('Grupo excluído com sucesso!');
      setDeleteModalOpen(false);
      setSelectedGroupId('');
      setSelectedGroupName('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir grupo';
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

  const exportInitialTypes: GroupType[] = useMemo(
    () => (filters.type ? [filters.type as GroupType] : [...GROUP_TYPES]),
    [filters.type]
  );

  const handleExportGroups = useCallback(
    async (selectedTypes: GroupType[]) => {
      try {
        setIsExportingGroups(true);

        const blob = await apiService.exportGroupsList({
          types: selectedTypes,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.congregationId ? { congregation_id: filters.congregationId } : {}),
          ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grupos-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('PDF exportado com sucesso!');
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Erro ao exportar PDF. Tente novamente.';
        toast.error(msg);
        throw error;
      } finally {
        setIsExportingGroups(false);
      }
    },
    [filters]
  );

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.congregationId !== '' ||
    filters.type !== '' ||
    filters.status !== 'all' ||
    sorting.sort_by !== initialSorting.sort_by ||
    sorting.sort_order !== initialSorting.sort_order;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Grupos"
        subtitle="Gerencie os grupos da sua igreja"
        actions={
          <Button
            onClick={() => setCreateModalOpen(true)}
            disabled={canEdit === false}
            title={canEdit === false ? READER_TOOLTIP : undefined}
          >
            <Plus size={18} className="mr-2" />
            Criar Grupo
          </Button>
        }
      />

      <div className="flex flex-nowrap items-end gap-2 w-full overflow-x-auto">
        <div className="min-w-[200px] flex-1 flex flex-col gap-1">
          <label htmlFor="groups-search" className="block text-xs font-medium text-gray-600">
            Busca
          </label>
          <MemberSearchInput
            id="groups-search"
            value={filters.search}
            onChange={handleSearchChange}
            isLoading={loading}
            placeholder="Busque por nome do grupo"
          />
        </div>
        <div className="flex-shrink-0">
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

      {/* Conteúdo */}
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
            onExportClick={() => setExportModalOpen(true)}
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

      {/* Modal de Criação */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Criar Novo Grupo"
        size="lg"
      >
        <GroupForm
          mode="create"
          onSubmit={handleCreateGroup}
          onCancel={() => setCreateModalOpen(false)}
          isLoading={isSubmitting}
          selectedCongregationId={filters.congregationId}
        />
      </Modal>

      {/* Modal de Visualização */}
      <GroupModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedGroupId('');
        }}
        groupId={selectedGroupId}
        canEdit={canEdit}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onRefresh={loadGroups}
      />

      {/* Modal de Edição */}
      {selectedGroupId && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedGroupId('');
          }}
          title="Editar Grupo"
          size="lg"
        >
          <GroupForm
            mode="edit"
            group={groups.find(g => g.id === selectedGroupId) || null}
            onSubmit={handleEditGroup}
            onCancel={() => {
              setEditModalOpen(false);
              setSelectedGroupId('');
            }}
            isLoading={isSubmitting}
            selectedCongregationId={filters.congregationId}
          />
        </Modal>
      )}

      <ExportGroupsTypesModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        initialSelectedTypes={exportInitialTypes}
        onExport={handleExportGroups}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedGroupId('');
          setSelectedGroupName('');
        }}
        title="Excluir Grupo"
        size="md"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Tem certeza que deseja excluir o grupo <strong>{selectedGroupName}</strong>?
            Esta ação não poderá ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedGroupId('');
                setSelectedGroupName('');
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteGroup}
              isLoading={isSubmitting}
            >
              <Trash2 size={16} className="mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

