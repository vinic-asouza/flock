'use client';

import { WaitlistForm } from './WaitlistForm';

export function CTA() {
  return (
    <section 
      id="waitlist" 
      className="py-20 px-4 text-white"
      style={{ 
        backgroundColor: '#090725',
        backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2.5">
            Pronto para Transformar a Gestão da sua Igreja?
          </h2>
          <p className="text-base sm:text-lg md:text-xl opacity-90">
            Faça sua solicitação e seja um dos primeiros a usar o Flock
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

