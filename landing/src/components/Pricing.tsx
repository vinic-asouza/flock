'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, ClipboardList, Star, User } from 'lucide-react';
import { CheckoutButton } from './CheckoutButton';
import { fetchPlans, type ApiPlan } from '@/services/plans';
import { PLAN_DISPLAY_NAMES, type PaidPlanId } from '@/utils/planFunnel';
import { isClosedLaunch } from '@/utils/launchMode';
import { partnerPromoPrice } from '@/utils/partnerOffer';
import { selectWaitlistPlan } from '@/utils/landingScroll';

const PAID_ORDER = ['200', '500', '800'] as const;

const PLAN_ICONS: Record<string, React.ElementType> = {
  '200': User,
  '500': ClipboardList,
  '800': BarChart3,
};

const PLAN_FEATURES: Record<string, string[]> = {
  '200': [
    'Rol de membros',
    'Acompanhamento de quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Relatórios',
    'Suporte comercial',
  ],
  '500': [
    'Rol de membros',
    'Acompanhamento de quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Relatórios',
    'Suporte comercial',
  ],
  '800': [
    'Rol de membros',
    'Acompanhamento de quem está chegando',
    'Congregações',
    'Ministérios e equipes',
    'Relatórios',
    'Suporte dedicado',
  ],
};

const TRUST_POINTS = [
  'Todas as funcionalidades incluídas',
  'Sem fidelidade',
  'Cancele quando quiser',
];

const FALLBACK_PAID: ApiPlan[] = [
  { id: '200', name: 'Plano 200 Membros', priceFormatted: 'R$ 29,99', members: 200 },
  { id: '500', name: 'Plano 500 Membros', priceFormatted: 'R$ 59,99', members: 500 },
  { id: '800', name: 'Plano 800 Membros', priceFormatted: 'R$ 89,99', members: 800 },
];

function orderPaidPlans(plans: ApiPlan[]): ApiPlan[] {
  return PAID_ORDER.flatMap((id) => {
    const plan = plans.find((item) => item.id === id);
    return plan ? [plan] : [];
  });
}

function planCtaClass(featured: boolean): string {
  return `flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:text-base ${
    featured
      ? 'bg-[#5346f0] hover:bg-[#4639d6] focus-visible:ring-[#5346f0]'
      : 'bg-[#090725] hover:bg-[#0d0a3a] focus-visible:ring-[#090725]'
  }`;
}

export function Pricing() {
  const [paidPlans, setPaidPlans] = useState<ApiPlan[]>(FALLBACK_PAID);

  useEffect(() => {
    fetchPlans()
      .then((plans) => {
        const paid = orderPaidPlans(plans.filter((plan) => plan.id !== '100'));
        if (paid.length > 0) setPaidPlans(paid);
      })
      .catch(() => {
        // mantém fallback alinhado ao backend
      });
  }, []);

  const closed = isClosedLaunch();

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#f6f6f8] px-4 py-20 min-w-0">
      <div className="mx-auto min-w-0 max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-4 inline-flex rounded-full bg-[#ece9ff] px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[#5346f0]">
            PLANOS
          </p>
          <h2 className="mb-3 text-2xl font-extrabold text-primary sm:text-3xl md:text-4xl">
            Comece grátis. Cresça quando sua igreja crescer.
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">
            O Flock é o mesmo em todos os planos. Você paga apenas pelo tamanho da sua igreja.
          </p>
        </div>

        <div className="mb-10 grid grid-cols-1 items-stretch gap-6 pt-4 lg:grid-cols-3 lg:gap-5">
          {paidPlans.map((plan) => {
            const planId = plan.id as PaidPlanId;
            const IconComponent = PLAN_ICONS[plan.id] || User;
            const features = PLAN_FEATURES[plan.id] || PLAN_FEATURES['200'];
            const isFeatured = plan.id === '500';
            const displayName = PLAN_DISPLAY_NAMES[plan.id] ?? plan.name;
            const promoPrice = partnerPromoPrice(plan.id);
            const showOffer = closed && Boolean(promoPrice);

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm md:p-8 ${
                  isFeatured
                    ? 'z-10 border-[#cfc9ff] bg-[#f4f2ff] shadow-md lg:-my-2 lg:py-10'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#5346f0] px-3 py-1 text-xs font-semibold text-white">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                    Mais escolhido
                  </span>
                )}

                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                    isFeatured ? 'bg-white' : 'bg-[#f3f1ff]'
                  }`}
                >
                  <IconComponent className="h-5 w-5 text-[#5346f0]" aria-hidden />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">{displayName}</h3>
                <p className="mb-5 text-sm text-gray-500">Para igrejas com até {plan.members} membros</p>

                {showOffer ? (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#ece9ff] px-2.5 py-1 text-xs font-bold text-[#5346f0]">
                        50% OFF
                      </span>
                      <span className="text-sm font-medium text-gray-600">Oferta de lançamento</span>
                    </div>
                    <div
                      className={`mb-6 rounded-2xl px-4 py-5 text-center ${
                        isFeatured ? 'bg-white/80' : 'bg-[#f7f6fb]'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-600">3 meses grátis</p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">
                        {promoPrice}
                        <span className="text-lg font-bold">/mês</span>
                      </p>
                      <p className="mt-1 text-sm text-gray-500">nos 12 meses seguintes</p>
                      <p className="mt-2 text-sm text-gray-400 line-through">{plan.priceFormatted}/mês</p>
                    </div>
                  </>
                ) : (
                  <p className="mb-6 text-3xl font-extrabold text-gray-900">
                    {plan.priceFormatted}
                    <span className="ml-1 text-base font-medium text-gray-500">/mês</span>
                  </p>
                )}

                <ul className="mb-6 flex-1 space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ece9ff]">
                        <Check className="h-3 w-3 text-[#5346f0]" aria-hidden />
                      </span>
                      <span
                        className={
                          feature === 'Suporte dedicado'
                            ? 'text-sm font-bold text-[#5346f0]'
                            : 'text-sm text-gray-700'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {closed ? (
                  <button
                    type="button"
                    onClick={() => selectWaitlistPlan(planId)}
                    className={planCtaClass(isFeatured)}
                  >
                    Escolher plano
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <CheckoutButton plan={planId} tone={isFeatured ? 'accent' : 'navy'}>
                    Escolher plano
                  </CheckoutButton>
                )}
              </article>
            );
          })}
        </div>

        <ul className="flex flex-col items-center justify-center gap-3 text-sm text-gray-600 sm:flex-row sm:gap-8">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-3 w-3 text-emerald-600" aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
