'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CongregationList } from '@/components/congregations/CongregationList';
import { CreateCongregationModal } from '@/components/congregations/CreateCongregationModal';
import { EditCongregationModal } from '@/components/congregations/EditCongregationModal';
import { DeleteCongregationModal } from '@/components/congregations/DeleteCongregationModal';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

export default function CongregationsPage() {
  const { canEdit } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('');
  const [selectedCongregationName, setSelectedCongregationName] = useState<string>('');
  const [selectedCongregationMembersCount, setSelectedCongregationMembersCount] = useState<number>(0);

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

      <CongregationList 
        canEdit={canEdit}
        onEdit={handleEditCongregation}
        onDelete={handleDeleteCongregation}
        refreshTrigger={refreshTrigger}
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
