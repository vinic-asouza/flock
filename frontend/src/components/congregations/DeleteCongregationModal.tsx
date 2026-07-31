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
      <div className="p-4 sm:p-6">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="break-words text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <div className="text-center">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            isPrimary || activeMembersCount > 0 ? 'bg-orange-100' : 'bg-red-100'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              isPrimary || activeMembersCount > 0 ? 'text-orange-600' : 'text-red-600'
            }`} />
          </div>
          
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {isPrimary || activeMembersCount > 0 ? 'Não é possível excluir a congregação' : 'Excluir Congregação'}
          </h3>
          
          {isPrimary ? (
            <div className="mb-6 space-y-2">
              <p className="break-words text-sm text-gray-600">
                <strong className="font-semibold text-gray-900">{congregationName}</strong> é a congregação principal da igreja e não pode ser excluída.
              </p>
            </div>
          ) : activeMembersCount > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                <p className="break-words text-sm text-orange-700">
                  Esta congregação possui <strong>{activeMembersCount} membro{activeMembersCount !== 1 ? 's' : ''} ativo{activeMembersCount !== 1 ? 's' : ''}</strong> vinculado{activeMembersCount !== 1 ? 's' : ''}.
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Para excluir esta congregação, você precisa primeiro:
              </p>
              
              <ul className="space-y-1 text-left text-sm text-gray-600">
                <li>• Remover a congregação dos membros vinculados, ou</li>
                <li>• Atribuir outra congregação a esses membros</li>
              </ul>
              
              <p className="mt-3 text-xs text-gray-500">
                Acesse a seção <strong>Membros</strong> para fazer essas alterações.
              </p>
            </div>
          ) : (
            <div className="mb-6 space-y-2">
              <p className="break-words text-sm text-gray-500">
                Tem certeza que deseja excluir a congregação <strong className="font-semibold text-gray-900">{congregationName}</strong>?
              </p>
              <p className="text-xs text-gray-400">
                Esta ação não pode ser desfeita. Todos os dados relacionados serão atualizados automaticamente.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            {isPrimary ? (
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading}
                className="min-h-11 w-full sm:w-auto"
              >
                Entendi
              </Button>
            ) : activeMembersCount > 0 ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Entendi
                </Button>
                <Button
                  onClick={handleGoToMembers}
                  disabled={isLoading}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Users size={16} className="shrink-0" />
                  Ir para Membros
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={isLoading}
                  className="min-h-11 w-full sm:w-auto"
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
