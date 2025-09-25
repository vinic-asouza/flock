'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando confirmação...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Se há erro nos parâmetros
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Erro na confirmação do email');
          return;
        }

        // Se não há tokens
        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Token de confirmação inválido ou expirado');
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
          setMessage('Email confirmado com sucesso! Redirecionando...');
          
          // Redirecionar após 2 segundos
          setTimeout(() => {
            router.push('/settings?tab=account');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.details || 'Erro ao confirmar email');
        }
      } catch (error) {
        console.error('Erro no callback:', error);
        setStatus('error');
        setMessage('Erro interno. Tente novamente.');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    router.push('/login');
  };

  const handleGoHome = () => {
    router.push('/');
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
              onClick={handleGoHome}
              variant="primary"
              className="w-full"
            >
              Ir para o Sistema
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
                onClick={handleGoHome}
                variant="secondary"
                className="w-full"
              >
                Ir para o Sistema
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
