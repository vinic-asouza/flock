'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { PublicMemberForm } from '@/components/public/PublicMemberForm';
import { Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FlockLogo } from '@/components/ui/FlockLogo';
import apiService, { formatApiError } from '@/services/api';

type LinkInfo = {
  church_name: string;
  expires_at: string;
  max_uses?: number | null;
  current_uses: number;
  remaining_uses?: number | null;
  congregations?: { id: string; name: string; abbreviation?: string | null }[];
  blocked_reason?: string;
};

function isLimitError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  const message = formatApiError(err).toLowerCase();
  return status === 403 || status === 409 || message.includes('limite');
}

export default function PublicRegisterPage() {
  const params = useParams();
  const token = params.token as string;

  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'link' | 'submission' | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);

  const refreshLinkInfo = useCallback(async () => {
    try {
      const response = await apiService.validateRegistrationLink(token);
      setLinkInfo(response);
      setIsValid(true);
      setErrorType(null);
      setError(null);
      return response;
    } catch (err: unknown) {
      setIsValid(false);
      setErrorType('link');
      setError(formatApiError(err));
      return null;
    }
  }, [token]);

  useEffect(() => {
    const validateLink = async () => {
      try {
        setIsValidating(true);
        setError(null);
        setErrorType(null);
        await refreshLinkInfo();
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateLink();
    }
  }, [token, refreshLinkInfo]);

  const handleSubmit = async (data: { name: string; groups?: string[]; [key: string]: unknown }) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setErrorType(null);

      await apiService.createMemberViaPublicLink(token, data);

      setSuccess(true);
      await refreshLinkInfo();
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
      setError(errorMessage);
      setErrorType('submission');

      if (isLimitError(err)) {
        await refreshLinkInfo();
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkExhausted =
    linkInfo?.max_uses != null &&
    linkInfo.remaining_uses !== null &&
    linkInfo.remaining_uses !== undefined &&
    linkInfo.remaining_uses <= 0;

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#0d0a3a] to-primary">
        <header className="fixed top-0 left-0 right-0 bg-primary border-b border-white/20 px-6 flex items-center justify-center z-50 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <FlockLogo size={30} className="text-white" />
              <span className="text-lg font-semibold text-white">Flock App</span>
            </div>
            {linkInfo?.church_name && (
              <h1 className="text-sm font-normal text-white/90">
                {linkInfo.church_name}
              </h1>
            )}
          </div>
        </header>
        <div className="flex items-center justify-center p-4 min-h-screen pt-[calc(3.5rem+1rem)]">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <Loader className="animate-spin text-primary mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validando link...</h2>
            <p className="text-gray-600">Por favor, aguarde enquanto verificamos o link de registro.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid && errorType === 'link') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#0d0a3a] to-primary">
        <header className="fixed top-0 left-0 right-0 bg-primary border-b border-white/20 px-6 flex items-center justify-center z-50 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <FlockLogo size={30} className="text-white" />
              <span className="text-lg font-semibold text-white">Flock App</span>
            </div>
            {linkInfo?.church_name && (
              <h1 className="text-sm font-normal text-white/90">
                {linkInfo.church_name}
              </h1>
            )}
          </div>
        </header>
        <div className="flex items-center justify-center p-4 min-h-screen pt-[calc(3.5rem+1rem)]">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <XCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Inválido ou Expirado</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Este link de registro não é válido, expirou ou foi desativado.'}
            </p>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <AlertCircle className="inline mr-2" size={16} />
                Se você acredita que este é um erro, entre em contato com a secretaria da igreja para obter um novo link de cadastro.
              </p>
            </div>
            <div className="mt-6">
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#0d0a3a] to-primary">
        <header className="fixed top-0 left-0 right-0 bg-primary border-b border-white/20 px-6 flex items-center justify-center z-50 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <FlockLogo size={30} className="text-white" />
              <span className="text-lg font-semibold text-white">Flock App</span>
            </div>
            {linkInfo?.church_name && (
              <h1 className="text-sm font-normal text-white/90">
                {linkInfo.church_name}
              </h1>
            )}
          </div>
        </header>
        <div className="flex items-center justify-center p-4 min-h-screen pt-[calc(3.5rem+1rem)]">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cadastro Realizado com Sucesso!</h2>
            <p className="text-gray-600 mb-4">
              Obrigado! Seu cadastro foi enviado com sucesso para a <strong>{linkInfo?.church_name}</strong>
            </p>

            <div className="mt-6 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="inline mr-2" size={16} />
                  Lembre-se de realizar um cadastro individual para cada membro da família, como cônjuge e filhos (se houver).
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setError(null);
                    setErrorType(null);
                    window.location.reload();
                  }}
                  variant="primary"
                  disabled={linkExhausted}
                >
                  Realizar Novo Cadastro
                </Button>

                {linkExhausted && (
                  <p className="text-xs text-amber-700">
                    Este link atingiu o limite de cadastros permitidos.
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  Ou você já pode fechar esta página.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#0d0a3a] to-primary">
      <header className="fixed top-0 left-0 right-0 bg-primary border-b border-white/20 px-6 flex items-center justify-center z-50 py-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <FlockLogo size={30} className="text-white" />
            <span className="text-lg font-semibold text-white">Flock App</span>
          </div>
          {linkInfo?.church_name && (
            <h1 className="text-sm font-normal text-white/90">
              {linkInfo.church_name}
            </h1>
          )}
        </div>
      </header>

      <div className="py-8 px-4 pt-[calc(3.5rem+2rem)]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Cadastro de Membro
            </h1>
            {linkInfo?.church_name && (
              <p className="text-gray-600">
                Preencha o formulário abaixo para se cadastrar na {linkInfo.church_name}
              </p>
            )}
            {linkInfo?.max_uses != null && linkInfo.remaining_uses !== null && linkInfo.remaining_uses !== undefined && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="inline mr-2" size={16} />
                  {linkInfo.remaining_uses > 0
                    ? `${linkInfo.remaining_uses} ${linkInfo.remaining_uses === 1 ? 'cadastro restante' : 'cadastros restantes'}`
                    : 'Limite de cadastros atingido'
                  }
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <PublicMemberForm
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              churchName={linkInfo?.church_name}
              error={error && errorType === 'submission' ? error : null}
              congregations={linkInfo?.congregations ?? []}
              registrationToken={token}
              submitDisabled={linkExhausted}
            />
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Seus dados serão tratados com confidencialidade e segurança.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
