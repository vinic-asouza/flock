'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando confirmação...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Ler parâmetros do fragmento da URL (após #)
        const hash = window.location.hash.substring(1); // Remove o #
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        const type = params.get('type');
        const messageParam = params.get('message');

        // Caso especial: fluxo de mudança de email do Supabase
        // Primeiro clique confirma posse do email antigo e pode vir apenas com #message e type=email_change
        if (!accessToken && !refreshToken && type === 'email_change' && messageParam) {
          setStatus('success');
          setMessage('Link confirmado. Verifique o link enviado para o novo email para concluir.');
          return;
        }

        // Se há erro nos parâmetros
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Erro na confirmação do email');
          return;
        }

        // Se não há tokens
        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage(messageParam || 'Token de confirmação inválido ou expirado');
          return;
        }

        // Processar confirmação com o backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email confirmado com sucesso! Agora você pode fazer login no sistema.');
          toast.success('Email confirmado com sucesso!');
        } else {
          setStatus('error');
          const errorMessage = data.details || data.error || 'Erro ao confirmar email';
          setMessage(errorMessage);
          toast.error(errorMessage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro interno. Tente novamente.';
        setStatus('error');
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    handleAuthCallback();
  }, [router]);

  const handleRetry = () => {
    router.push('/login');
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Confirmação de Email
          </h1>
          <p className="text-gray-600">
            Processando sua confirmação de email...
          </p>
        </div>

        {status === 'loading' && (
          <div>
            <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmando Email
            </h2>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Email Confirmado!
            </h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Button
              onClick={handleGoToLogin}
              variant="primary"
              className="w-full"
            >
              Fazer Login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Erro na Confirmação
            </h2>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                variant="primary"
                className="w-full"
              >
                Fazer Login
              </Button>
              <Button
                onClick={handleGoToLogin}
                variant="secondary"
                className="w-full"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
