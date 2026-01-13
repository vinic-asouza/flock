'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, CreditCard } from 'lucide-react';
import { stripeService } from '@/services/stripe';
import toast from 'react-hot-toast';

interface CheckoutButtonProps {
  plan: '200' | '500' | '800';
  email?: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
  isAuthenticated?: boolean;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

export function CheckoutButton({
  plan,
  email,
  name,
  className = '',
  children,
  isAuthenticated = false,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Se não estiver autenticado, redirecionar para registro primeiro
      if (!isAuthenticated) {
        // Redirecionar para página de registro no frontend (sem parâmetro de plano)
        window.location.href = `${FRONTEND_URL}/register`;
        return;
      }

      // Cliente autenticado, criar checkout diretamente
      const { url } = await stripeService.createCheckoutSession({
        plan,
        email,
        name,
      });

      // Redirecionar para checkout do Stripe
      window.location.href = url;
    } catch (error: any) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error(error.message || 'Erro ao iniciar processo de pagamento');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className={`
        w-full text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg text-sm md:text-base 
        font-semibold transition-all duration-300 shadow-lg hover:shadow-xl 
        hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
      style={{
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
      }}
    >
      {isLoading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span>Processando...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          {children || 'Assinar Agora'}
        </>
      )}
    </button>
  );
}

