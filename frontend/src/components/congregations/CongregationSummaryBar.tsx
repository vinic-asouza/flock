'use client';

import { Congregation } from '@/types/congregation';
import { Download, Loader2, RefreshCcw } from 'lucide-react';

interface CongregationSummaryBarProps {
  congregations: Congregation[];
  onExportClick?: () => void;
  onRefreshClick?: () => void;
  exporting?: boolean;
}

export function CongregationSummaryBar({
  congregations,
  onExportClick,
  onRefreshClick,
  exporting,
}: CongregationSummaryBarProps) {
  const totalCongregations = congregations.length;
  const totalMembers = congregations.reduce((sum, c) => sum + (c.activeMembersCount ?? 0), 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500 min-w-0">
        <span className="shrink-0">
          {totalCongregations} {totalCongregations === 1 ? 'congregação' : 'congregações'}
        </span>
        <span className="text-gray-300 hidden sm:inline" aria-hidden>|</span>
        <span className="min-w-0">
          {totalMembers === 0
            ? 'Nenhum membro'
            : `${totalMembers} membro${totalMembers !== 1 ? 's' : ''} em congregações`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onRefreshClick && (
          <button
            type="button"
            onClick={onRefreshClick}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-md text-xs font-medium transition-colors bg-white text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCcw size={14} className="shrink-0" />
            Atualizar
          </button>
        )}
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-md text-xs font-medium transition-colors bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Download size={14} className="shrink-0" />
            )}
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
