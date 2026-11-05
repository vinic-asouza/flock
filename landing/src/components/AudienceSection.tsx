'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ClipboardList, Church, Megaphone, UsersRound, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';
import { ModuleIllustration, type ModuleId } from '@/components/product/ModuleIllustrations';
import { cn } from '@/utils/cn';

interface Persona {
  id: string;
  title: string;
  icon: LucideIcon;
  headline: string;
  description: string;
  modules: { id: ModuleId; label: string }[];
}

const PERSONAS: Persona[] = [
  {
    id: 'secretaria',
    title: 'Secretaria',
    icon: ClipboardList,
    headline: 'Menos planilhas, menos retrabalho.',
    description: 'Centralize os cadastros, atualizações e informações dos membros em um único lugar.',
    modules: [{ id: 'members', label: 'Membros' }],
  },
  {
    id: 'pastores',
    title: 'Pastores',
    icon: Church,
    headline: 'A igreja inteira em uma só visão.',
    description: 'Acompanhe crescimento, membresia, congregações e os principais indicadores da igreja.',
    modules: [{ id: 'reports', label: 'Relatórios' }],
  },
  {
    id: 'lideres',
    title: 'Líderes',
    icon: UsersRound,
    headline: 'Sua equipe organizada, sem listas soltas.',
    description: 'Organize equipes e ministérios sem depender de listas espalhadas.',
    modules: [{ id: 'ministries', label: 'Ministérios' }],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    icon: Megaphone,
    headline: 'Informação organizada para cada campanha, comunicado e evento.',
    description: 'Tenha os dados dos membros e das congregações organizados para facilitar as ações de relacionamento.',
    modules: [
      { id: 'members', label: 'Membros' },
      { id: 'congregations', label: 'Congregações' },
    ],
  },
];

export function AudienceSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const active = PERSONAS[activeIndex];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let next: number | null = null;
    if (event.key in keys) next = (activeIndex + keys[event.key] + PERSONAS.length) % PERSONAS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = PERSONAS.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="para-quem" className="relative scroll-mt-20 bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Para quem é"
          title="Para quem é o Flock?"
          description="Cada pessoa da liderança encontra no Flock o que precisa para o seu trabalho."
        />

        <Reveal delay={0.1} className="mt-14 grid gap-6 lg:grid-cols-[18rem_1fr] lg:gap-10">
          <div
            role="tablist"
            aria-label="Perfis de usuário"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {PERSONAS.map((persona, index) => {
              const selected = index === activeIndex;
              const Icon = persona.icon;
              return (
                <button
                  key={persona.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`${baseId}-tab-${persona.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'relative flex min-h-12 shrink-0 snap-start items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 lg:text-base',
                    selected ? 'text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                  )}
                >
                  {selected && (
                    <m.span
                      layoutId={`${baseId}-persona`}
                      className="absolute inset-0 -z-0 rounded-2xl bg-primary shadow-[0_12px_30px_-12px_rgb(9_7_37/0.6)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                      selected ? 'bg-white/10 text-white' : 'bg-accent-50 text-accent-500'
                    )}
                  >
                    <Icon aria-hidden className="h-[18px] w-[18px]" />
                  </span>
                  <span className="relative">{persona.title}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`${baseId}-panel`}
            aria-labelledby={`${baseId}-tab-${active.id}`}
            className="relative min-h-[22rem] overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-accent-50 via-white to-white p-6 shadow-[0_30px_80px_-40px_rgb(9_7_37/0.35)] sm:p-10"
          >
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(83_70_240/0.18),transparent)]" />
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid gap-8 md:grid-cols-[1fr_1.05fr] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-accent-500">{active.title}</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-balance text-primary sm:text-3xl">
                    {active.headline}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-gray-600">{active.description}</p>
                </div>
                <div className="group space-y-3">
                  {active.modules.map((module) => (
                    <div key={module.id} className="rounded-2xl border border-gray-100 bg-canvas/70 p-4 shadow-inner">
                      <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-gray-400 uppercase">{module.label}</p>
                      <ModuleIllustration module={module.id} />
                    </div>
                  ))}
                </div>
              </m.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
