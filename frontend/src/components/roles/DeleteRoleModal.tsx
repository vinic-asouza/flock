'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Loader, Users } from 'lucide-react';
import { apiService } from '@/services/api';

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  activeMembersCount?: number;
  onSuccess: (roleId: string) => void;
}

export function DeleteRoleModal({ isOpen, onClose, roleId, roleName, activeMembersCount = 0, onSuccess }: DeleteRoleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.deleteRole(roleId);
      
      onSuccess(roleId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cargo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  const handleGoToMembers = () => {
    router.push(`/members?role_id=${roleId}&status=active`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirmar Exclusão"
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
            activeMembersCount > 0 ? 'bg-orange-100' : 'bg-red-100'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              activeMembersCount > 0 ? 'text-orange-600' : 'text-red-600'
            }`} />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeMembersCount > 0 ? 'Não é possível excluir o cargo' : 'Excluir Cargo'}
          </h3>
          
          {activeMembersCount > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-700">
                  Este cargo possui <strong>{activeMembersCount} membro{activeMembersCount !== 1 ? 's' : ''} ativo{activeMembersCount !== 1 ? 's' : ''}</strong> vinculado{activeMembersCount !== 1 ? 's' : ''}.
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Para excluir este cargo, você precisa primeiro:
              </p>
              
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• Remover o cargo dos membros vinculados, ou</li>
                <li>• Atribuir outro cargo a esses membros</li>
              </ul>
              
              <p className="text-xs text-gray-500 mt-3">
                Acesse a seção <strong>Membros</strong> para fazer essas alterações.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir o cargo <strong>{roleName}</strong>? 
              Esta ação não pode ser desfeita.
            </p>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            {activeMembersCount > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Entendi
                </Button>
                <Button
                  onClick={handleGoToMembers}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2"
                >
                  <Users size={16} />
                  Ir para Membros
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={isLoading}
                >
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
