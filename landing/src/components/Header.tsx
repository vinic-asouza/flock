'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, LogIn } from 'lucide-react';

interface HeaderProps {
  onOpenWaitlist?: () => void;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function Header({ onOpenWaitlist }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header 
      className="bg-gradient-to-r from-primary via-[#0d0a3a] to-primary shadow-lg sticky top-0 z-50"
      style={{ 
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
        opacity: 1,
        backdropFilter: 'none'
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white hover:text-gray-100 transition-colors">
              <Image
                src="/flock-logo.svg"
                alt="Flock Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span>Flock</span>
            </Link>
          </div>

          {/* Desktop Navigation - Centralized Links */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1 md:space-x-8">
            <Link
              href="#features"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Recursos
            </Link>
            <Link
              href="#demo"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Demonstração
            </Link>
            <Link
              href="#pricing"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Planos
            </Link>
            <Link
              href="#waitlist"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Contato
            </Link>
          </div>

          {/* Desktop Actions - Right Side */}
          <div className="hidden md:flex md:items-center md:space-x-4 md:flex-shrink-0">
            <Link
              href={`${FRONTEND_URL}/login`}
              // target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors font-medium"
            >
              <LogIn size={18} />
              <span>Acessar Painel</span>
            </Link>
            <Link
              href="#pricing"
              className="bg-white text-primary px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg inline-block"
            >
              Assinar agora
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-white/20">
            <Link
              href="#features"
              className="block text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Recursos
            </Link>
            <Link
              href="#demo"
              className="block text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demonstração
            </Link>
            <Link
              href="#pricing"
              className="block text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Planos
            </Link>
            <Link
              href="#waitlist"
              className="block text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contato
            </Link>
            <Link
              href={`${FRONTEND_URL}/login`}
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-white/90 hover:text-white transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LogIn size={18} />
              <span>Acessar Painel</span>
            </Link>
            <Link
              href="#pricing"
              className="w-full bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Assinar agora
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
