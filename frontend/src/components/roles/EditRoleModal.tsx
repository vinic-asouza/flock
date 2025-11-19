'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { RoleForm } from './RoleForm';
import { apiService } from '@/services/api';
import { Role } from '@/types/role';
import { Loader } from 'lucide-react';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  onSuccess: (roleData: Role) => void;
}

export function EditRoleModal({ isOpen, onClose, roleId, onSuccess }: EditRoleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  // Carregar dados do cargo quando o modal abrir
  useEffect(() => {
    if (isOpen && roleId) {
      loadRole();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roleId]);

  const loadRole = async () => {
    try {
      setIsLoadingRole(true);
      setError(null);
      const roleData = await apiService.getRole(roleId);
      setRole(roleData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || err.message 
        : 'Erro ao carregar cargo';
      setError(errorMessage);
    } finally {
      setIsLoadingRole(false);
    }
  };

  const handleSubmit = async (data: { name: string; [key: string]: unknown }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.updateRole(roleId, data);
      
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || err.message 
        : 'Erro ao atualizar cargo';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isLoadingRole) {
      setRole(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Cargo"
      size="lg"
      closeOnOverlayClick={!isLoading && !isLoadingRole}
      closeOnEscape={!isLoading && !isLoadingRole}
    >
      {isLoadingRole && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {role && !isLoadingRole && (
        <RoleForm
          role={role}
          mode="edit"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isLoading}
        />
      )}
    </Modal>
  );
}
