'use client';

import * as m from 'motion/react-m';
import { Check, PieChart, Network } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { AppWindow } from '@/components/product/AppWindow';
import { BarList, Donut } from '@/components/charts/Charts';

const HIGHLIGHTS = [
  'Crescimento da membresia ao longo do tempo.',
  'Perfil da igreja: gênero, estado civil e faixa etária.',
  'Distribuição por cargos e por congregações.',
];

const GENDER = [
  { label: 'Feminino', value: 52, color: '#7d71f5' },
  { label: 'Masculino', value: 48, color: '#090725' },
];

const MARITAL = [
  { label: 'Casado(a)', value: 46, color: '#5346f0' },
  { label: 'Solteiro(a)', value: 38, color: '#a99ffb' },
  { label: 'Divorciado(a)', value: 9, color: '#33305a' },
  { label: 'Viúvo(a)', value: 7, color: '#cfc9ff' },
];

const AGE = [
  { label: 'Crianças (0–12)', value: 34, color: '#a99ffb' },
  { label: 'Adolescentes (13–17)', value: 21, color: '#7d71f5' },
  { label: 'Jovens (18–29)', value: 48, color: '#5346f0' },
  { label: 'Adultos (30–59)', value: 86, color: '#4639d6' },
  { label: 'Idosos (60+)', value: 23, color: '#33305a' },
];

const ROLES = [
  { label: 'Diáconos', value: 17, color: '#5346f0' },
  { label: 'Líderes', value: 12, color: '#7d71f5' },
  { label: 'Presbíteros', value: 6, color: '#a99ffb' },
  { label: 'Pastores', value: 3, color: '#33305a' },
];

const CONGREGATIONS = [
  { label: 'Sede', value: 148, color: '#5346f0' },
  { label: 'Congregação Norte', value: 64, color: '#a99ffb' },
];

function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="truncate">{item.label}</span>
          <span className="ml-auto pl-1 font-semibold text-gray-900 tabular-nums">{item.value}%</span>
        </li>
      ))}
    </ul>
  );
}

function ReportsPanel() {
  return (
    <AppWindow title="Relatórios" className="shadow-[0_40px_120px_-30px_rgb(83_70_240/0.7)]">
      <div className="space-y-3 p-3 sm:p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <PieChart aria-hidden className="h-3.5 w-3.5 text-accent-500" />
          Demografia
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[11px] font-semibold text-gray-700">Gênero</p>
            <div className="mt-2 flex items-center gap-3 sm:flex-col sm:items-stretch">
              <Donut size={64} thickness={22} className="sm:self-center" segments={GENDER} />
              <div className="min-w-0 flex-1">
                <Legend items={GENDER} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[11px] font-semibold text-gray-700">Estado civil</p>
            <div className="mt-2 flex items-center gap-3 sm:flex-col sm:items-stretch">
              <Donut size={64} thickness={22} className="sm:self-center" segments={MARITAL} />
              <div className="min-w-0 flex-1">
                <Legend items={MARITAL} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[11px] font-semibold text-gray-700">Faixa etária</p>
            <BarList items={AGE} className="mt-2 space-y-1.5" />
          </div>
        </div>

        <p className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-gray-700">
          <Network aria-hidden className="h-3.5 w-3.5 text-accent-500" />
          Estrutura da igreja
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[11px] font-semibold text-gray-700">Distribuição por cargos</p>
            <BarList items={ROLES} className="mt-2" />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[11px] font-semibold text-gray-700">Distribuição por congregações</p>
            <BarList items={CONGREGATIONS} className="mt-2" />
          </div>
        </div>
      </div>
    </AppWindow>
  );
}

export function ReportsHighlight() {
  return (
    <section id="relatorios" className="relative isolate scroll-mt-20 overflow-hidden bg-brand-950 py-24 text-white sm:py-32">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="bg-noise absolute inset-0" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div>
          <SectionHeading
            align="left"
            tone="dark"
            eyebrow="Relatórios"
            title="Pare de tomar decisões no escuro."
            description="Tenha uma visão clara do crescimento e da realidade da sua igreja."
          />
          <Stagger as="ul" className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <StaggerItem as="li" key={item} className="flex items-start gap-3 text-base text-white/80">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/20 ring-1 ring-accent-400/40">
                  <Check aria-hidden className="h-3.5 w-3.5 text-accent-300" />
                </span>
                {item}
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div className="relative">
          <m.div
            aria-hidden
            className="absolute -inset-16 -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(83_70_240/0.55),rgb(83_70_240/0.12)_55%,transparent)] blur-2xl"
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '0px 0px -20% 0px' }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <Reveal y={40}>
            <ReportsPanel />
          </Reveal>
          <p className="mt-5 text-center text-xs text-white/45">Prévia ilustrativa. Dados não representam cliente real.</p>
        </div>
      </div>
    </section>
  );
}
