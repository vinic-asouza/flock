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
    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>
          {totalCongregations} {totalCongregations === 1 ? 'congregação' : 'congregações'}
        </span>
        <span className="text-gray-300" aria-hidden>|</span>
        <span>
          {totalMembers === 0
            ? 'Nenhum membro'
            : `${totalMembers} membro${totalMembers !== 1 ? 's' : ''} em congregações`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {onRefreshClick && (
          <button
            type="button"
            onClick={onRefreshClick}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-white text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCcw size={12} />
            Atualizar
          </button>
        )}
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            disabled={exporting}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Exportar PDF
          </button>
        )}
      </div>
    </div>
  );
}
