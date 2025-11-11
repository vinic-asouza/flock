import { IntegrationStatus } from '@/types';

const statusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  em_progresso: { label: 'Em progresso', className: 'bg-blue-100 text-blue-700' },
  integrado: { label: 'Integrado', className: 'bg-emerald-100 text-emerald-700' },
  descartado: { label: 'Descartado', className: 'bg-red-100 text-red-700' },
};

interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
}

export function IntegrationStatusBadge({ status }: IntegrationStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.em_progresso;

  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

