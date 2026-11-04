'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useScroll, useSpring } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, BarChart3, Church, FileSpreadsheet, LifeBuoy, UserPlus, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PrimaryAction } from '@/components/ui/PrimaryAction';
import { Reveal } from '@/components/motion/Reveal';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: Church, title: 'Crie sua igreja', description: 'Cadastre a igreja e configure o ambiente.' },
  { icon: FileSpreadsheet, title: 'Importe seus membros', description: 'Traga a planilha que você já tem.' },
  { icon: UserPlus, title: 'Convide sua liderança', description: 'Acesso para secretaria, pastores e líderes.' },
  { icon: BarChart3, title: 'Comece a organizar', description: 'Tudo em um só lugar.' },
];

export function ProcessSection() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 85%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <section id="como-funciona" className="relative scroll-mt-20 bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Você não precisa começar do zero"
          title="Comece em poucos passos."
          description="Sua igreja já tem uma planilha? Traga seus dados para o Flock."
        />

        <div className="relative mt-16">
          <span aria-hidden className="absolute top-0 bottom-0 left-6 w-px bg-gray-200 md:top-6 md:right-[12.5%] md:bottom-auto md:left-[12.5%] md:h-px md:w-auto" />
          <m.span
            aria-hidden
            style={{ scaleY: progress }}
            className="absolute top-0 bottom-0 left-6 w-px origin-top bg-gradient-to-b from-accent-500 to-primary md:hidden"
          />
          <m.span
            aria-hidden
            style={{ scaleX: progress }}
            className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px origin-left bg-gradient-to-r from-accent-500 to-primary md:block"
          />

          <ol ref={listRef} className="relative grid gap-10 md:grid-cols-4 md:gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal as="li" key={step.title} delay={i * 0.1} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_30px_-10px_rgb(9_7_37/0.55)] ring-8 ring-white">
                  <Icon aria-hidden className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold ring-2 ring-white">
                    {i + 1}
                  </span>
                </span>
                <div className="pt-1 md:pt-5">
                  <h3 className="text-lg font-bold text-primary">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{step.description}</p>
                </div>
              </Reveal>
            );
          })}
          </ol>
        </div>

        <Reveal delay={0.1} className="mt-16">
          <div className="flex flex-col gap-5 rounded-3xl border border-accent-200/70 bg-gradient-to-r from-accent-50 to-white p-6 sm:flex-row sm:items-center sm:p-7">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-500 shadow-sm ring-1 ring-accent-200">
              <LifeBuoy aria-hidden className="h-6 w-6" />
            </span>
            <p className="flex-1 text-base text-gray-700 sm:text-lg">
              <strong className="font-semibold text-primary">Já tem a lista em planilha ou em outro sistema?</strong> Nossa equipe ajuda você a
              migrar para o Flock.
            </p>
            <Link
              href="#waitlist"
              className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-xl px-4 font-semibold text-accent-500 ring-1 ring-accent-200 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 sm:self-auto"
            >
              Fale com a gente
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-20 flex flex-col items-center text-center">
          <p className="text-gradient-brand max-w-3xl text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
            Menos trabalho para migrar. Mais tempo para cuidar da igreja.
          </p>
          <PrimaryAction size="lg" className="mt-8" />
        </Reveal>
      </div>
    </section>
  );
}
