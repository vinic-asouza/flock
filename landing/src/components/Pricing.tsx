'use client';

import { Users, Building2, BarChart3, Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  maxMembers: number;
  icon: React.ElementType;
  price: string;
  annualPrice: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'plan-200',
    name: 'Plano 200',
    maxMembers: 200,
    icon: Users,
    price: 'R$ 39,99',
    annualPrice: 'ou 399,99 /ano',
    features: [
      'Gestão completa de membros',
      'Múltiplas congregações',
      'Relatórios detalhados',
      'Exportação de dados em PDF',
      'Interface moderna e responsiva',
      'Segurança e criptografia',
      'Suporte comercial',
    ],
  },
  {
    id: 'plan-500',
    name: 'Plano 500',
    maxMembers: 500,
    icon: Building2,
    price: 'R$ 69,99',
    annualPrice: 'ou 699,99 /ano',
    features: [
      'Gestão completa de membros',
      'Múltiplas congregações',
      'Relatórios detalhados',
      'Exportação de dados em PDF',
      'Interface moderna e responsiva',
      'Segurança e criptografia',
      'Suporte comercial',
    ],
  },
  {
    id: 'plan-800',
    name: 'Plano 800',
    maxMembers: 800,
    icon: BarChart3,
    price: 'R$ 99,99',
    annualPrice: 'ou 999,99 /ano',
    features: [
      'Gestão completa de membros',
      'Múltiplas congregações',
      'Relatórios detalhados',
      'Exportação de dados em PDF',
      'Interface moderna e responsiva',
      'Segurança e criptografia',
      'Suporte dedicado',
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 bg-[#f5f5f5fe]">
      <div className="max-w-7xl mx-auto">
        {/* Título e Subtítulo */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            Planos e Preços
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para o tamanho da sua igreja
          </p>
        </div>

        {/* Cards de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.id}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 md:p-8 flex flex-col"
              >
                {/* Ícone e Nome do Plano */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4">
                    Até {plan.maxMembers} membros
                  </p>
                  <div className="text-2xl md:text-3xl font-extrabold text-primary">
                    {/* {plan.price} */}
                    R$ XX
                    <span className="text-sm md:text-base font-normal text-gray-500 ml-1">/mês</span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    {/* {plan.annualPrice} */}
                    R$ XX /ano
                  </p>
                </div>

                {/* Lista de Recursos */}
                <div className="flex-1 mb-6">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão de Ação */}
                <a
                  href="#waitlist"
                  className="w-full text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg text-sm md:text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 mt-auto text-center inline-block"
                  style={{
                    backgroundColor: '#090725',
                    backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    const waitlistSection = document.getElementById('waitlist');
                    if (waitlistSection) {
                      waitlistSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Entrar na Lista de Espera
                </a>
              </div>
            );
          })}
        </div>

        {/* Observação sobre planos personalizados */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-sm text-gray-700">
            Precisa de gestão para mais de 800 membros?{' '}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:text-[#0d0a3a] transition-colors underline"
            >
              Entre em contato com nosso suporte
            </a>
            {' '}para consultar opções personalizadas.
          </p>
        </div>
      </div>
    </section>
  );
}

