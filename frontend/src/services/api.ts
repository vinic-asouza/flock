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
  Church,
  MemberReports,
  ReportFilters
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true, // Permitir cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para tratamento de erros (cookies são enviados automaticamente)
    this.api.interceptors.request.use(
      (config) => {
        // Cookies são enviados automaticamente com withCredentials: true
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
        // Não redirecionar para login se for o endpoint de verificação de auth
        const url: string = error.config?.url || '';
        const isCheckAuthEndpoint = url.includes('/refresh/check');
        const isLoginEndpoint = url.includes('/auth/login');
        const isAlreadyOnLogin = typeof window !== 'undefined' && window.location.pathname === '/login';
        
        if (error.response?.status === 401 && !isCheckAuthEndpoint && !isLoginEndpoint && !isAlreadyOnLogin) {
          // Token expirado ou inválido - redirecionar para login
          // Cookies serão limpos automaticamente pelo servidor
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

  // Gerenciamento de autenticação via cookies (gerenciado pelo servidor)
  // Os tokens agora são armazenados em httpOnly cookies, não acessíveis via JavaScript

  // Métodos de autenticação
  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', data);
    // Tokens são armazenados automaticamente em cookies httpOnly pelo servidor
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
  async logout(): Promise<void> {
    try {
      // Chamar a rota de logout no backend para invalidar o token e limpar cookies
      await this.api.post('/auth/logout');
    } catch (error) {
      // Mesmo com erro, o servidor limpa os cookies automaticamente
      console.warn('Erro ao fazer logout no servidor:', error);
    }
  }

  // Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.api.get('/refresh/check');
      return response.data.authenticated;
    } catch (error) {
      return false;
    }
  }

  // Obter dados da igreja (agora via API)
  async getChurch(): Promise<Church | null> {
    try {
      const response = await this.api.get('/refresh/check');
      return response.data.church || null;
    } catch (error) {
      return null;
    }
  }

  // Renovar token de acesso
  async refreshToken(): Promise<boolean> {
    try {
      await this.api.post('/refresh/refresh');
      return true;
    } catch (error) {
      return false;
    }
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

  // Criar congregação
  async createCongregation(data: { name: string; address: string; city: string; state: string; leader?: string; phone?: string }) {
    const response = await this.api.post('/congregations', data);
    return response.data;
  }

  // Buscar congregação por ID
  async getCongregation(id: string) {
    const response = await this.api.get(`/congregations/${id}`);
    return response.data;
  }

  // Atualizar congregação
  async updateCongregation(id: string, data: { name?: string; address?: string; city?: string; state?: string; leader?: string; phone?: string }) {
    const response = await this.api.put(`/congregations/${id}`, data);
    return response.data;
  }

  // Excluir congregação
  async deleteCongregation(id: string) {
    const response = await this.api.delete(`/congregations/${id}`);
    return response.data;
  }

  // Criar congregações em lote
  async createCongregationsBatch(data: Array<{ name: string; address: string; city: string; state: string; leader?: string; phone?: string }>) {
    const response = await this.api.post('/congregations/batch', data);
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

  // Relatórios de membros
  async getMemberReports(filters?: ReportFilters): Promise<MemberReports> {
    const queryParams = new URLSearchParams();
    
    // Filtros básicos
    if (filters?.active !== undefined) queryParams.append('active', filters.active.toString());
    if (filters?.role_id) queryParams.append('role_id', filters.role_id);
    if (filters?.congregation_id) queryParams.append('congregation_id', filters.congregation_id);
    
    // Filtros demográficos
    if (filters?.gender) queryParams.append('gender', filters.gender);
    if (filters?.marital_status) queryParams.append('marital_status', filters.marital_status);
    if (filters?.nationality) queryParams.append('nationality', filters.nationality);
    if (filters?.occupation) queryParams.append('occupation', filters.occupation);
    if (filters?.city) queryParams.append('city', filters.city);
    if (filters?.state) queryParams.append('state', filters.state);
    
    // Filtros temporais
    if (filters?.birth_date_from) queryParams.append('birth_date_from', filters.birth_date_from);
    if (filters?.birth_date_to) queryParams.append('birth_date_to', filters.birth_date_to);
    if (filters?.baptism_date_from) queryParams.append('baptism_date_from', filters.baptism_date_from);
    if (filters?.baptism_date_to) queryParams.append('baptism_date_to', filters.baptism_date_to);
    if (filters?.admission_date_from) queryParams.append('admission_date_from', filters.admission_date_from);
    if (filters?.admission_date_to) queryParams.append('admission_date_to', filters.admission_date_to);
    if (filters?.age_from !== undefined) queryParams.append('age_from', filters.age_from.toString());
    if (filters?.age_to !== undefined) queryParams.append('age_to', filters.age_to.toString());
    
    // Busca geral
    if (filters?.search) queryParams.append('search', filters.search);

    const url = `/members/reports?${queryParams.toString()}`;
    const response = await this.api.get(url);
    return response.data;
  }

  // Gerenciamento da Igreja
  async getChurchData(): Promise<Church> {
    const response = await this.api.get('/church');
    return response.data.church;
  }

  async updateChurch(data: Partial<Church>): Promise<Church> {
    const response = await this.api.put('/church', data);
    return response.data.church;
  }

  // Gerenciamento de Conta
  async getAccountData(): Promise<any> {
    const response = await this.api.get('/account');
    return response.data.user;
  }

  async changeEmail(data: { newEmail: string; password: string }): Promise<any> {
    const response = await this.api.put('/account/email', data);
    return response.data;
  }

  async changeAccountPassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    const response = await this.api.put('/account/password', data);
    return response.data;
  }

  async changePhone(data: { newPhone: string; password: string }): Promise<any> {
    const response = await this.api.put('/account/phone', data);
    return response.data;
  }

  async deleteAccount(data: { password: string; confirmation: string }): Promise<any> {
    const response = await this.api.delete('/account', { data });
    return response.data;
  }

  async resendConfirmation(email: string): Promise<any> {
    const response = await this.api.post('/account/resend-confirmation', { email });
    return response.data;
  }
}

// Instância singleton
export const apiService = new ApiService();
export default apiService;
