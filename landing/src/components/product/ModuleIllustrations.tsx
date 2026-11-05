import { Building2, Check, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ModuleId = 'members' | 'integration' | 'congregations' | 'ministries' | 'reports';

const AVATAR_COLORS = ['bg-accent-400', 'bg-brand-700', 'bg-accent-200', 'bg-brand-500', 'bg-accent-300'];

function MembersIllustration() {
  const rows = [
    { name: 'Ana Paula Ribeiro', status: 'Ativo' },
    { name: 'Carlos Henrique Lima', status: 'Ativo' },
    { name: 'Fernanda Souza', status: 'Novo' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] text-gray-400">
        <Search aria-hidden className="h-3.5 w-3.5" />
        Buscar membro
        <span className="ml-auto h-3.5 w-px animate-[shimmer_1.1s_steps(2)_infinite] bg-accent-500" />
      </div>
      {rows.map((row, i) => (
        <div
          key={row.name}
          className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-2.5 py-2 shadow-sm transition-transform duration-500 group-hover:translate-x-1"
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <span className={cn('h-6 w-6 shrink-0 rounded-full', AVATAR_COLORS[i])} />
          <span className="truncate text-[11px] font-medium text-gray-800">{row.name}</span>
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
              row.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-accent-100 text-accent-500'
            )}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function IntegrationIllustration() {
  const steps = ['Primeiro contato', 'Acompanhamento', 'Integração'];
  return (
    <ol className="relative space-y-3 pl-6">
      <span aria-hidden className="absolute top-2 bottom-2 left-[9px] w-px bg-gray-200" />
      <span
        aria-hidden
        className="absolute top-2 left-[9px] h-[55%] w-px origin-top bg-accent-500 transition-transform duration-700 group-hover:scale-y-[1.45]"
      />
      {steps.map((step, i) => (
        <li key={step} className="relative flex items-center gap-2 text-[11px]">
          <span
            className={cn(
              'absolute -left-6 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-4 ring-white',
              i < 2 ? 'bg-accent-500 text-white' : 'bg-gray-200'
            )}
          >
            {i < 2 && <Check aria-hidden className="h-2.5 w-2.5" />}
          </span>
          <span className="font-medium text-gray-800">{step}</span>
          {i === 1 && (
            <span className="ml-auto rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-500">
              Em progresso
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function CongregationsIllustration() {
  const nodes = [
    { label: 'Congregação Norte', className: 'left-0 top-0' },
    { label: 'Congregação Sul', className: 'right-0 top-0' },
    { label: 'Congregação Leste', className: 'left-1/2 bottom-0 -translate-x-1/2' },
  ];
  return (
    <div className="relative mx-auto h-32 max-w-[16rem]">
      <svg aria-hidden viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {['M100 60 L30 14', 'M100 60 L170 14', 'M100 60 L100 108'].map((d) => (
          <path
            key={d}
            d={d}
            stroke="#a99ffb"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
            className="transition-[stroke-dashoffset] duration-1000 [stroke-dashoffset:0] group-hover:[stroke-dashoffset:-24]"
          />
        ))}
      </svg>
      <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg">
        <Building2 aria-hidden className="h-3 w-3" />
        Sede
      </span>
      {nodes.map((node) => (
        <span
          key={node.label}
          className={cn(
            'absolute rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm',
            node.className
          )}
        >
          {node.label}
        </span>
      ))}
    </div>
  );
}

function MinistriesIllustration() {
  const groups = [
    { name: 'Louvor', count: 4 },
    { name: 'Infantil', count: 3 },
    { name: 'Recepção', count: 5 },
  ];
  return (
    <ul className="space-y-2">
      {groups.map((group, gi) => (
        <li key={group.name} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-2.5 py-2 shadow-sm">
          <span className="text-[11px] font-medium text-gray-800">{group.name}</span>
          <span className="flex -space-x-1.5 transition-[gap] duration-500">
            {Array.from({ length: group.count }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-5 w-5 rounded-full ring-2 ring-white transition-transform duration-500 group-hover:translate-x-0.5',
                  AVATAR_COLORS[(i + gi) % AVATAR_COLORS.length]
                )}
                style={{ transitionDelay: `${i * 40}ms` }}
              />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ReportsIllustration() {
  const bars = [42, 55, 48, 63, 58, 72, 66, 80, 74, 88];
  return (
    <div className="flex h-28 items-end gap-1.5">
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1 origin-bottom rounded-t-[4px] bg-gradient-to-t from-primary to-accent-500 transition-transform duration-500 group-hover:scale-y-110"
          style={{ height: `${h}%`, opacity: 0.35 + (h / 88) * 0.65, transitionDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
}

const ILLUSTRATIONS: Record<ModuleId, () => React.JSX.Element> = {
  members: MembersIllustration,
  integration: IntegrationIllustration,
  congregations: CongregationsIllustration,
  ministries: MinistriesIllustration,
  reports: ReportsIllustration,
};

export function ModuleIllustration({ module, className }: { module: ModuleId; className?: string }) {
  const Illustration = ILLUSTRATIONS[module];
  return (
    <div aria-hidden className={className}>
      <Illustration />
    </div>
  );
}
