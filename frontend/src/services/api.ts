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
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    this.api = axios.create({
      baseURL,
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
      localStorage.removeItem('flock_session');
    }
  }

  // Métodos de autenticação
  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', data);
    this.setToken(response.data.session.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('flock_church', JSON.stringify(response.data.church));
      localStorage.setItem('flock_session', JSON.stringify(response.data.session));
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

  // Listar membros paginados
  async listMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
    role_id?: string;
    congregation_id?: string;
    gender?: string;
    marital_status?: string;
    nationality?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    age_from?: string | number;
    age_to?: string | number;
    occupation?: string;
    birth_date_from?: string;
    birth_date_to?: string;
    baptism_date_from?: string;
    baptism_date_to?: string;
    admission_date_from?: string;
    admission_date_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    
    // Paginação
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    // Busca
    if (params.search) queryParams.append('search', params.search);
    
    // Filtros básicos
    if (params.active !== undefined) queryParams.append('active', params.active.toString());
    if (params.role_id) queryParams.append('role_id', params.role_id);
    if (params.congregation_id) queryParams.append('congregation_id', params.congregation_id);
    
    // Filtros demográficos
    if (params.gender) queryParams.append('gender', params.gender);
    if (params.marital_status) queryParams.append('marital_status', params.marital_status);
    if (params.nationality) queryParams.append('nationality', params.nationality);
    if (params.occupation) queryParams.append('occupation', params.occupation);
    if (params.city) queryParams.append('city', params.city);
    if (params.state) queryParams.append('state', params.state);
    if (params.neighborhood) queryParams.append('neighborhood', params.neighborhood);
    
    // Filtros de idade
    if (params.age_from !== undefined) queryParams.append('age_from', params.age_from.toString());
    if (params.age_to !== undefined) queryParams.append('age_to', params.age_to.toString());
    
    // Filtros de data de nascimento
    if (params.birth_date_from) queryParams.append('birth_date_from', params.birth_date_from);
    if (params.birth_date_to) queryParams.append('birth_date_to', params.birth_date_to);
    
    // Filtros de data de batismo
    if (params.baptism_date_from) queryParams.append('baptism_date_from', params.baptism_date_from);
    if (params.baptism_date_to) queryParams.append('baptism_date_to', params.baptism_date_to);
    
    // Filtros de data de admissão
    if (params.admission_date_from) queryParams.append('admission_date_from', params.admission_date_from);
    if (params.admission_date_to) queryParams.append('admission_date_to', params.admission_date_to);
    
    // Ordenação
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/members?${queryParams.toString()}`;
    const response = await this.api.get(url);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  }

  // Listar cargos
  async listRoles() {
    const response = await this.api.get('/roles');
    return response.data;
  }

  // Criar cargo
  async createRole(data: { name: string; description?: string }) {
    const response = await this.api.post('/roles', data);
    return response.data;
  }

  // Buscar cargo por ID
  async getRole(id: string) {
    const response = await this.api.get(`/roles/${id}`);
    return response.data;
  }

  // Atualizar cargo
  async updateRole(id: string, data: { name?: string; description?: string }) {
    const response = await this.api.put(`/roles/${id}`, data);
    return response.data;
  }

  // Excluir cargo
  async deleteRole(id: string) {
    const response = await this.api.delete(`/roles/${id}`);
    return response.data;
  }

  // Criar cargos em lote
  async createRolesBatch(data: Array<{ name: string; description?: string }>) {
    const response = await this.api.post('/roles/batch', data);
    return response.data;
  }

  // Listar congregações
  async listCongregations() {
    const response = await this.api.get('/congregations');
    return response.data;
  }

  // Criar membro
  async createMember(data: any) {
    const response = await this.api.post('/members', data);
    return response.data;
  }

  // Atualizar membro
  async updateMember(id: string, data: any) {
    const response = await this.api.put(`/members/${id}`, data);
    return response.data;
  }

  // Buscar membro por ID
  async getMember(id: string) {
    const response = await this.api.get(`/members/${id}`);
    return response.data;
  }

  // Excluir membro
  async deleteMember(id: string) {
    const response = await this.api.delete(`/members/${id}`);
    return response.data;
  }
}

// Instância singleton
export const apiService = new ApiService();
export default apiService;
