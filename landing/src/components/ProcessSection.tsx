'use client';

import Image from 'next/image';
import { Church, FileSpreadsheet, UserPlus, BarChart3 } from 'lucide-react';

const processes = [
  {
    step: '1',
    icon: Church,
    title: 'Crie sua igreja',
    description: 'Cadastre sua igreja e configure o ambiente.',
  },
  {
    step: '2',
    icon: FileSpreadsheet,
    title: 'Importe seus membros',
    description: 'Traga para o Flock os dados que sua igreja já possui.',
  },
  {
    step: '3',
    icon: UserPlus,
    title: 'Convide sua liderança',
    description: 'Dê acesso à secretaria, pastores e líderes.',
  },
  {
    step: '4',
    icon: BarChart3,
    title: 'Comece a organizar',
    description: 'Centralize as informações e acompanhe sua igreja em um só lugar.',
  },
];

const benefits = [
  {
    title: 'Uma liderança, uma visão.',
    description:
      'Pastores, secretaria e líderes trabalham com informações atualizadas e centralizadas.',
  },
  {
    title: 'Dados para decidir melhor.',
    description: 'Tenha indicadores claros para acompanhar a realidade da sua igreja.',
  },
  {
    title: 'Feito para igrejas brasileiras.',
    description: 'Uma plataforma pensada para a forma como igrejas brasileiras se organizam.',
  },
  {
    title: 'Acesso de qualquer lugar.',
    description: 'Acesse as informações da sua igreja pelo computador, tablet ou celular.',
  },
  {
    title: 'Comece grátis.',
    description: 'Igrejas com até 100 membros podem começar gratuitamente.',
  },
];

export function ProcessSection() {
  return (
    <section id="como-funciona" className="scroll-mt-24 py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div
          className="mb-12 md:mb-20 rounded-xl p-6 sm:p-8 md:p-12"
          style={{
            backgroundColor: '#090725',
            backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
          }}
        >
          <div className="text-center mb-8 md:mb-10">
            <p className="text-sm sm:text-base font-medium text-white/80 mb-2">
              Você não precisa começar do zero.
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
              Comece em poucos passos.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/80">
              Sua igreja já tem uma planilha? Traga seus dados para o Flock.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {processes.map((process) => {
              const IconComponent = process.icon;
              return (
                <div key={process.step} className="text-center relative">
                  <p className="text-xs font-semibold tracking-widest text-white/50 mb-2">
                    {process.step}
                  </p>
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-white" aria-hidden />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">
                    {process.title}
                  </h3>
                  <p className="text-xs md:text-sm text-white/90 leading-relaxed">
                    {process.description}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm sm:text-base text-white/90 mt-8 md:mt-10 font-medium">
            Menos trabalho para migrar. Mais tempo para cuidar da igreja.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative flex justify-center order-2 lg:order-1">
            <Image
              src="/demo/painel.png"
              alt="Prévia do Painel do Flock"
              width={500}
              height={500}
              className="rounded-xl w-full max-w-xs md:max-w-sm lg:max-w-md shadow-lg"
            />
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-6 md:mb-8">
              Menos planilhas. Mais organização.
            </h2>

            <div className="space-y-6">
              {benefits.map((benefit) => (
                <div key={benefit.title}>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
