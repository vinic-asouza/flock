'use client';

import Link from 'next/link';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { requestDemo } from '@/utils/landingScroll';

export function DemoCta() {
  return (
    <section aria-labelledby="demo-cta-title" className="bg-canvas px-4 pt-16 pb-24 sm:px-6 md:pt-0 md:pb-28 lg:px-8">
      <Reveal className="mx-auto max-w-5xl">
        <div className="border-glow rounded-[1.75rem]">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 px-6 py-10 text-white sm:px-12 sm:py-12">
            <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(83_70_240/0.45),transparent)] blur-xl" />
            <div aria-hidden className="bg-grid absolute inset-0 opacity-50" />
            <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <CalendarCheck aria-hidden className="h-5 w-5 text-accent-200" />
                </span>
                <h2 id="demo-cta-title" className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-balance sm:text-3xl">
                  <span className="md:hidden">Gostaria de agendar uma demonstração?</span>
                  <span className="hidden md:inline">Prefere ver com alguém da nossa equipe?</span>
                </h2>
                <p className="mt-3 text-base text-white/70 sm:text-lg">Mostramos o Flock com calma e tiramos suas dúvidas.</p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row md:flex-col lg:flex-row lg:items-center">
                <Link
                  href="#waitlist"
                  onClick={(event) => {
                    event.preventDefault();
                    requestDemo();
                  }}
                  className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white whitespace-nowrap px-6 py-3 text-base font-semibold text-primary shadow-[0_8px_30px_-8px_rgb(83_70_240/0.6)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-950"
                >
                  Agendar demonstração
                </Link>
                <Link
                  href="#pricing"
                  className="group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 whitespace-nowrap text-base font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Ver planos
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
