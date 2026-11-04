import type { EventStatus } from '@/types';

export const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberto',
  in_progress: 'Em andamento',
  closed: 'Encerrado',
  archived: 'Arquivado',
};

export const EVENT_STATUS_OPTIONS = Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
