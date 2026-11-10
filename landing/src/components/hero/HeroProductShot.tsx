'use client';

import { useEffect, useState, type PointerEvent } from 'react';
import { useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { Activity, BarChart3, FileText, PieChart, TrendingUp, UserPlus, Users } from 'lucide-react';
import { CountUp, Donut, LineChart } from '@/components/charts/Charts';
import { AppWindow } from '@/components/product/AppWindow';

const GROWTH = [65, 82, 58, 95, 73, 88, 76, 91];
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A'];

function usePointerParallax() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 20 });
  const springY = useSpring(y, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const query = window.matchMedia('(pointer: fine) and (min-width: 1024px)');
    const update = () => setEnabled(query.matches && !reduce);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [reduce]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { springX, springY, onPointerMove, onPointerLeave };
}

export function HeroProductShot() {
  const { springX, springY, onPointerMove, onPointerLeave } = usePointerParallax();
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const floatAX = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const floatAY = useTransform(springY, [-0.5, 0.5], [-14, 14]);
  const floatBX = useTransform(springX, [-0.5, 0.5], [14, -14]);
  const floatBY = useTransform(springY, [-0.5, 0.5], [10, -10]);

  return (
    <figure className="relative mx-auto w-full max-w-[40rem] [perspective:1600px]" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div aria-hidden className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(83_70_240/0.35),transparent)] blur-2xl" />

      <m.div style={{ rotateX, rotateY }} className="[transform-style:preserve-3d]">
        <AppWindow title="Painel" className="shadow-[0_40px_120px_-30px_rgb(83_70_240/0.55)]">
          <div className="grid grid-cols-6 gap-3 p-3 sm:p-4">
            <div className="col-span-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100 text-accent-500">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">87% do total</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                <CountUp value={350} />
              </p>
              <p className="text-xs text-gray-500">Membros ativos</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <m.div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-accent-500"
                  style={{ width: '87%' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            <div className="col-span-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <UserPlus className="h-3.5 w-3.5 text-accent-500" aria-hidden />
                Em integração
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                <CountUp value={3} duration={0.8} />
              </p>
              <p className="text-xs text-gray-500">Pessoas acompanhadas</p>
              <div className="mt-3 flex -space-x-2">
                {['bg-accent-400', 'bg-brand-700', 'bg-accent-200'].map((color) => (
                  <span key={color} className={`h-6 w-6 rounded-full ring-2 ring-white ${color}`} />
                ))}
              </div>
            </div>

            <div className="col-span-6 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <BarChart3 className="h-3.5 w-3.5 text-accent-500" aria-hidden />
                  Crescimento
                </p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                  <TrendingUp className="h-3 w-3" aria-hidden />
                  últimos 8 meses
                </span>
              </div>
              <LineChart values={GROWTH} labels={MONTHS} className="mt-2 h-24 sm:h-28" height={100} />
            </div>
          </div>
        </AppWindow>
      </m.div>

      <m.div
        style={{ x: floatAX, y: floatAY }}
        className="absolute -top-6 -right-3 hidden w-44 rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-[0_24px_60px_-20px_rgb(9_7_37/0.55)] backdrop-blur-md sm:block lg:-right-10"
      >
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <PieChart className="h-3.5 w-3.5 text-accent-500" aria-hidden />
            Distribuição
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Donut
              size={64}
              thickness={18}
              segments={[
                { label: 'Masculino', value: 48, color: '#090725' },
                { label: 'Feminino', value: 52, color: '#7d71f5' },
              ]}
            />
            <ul className="space-y-1 text-[10px] text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                48% Masc.
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-400" />
                52% Fem.
              </li>
            </ul>
          </div>
        </m.div>
      </m.div>

      <m.div
        style={{ x: floatBX, y: floatBY }}
        className="absolute -bottom-10 -left-3 hidden w-48 rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-[0_24px_60px_-20px_rgb(9_7_37/0.55)] backdrop-blur-md sm:block sm:w-52 lg:-left-12"
      >
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <FileText className="h-3.5 w-3.5 text-accent-500" aria-hidden />
            Relatórios
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              { icon: Activity, label: 'Batismos', value: 12 },
              { icon: TrendingUp, label: 'Recebimento', value: 8 },
              { icon: Users, label: 'Integração', value: 3 },
            ].map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-gray-700">
                  <Icon className="h-3 w-3 text-accent-500" aria-hidden />
                  {label}
                </span>
                <span className="font-semibold text-gray-900">
                  <CountUp value={value} duration={1} />
                </span>
              </li>
            ))}
          </ul>
        </m.div>
      </m.div>

      <figcaption className="mt-5 text-center text-xs text-white/45 sm:mt-20 sm:pl-40 sm:text-right lg:pl-44">
        Prévia ilustrativa do Painel. Dados não representam cliente real.
      </figcaption>
    </figure>
  );
}
