'use client';

import { useState } from 'react';
import { ArrowRight, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildRegisterUrl, type PaidPlanId } from '@/utils/planFunnel';

interface CheckoutButtonProps {
  plan: PaidPlanId;
  className?: string;
  children?: React.ReactNode;
  tone?: 'navy' | 'accent';
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function CheckoutButton({
  plan,
  className = '',
  children,
  tone = 'navy',
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = () => {
    try {
      setIsLoading(true);
      window.location.href = buildRegisterUrl(plan, FRONTEND_URL);
    } catch (error) {
      console.error('Erro ao redirecionar para registro:', error);
      toast.error('Não foi possível iniciar o cadastro. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={isLoading}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-base ${
        tone === 'accent'
          ? 'bg-[#5346f0] hover:bg-[#4639d6] focus-visible:ring-[#5346f0]'
          : 'bg-[#090725] hover:bg-[#0d0a3a] focus-visible:ring-[#090725]'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader className="h-5 w-5 animate-spin" aria-hidden />
          <span>Processando...</span>
        </>
      ) : (
        <>
          {children || 'Escolher plano'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </>
      )}
    </button>
  );
}
