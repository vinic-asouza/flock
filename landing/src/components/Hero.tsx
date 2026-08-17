'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StatsGraphics } from './StatsGraphics';
import { useState } from 'react';

interface HeroProps {
  onOpenWaitlist?: () => void;
}

export function Hero({ onOpenWaitlist }: HeroProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative bg-[#f5f5f5fe] py-10 px-4 overflow-hidden min-w-0">
      <div className="max-w-7xl mx-auto relative z-10 min-w-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-left min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary mb-2.5 leading-tight break-words">
              Gerencie sua Igreja de Forma Inteligente e Simples
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              Sistema completo para gestão eclesiástica. Tudo que sua igreja precisa em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="#pricing"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group bg-primary text-white px-6 sm:px-8 py-3 min-h-11 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#0d0a3a] transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl sm:hover:scale-105 relative overflow-hidden w-full sm:w-auto"
              >
                <span className="relative z-10">Assinar Agora</span>
                <ArrowRight 
                  size={20} 
                  className={`relative z-10 transition-all duration-300 ${isHovered ? 'translate-x-2 scale-110' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#0d0a3a] to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                href="#features"
                className="bg-white text-primary px-6 sm:px-8 py-3 min-h-11 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-xl sm:hover:scale-105 inline-flex items-center justify-center w-full sm:w-auto"
              >
                Conhecer Recursos
              </Link>
            </div>
          </div>

          {/* Right Column - Stats Graphics */}
          <div className="relative hidden lg:block">
            <StatsGraphics />
          </div>
          
          {/* Mobile - Show simplified graphics */}
          <div className="lg:hidden mt-8 min-w-0 overflow-hidden">
            <StatsGraphics />
          </div>
        </div>
      </div>
    </section>
  );
}
