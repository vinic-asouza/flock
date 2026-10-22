export const FOUNDER_OFFER_BANNER =
  'Oferta Igrejas Fundadoras · 3 meses grátis + 50% off no 1º ano · Vagas limitadas';

export const FOUNDER_PROMO_PRICES = {
  '200': 'R$ 14,99',
  '500': 'R$ 29,99',
  '800': 'R$ 44,99',
} as const;

export type FounderPaidPlanId = keyof typeof FOUNDER_PROMO_PRICES;

export function founderPromoPrice(planId: string): string | null {
  if (planId in FOUNDER_PROMO_PRICES) {
    return FOUNDER_PROMO_PRICES[planId as FounderPaidPlanId];
  }
  return null;
}

export function founderPromoLine(promoPrice: string): string {
  return `3 meses grátis, depois ${promoPrice}/mês por 12 meses`;
}
