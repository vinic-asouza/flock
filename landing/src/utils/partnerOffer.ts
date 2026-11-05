export const PARTNER_OFFER_SUMMARY =
  '3 meses grátis para testar. Depois, 50% de desconto nos 12 meses seguintes.';

export const PARTNER_PROMO_PRICES = {
  '200': 'R$ 14,99',
  '500': 'R$ 29,99',
  '800': 'R$ 44,99',
} as const;

export type PartnerPaidPlanId = keyof typeof PARTNER_PROMO_PRICES;

export function partnerPromoPrice(planId: string): string | null {
  if (planId in PARTNER_PROMO_PRICES) {
    return PARTNER_PROMO_PRICES[planId as PartnerPaidPlanId];
  }
  return null;
}

export function partnerPromoLine(promoPrice: string): string {
  return `3 meses grátis, depois ${promoPrice}/mês por 12 meses`;
}
