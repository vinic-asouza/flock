'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import { landingAnchor } from '@/utils/landingLinks';
import { buildFreeRegisterUrl } from '@/utils/planFunnel';

interface HeaderProps {
  onOpenWaitlist?: () => void;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function Header({ onOpenWaitlist }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setMobileMenuOpen(false);

  const navLinkClass =
    'flex min-h-11 items-center text-white/90 hover:text-white transition-colors font-medium';

  return (
    <header
      className="sticky top-0 z-50 bg-gradient-to-r from-primary via-[#0d0a3a] to-primary shadow-lg pt-[env(safe-area-inset-top,0px)]"
      style={{
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
        opacity: 1,
        backdropFilter: 'none',
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-w-0">
          {/* Logo */}
          <div className="flex-shrink-0 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white hover:text-gray-100 transition-colors"
            >
              <Image
                src="/flock-logo.svg"
                alt="Flock Logo"
                width={32}
                height={32}
                className="w-8 h-8 flex-shrink-0"
              />
              <span>Flock</span>
            </Link>
          </div>

          {/* Desktop Navigation - Centralized Links */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1 md:space-x-5 lg:space-x-8">
            <Link href={landingAnchor('#features', pathname)} className={navLinkClass}>
              Recursos
            </Link>
            <Link href={landingAnchor('#demo', pathname)} className={navLinkClass}>
              Demonstração
            </Link>
            <Link href={landingAnchor('#pricing', pathname)} className={navLinkClass}>
              Planos
            </Link>
            <Link href={landingAnchor('#faq', pathname)} className={navLinkClass}>
              FAQ
            </Link>
            <Link
              href={landingAnchor('#waitlist', pathname)}
              className={navLinkClass}
              onClick={onOpenWaitlist}
            >
              Contato
            </Link>
          </div>

          {/* Desktop Actions - Right Side */}
          <div className="hidden md:flex md:items-center md:space-x-4 md:flex-shrink-0">
            <Link
              href={`${FRONTEND_URL}/login`}
              rel="noopener noreferrer"
              className={`${navLinkClass} gap-2`}
            >
              <LogIn size={18} />
              <span>Acessar Painel</span>
            </Link>
            <Link
              href={buildFreeRegisterUrl(FRONTEND_URL)}
              className="inline-flex min-h-11 items-center bg-white text-primary px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Começar grátis
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-white hover:text-gray-200 transition-colors rounded-lg"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 space-y-1 border-t border-white/20 pb-[env(safe-area-inset-bottom,0px)]">
            <Link
              href={landingAnchor('#features', pathname)}
              className={`${navLinkClass} px-2`}
              onClick={closeMenu}
            >
              Recursos
            </Link>
            <Link
              href={landingAnchor('#demo', pathname)}
              className={`${navLinkClass} px-2`}
              onClick={closeMenu}
            >
              Demonstração
            </Link>
            <Link
              href={landingAnchor('#pricing', pathname)}
              className={`${navLinkClass} px-2`}
              onClick={closeMenu}
            >
              Planos
            </Link>
            <Link
              href={landingAnchor('#faq', pathname)}
              className={`${navLinkClass} px-2`}
              onClick={closeMenu}
            >
              FAQ
            </Link>
            <Link
              href={landingAnchor('#waitlist', pathname)}
              className={`${navLinkClass} px-2`}
              onClick={() => {
                closeMenu();
                onOpenWaitlist?.();
              }}
            >
              Contato
            </Link>
            <Link
              href={`${FRONTEND_URL}/login`}
              rel="noopener noreferrer"
              className={`${navLinkClass} justify-center gap-2 px-2`}
              onClick={closeMenu}
            >
              <LogIn size={18} />
              <span>Acessar Painel</span>
            </Link>
            <Link
              href={buildFreeRegisterUrl(FRONTEND_URL)}
              className="flex min-h-11 w-full items-center justify-center bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              onClick={closeMenu}
            >
              Começar grátis
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
