import { Globe2, MonitorSmartphone, ShieldCheck, Flag, type LucideIcon } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';

const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Flag, label: 'Feito para igrejas brasileiras' },
  { icon: MonitorSmartphone, label: 'Funciona no computador, tablet e celular' },
  { icon: Globe2, label: 'Sem instalação: direto no navegador' },
  { icon: ShieldCheck, label: 'Dados de cada igreja isolados e protegidos' },
];

export function Differentiators() {
  return (
    <Stagger
      as="ul"
      className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-gray-200/80 rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
    >
      {ITEMS.map(({ icon: Icon, label }) => (
        <StaggerItem as="li" key={label} className="group flex items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-500 ring-1 ring-accent-100 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-6">
            <Icon aria-hidden className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
