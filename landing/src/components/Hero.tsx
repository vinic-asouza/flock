import Link from 'next/link';
import { Check, PlayCircle } from 'lucide-react';
import { isClosedLaunch } from '@/utils/launchMode';
import { PrimaryAction } from '@/components/ui/PrimaryAction';
import { HeroProductShot } from '@/components/hero/HeroProductShot';

const TRUST_POINTS = ['Sem instalação', 'Funciona no celular', 'Sem fidelidade'];

export function Hero() {
  const closed = isClosedLaunch();

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-brand-950 pt-[calc(4rem+env(safe-area-inset-top,0px))] text-white"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[72rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(83_70_240/0.45),transparent)] blur-2xl" />
        <div className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(125_113_245/0.25),transparent)] blur-2xl" />
        <div className="bg-grid absolute inset-0" />
        <div className="bg-noise absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-24 sm:px-6 sm:pt-20 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-32">
        <div className="min-w-0">
          <p className="animate-fade-up inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur sm:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-accent-300" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-300" />
            </span>
            {closed ? 'Programa Igrejas Parceiras · vagas limitadas' : 'Grátis para até 100 membros'}
          </p>

          <h1
            id="hero-title"
            className="text-gradient-light mt-6 text-[2.6rem] leading-[1.04] font-black tracking-[-0.04em] text-balance sm:text-6xl lg:text-[4.4rem]"
          >
            A gestão da sua igreja, em um só lugar
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/70 sm:text-xl"
            style={{ animationDelay: '120ms' }}
          >
            Membros, congregações, ministérios e relatórios da sua igreja em um só painel. Sem fichas, sem
            planilhas espalhadas.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: '220ms' }}
          >
            <PrimaryAction variant="light" size="lg" />
            <Link
              href="#demo"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.06] hover:ring-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-lg"
            >
              <PlayCircle aria-hidden className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              Ver como funciona
            </Link>
          </div>

          <ul
            className="animate-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60"
            style={{ animationDelay: '320ms' }}
          >
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check aria-hidden className="h-4 w-4 text-accent-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-fade-in min-w-0" style={{ animationDelay: '200ms' }}>
          <HeroProductShot />
        </div>
      </div>
    </section>
  );
}
