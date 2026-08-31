'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, BarChart3, Check, Gift } from 'lucide-react';
import Link from 'next/link';
import { CheckoutButton } from './CheckoutButton';
import { fetchPlans, type ApiPlan } from '@/services/plans';
import { buildLoginCheckoutUrl, buildFreeRegisterUrl, PLAN_DISPLAY_NAMES, type PaidPlanId } from '@/utils/planFunnel';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

const PLAN_ICONS: Record<string, React.ElementType> = {
  '200': Users,
  '500': Building2,
  '800': BarChart3,
};

const PLAN_FEATURES: Record<string, string[]> = {
  '200': [
    'Rol de membros',
    'Quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Agenda da igreja',
    'Relatórios',
    'Suporte comercial',
  ],
  '500': [
    'Rol de membros',
    'Quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Agenda da igreja',
    'Relatórios',
    'Suporte comercial',
  ],
  '800': [
    'Rol de membros',
    'Quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Agenda da igreja',
    'Relatórios',
    'Suporte dedicado',
  ],
};

const FALLBACK_PAID: ApiPlan[] = [
  { id: '200', name: 'Plano 200 Membros', priceFormatted: 'R$ 29,99', members: 200 },
  { id: '500', name: 'Plano 500 Membros', priceFormatted: 'R$ 59,99', members: 500 },
  { id: '800', name: 'Plano 800 Membros', priceFormatted: 'R$ 89,99', members: 800 },
];

export function Pricing() {
  const [paidPlans, setPaidPlans] = useState<ApiPlan[]>(FALLBACK_PAID);
  const [freePlan, setFreePlan] = useState<ApiPlan | null>({
    id: '100',
    name: 'Plano 100 Membros',
    priceFormatted: 'Gratuito',
    members: 100,
    description: 'Ideal para começar',
  });

  useEffect(() => {
    fetchPlans()
      .then((plans) => {
        const free = plans.find((p) => p.id === '100') ?? null;
        const paid = plans.filter((p) => p.id !== '100');
        if (free) setFreePlan(free);
        if (paid.length > 0) setPaidPlans(paid);
      })
      .catch(() => {
        // mantém fallback alinhado ao backend
      });
  }, []);

  return (
    <section id="pricing" className="scroll-mt-24 py-20 px-4 bg-[#f5f5f5fe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            Comece grátis. Cresça quando sua igreja crescer.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Todas as funcionalidades. Uma única assinatura. <br /> Você paga apenas pelo tamanho da sua igreja.
          </p>
        </div>

        {freePlan && (
          <div className="mb-8 max-w-xl mx-auto">
            <div className="bg-white rounded-xl border-2 border-primary/20 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{PLAN_DISPLAY_NAMES[freePlan.id] ?? 'Grátis'}</h3>
                  <p className="text-sm text-gray-600">Até {freePlan.members} membros — {freePlan.priceFormatted}</p>
                </div>
              </div>
              <Link
                href={buildFreeRegisterUrl(FRONTEND_URL)}
                className="inline-flex justify-center items-center min-h-11 w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#0d0a3a] transition-all duration-300 shadow-lg hover:shadow-xl sm:hover:scale-105 text-sm sm:text-base"
              >
                Começar grátis
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          {paidPlans.map((plan) => {
            const planId = plan.id as PaidPlanId;
            const IconComponent = PLAN_ICONS[plan.id] || Users;
            const features = PLAN_FEATURES[plan.id] || PLAN_FEATURES['200'];
            const isFeatured = plan.id === '500';
            const displayName = PLAN_DISPLAY_NAMES[plan.id] ?? plan.name;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 md:p-8 flex flex-col relative ${
                  isFeatured
                    ? 'border-primary hover:border-primary'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Mais escolhido
                  </span>
                )}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="w-8 h-8 text-primary" aria-hidden />
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">{displayName}</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4">
                    Até {plan.members} membros
                  </p>
                  <div className="text-2xl md:text-3xl font-extrabold text-primary">
                    {plan.priceFormatted}
                    <span className="text-sm md:text-base font-normal text-gray-500 ml-1">/mês</span>
                  </div>
                </div>

                <div className="flex-1 mb-6">
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-primary" aria-hidden />
                        </div>
                        <span
                          className={
                            feature === 'Suporte dedicado'
                              ? 'text-sm font-bold text-primary'
                              : 'text-sm text-gray-700'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto space-y-2">
                  <CheckoutButton plan={planId} className="w-full">
                    Escolher este plano
                  </CheckoutButton>
                  <Link
                    href={buildLoginCheckoutUrl(planId, FRONTEND_URL)}
                    className="flex min-h-11 w-full items-center justify-center text-center text-sm text-primary hover:text-[#0d0a3a] font-medium py-2"
                  >
                    Já tenho conta
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-sm text-gray-700">
            Sua igreja tem mais de 800 membros?{' '}
            <a
              href="#waitlist?plan=personalizado"
              className="text-primary font-semibold hover:text-[#0d0a3a] transition-colors underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#waitlist?plan=personalizado';
                setTimeout(() => {
                  document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              Entre em contato
            </a>{' '}
            para um orçamento personalizado.
          </p>
        </div>
      </div>
    </section>
  );
}
