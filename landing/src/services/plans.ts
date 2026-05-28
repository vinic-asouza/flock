const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ApiPlan {
  id: string;
  name: string;
  priceFormatted: string;
  members: number;
  description?: string;
}

export async function fetchPlans(): Promise<ApiPlan[]> {
  const response = await fetch(`${API_URL}/plans`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error('Erro ao carregar planos');
  }

  const data = await response.json();
  return data.plans as ApiPlan[];
}
