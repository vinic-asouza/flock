import type { TeachingClassStatus } from '@/types';

export const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

export const STATUS_LABELS: Record<TeachingClassStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Encerrada',
  archived: 'Arquivada',
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
