'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Users } from 'lucide-react';
import { apiService } from '@/services/api';

interface DeleteCongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  congregationId: string;
  congregationName: string;
  activeMembersCount?: number;
  isPrimary?: boolean;
  onSuccess: (congregationId: string) => void;
}

export function DeleteCongregationModal({ isOpen, onClose, congregationId, congregationName, activeMembersCount = 0, isPrimary = false, onSuccess }: DeleteCongregationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.deleteCongregation(congregationId);
      
      onSuccess(congregationId);
      onClose();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string; details?: string } } };
      const errorMessage = errorResponse.response?.data?.details 
        || errorResponse.response?.data?.error 
        || (err instanceof Error ? err.message : 'Erro ao excluir congregação');
      setError(errorMessage);
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
    router.push(`/members?congregation_id=${congregationId}&status=active`);
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
            isPrimary || activeMembersCount > 0 ? 'bg-orange-100' : 'bg-red-100'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              isPrimary || activeMembersCount > 0 ? 'text-orange-600' : 'text-red-600'
            }`} />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isPrimary || activeMembersCount > 0 ? 'Não é possível excluir a congregação' : 'Excluir Congregação'}
          </h3>
          
          {isPrimary ? (
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                <strong className="font-semibold text-gray-900">{congregationName}</strong> é a congregação principal da igreja e não pode ser excluída.
              </p>
            </div>
          ) : activeMembersCount > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-700">
                  Esta congregação possui <strong>{activeMembersCount} membro{activeMembersCount !== 1 ? 's' : ''} ativo{activeMembersCount !== 1 ? 's' : ''}</strong> vinculado{activeMembersCount !== 1 ? 's' : ''}.
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Para excluir esta congregação, você precisa primeiro:
              </p>
              
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• Remover a congregação dos membros vinculados, ou</li>
                <li>• Atribuir outra congregação a esses membros</li>
              </ul>
              
              <p className="text-xs text-gray-500 mt-3">
                Acesse a seção <strong>Membros</strong> para fazer essas alterações.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-500">
                Tem certeza que deseja excluir a congregação <strong className="font-semibold text-gray-900">{congregationName}</strong>?
              </p>
              <p className="text-xs text-gray-400">
                Esta ação não pode ser desfeita. Todos os dados relacionados serão atualizados automaticamente.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            {isPrimary ? (
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading}
              >
                Entendi
              </Button>
            ) : activeMembersCount > 0 ? (
              <>
                <Button
                  variant="secondary"
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
                  variant="secondary"
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
