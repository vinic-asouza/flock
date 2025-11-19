'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { RoleList } from '@/components/roles/RoleList';
import { CreateRoleModal } from '@/components/roles/CreateRoleModal';
import { EditRoleModal } from '@/components/roles/EditRoleModal';
import { DeleteRoleModal } from '@/components/roles/DeleteRoleModal';

export default function RolesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [selectedRoleMembersCount, setSelectedRoleMembersCount] = useState<number>(0);

  const handleCreateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setCreateModalOpen(false);
  };

  const handleEditRole = (id: string) => {
    setSelectedRoleId(id);
    setEditModalOpen(true);
  };

  const handleDeleteRole = (id: string, name: string, activeMembersCount: number = 0) => {
    setSelectedRoleId(id);
    setSelectedRoleName(name);
    setSelectedRoleMembersCount(activeMembersCount);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cargos</h1>
          <p className="text-sm text-gray-600">Gerencie os cargos da sua igreja</p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus size={18} />
          Adicionar Cargo
        </Button>
      </div>

      <RoleList 
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        refreshTrigger={refreshTrigger}
      />

      {/* Modais */}
      <CreateRoleModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditRoleModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        roleId={selectedRoleId}
        onSuccess={handleEditSuccess}
      />

      <DeleteRoleModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        roleId={selectedRoleId}
        roleName={selectedRoleName}
        activeMembersCount={selectedRoleMembersCount}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
