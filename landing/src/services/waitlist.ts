import axios from 'axios';
import { formatWaitlistError } from '@/utils/formatWaitlistError';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class WaitlistService {
  async subscribe(data: WaitlistData): Promise<void> {
    try {
      await axios.post(`${API_URL}/waitlist`, {
        ...data,
        email: data.email.trim().toLowerCase(),
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      throw new Error(formatWaitlistError(error));
    }
  }
}

export const waitlistService = new WaitlistService();
