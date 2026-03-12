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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
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