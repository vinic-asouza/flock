'use client';

import { WaitlistForm } from './WaitlistForm';

export function CTA() {
  return (
    <section 
      id="waitlist" 
      className="py-20 px-4 text-white min-w-0 overflow-x-hidden"
      style={{ 
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
      }}
    >
      <div className="max-w-4xl mx-auto min-w-0">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2.5 break-words">
            Mais de 800 membros ou quer conversar?
          </h2>
          <p className="text-base sm:text-lg md:text-xl opacity-90">
            Entre em contato com a equipe do Flock
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 min-w-0 overflow-hidden">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

