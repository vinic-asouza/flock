'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenWaitlist?: () => void;
}

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
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white hover:text-gray-100 transition-colors">
              <img
                src="/flock-logo.svg"
                alt="Flock Logo"
                className="w-8 h-8"
              />
              <span>Flock</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              href="#features"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Recursos
            </Link>
            <Link
              href="#about"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Sobre
            </Link>
            <button
              onClick={() => {
                onOpenWaitlist?.();
                setMobileMenuOpen(false);
              }}
              className="bg-white text-primary px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Lista de Espera
            </button>
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
              href="#about"
              className="block text-white/90 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sobre
            </Link>
            <button
              onClick={() => {
                onOpenWaitlist?.();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Lista de Espera
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
