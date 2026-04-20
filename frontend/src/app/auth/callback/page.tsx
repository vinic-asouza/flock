'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando confirmação...');
  // Ref para evitar dupla execução em StrictMode/re-renders
  const hasRun = useRef(false);

  // ACHADO 12: dependency array vazia — router não é usado dentro do effect
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleAuthCallback = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        const type = params.get('type');
        const messageParam = params.get('message');

        // Fluxo de mudança de email: primeiro clique confirma o email antigo
        if (!accessToken && !refreshToken && type === 'email_change' && messageParam) {
          setStatus('success');
          setMessage('Link confirmado. Verifique o link enviado para o novo email para concluir.');
          return;
        }

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Erro na confirmação do email');
          return;
        }

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage(messageParam || 'Token de confirmação inválido ou expirado');
          return;
        }

        // ACHADO 03: adicionar credentials: 'include' para que cookies Set-Cookie
        // do backend sejam gravados corretamente em ambientes cross-origin
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/callback`, {
          method: 'POST',
          credentials: 'include',
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
          toast.success('Email confirmado com sucesso!');

          // ACHADO 11: cookies já foram setados pelo backend — redirecionar automaticamente
          // após breve delay para o usuário ver a mensagem de sucesso
          setTimeout(() => {
            router.push('/');
          }, 2000);
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

  const handleGoToLogin = () => {
    router.push('/login');
  };

  // ACHADO 10: ação de reenvio de confirmação (direciona para login com msg de reenvio)
  const handleResendConfirmation = () => {
    router.push('/login?message=email_confirm_required');
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
            {/* ACHADO 11: mensagem indica redirecionamento automático */}
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            {/* R01: usuário já está autenticado após callback bem-sucedido.
                Botão aponta para '/' — não para '/login' — para evitar redirect duplo via AuthGuard */}
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              className="w-full"
            >
              Ir para o Painel
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
            {/* ACHADO 10: dois botões com labels e ações distintas */}
            <div className="space-y-3">
              <Button
                onClick={handleGoToLogin}
                variant="primary"
                className="w-full"
              >
                Ir para o Login
              </Button>
              <Button
                onClick={handleResendConfirmation}
                variant="secondary"
                className="w-full"
              >
                Reenviar confirmação
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
