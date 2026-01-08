import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface WaitlistData {
  name: string;
  email: string;
  phone: string;
  churchName: string;
  city: string;
  state: string;
  plan: '200' | '500' | '800' | 'personalizado';
  message?: string;
}

class WaitlistService {
  async subscribe(data: WaitlistData): Promise<void> {
    try {
      await axios.post(`${API_URL}/waitlist`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.error ||
          error.response?.data?.details ||
          'Erro ao cadastrar na lista de espera';
        throw new Error(message);
      }
      throw error;
    }
  }
}

export const waitlistService = new WaitlistService();

