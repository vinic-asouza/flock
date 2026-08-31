'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';

const highlights = [
  'Acompanhe o crescimento da igreja',
  'Entenda o perfil da membresia',
  'Visualize indicadores em um único painel',
  'Identifique mudanças e tendências',
  'Tome decisões com base em dados',
];

function scrollToPricing() {
  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
}

export function ReportsHighlight() {
  return (
    <section id="relatorios" className="scroll-mt-24 py-20 px-4 bg-[#f5f5f5fe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-3">
              Pare de tomar decisões no escuro.
            </h2>
            <p className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              Tenha uma visão clara do crescimento e da realidade da sua igreja.
            </p>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
              Transforme os dados da sua igreja em informações fáceis de entender. Acompanhe a evolução da membresia, novos membros, perfil da comunidade e outros indicadores importantes para a liderança.
            </p>
            <ul className="space-y-3 mb-8">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-primary" aria-hidden />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                scrollToPricing();
              }}
              className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center bg-white text-primary px-6 sm:px-8 py-3 rounded-lg text-base font-semibold border border-primary/20 hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-xl"
            >
              Conhecer o Flock
            </a>
          </div>
          <div className="relative min-w-0 order-first lg:order-last">
            <Image
              src="/demo/details.png"
              alt="Relatórios do Flock — gráficos e indicadores da igreja"
              width={960}
              height={600}
              className="rounded-xl w-full h-auto shadow-lg object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
