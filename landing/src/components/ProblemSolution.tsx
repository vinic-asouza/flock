'use client';

import { useRef } from 'react';
import { useScroll, useTransform, type MotionValue } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowDown, BarChart3, Building2, FileSpreadsheet, FileText, NotebookPen, UserPlus, Users, UsersRound } from 'lucide-react';
import { AppWindow } from '@/components/product/AppWindow';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/utils/cn';

const QUESTION = 'Sua igreja ainda depende de fichas ou planilhas?';
const ANSWER = 'Tudo o que sua liderança precisa saber, em um só lugar.';

type ScrapKind = 'ficha' | 'planilha' | 'lista';

interface Scrap {
  kind: ScrapKind;
  title: string;
  x: number;
  y: number;
  rotate: number;
}

const SCRAPS: Scrap[] = [
  { kind: 'ficha', title: 'Ficha de membro', x: -430, y: -150, rotate: -9 },
  { kind: 'planilha', title: 'membros.xlsx', x: 410, y: -170, rotate: 7 },
  { kind: 'lista', title: 'Ministérios', x: -470, y: 150, rotate: 6 },
  { kind: 'ficha', title: 'Ficha de visitante', x: 450, y: 140, rotate: -6 },
  { kind: 'planilha', title: 'congregacoes.xlsx', x: -40, y: 250, rotate: -3 },
];

const TILES = [
  { icon: Users, label: 'Membros', value: '212', hint: 'ativos' },
  { icon: UserPlus, label: 'Integração', value: '3', hint: 'em progresso' },
  { icon: Building2, label: 'Congregações', value: '2', hint: 'conectadas' },
  { icon: UsersRound, label: 'Ministérios', value: '6', hint: 'organizados' },
];

