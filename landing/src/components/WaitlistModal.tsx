'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { WaitlistForm } from './WaitlistForm';
import { waitlistService } from '@/services/waitlist';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WaitlistModal({ isOpen, onClose, onSuccess }: WaitlistModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Resetar estado quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (data: {
    name: string;
    email: string;
    phone: string;
    churchName: string;
    city: string;
    state: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await waitlistService.subscribe(data);
      
      setIsSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar na lista de espera';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setIsSuccess(false);
      onClose();
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSuccess ? handleSuccessClose : handleClose}
      title={isSuccess ? 'Cadastro Realizado!' : 'Entrar na Lista de Espera'}
      size="lg"
      closeOnOverlayClick={!isLoading && !isSuccess}
      closeOnEscape={!isLoading && !isSuccess}
    >
      {isSuccess ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Cadastro Concluído com Sucesso!
          </h3>
          
          <p className="text-gray-600 mb-2 max-w-md">
            Obrigado por se cadastrar na lista de espera do Flock.
          </p>
          
          <p className="text-gray-600 mb-8 max-w-md">
            Nossa equipe entrará em contato em breve para apresentar o sistema e tirar suas dúvidas.
          </p>
          
          <button
            onClick={handleSuccessClose}
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Entendi, obrigado!
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {error && (
            <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}
          
          <div className="flex-1">
            <WaitlistForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

