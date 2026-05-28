import axios from 'axios';

export function formatWaitlistError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: string | string[] } | undefined;

    if (Array.isArray(data?.details) && data.details.length > 0) {
      return data.details.join('; ');
    }

    if (typeof data?.details === 'string' && data.details.trim()) {
      return data.details;
    }

    if (data?.error) {
      return data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Erro ao enviar solicitação. Tente novamente.';
}
