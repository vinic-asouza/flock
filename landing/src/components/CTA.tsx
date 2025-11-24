'use client';

import { ArrowRight } from 'lucide-react';

interface CTAProps {
  onOpenWaitlist?: () => void;
}

export function CTA({ onOpenWaitlist }: CTAProps) {
  return (
    <section className="py-20 px-4 bg-primary text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Pronto para Transformar a Gestão da sua Igreja?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Junte-se à lista de espera e seja um dos primeiros a usar o Flock
        </p>
        <button
          onClick={onOpenWaitlist}
          className="bg-white text-primary px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
        >
          Entrar na Lista de Espera
          <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );
}

