'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUp, LogIn, Mail } from 'lucide-react';
import { landingAnchor } from '@/utils/landingLinks';
import { prefersReducedMotion } from '@/utils/landingScroll';
import { PrimaryAction } from '@/components/ui/PrimaryAction';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

const linkClass =
  'group inline-flex min-h-11 items-center gap-2 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      <span className="bg-gradient-to-r from-white to-white bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {children}
      </span>
    </Link>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <footer className="relative isolate overflow-hidden bg-brand-950 text-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 border-b border-white/10 pb-14 md:flex-row md:items-end">
          <p className="max-w-xl text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
            A gestão da sua igreja, em um só lugar.
          </p>
          <PrimaryAction variant="light" />
        </div>

        <div className="grid grid-cols-2 gap-10 py-14 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold">
              <Image src="/flock-logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
              Flock
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/55">Feito para igrejas brasileiras.</p>
            <a href="mailto:contato@flockapp.com.br" className={linkClass}>
              <Mail aria-hidden className="h-4 w-4" />
              contato@flockapp.com.br
            </a>
          </div>

          <nav aria-label="Produto">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">Produto</p>
            <ul className="mt-3">
              <li><FooterLink href={landingAnchor('#features', pathname)}>Recursos</FooterLink></li>
              <li><FooterLink href={landingAnchor('#demo', pathname)}>Demonstração</FooterLink></li>
              <li><FooterLink href={landingAnchor('#como-funciona', pathname)}>Como funciona</FooterLink></li>
              <li><FooterLink href={landingAnchor('#pricing', pathname)}>Planos</FooterLink></li>
            </ul>
          </nav>

          <nav aria-label="Ajuda">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">Ajuda</p>
            <ul className="mt-3">
              <li><FooterLink href={landingAnchor('#faq', pathname)}>FAQ</FooterLink></li>
              <li><FooterLink href={landingAnchor('#waitlist', pathname)}>Contato</FooterLink></li>
              <li><FooterLink href="/privacidade">Política de Privacidade</FooterLink></li>
            </ul>
          </nav>

          <nav aria-label="Acesso">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">Acesso</p>
            <ul className="mt-3">
              <li>
                <a href={`${FRONTEND_URL}/login`} className={linkClass}>
                  <LogIn aria-hidden className="h-4 w-4" />
                  Acessar Painel
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none mx-auto max-w-7xl overflow-hidden px-4 select-none sm:px-6 lg:px-8">
        <p className="bg-gradient-to-b from-white/20 to-white/0 bg-clip-text text-center text-6xl leading-none font-black tracking-[-0.06em] text-transparent sm:text-8xl">
          Flock
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-sm text-white/50 sm:flex-row sm:px-6 lg:px-8">
          <p>
            &copy; {currentYear} Flock. Todos os direitos reservados. ·{' '}
            <Link href="/privacidade" className="underline-offset-2 hover:text-white hover:underline">
              Política de Privacidade
            </Link>
          </p>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-white/60 ring-1 ring-white/15 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Voltar ao topo
            <ArrowUp aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
