'use client';

import Link from 'next/link';
import { WaitlistForm } from './WaitlistForm';
import { buildFreeRegisterUrl } from '@/utils/planFunnel';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function CTA() {
  return (
    <section
      className="py-20 px-4 text-white min-w-0 overflow-x-hidden"
      style={{
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
      }}
    >
      <div className="max-w-4xl mx-auto min-w-0">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2.5 break-words">
            Sua igreja merece uma gestão mais simples.
          </h2>
          <p className="text-base sm:text-lg md:text-xl opacity-90 mb-6">
            Comece gratuitamente e veja o Flock funcionando na prática.
          </p>
          <Link
            href={buildFreeRegisterUrl(FRONTEND_URL)}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center bg-white text-primary px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Começar grátis
          </Link>
          <p className="mt-4 text-sm sm:text-base text-white/80">
            Até 100 membros grátis.
          </p>
        </div>

        <div id="waitlist" className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 min-w-0 overflow-hidden scroll-mt-24">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-primary mb-2">
              Mais de 800 membros ou quer uma demonstração?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Fale com a equipe do Flock
            </p>
          </div>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
