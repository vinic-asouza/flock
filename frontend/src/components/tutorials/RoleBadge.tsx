'use client';

import type { TutorialRole } from '@/lib/tutorials/types';

const roleConfig: Record<
  TutorialRole,
  { label: string; className: string }
> = {
  reader: {
    label: 'Somente leitura',
    className: 'bg-gray-100 text-gray-700',
  },
  editor: {
    label: 'Requer Editor',
    className: 'bg-blue-100 text-blue-800',
  },
};

interface RoleBadgeProps {
  role: TutorialRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}
    >
      {config.label}
    </span>
  );
}
