'use client';

import { Group } from '@/types';
import { Download, Loader2, RefreshCcw } from 'lucide-react';

interface GroupSummaryBarProps {
  congregationId: string;
  groups: Group[];
  onRefreshClick?: () => void;
  onExportClick?: () => void;
  exporting?: boolean;
}

export function GroupSummaryBar({ groups, onRefreshClick, onExportClick, exporting }: GroupSummaryBarProps) {
  const totalGroups = groups.length;
  const totalMembers = groups.reduce((sum, g) => sum + (g.memberCount ?? 0), 0);
  const emptyCount = groups.filter(g => (g.memberCount ?? 0) === 0).length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>
          {totalGroups} grupo{totalGroups !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-300" aria-hidden>|</span>
        <span>
          {totalMembers === 0 ? 'Nenhum membro' : `${totalMembers} membro${totalMembers !== 1 ? 's' : ''}`}
        </span>
        <span className="text-gray-300" aria-hidden>|</span>
        <span>
          {emptyCount} vazio{emptyCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onRefreshClick && (
          <button
            type="button"
            onClick={onRefreshClick}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <RefreshCcw size={14} />
            Atualizar
          </button>
        )}
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            disabled={exporting}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
