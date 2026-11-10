'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gift, SlidersHorizontal, Sparkles, Star } from 'lucide-react';
import { CheckoutButton } from './CheckoutButton';
import { Differentiators } from './Differentiators';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { fetchPlans, type ApiPlan } from '@/services/plans';
import { PLAN_DISPLAY_NAMES, buildFreeRegisterUrl, type PaidPlanId } from '@/utils/planFunnel';
import { isClosedLaunch } from '@/utils/launchMode';
import { PARTNER_OFFER_SUMMARY, partnerPromoPrice } from '@/utils/partnerOffer';
import { selectWaitlistPlan } from '@/utils/landingScroll';
import { cn } from '@/utils/cn';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

const PAID_ORDER = ['200', '500', '800'] as const;

const INCLUDED_FEATURES = [
  'Rol de membros',
  'Acompanhamento de quem está chegando',
  'Congregações',
  'Ministérios e equipes',
  'Relatórios',
];

const PLAN_SUPPORT: Record<string, string> = {
  '200': 'Suporte comercial',
  '500': 'Suporte comercial',
  '800': 'Suporte dedicado',
};

const TRUST_POINTS = ['Todas as funcionalidades incluídas', 'Sem fidelidade', 'Cancele quando quiser'];

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

function OfferTimeline({ promoPrice, fullPrice, featured }: { promoPrice: string; fullPrice: string; featured: boolean }) {
  const steps = [
    { when: 'Primeiros 3 meses', price: 'Grátis', note: 'para testar' },
    { when: 'Nos 12 meses seguintes', price: `${promoPrice}/mês`, note: '50% de desconto' },
    { when: 'Depois', price: `${fullPrice}/mês`, note: 'preço normal' },
  ];
  return (
    <ol className={cn('relative space-y-3 rounded-2xl p-4', featured ? 'bg-white/80' : 'bg-canvas')}>
      <span aria-hidden className="absolute top-7 bottom-7 left-[1.4rem] w-px bg-accent-200" />
      {steps.map((step, i) => (
        <li key={step.when} className="relative flex items-center gap-3 pl-6">
          <span
            className={cn(
              'absolute left-0 h-3 w-3 rounded-full ring-4',
              i === 2 ? 'bg-gray-300 ring-gray-100' : 'bg-accent-500 ring-accent-100'
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-[11px] font-medium text-gray-500">{step.when}</p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap',
                  i === 2 ? 'bg-gray-100 text-gray-500' : 'bg-accent-100 text-accent-500'
                )}
              >
                {step.note}
              </span>
            </div>
            <p
              className={cn(
                'font-extrabold tracking-tight whitespace-nowrap',
                i === 1 ? 'text-2xl text-gray-900' : 'text-sm text-gray-700'
              )}
            >
              {step.price}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const ASIDE_BUTTON =
  'group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl px-5 font-semibold text-primary ring-1 ring-gray-300 transition-[background-color,box-shadow] hover:bg-white hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:self-auto';

function PlanAside({
  icon,
  iconClass,
  title,
  limitPrefix,
  limit,
  description,
  action,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  limitPrefix: string;
  limit: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-5 sm:p-6 lg:flex-row lg:items-center">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', iconClass)}>{icon}</span>
      <div className="flex-1">
        <p className="text-lg font-extrabold text-primary">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {limitPrefix ? `${limitPrefix} ` : null}
          <span className="text-gradient-brand inline-block text-xl font-extrabold tracking-tight">{limit}</span>
        </p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

function PlanAsides({ closed }: { closed: boolean }) {
  return (
    <Reveal className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-2">
      <PlanAside
        icon={<Gift aria-hidden className="h-5 w-5" />}
        iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100"
        title={PLAN_DISPLAY_NAMES['100']}
        limitPrefix="até"
        limit="100 membros"
        description="O mesmo Flock, com todas as funcionalidades, para igrejas com até 100 membros."
        action={
          closed ? (
            <button type="button" onClick={() => selectWaitlistPlan('100')} className={ASIDE_BUTTON}>
              Solicitar acesso
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <Link href={buildFreeRegisterUrl(FRONTEND_URL)} className={ASIDE_BUTTON}>
              Começar grátis
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )
        }
      />
      <PlanAside
        icon={<SlidersHorizontal aria-hidden className="h-5 w-5" />}
        iconClass="bg-accent-50 text-accent-500 ring-accent-100"
        title="Personalizado"
        limitPrefix=""
        limit="+ de 800 membros"
        description="O mesmo Flock, com todas as funcionalidades, para igrejas com mais de 800 membros."
        action={
          <button type="button" onClick={() => selectWaitlistPlan('personalizado')} className={ASIDE_BUTTON}>
            Entrar em contato
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        }
      />
    </Reveal>
  );
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
    <section id="pricing" className="relative scroll-mt-20 bg-canvas py-24 sm:py-28">
      <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Differentiators />

        <SectionHeading
          className="mt-20"
          eyebrow="Planos"
          title={
            closed ? (
              <>
                <span className="text-gradient-brand">Três meses para testar.</span> Depois, o plano do tamanho da sua igreja.
              </>
            ) : (
              'Comece grátis. Cresça quando sua igreja crescer.'
            )
          }
          description="O Flock é o mesmo em todos os planos. Você paga apenas pelo tamanho da sua igreja."
        />

        {closed && (
          <Reveal delay={0.1} className="mt-8 flex justify-center">
            <p className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-primary px-5 py-3 text-center text-sm text-white shadow-[0_12px_30px_-12px_rgb(9_7_37/0.6)]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent-200">
                <Sparkles aria-hidden className="h-4 w-4" />
                Oferta Igrejas Parceiras · vagas limitadas
              </span>
              <span className="text-white/85">{PARTNER_OFFER_SUMMARY}</span>
            </p>
          </Reveal>
        )}

        <Stagger className="mt-14 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-5" stagger={0.12}>
          {paidPlans.map((plan) => {
            const planId = plan.id as PaidPlanId;
            const isFeatured = plan.id === '500';
            const displayName = PLAN_DISPLAY_NAMES[plan.id] ?? plan.name;
            const promoPrice = partnerPromoPrice(plan.id);
            const showOffer = closed && Boolean(promoPrice);
            const support = PLAN_SUPPORT[plan.id] ?? 'Suporte comercial';

            return (
              <StaggerItem
                as="article"
                key={plan.id}
                className={cn('flex', isFeatured && 'md:order-first lg:order-none')}
              >
                <div
                  className={cn(
                    'relative flex w-full flex-col rounded-3xl p-6 sm:p-8',
                    isFeatured
                      ? 'border-glow bg-gradient-to-b from-accent-50 to-white shadow-[0_40px_80px_-40px_rgb(83_70_240/0.6)] lg:-my-3 lg:py-11'
                      : 'border border-gray-200 bg-white shadow-sm'
                  )}
                >
                  {isFeatured && (
                    <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_-6px_rgb(83_70_240/0.8)]">
                      <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
                      Mais escolhido
                    </span>
                  )}

                  <h3 className="text-xl font-extrabold text-primary">{displayName}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Para igrejas com até{' '}
                    <span className="text-gradient-brand inline-block text-xl font-extrabold tracking-tight">
                      {plan.members} membros
                    </span>
                  </p>

                  <div className="mt-6 mb-6">
                    {showOffer && promoPrice ? (
                      <OfferTimeline promoPrice={promoPrice} fullPrice={plan.priceFormatted} featured={isFeatured} />
                    ) : (
                      <p className="text-4xl font-extrabold tracking-tight text-gray-900">
                        {plan.priceFormatted}
                        <span className="ml-1 text-base font-medium text-gray-500">/mês</span>
                      </p>
                    )}
                  </div>

                  <p className={cn('mb-6 flex items-center gap-2 text-sm', plan.id === '800' ? 'font-bold text-accent-500' : 'text-gray-700')}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-100">
                      <Check aria-hidden className="h-3 w-3 text-accent-500" />
                    </span>
                    {support}
                  </p>

                  <div className="mt-auto">
                    {closed ? (
                      <button
                        type="button"
                        onClick={() => selectWaitlistPlan(planId)}
                        className={cn(
                          'group flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:text-base',
                          isFeatured
                            ? 'bg-accent-500 hover:bg-accent-600 focus-visible:ring-accent-500'
                            : 'bg-primary hover:bg-brand-900 focus-visible:ring-primary'
                        )}
                      >
                        Quero este plano
                        <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    ) : (
                      <CheckoutButton plan={planId} tone={isFeatured ? 'accent' : 'navy'}>
                        Escolher plano
                      </CheckoutButton>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <PlanAsides closed={closed} />

        <Reveal className="mt-12 rounded-3xl bg-white p-6 ring-1 ring-gray-200/80 sm:p-8">
          <p className="text-center text-sm font-semibold text-primary">Todos os planos incluem</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {INCLUDED_FEATURES.map((feature) => (
              <li
                key={feature}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-sm text-gray-700 ring-1 ring-accent-100"
              >
                <Check aria-hidden className="h-3.5 w-3.5 text-accent-500" />
                {feature}
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-col items-center justify-center gap-3 border-t border-gray-100 pt-6 text-sm text-gray-600 sm:flex-row sm:gap-8">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                  <Check aria-hidden className="h-3 w-3 text-emerald-600" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
