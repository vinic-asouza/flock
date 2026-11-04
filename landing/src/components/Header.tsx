'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { Menu, X, LogIn } from 'lucide-react';
import { landingAnchor } from '@/utils/landingLinks';
import { cn } from '@/utils/cn';
import { PrimaryAction } from '@/components/ui/PrimaryAction';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export const NAV_LINKS = [
  { id: 'features', label: 'Recursos' },
  { id: 'demo', label: 'Demonstração' },
  { id: 'como-funciona', label: 'Como funciona' },
  { id: 'pricing', label: 'Planos' },
  { id: 'faq', label: 'FAQ' },
  { id: 'waitlist', label: 'Contato' },
] as const;

interface HeaderProps {
  /** Header transparente sobre um Hero escuro (home). Nas demais páginas fica sólido. */
  overlay?: boolean;
}

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const delta = y - lastY.current;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 480);
        lastY.current = y;
      }
      ticking.current = false;
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrolled, hidden };
}

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const sections = NAV_LINKS.map(({ id }) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        });
        const order = NAV_LINKS.map(({ id }) => id).filter((id) => visible.has(id));
        setActive(order[0] ?? null);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

export function Header({ overlay = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { scrolled, hidden } = useScrollState();
  const active = useActiveSection(pathname === '/');

  const solid = !overlay || scrolled;
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-[transform,background-color,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          solid
            ? 'border-b border-white/10 bg-brand-950/80 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
          hidden && !mobileMenuOpen ? '-translate-y-full' : 'translate-y-0'
        )}
      >
        <nav
          aria-label="Principal"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 rounded-lg text-xl font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image
              src="/flock-logo.svg"
              alt=""
              width={32}
              height={32}
              priority
              className="h-8 w-8 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
            />
            <span className="tracking-tight">Flock</span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <li key={id} className="relative">
                  <Link
                    href={landingAnchor(`#${id}`, pathname)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'relative flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <m.span
                        layoutId="nav-active"
                        className="absolute inset-x-0 inset-y-2 -z-10 rounded-full bg-white/10 ring-1 ring-white/15"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <Link
              href={`${FRONTEND_URL}/login`}
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <LogIn size={16} aria-hidden />
              Acessar Painel
            </Link>
            <PrimaryAction variant="light" withArrow={false} className="shadow-none" />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menu"
          >
            <Menu size={24} aria-hidden />
          </button>
        </nav>
      </header>

      {!overlay && (
        <div aria-hidden className="h-16 shrink-0 bg-brand-950 pt-[env(safe-area-inset-top,0px)]" />
      )}

      <AnimatePresence>
        {mobileMenuOpen && (
          <Dialog static open={mobileMenuOpen} onClose={closeMenu} className="relative z-[60] lg:hidden">
            <m.div
              aria-hidden
              className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
            <DialogPanel className="fixed inset-y-0 right-0 w-full max-w-sm">
              <m.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="flex h-full flex-col bg-brand-950 px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-white shadow-2xl ring-1 ring-white/10"
              >
              <div className="flex h-12 items-center justify-between">
                <span className="flex items-center gap-2 text-xl font-bold">
                  <Image src="/flock-logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
                  Flock
                </span>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label="Fechar menu"
                >
                  <X size={24} aria-hidden />
                </button>
              </div>

              <ul className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map(({ id, label }, index) => (
                  <m.li
                    key={id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + index * 0.04, duration: 0.4 }}
                  >
                    <Link
                      href={landingAnchor(`#${id}`, pathname)}
                      onClick={closeMenu}
                      className="flex min-h-12 items-center rounded-xl px-3 text-lg font-medium text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {label}
                    </Link>
                  </m.li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-6">
                <Link
                  href={`${FRONTEND_URL}/login`}
                  onClick={closeMenu}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-white/80 ring-1 ring-white/15 hover:bg-white/5"
                >
                  <LogIn size={18} aria-hidden />
                  Acessar Painel
                </Link>
                <PrimaryAction variant="light" size="lg" onActivate={closeMenu} className="w-full" />
              </div>
              </m.div>
            </DialogPanel>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
