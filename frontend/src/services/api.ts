import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginData, 
  RegisterData, 
  ForgotPasswordData, 
  ChangePasswordData, 
  ResetPasswordData,
  LoginResponse,
  RegisterResponse,
  ApiResponse,
  ApiError,
  Church
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token de autenticação
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratamento de erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          this.removeToken();
          window.location.href = '/login';
        }
        
        // Capturar erros específicos da API
        if (error.response?.data) {
          const responseData = error.response.data;
          let errorMessage = 'Erro desconhecido';
          let errorDetails: string | string[] | undefined;
          
          // Verificar diferentes formatos de erro
          if (typeof responseData === 'object') {
            if ('error' in responseData) {
              errorMessage = responseData.error;
            } else if ('message' in responseData) {
              errorMessage = responseData.message;
            }
            
            if ('details' in responseData) {
              errorDetails = responseData.details;
            }
          } else if (typeof responseData === 'string') {
            errorMessage = responseData;
          }
          
          // Criar um erro mais informativo
          const enhancedError = new Error(errorMessage);
          (enhancedError as any).details = errorDetails;
          (enhancedError as any).status = error.response.status;
          (enhancedError as any).originalError = error.response.data;
          
          return Promise.reject(enhancedError);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Gerenciamento de token
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('flock_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flock_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flock_token');
      localStorage.removeItem('flock_church');
    }
  }

  // Métodos de autenticação
  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', data);
    this.setToken(response.data.session.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('flock_church', JSON.stringify(response.data.church));
    }
    return response.data;
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response: AxiosResponse<RegisterResponse> = await this.api.post('/auth/register', data);
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/password/forgot', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/password/change', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordData): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/password/reset', data);
    return response.data;
  }

  // Logout
  logout(): void {
    this.removeToken();
  }

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Obter dados da igreja
  getChurch(): Church | null {
    if (typeof window !== 'undefined') {
      const church = localStorage.getItem('flock_church');
      return church ? JSON.parse(church) : null;
    }
    return null;
  }
}

// Instância singleton
export const apiService = new ApiService();
export default apiService;
