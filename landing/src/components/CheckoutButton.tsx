'use client';

import { useState } from 'react';
import { Loader, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildRegisterUrl,
  type PaidPlanId,
} from '@/utils/planFunnel';

interface CheckoutButtonProps {
  plan: PaidPlanId;
  className?: string;
  children?: React.ReactNode;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function CheckoutButton({
  plan,
  className = '',
  children,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = () => {
    try {
      setIsLoading(true);
      window.location.href = buildRegisterUrl(plan, FRONTEND_URL);
    } catch (error) {
      console.error('Erro ao redirecionar para registro:', error);
      toast.error('Não foi possível iniciar o cadastro. Tente novamente.');
    } finally {
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
