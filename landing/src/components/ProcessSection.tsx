'use client';

import Image from 'next/image';
import { FileText, Users, BarChart3 } from 'lucide-react';

const processes = [
  {
    icon: FileText,
    title: 'Crie a igreja grátis',
    description: 'Registro, congregação principal, plano 100 — comece sem custo',
  },
  {
    icon: Users,
    title: 'Monte o Painel',
    description: 'Membros (inclui import CSV), integração, congregações, grupos e calendário',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe pelos relatórios',
    description: 'Totais e demografia; CSV só da lista de membros',
  },
];

const benefits = [
  {
    title: 'Feito para a igreja brasileira',
    description: 'CNPJ, telefone, IBGE, vocabulário eclesial. O Painel fala a língua da sua secretaria e do seu pastor.',
  },
  {
    title: 'Secretaria e pastor no mesmo Painel',
    description: 'Papéis Dono / Admin / Editor / Leitor. Cada um vê e edita o que precisa, na mesma plataforma.',
  },
  {
    title: 'Começa grátis até 100 membros ativos',
    description: 'O plano só muda o teto de membros. Funcionalidades iguais em todos os planos.',
  },
];

export function ProcessSection() {
  return (
    <section className="py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        {/* Bloco 1: Processos */}
        <div className="mb-12 md:mb-20 rounded-xl p-6 sm:p-8 md:p-12" style={{ 
          backgroundColor: '#090725',
          backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
        }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
            {processes.map((process, index) => {
              const IconComponent = process.icon;
              return (
                <div key={index} className="text-center relative">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-white" />
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
        </div>

        {/* Bloco 2: Por que o Flock é para sua igreja */}
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Lado Esquerdo - Imagem */}
          <div className="relative flex justify-center order-2 lg:order-1">
            <Image
              src="/demo/painel.png"
              alt="Prévia do Painel do Flock"
              width={500}
              height={500}
              className="rounded-xl w-full max-w-xs md:max-w-sm lg:max-w-md shadow-lg"
              priority
            />
          </div>

          {/* Lado Direito - Texto */}
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-6 md:mb-8">
              Porque escolher o Flock?
            </h2>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index}>
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

