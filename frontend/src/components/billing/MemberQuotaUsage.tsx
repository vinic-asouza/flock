'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';

export type MemberQuotaVariant = 'panel' | 'settings';

interface MemberLimitData {
  currentCount: number;
  limit: number | null;
  percentage: number;
}

interface MemberQuotaUsageProps {
  /** Quem pode ver CTA de upgrade (owner/admin). */
  canManagePlan: boolean;
  variant?: MemberQuotaVariant;
  /** Na aba Plano: abre fluxo de troca de plano em vez de navegar. */
  onUpgradeClick?: () => void;
  className?: string;
}

function isFiniteLimit(limit: number | null | undefined): limit is number {
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0;
}

const KNOWN_PLAN_LIMITS: Record<string, number> = {
  '100': 100,
  '200': 200,
  '500': 500,
  '800': 800,
};

function bannerTone(percentage: number): {
  container: string;
  icon: string;
} {
  if (percentage >= 100) {
    return {
      container: 'bg-red-50 text-red-700 border-red-200',
      icon: 'text-red-600',
    };
  }
  if (percentage >= 90) {
    return {
      container: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: 'text-orange-600',
    };
  }
  return {
    container: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: 'text-gray-600',
  };
}

const NEAR_LIMIT_COPY =
  'Você está perto do limite do plano. Atualize para continuar crescendo.';
const AT_LIMIT_COPY =
  'Limite do plano atingido. Não é possível adicionar novos membros (cadastro, importação, conversão da integração ou links públicos) até liberar vagas ou atualizar o plano.';

export function MemberQuotaUsage({
  canManagePlan,
  variant = 'panel',
  onUpgradeClick,
  className = '',
}: MemberQuotaUsageProps) {
  const { isAuthenticated, activeChurchId, user } = useAuth();
  const planType = user?.plan_type;
  const [data, setData] = useState<MemberLimitData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setData(null);
      setLoadFailed(false);
      setLoading(false);
      return;
    }

    try {
      const result = await apiService.getMemberLimit();
      const limit =
        result.limit == null || result.limit === Infinity
          ? null
          : result.limit;
      setData({
        currentCount: result.currentCount,
        limit,
        percentage: typeof result.percentage === 'number' ? result.percentage : 0,
      });
      setLoadFailed(false);
    } catch {
      setData(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const known = planType ? KNOWN_PLAN_LIMITS[planType] : undefined;
    if (!known) return;
    setData((current) => {
      if (!current || current.limit === known) return current;
      const percentage =
        known > 0 ? Math.min(100, Math.round((current.currentCount / known) * 100)) : 0;
      return { ...current, limit: known, percentage };
    });
  }, [planType]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, activeChurchId, planType]);

  const handleRetry = async () => {
    setRetrying(true);
    setLoading(true);
    await load();
    setRetrying(false);
  };

  const upgradeControl = canManagePlan ? (
    onUpgradeClick ? (
      <button
        type="button"
        onClick={onUpgradeClick}
        className="underline font-medium hover:opacity-80 min-h-11 sm:min-h-0 touch-manipulation"
      >
        Atualizar plano
      </button>
    ) : (
      <Link
        href="/settings?tab=payment"
        className="underline font-medium hover:opacity-80 min-h-11 sm:min-h-0 inline-flex items-center touch-manipulation"
      >
        Atualizar plano
      </Link>
    )
  ) : null;

  if (!isAuthenticated) {
    return null;
  }

  if (loading && !data && !loadFailed) {
    return (
      <div
        data-quota-variant={variant}
        className={`rounded-lg border border-[#090725]/10 bg-white px-4 py-3 animate-pulse ${className}`}
        aria-hidden
      >
        <div className="h-4 w-48 bg-[#090725]/10 rounded" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        data-quota-variant={variant}
        className={`rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 ${className}`}
      >
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-60 min-h-11 sm:min-h-0 touch-manipulation"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          Limite de membros indisponível — tentar novamente
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { currentCount, limit, percentage } = data;
  const unlimited = !isFiniteLimit(limit);

  if (unlimited) {
    return (
      <div
        data-quota-variant={variant}
        className={`rounded-lg border border-[#090725]/10 bg-white px-4 py-3 ${className}`}
      >
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <Users size={16} className="text-gray-500 mt-0.5 shrink-0" />
          <p>
            <span className="font-medium text-gray-900">{currentCount}</span> membros ativos
            <span className="text-gray-500"> (sem limite de plano)</span>
          </p>
        </div>
      </div>
    );
  }

  const showWarning = percentage >= 80;
  const atLimit = percentage >= 100;
  const tone = bannerTone(percentage);

  return (
    <div data-quota-variant={variant} className={`space-y-2 ${className}`}>
      <div className="rounded-lg border border-[#090725]/10 bg-white px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <Users size={16} className="text-gray-500 mt-0.5 shrink-0" aria-hidden />
          <p>
            <span className="font-medium text-gray-900">
              {currentCount} de {limit} membros ativos
            </span>
            <span className="sr-only">
              {' '}
              ({Math.min(100, Math.round(percentage))}% do limite do plano)
            </span>
          </p>
        </div>
      </div>

      {showWarning && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${tone.container}`}
        >
          <AlertCircle size={16} className={`${tone.icon} mt-0.5 shrink-0`} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p>{atLimit ? AT_LIMIT_COPY : NEAR_LIMIT_COPY}</p>
            {upgradeControl && <div className="pt-0.5">{upgradeControl}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
