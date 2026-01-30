'use client';

import { useState, useEffect } from 'react';
import { ViewMode } from '@/components/members/ViewModeSelector';

const STORAGE_KEY = 'flock_member_view_mode';

export function useViewMode(initialMode: ViewMode = 'list') {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar preferência salva do localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ViewMode;
      if (savedMode && (savedMode === 'list' || savedMode === 'card')) {
        setViewMode(savedMode);
      }
    } catch (error) {
      // Silenciar erro - não crítico, apenas preferência de UI
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salvar preferência no localStorage quando mudar
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      // Silenciar erro - não crítico, apenas preferência de UI
    }
  };

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    isLoaded // Para evitar flash de conteúdo durante o carregamento
  };
}
