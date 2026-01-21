'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GroupForm } from '@/components/groups/GroupForm';
import { GroupList } from '@/components/groups/GroupList';
import { GroupModal } from '@/components/groups/GroupModal';
import { Group, GroupPayload } from '@/types';

// Tipo do formulário de grupo (mesmo do GroupForm)
type GroupFormData = {
  name: string;
  type: Group['type'];
  description?: string;
  congregation_id?: string | null;
  responsible_id?: string | null;
  status: boolean;
};
import { apiService } from '@/services/api';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { useFiltersData } from '@/hooks/useFiltersData';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('sede'); // Padrão: Sede
  const { congregations, loading: loadingCongregations } = useFiltersData();

  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGroups = useCallback(async () => {
    // Só carregar se uma congregação estiver selecionada
    if (!selectedCongregationId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listGroups(selectedCongregationId);
      setGroups(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar grupos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedCongregationId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      await apiService.createGroup(data as GroupPayload);
      setCreateModalOpen(false);
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar grupo';
      alert(errorMessage);
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
      setEditModalOpen(false);
      setSelectedGroupId('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar grupo';
      alert(errorMessage);
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
      setDeleteModalOpen(false);
      setSelectedGroupId('');
      setSelectedGroupName('');
      await loadGroups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir grupo';
      alert(errorMessage);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os grupos da sua igreja
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Criar Grupo
        </Button>
      </div>

      {/* Seletor de Congregação */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecionar Congregação
        </label>
        <div className="max-w-xs">
          <Select
            value={selectedCongregationId}
            onChange={setSelectedCongregationId}
            options={[
              { value: 'sede', label: 'Sede' },
              ...(congregations || []).map((cong) => ({
                value: cong.id,
                label: cong.name
              }))
            ]}
            disabled={loadingCongregations}
            searchable={true}
            placeholder="Selecione uma congregação"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Selecione uma congregação para visualizar e gerenciar os grupos
        </p>
      </div>

      {/* Conteúdo */}
      {!selectedCongregationId ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">Selecione uma congregação</p>
          <p className="text-sm text-gray-500 text-center max-w-md">
            Selecione uma congregação acima para visualizar e gerenciar os grupos.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadGroups}>Tentar novamente</Button>
        </div>
      ) : (
        <GroupList groups={groups} onGroupClick={handleViewGroup} />
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
          selectedCongregationId={selectedCongregationId || undefined}
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
            selectedCongregationId={selectedCongregationId || undefined}
          />
        </Modal>
      )}

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