function ScrapCard({ scrap, className }: { scrap: Scrap; className?: string }) {
  const Icon = scrap.kind === 'planilha' ? FileSpreadsheet : scrap.kind === 'lista' ? NotebookPen : FileText;
  return (
    <div
      className={cn(
        'w-60 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_18px_40px_-18px_rgb(9_7_37/0.35)]',
        className
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Icon aria-hidden className={cn('h-4 w-4', scrap.kind === 'planilha' ? 'text-emerald-600' : 'text-amber-600')} />
        {scrap.title}
      </p>
      {scrap.kind === 'planilha' ? (
        <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded bg-gray-200">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={cn('h-3', i < 3 ? 'bg-emerald-50' : 'bg-white')} />
          ))}
        </div>
      ) : scrap.kind === 'lista' ? (
        <ul className="mt-2 space-y-1.5">
          {[80, 64, 72, 52].map((w) => (
            <li key={w} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm border border-gray-300" />
              <span className="h-1.5 rounded bg-gray-200" style={{ width: `${w}%` }} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 flex gap-2">
          <span className="h-11 w-9 shrink-0 rounded bg-gray-100" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <span className="block h-1.5 w-full rounded bg-gray-200" />
            <span className="block h-1.5 w-3/4 rounded bg-gray-200" />
            <span className="block h-1.5 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPreview({
  tileProgress,
  tileScale,
}: {
  tileProgress?: MotionValue<number>[];
  tileScale?: MotionValue<number>;
}) {
  return (
    <AppWindow title="Painel" className="shadow-[0_40px_100px_-30px_rgb(9_7_37/0.45)]">
      <div className="grid grid-cols-2 gap-3.5 p-5 sm:grid-cols-4">
        {TILES.map(({ icon: Icon, label, value, hint }, i) => (
          <m.div
            key={label}
            style={tileProgress ? { opacity: tileProgress[i], scale: tileScale } : undefined}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100 text-accent-500">
              <Icon aria-hidden className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">
              {label} · {hint}
            </p>
          </m.div>
        ))}
        <m.div
          style={tileProgress ? { opacity: tileProgress[4] } : undefined}
          className="col-span-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-4"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <BarChart3 aria-hidden className="h-4 w-4 text-accent-500" />
            Relatórios
          </p>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {[38, 52, 45, 60, 58, 72, 68, 80, 76, 88, 84, 94].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-[3px] bg-gradient-to-t from-primary to-accent-500"
                style={{ height: `${h}%`, opacity: 0.4 + (h / 94) * 0.6 }}
              />
            ))}
          </div>
        </m.div>
      </div>
    </AppWindow>
  );
}

function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // Motion acelera opacidade via ViewTimeline nativo, que calcula errado a faixa de alvos sticky mais altos que a viewport.
  const progress = useTransform(scrollYProgress, (v) => v);

  const gather = useTransform(progress, [0.05, 0.36], [0, 1]);
  const scrapOpacity = useTransform(progress, [0.28, 0.4], [1, 0]);
  const dashboardOpacity = useTransform(progress, [0.1, 0.32], [0.15, 1]);
  const dashboardScale = useTransform(progress, [0.1, 0.36], [0.9, 1]);
  const questionOpacity = useTransform(progress, [0.26, 0.38], [1, 0]);
  const questionY = useTransform(progress, [0.26, 0.38], [0, -16]);
  const answerOpacity = useTransform(progress, [0.34, 0.46], [0, 1]);
  const answerY = useTransform(progress, [0.34, 0.46], [16, 0]);
  const tileProgress = [
    useTransform(progress, [0.32, 0.42], [0, 1]),
    useTransform(progress, [0.36, 0.46], [0, 1]),
    useTransform(progress, [0.4, 0.5], [0, 1]),
    useTransform(progress, [0.44, 0.54], [0, 1]),
    useTransform(progress, [0.48, 0.58], [0, 1]),
  ];
  const tileScale = useTransform(progress, [0.32, 0.54], [0.92, 1]);

  return (
    <div ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-8">
        <div aria-hidden className="bg-grid-soft pointer-events-none absolute inset-0" />
        <div className="relative h-32 w-full max-w-4xl text-center">
          <m.h2
            style={{ opacity: questionOpacity, y: questionY }}
            className="absolute inset-x-0 top-0 text-5xl font-extrabold tracking-[-0.03em] text-balance text-primary"
          >
            {QUESTION}
          </m.h2>
          <m.p
            aria-hidden
            style={{ opacity: answerOpacity, y: answerY }}
            className="text-gradient-brand absolute inset-x-0 top-0 text-5xl font-extrabold tracking-[-0.03em] text-balance"
          >
            {ANSWER}
          </m.p>
        </div>

        <div className="relative mt-10 flex w-full max-w-4xl items-center justify-center">
          <m.div style={{ opacity: dashboardOpacity, scale: dashboardScale }} className="w-full">
            <DashboardPreview tileProgress={tileProgress} tileScale={tileScale} />
          </m.div>

          {SCRAPS.map((scrap) => (
            <ScrapLayer key={scrap.title} scrap={scrap} gather={gather} opacity={scrapOpacity} />
          ))}
        </div>

      </div>
    </div>
  );
}

function ScrapLayer({
  scrap,
  gather,
  opacity,
}: {
  scrap: Scrap;
  gather: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  const x = useTransform(gather, [0, 1], [scrap.x, 0]);
  const y = useTransform(gather, [0, 1], [scrap.y, 0]);
  const rotate = useTransform(gather, [0, 1], [scrap.rotate, 0]);
  const scale = useTransform(gather, [0, 1], [1, 0.55]);
  return (
    <m.div aria-hidden style={{ x, y, rotate, scale, opacity }} className="pointer-events-none absolute">
      <ScrapCard scrap={scrap} />
    </m.div>
  );
}

function StaticStory() {
  return (
    <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
      <Reveal className="text-center">
        <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-balance text-primary sm:text-4xl">{QUESTION}</h2>
      </Reveal>
      <Reveal delay={0.1} className="mt-10 flex justify-center">
        <div aria-hidden className="relative h-48 w-full max-w-lg">
          {SCRAPS.slice(0, 3).map((scrap, i) => (
            <div
              key={scrap.title}
              className="absolute top-0 left-1/2"
              style={{
                transform: `translateX(calc(-50% + ${(i - 1) * 88}px)) translateY(${i === 1 ? 12 : 0}px) rotate(${[-8, 3, 9][i]}deg)`,
              }}
            >
              <ScrapCard scrap={scrap} />
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={0.15} className="my-6 flex justify-center text-accent-500">
        <ArrowDown aria-hidden className="h-6 w-6" />
      </Reveal>
      <Reveal delay={0.2}>
        <DashboardPreview />
      </Reveal>
      <Reveal delay={0.25} className="mt-8 text-center">
        <p className="text-gradient-brand text-2xl font-extrabold tracking-[-0.02em] text-balance sm:text-3xl">{ANSWER}</p>
        <p className="mt-3 text-xs text-gray-500">Prévia ilustrativa. Dados não representam cliente real.</p>
      </Reveal>
    </div>
  );
}

export function ProblemSolution() {
  return (
    <section id="visao-geral" aria-label={QUESTION} className="relative bg-canvas">
      <div className="hidden lg:motion-safe:block">
        <ScrollStory />
      </div>
      <div className="relative py-20 sm:py-24 lg:motion-safe:hidden">
        <div aria-hidden className="bg-grid-soft pointer-events-none absolute inset-0" />
        <StaticStory />
      </div>
    </section>
  );
}
