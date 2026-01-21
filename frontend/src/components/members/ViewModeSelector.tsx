'use client';

import { List, Grid3X3 } from 'lucide-react';

export type ViewMode = 'list' | 'card';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ mode, onModeChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onModeChange('list')}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          mode === 'list'
            ? 'bg-white text-gray-900 border border-gray-200'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Visualização em lista"
      >
        <List size={16} />
        Compacto
      </button>
      <button
        onClick={() => onModeChange('card')}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          mode === 'card'
            ? 'bg-white text-gray-900 border border-gray-200'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Visualização em cards"
      >
        <Grid3X3 size={16} />
        Detalhado
      </button>
    </div>
  );
}
