'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, AlertCircle, Crown, Gift } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { FlockLogo } from '@/components/ui/FlockLogo';
import { useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api';
interface MemberLimitInfo {
  currentCount: number;
  limit: number;
  remaining: number;
  planType?: string | null;
  percentage: number;
  canAdd: boolean;
}

export function Header() {
  const router = useRouter();
  const { user, session, logout } = useAuth();
  const [memberLimit, setMemberLimit] = useState<MemberLimitInfo | null>(null);

  // Função para carregar informações do limite
  const loadMemberLimit = useCallback(async () => {
    if (user) {
      try {
        const data = await apiService.getMemberLimit();
        setMemberLimit(data);
      } catch {
        // Erro silencioso - não mostrar toast para não poluir a interface
        // Apenas não mostrar o alerta de limite
        setMemberLimit(null);
      }
    } else {
      setMemberLimit(null);
    }
  }, [user]);

  // Carregar informações do limite quando o usuário estiver autenticado
  useEffect(() => {
    loadMemberLimit();
  }, [loadMemberLimit]);

  // Atualizar limite quando membros forem atualizados
  useEffect(() => {
    const handleMemberUpdate = () => {
      loadMemberLimit();
    };

    window.addEventListener('memberUpdated', handleMemberUpdate);
    return () => {
      window.removeEventListener('memberUpdated', handleMemberUpdate);
    };
  }, [loadMemberLimit]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Determinar tipo de plano e limite
  const planType = user?.plan_type || memberLimit?.planType;
  const isFreePlan = planType === '100' || !planType;

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Logo e Nome da Igreja */}
      <div className="flex items-center gap-3">
        <FlockLogo size={30} className="text-primary" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">Flock App</span>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-normal text-gray-600" title={user?.name}>
            {user?.name || 'Igreja'}
          </h1>
        </div>
      </div>

      {/* Dados do Usuário e Botão Sair */}
      <div className="flex items-center gap-4">
        {/* Alerta de Limite de Membros */}
        {memberLimit && memberLimit.limit !== Infinity && memberLimit.percentage >= 80 && (
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              memberLimit.percentage >= 100
                ? 'bg-red-50 text-red-700 border border-red-200'
                : memberLimit.percentage >= 90
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <AlertCircle
              size={16}
              className={
                memberLimit.percentage >= 100
                  ? 'text-red-600'
                  : memberLimit.percentage >= 90
                  ? 'text-orange-600'
                  : 'text-gray-600'
              }
            />
            <span>
              {memberLimit.percentage >= 100 ? (
                <>
                  Limite de membros no plano atual atingido 
                  (<strong>{memberLimit.limit}</strong>).
                  {' '}
                  <a
                    href="/settings?tab=payment"
                    className="underline hover:text-primary"
                  >
                    Atualize seu plano
                  </a>
                </>
              ) : (
                <>
                  Limite de membros do plano atual quase atingido 
                  (<strong>{memberLimit.currentCount}/{memberLimit.limit}</strong>).
                  {' '}
                  <a
                    href="/settings?tab=payment"
                    className="underline hover:text-primary"
                  >
                    Atualize seu plano
                  </a>
                </>
              )}
            </span>
          </div>
        )}

        {/* Badge do Plano */}
        {user && (
          <Link
            href="/settings?tab=payment"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all hover:opacity-80 cursor-pointer ${
              isFreePlan
                ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
            }`}
          >
            {isFreePlan ? (
              <Gift size={12} className="text-green-600" />
            ) : (
              <Crown size={12} className="text-blue-600" />
            )}
            <span>{isFreePlan ? 'Versão Gratuita' : 'Versão PRO'}</span>
            {/* <span className="text-[10px] font-medium opacity-90">
              • Até {memberLimitValue} membros
            </span> */}
          </Link>
        )}

        {/* Email do Usuário */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <User size={16} className="text-gray-600" />
          <span className="truncate max-w-48" title={session?.user?.email}>
            {session?.user?.email || 'usuario@igreja.com'}
          </span>
        </div>

        {/* Botão Sair */}
        <Button
          onClick={handleLogout}
          size="sm"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          <LogOut size={16} className="text-white" />
          <span className="hidden sm:inline text-white">Sair</span>
        </Button>
      </div>
    </header>
  );
}
