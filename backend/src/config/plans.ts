/**
 * Configuração centralizada dos planos
 * Fonte única de verdade para preços e informações dos planos
 */

export interface PlanConfig {
  name: string;
  price: number;
  priceFormatted: string;
  members: number;
  description?: string;
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  '100': {
    name: 'Plano 100 Membros',
    price: 0,
    priceFormatted: 'Gratuito',
    members: 100,
    description: 'Ideal para começar',
  },
  '200': {
    name: 'Plano 200 Membros',
    price: 29.99,
    priceFormatted: 'R$ 29,99',
    members: 200,
    description: 'Para igrejas pequenas',
  },
  '500': {
    name: 'Plano 500 Membros',
    price: 59.99,
    priceFormatted: 'R$ 59,99',
    members: 500,
    description: 'Para igrejas médias',
  },
  '800': {
    name: 'Plano 800 Membros',
    price: 89.99,
    priceFormatted: 'R$ 89,99',
    members: 800,
    description: 'Para igrejas grandes',
  },
};

/**
 * Obter configuração de um plano
 */
export function getPlanConfig(planType: string | null | undefined): PlanConfig | null {
  if (!planType) return null;
  return PLAN_CONFIG[planType] || null;
}

/**
 * Obter nome formatado do plano
 */
export function getPlanName(planType: string | null | undefined): string {
  const config = getPlanConfig(planType);
  return config?.name || planType || 'Plano não definido';
}

/**
 * Obter preço formatado do plano
 */
export function getPlanPrice(planType: string | null | undefined): string {
  const config = getPlanConfig(planType);
  return config?.priceFormatted || 'N/A';
}

/**
 * Obter limite de membros do plano
 */
export function getPlanMemberLimit(planType: string | null | undefined): number {
  const config = getPlanConfig(planType);
  return config?.members || 0;
}

/**
 * Listar todos os planos disponíveis
 */
export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIG);
}

/**
 * Listar planos pagos (excluindo gratuito)
 */
export function getPaidPlans(): PlanConfig[] {
  return Object.entries(PLAN_CONFIG)
    .filter(([key]) => key !== '100')
    .map(([_, config]) => config);
}

