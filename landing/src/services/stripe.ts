import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface CreateCheckoutSessionRequest {
  plan: '200' | '500' | '800' | 'custom';
  email?: string;
  name?: string;
  church_id?: string;
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  url: string;
}

class StripeService {
  /**
   * Criar sessão de checkout
   */
  async createCheckoutSession(
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await axios.post<CreateCheckoutSessionResponse>(
        `${API_URL}/stripe/create-checkout-session`,
        data
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || 'Erro ao criar sessão de checkout'
        );
      }
      throw new Error('Erro ao conectar com o servidor');
    }
  }

  /**
   * Criar sessão do portal do cliente (para gerenciar assinatura)
   */
  async createPortalSession(): Promise<{ url: string }> {
    try {
      const response = await axios.post<{ url: string }>(
        `${API_URL}/stripe/create-portal-session`,
        {},
        {
          withCredentials: true, // Incluir cookies de autenticação
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || 'Erro ao criar sessão do portal'
        );
      }
      throw new Error('Erro ao conectar com o servidor');
    }
  }
}

export const stripeService = new StripeService();

