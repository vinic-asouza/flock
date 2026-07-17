import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getFilenameFromContentDisposition } from '@/utils';
import {
  LoginData,
  RegisterData,
  ForgotPasswordData,
  ChangePasswordData,
  ResetPasswordData,
  LoginResponse,
  RegisterResponse,
  ApiResponse,
  Church,
  MemberReports,
  ReportFilters,
  IntegrationMember,
  IntegrationMemberPayload,
  IntegrationFilters,
  ValidationResult,
  ImportResult,
  Group,
  GroupPayload,
  GroupWithMembers,
  ChurchUserListItem,
  ChurchUserRole
} from '@/types';
import {
  CalendarItem,
  CreateCalendarItemData,
  UpdateCalendarItemData,
  CalendarFilters,
  CalendarListResponse,
  CalendarParticipant,
  CreateParticipantData
} from '@/types/calendar';

const ACTIVE_CHURCH_STORAGE_KEY = 'flock_active_church_id';

class ApiService {
  private api: AxiosInstance;

  setActiveChurchIdClient(churchId: string | null): void {
    if (typeof window === 'undefined') return;
    if (churchId) {
      localStorage.setItem(ACTIVE_CHURCH_STORAGE_KEY, churchId);
    } else {
      localStorage.removeItem(ACTIVE_CHURCH_STORAGE_KEY);
    }
  }

  getActiveChurchIdClient(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_CHURCH_STORAGE_KEY);
  }

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
        const churchId = this.getActiveChurchIdClient();
        if (churchId) {
          config.headers = config.headers || {};
          config.headers['X-Church-Id'] = churchId;
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
      async (error) => {
        // Não redirecionar para login se for o endpoint de verificação de auth
        const url: string = error.config?.url || '';
        const isCheckAuthEndpoint = url.includes('/refresh/check');
        const isLoginEndpoint = url.includes('/auth/login');
        const isRegisterEndpoint = url.includes('/auth/register');
        const isPublicEndpoint = url.includes('/public/'); // Rotas públicas não requerem autenticação
        const isAlreadyOnLogin = typeof window !== 'undefined' && window.location.pathname === '/login';
        const isAlreadyOnRegister = typeof window !== 'undefined' && window.location.pathname === '/register';
        const isOnPublicPage = typeof window !== 'undefined' && (
          window.location.pathname.startsWith('/public/register/') ||
          window.location.pathname.startsWith('/public/integration/')
        );

        // Silenciar erros 401 durante verificação de autenticação (é esperado)
        if (error.response?.status === 401 && isCheckAuthEndpoint) {
          // Retornar erro silencioso - não logar
          return Promise.reject(new Error('Não autenticado'));
        }

        // Não redirecionar para login se for rota pública ou já estiver em página pública
        if (error.response?.status === 401 && !isCheckAuthEndpoint && !isLoginEndpoint && !isRegisterEndpoint && !isPublicEndpoint && !isAlreadyOnLogin && !isAlreadyOnRegister && !isOnPublicPage) {
          // Token expirado ou inválido - redirecionar para login
          // Cookies serão limpos automaticamente pelo servidor
          window.location.href = '/login';
        }

        // Capturar erros específicos da API
        if (error.response?.data) {
          let responseData = error.response.data;
          let errorMessage = 'Erro desconhecido';
          let errorDetails: string | string[] | undefined;

          // Quando responseType é 'blob' (ex.: exportação PDF), erros HTTP chegam como Blob.
          // Precisamos ler o Blob como texto para extrair o JSON de erro do backend.
          if (responseData instanceof Blob && responseData.type === 'application/json') {
            try {
              const text = await responseData.text();
              responseData = JSON.parse(text);
            } catch {
              // Blob não é JSON válido — manter mensagem genérica
            }
          }

          // Verificar diferentes formatos de erro
          if (typeof responseData === 'object' && !(responseData instanceof Blob)) {
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
          const enhancedError = new Error(errorMessage) as Error & {
            details?: string | string[];
            status?: number;
            originalError?: unknown;
          };
          enhancedError.details = errorDetails;
          enhancedError.status = error.response.status;
          enhancedError.originalError = error.response.data;

          return Promise.reject(enhancedError);
        }

        return Promise.reject(error);
      }
    );
  }

  // Gerenciamento de autenticação via cookies (gerenciado pelo servidor)
  // Os tokens agora são armazenados em httpOnly cookies, não acessíveis via JavaScript

  // ========== Planos e Stripe ==========

  // ACHADO 04: métodos centralizados para uso no checkout — garante interceptor de 401
  async getPlans(): Promise<{ plans: { id: string; name: string; priceFormatted: string; description?: string; members: number }[] }> {
    const response = await this.api.get('/plans');
    return response.data;
  }

  async activateFreePlan(): Promise<{ message: string; plan_type: string }> {
    const response = await this.api.post('/stripe/activate-free-plan', {});
    return response.data;
  }

  async createCheckoutSession(plan: string): Promise<{ url: string }> {
    const response = await this.api.post('/stripe/create-checkout-session', { plan });
    return response.data;
  }

  async getCheckoutStatus(sessionId: string): Promise<{
    confirmed: boolean;
    message?: string;
    payment_status?: string;
    error?: string;
  }> {
    const response = await this.api.get(`/stripe/checkout-status?session_id=${sessionId}`);
    return response.data;
  }

  async syncSubscription(): Promise<{ synced: boolean; message?: string }> {
    const response = await this.api.post('/stripe/sync-subscription', {});
    return response.data;
  }

  async createPortalSession(): Promise<{ url: string }> {
    const response = await this.api.post('/stripe/create-portal-session', {});
    return response.data;
  }

  async changePlan(plan: string): Promise<{ message?: string; [key: string]: unknown }> {
    const response = await this.api.post('/stripe/change-plan', { plan });
    return response.data;
  }

  async getSubscriptionEvents(params?: { limit?: number; offset?: number }): Promise<{
    events: Array<{
      id: string;
      event_type: string;
      old_plan: string | null;
      new_plan: string | null;
      old_status: string | null;
      new_status: string | null;
      source: string | null;
      stripe_event_id: string | null;
      created_at: string;
    }>;
    pagination: { limit: number; offset: number; total: number; has_more: boolean };
  }> {
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    const response = await this.api.get(`/stripe/subscription-events?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  // Métodos de autenticação
  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', data);
    // Tokens são armazenados automaticamente em cookies httpOnly pelo servidor
    return response.data;
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response: AxiosResponse<RegisterResponse> = await this.api.post('/auth/register', data, {
      timeout: 30000, // 30 segundos para registro (pode demorar mais que outras requisições)
    });
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
      await this.api.post('/auth/logout');
    } catch (error) {
      // ACHADO 09: logar falha de comunicação — sem resposta do servidor, o token pode
      // permanecer ativo até expirar naturalmente. O estado local será limpo pelo
      // AuthContext mesmo assim, mas o usuário deve ser informado se necessário.
      console.warn('[Logout] Falha ao comunicar logout ao servidor. Token pode ainda estar ativo no Supabase.', error);
    }
  }

  // Verificar autenticação e obter church + role em uma chamada
  async getCheckAuth(): Promise<import('@/types').CheckAuthResponse> {
    try {
      const response = await this.api.get('/refresh/check');
      const data = response.data;
      if (data.activeChurchId) {
        this.setActiveChurchIdClient(data.activeChurchId);
      }
      return {
        authenticated: !!data.authenticated,
        church: data.church || undefined,
        role: data.role ?? undefined,
        memberships: data.memberships,
        activeChurchId: data.activeChurchId ?? null,
        code: data.code,
        message: data.message,
        user: data.user,
      };
    } catch {
      return { authenticated: false, church: undefined };
    }
  }

  async listChurchMemberships(): Promise<{
    memberships: import('@/types').ChurchMembership[];
    activeChurchId: string | null;
  }> {
    const response = await this.api.get('/church/memberships');
    if (response.data.activeChurchId) {
      this.setActiveChurchIdClient(response.data.activeChurchId);
    }
    return response.data;
  }

  async setActiveChurch(churchId: string): Promise<{
    church: Church;
    role: string;
    activeChurchId: string;
  }> {
    const response = await this.api.post('/church/active', { churchId });
    this.setActiveChurchIdClient(churchId);
    return response.data;
  }

  // Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    const { authenticated } = await this.getCheckAuth();
    return authenticated;
  }

  // Obter dados da igreja (agora via API)
  async getChurch(): Promise<Church | null> {
    const { church } = await this.getCheckAuth();
    return church ?? null;
  }

  // Renovar token de acesso
  async refreshToken(): Promise<boolean> {
    try {
      await this.api.post('/refresh/refresh');
      return true;
    } catch {
      return false;
    }
  }

  // Listar membros paginados
  async listMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
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

    // Filtros de data de recebimento
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

  // Buscar contagem de aniversariantes do mês
  async getBirthdaysCount(params?: { month?: number; year?: number; congregation_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.congregation_id) queryParams.append('congregation_id', params.congregation_id);

    const url = `/members/birthdays/count${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url);
    return response.data;
  }

  // Buscar lista de aniversariantes do mês
  async getBirthdaysList(params?: { month?: number; year?: number; congregation_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.congregation_id) queryParams.append('congregation_id', params.congregation_id);

    const url = `/members/birthdays/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url);
    return response.data;
  }

  // Gerenciar integrantes
  async listIntegrationMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    expected_congregation_id?: string;
    mentor_id?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status && params.status !== 'todos') queryParams.append('status', params.status);
    if (params.expected_congregation_id) queryParams.append('expected_congregation_id', params.expected_congregation_id);
    if (params.mentor_id) queryParams.append('mentor_id', params.mentor_id);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/integration?${queryParams.toString()}`;
    const response = await this.api.get(url);
    return {
      data: response.data.data as IntegrationMember[],
      pagination: response.data.pagination,
    };
  }

  async getIntegrationMember(id: string): Promise<IntegrationMember> {
    const response = await this.api.get(`/integration/${id}`);
    return response.data as IntegrationMember;
  }

  async createIntegrationMember(data: IntegrationMemberPayload): Promise<IntegrationMember> {
    const response = await this.api.post('/integration', data);
    return response.data as IntegrationMember;
  }

  async updateIntegrationMember(id: string, data: IntegrationMemberPayload): Promise<IntegrationMember> {
    const response = await this.api.put(`/integration/${id}`, data);
    return response.data as IntegrationMember;
  }

  async deleteIntegrationMember(id: string): Promise<{ message: string }> {
    const response = await this.api.delete(`/integration/${id}`);
    return response.data;
  }

  async convertIntegrationMember(id: string, data: { name: string;[key: string]: unknown }): Promise<{
    member: { id: string;[key: string]: unknown };
    integrationMember: IntegrationMember;
  }> {
    const response = await this.api.post(`/integration/${id}/convert`, data);
    return response.data;
  }

  async exportIntegrationMemberPDF(id: string): Promise<Blob> {
    const response = await this.api.get(`/export/integration/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async exportIntegrationList(filters: IntegrationFilters, selectedFields: string[]): Promise<Blob> {
    const response = await this.api.post(
      '/export/integration/list',
      {
        filters,
        fields: selectedFields
      },
      {
        responseType: 'blob'
      }
    );
    return response.data;
  }

  // Listar congregações
  async listCongregations(params?: { search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.search?.trim()) {
      queryParams.append('search', params.search.trim());
    }
    const url = `/congregations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url);
    return response.data;
  }

  // Criar congregação
  async createCongregation(data: { name: string; abbreviation?: string; address: string; city: string; state: string; leader?: string; phone?: string }) {
    const response = await this.api.post('/congregations', data);
    return response.data;
  }

  // Buscar congregação por ID
  async getCongregation(id: string) {
    const response = await this.api.get(`/congregations/${id}`);
    return response.data;
  }

  // Atualizar congregação
  async updateCongregation(id: string, data: { name?: string; abbreviation?: string | null; address?: string; city?: string; state?: string; leader?: string; phone?: string }) {
    const response = await this.api.put(`/congregations/${id}`, data);
    return response.data;
  }

  // Excluir congregação
  async deleteCongregation(id: string) {
    const response = await this.api.delete(`/congregations/${id}`);
    return response.data;
  }

  // Criar congregações em lote
  async createCongregationsBatch(data: Array<{ name: string; abbreviation?: string; address: string; city: string; state: string; leader?: string; phone?: string }>) {
    const response = await this.api.post('/congregations/batch', data);
    return response.data;
  }

  // Listar grupos
  async listGroups(params?: {
    congregation_id?: string;
    type?: string;
    status?: 'active' | 'inactive' | 'all';
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<Group[]> {
    const queryParams = new URLSearchParams();
    if (params?.congregation_id) {
      queryParams.append('congregation_id', params.congregation_id);
    }
    if (params?.type) {
      queryParams.append('type', params.type);
    }
    if (params?.status && params.status !== 'all') {
      queryParams.append('status', params.status);
    }
    if (params?.search?.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params?.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params?.sort_order) {
      queryParams.append('sort_order', params.sort_order);
    }
    const url = `/groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url);
    return response.data as Group[];
  }

  // Buscar grupo por ID
  async getGroup(id: string): Promise<GroupWithMembers> {
    const response = await this.api.get(`/groups/${id}`);
    return response.data as GroupWithMembers;
  }

  // Criar grupo
  async createGroup(data: GroupPayload): Promise<Group> {
    const response = await this.api.post('/groups', data);
    return response.data as Group;
  }

  // Atualizar grupo
  async updateGroup(id: string, data: Partial<GroupPayload>): Promise<Group> {
    const response = await this.api.put(`/groups/${id}`, data);
    return response.data as Group;
  }

  // Deletar grupo
  async deleteGroup(id: string): Promise<{ message?: string }> {
    const response = await this.api.delete(`/groups/${id}`);
    return response.data;
  }

  // Listar membros de um grupo
  async getGroupMembers(groupId: string) {
    const response = await this.api.get(`/groups/${groupId}/members`);
    return response.data;
  }

  // Adicionar membro ao grupo
  async addMemberToGroup(groupId: string, memberId: string) {
    const response = await this.api.post(`/groups/${groupId}/members`, { member_id: memberId });
    return response.data;
  }

  // Remover membro do grupo
  async removeMemberFromGroup(groupId: string, memberId: string) {
    const response = await this.api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  }

  // ========== Calendário ==========

  // Listar itens do calendário
  async listCalendarItems(filters?: CalendarFilters): Promise<CalendarListResponse> {
    const queryParams = new URLSearchParams();

    if (filters?.type && filters.type.length > 0) {
      filters.type.forEach(type => queryParams.append('type', type));
    }
    if (filters?.congregation_id) {
      queryParams.append('congregation_id', filters.congregation_id);
    }
    if (filters?.group_id) {
      queryParams.append('group_id', filters.group_id);
    }
    if (filters?.start_date) {
      queryParams.append('start_date', filters.start_date);
    }
    if (filters?.end_date) {
      queryParams.append('end_date', filters.end_date);
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const url = `/calendar${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url);
    return response.data as CalendarListResponse;
  }

  // Buscar grupos que têm itens de calendário vinculados
  async listGroupsWithCalendarItems(): Promise<Group[]> {
    const response = await this.api.get('/calendar/groups');
    return response.data as Group[];
  }

  // Buscar item do calendário por ID
  async getCalendarItem(id: string): Promise<CalendarItem> {
    const response = await this.api.get(`/calendar/${id}`);
    return response.data as CalendarItem;
  }

  // Criar item do calendário
  async createCalendarItem(data: CreateCalendarItemData): Promise<CalendarItem> {
    const response = await this.api.post('/calendar', data);
    return response.data as CalendarItem;
  }

  // Atualizar item do calendário
  async updateCalendarItem(id: string, data: UpdateCalendarItemData): Promise<CalendarItem> {
    const response = await this.api.put(`/calendar/${id}`, data);
    return response.data as CalendarItem;
  }

  // Deletar item do calendário
  async deleteCalendarItem(id: string): Promise<void> {
    await this.api.delete(`/calendar/${id}`);
  }

  // Exportar calendário em PDF
  async exportCalendarPDF(params?: {
    month?: number;
    year?: number;
    congregation_id?: string;
    group_id?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.congregation_id) queryParams.append('congregation_id', params.congregation_id);
    if (params?.group_id) queryParams.append('group_id', params.group_id);

    const url = `/calendar/export/pdf${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get(url, {
      responseType: 'blob'
    });
    return response.data;
  }

  // ========== Participantes de Calendário ==========

  // Listar participantes de um item do calendário
  async listCalendarParticipants(calendarItemId: string): Promise<CalendarParticipant[]> {
    const response = await this.api.get(`/calendar-items/${calendarItemId}/participants`);
    return response.data as CalendarParticipant[];
  }

  // Adicionar participante a um item do calendário
  async addCalendarParticipant(calendarItemId: string, data: CreateParticipantData): Promise<CalendarParticipant> {
    const response = await this.api.post(`/calendar-items/${calendarItemId}/participants`, data);
    return response.data as CalendarParticipant;
  }

  // Adicionar múltiplos participantes de uma vez (bulk)
  async addCalendarParticipantsBulk(calendarItemId: string, participants: CreateParticipantData[]): Promise<{
    message: string;
    summary: {
      total: number;
      added: number;
      duplicates: number;
      errors: number;
    };
    results: {
      success: CalendarParticipant[];
      duplicates: { member_id?: string; guest_name?: string; details?: string }[];
      errors: { member_id?: string; guest_name?: string; details?: string }[];
    };
  }> {
    const response = await this.api.post(`/calendar-items/${calendarItemId}/participants/bulk`, { participants });
    return response.data;
  }

  // Remover participante de um item do calendário
  async removeCalendarParticipant(calendarItemId: string, participantId: string): Promise<void> {
    await this.api.delete(`/calendar-items/${calendarItemId}/participants/${participantId}`);
  }

  // Criar membro
  async createMember(data: { name: string;[key: string]: unknown }) {
    const response = await this.api.post('/members', data);
    return response.data;
  }

  // Atualizar membro
  async updateMember(id: string, data: { name: string;[key: string]: unknown }) {
    const response = await this.api.put(`/members/${id}`, data);
    return response.data;
  }

  // ACHADO 05: endpoint atômico para alterar apenas status active — evita GET+PUT race condition
  async setMemberStatus(id: string, active: boolean): Promise<{ message: string; member: { id: string; name: string; active: boolean } }> {
    const response = await this.api.patch(`/members/${id}/status`, { active });
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

  async getMemberLimit(): Promise<{
    currentCount: number;
    limit: number;
    remaining: number;
    planType?: string | null;
    subscriptionStatus?: string | null;
    hasActiveSubscription: boolean;
    isPastDue?: boolean;
    canAdd: boolean;
    message?: string;
    percentage: number;
  }> {
    const response = await this.api.get('/church/member-limit');
    return response.data;
  }

  // Gerenciamento de Conta
  async getAccountData(): Promise<{ id: string; email: string; phone?: string;[key: string]: unknown }> {
    const response = await this.api.get('/account');
    return response.data.user;
  }

  async changeEmail(data: { newEmail: string; password: string }): Promise<{ message: string;[key: string]: unknown }> {
    const response = await this.api.put('/account/email', data);
    return response.data;
  }

  async changeAccountPassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string;[key: string]: unknown }> {
    const response = await this.api.put('/account/password', data);
    return response.data;
  }

  async changePhone(data: { newPhone: string; password: string }): Promise<{ message: string;[key: string]: unknown }> {
    const response = await this.api.put('/account/phone', data);
    return response.data;
  }

  async deleteAccount(data: { password: string; confirmation: string }): Promise<{ message: string;[key: string]: unknown }> {
    const response = await this.api.delete('/account', { data });
    return response.data;
  }

  async resendConfirmation(email: string): Promise<{ message: string;[key: string]: unknown }> {
    const response = await this.api.post('/account/resend-confirmation', { email });
    return response.data;
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entity?: string;
    action?: string;
    member_status_change?: 'activate' | 'deactivate';
  }): Promise<{ data: { id: string;[key: string]: unknown }[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.entity) queryParams.append('entity', params.entity);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.member_status_change) {
      queryParams.append('member_status_change', params.member_status_change);
    }

    const response = await this.api.get(`/account/logs?${queryParams.toString()}`);
    return response.data;
  }

  // Usuários da igreja (admin/owner)
  async listChurchUsers(): Promise<{ data: ChurchUserListItem[] }> {
    const response = await this.api.get('/church-users');
    return response.data;
  }

  async createChurchUser(data: {
    email: string;
    role: ChurchUserRole;
    accessAllCongregations?: boolean;
    congregationIds?: string[];
  }): Promise<{ message: string; data: ChurchUserListItem }> {
    const response = await this.api.post('/church-users', data);
    return response.data;
  }

  async updateChurchUser(
    id: string,
    data: {
      role?: ChurchUserRole;
      status?: string;
      accessAllCongregations?: boolean;
      congregationIds?: string[];
    }
  ): Promise<{ message: string; data: ChurchUserListItem }> {
    const response = await this.api.patch(`/church-users/${id}`, data);
    return response.data;
  }

  async deleteChurchUser(id: string): Promise<{ message: string }> {
    const response = await this.api.delete(`/church-users/${id}`);
    return response.data;
  }

  // Exportação de dados
  async exportMemberPDF(memberId: string): Promise<Blob> {
    const response = await this.api.get(`/export/member/${memberId}/pdf`, {
      responseType: 'blob', // Importante para receber o arquivo como blob
    });
    return response.data;
  }

  async exportMemberRegistrationFormPDF(): Promise<{ blob: Blob; filename: string }> {
    const response = await this.api.get('/export/members/registration-form/pdf', {
      responseType: 'blob',
    });
    const filename = getFilenameFromContentDisposition(
      response.headers['content-disposition'] as string | undefined
    ) ?? `ficha-cadastro-membro-${new Date().toISOString().split('T')[0]}.pdf`;

    return { blob: response.data, filename };
  }

  async exportDashboardPDF(congregationId?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (congregationId) {
      params.append('congregation_id', congregationId);
    }

    const response = await this.api.get(`/export/dashboard/pdf?${params.toString()}`, {
      responseType: 'blob', // Importante para receber o arquivo como blob
    });
    return response.data;
  }

  async exportMembersList(filters: Record<string, string | number | boolean | null | undefined>, selectedFields: string[]): Promise<Blob> {
    const response = await this.api.post('/export/members/list', {
      filters,
      fields: selectedFields
    }, {
      responseType: 'blob', // Importante para receber o arquivo como blob
    });
    return response.data;
  }

  async exportGroupsList(filters: {
    types: string[];
    search?: string;
    congregation_id?: string;
    status?: string;
  }): Promise<Blob> {
    const response = await this.api.post('/export/groups/list', {
      filters,
    }, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportCongregationsList(
    filters?: Record<string, string | number | boolean | null | undefined>
  ): Promise<Blob> {
    const response = await this.api.post('/export/congregations/list', {
      filters: filters || {},
    }, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportGroupMembersList(groupId: string, selectedFields: string[]): Promise<Blob> {
    const response = await this.api.post('/export/group/members/list', {
      groupId,
      fields: selectedFields
    }, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportMembersListCSV(
    filters: Record<string, string | number | boolean | null | undefined>,
    selectedFields: string[],
    delimiter: string = ',',
    includeHeaders: boolean = true
  ): Promise<Blob> {
    const response = await this.api.post('/export/members/list/csv', {
      filters,
      fields: selectedFields,
      delimiter,
      includeHeaders
    }, {
      responseType: 'blob', // Importante para receber o arquivo como blob
    });
    return response.data;
  }

  // Importação de membros via CSV
  async validateMemberImport(file: File, congregationId: string | null = null): Promise<ValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (congregationId) {
      formData.append('congregation_id', congregationId);
    } else {
      formData.append('congregation_id', 'null');
    }

    const response = await this.api.post('/members/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 segundos para validação (pode demorar com arquivos grandes)
    });
    return response.data;
  }

  async importMembers(file: File, congregationId: string | null = null, skipDuplicates: boolean = true): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (congregationId) {
      formData.append('congregation_id', congregationId);
    } else {
      formData.append('congregation_id', 'null');
    }
    formData.append('skipDuplicates', skipDuplicates.toString());

    const response = await this.api.post('/members/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 120 segundos para importação (pode demorar com arquivos grandes)
    });
    return response.data;
  }

  // ========== Links de Registro Público ==========

  // Validar link de registro público
  async validateRegistrationLink(token: string) {
    const response = await this.api.get(`/public/registration/${token}`);
    return response.data;
  }

  async listPublicRegistrationGroups(token: string, congregationId: string) {
    const response = await this.api.get(`/public/registration/${token}/groups`, {
      params: { congregation_id: congregationId },
    });
    return response.data;
  }

  // Criar membro via link público
  async createMemberViaPublicLink(token: string, data: { name: string;[key: string]: unknown }) {
    const response = await this.api.post(`/public/registration/${token}`, data);
    return response.data;
  }

  // ========== Gerenciamento de Links de Registro (Admin) ==========

  // Listar links de registro
  async listRegistrationLinks() {
    const response = await this.api.get('/registration-links');
    return response.data;
  }

  // Buscar link específico
  async getRegistrationLink(id: string) {
    const response = await this.api.get(`/registration-links/${id}`);
    return response.data;
  }

  // Criar novo link de registro
  async createRegistrationLink(data: {
    expires_at: string;
    max_uses?: number | null;
    default_congregation_id?: string | null;
    notes?: string | null;
  }) {
    const response = await this.api.post('/registration-links', data);
    return response.data;
  }

  // Atualizar link de registro
  async updateRegistrationLink(id: string, data: {
    expires_at?: string;
    max_uses?: number | null;
    is_active?: boolean;
    default_congregation_id?: string | null;
    notes?: string | null;
  }) {
    const response = await this.api.put(`/registration-links/${id}`, data);
    return response.data;
  }

  // Desativar link de registro
  async deactivateRegistrationLink(id: string) {
    const response = await this.api.patch(`/registration-links/${id}/deactivate`);
    return response.data;
  }

  // Excluir permanentemente link de registro
  async deleteRegistrationLink(id: string) {
    const response = await this.api.delete(`/registration-links/${id}`);
    return response.data;
  }

  // ========== Links de Integração Pública ==========

  // Validar link de integração pública
  async validateIntegrationLink(token: string) {
    const response = await this.api.get(`/public/integration/${token}`);
    return response.data;
  }

  // Criar integrante via link público
  async createIntegrationMemberViaPublicLink(token: string, data: { name: string;[key: string]: unknown }) {
    const response = await this.api.post(`/public/integration/${token}`, data);
    return response.data;
  }

  // ========== Gerenciamento de Links de Integração (Admin) ==========

  // Listar links de integração
  async listIntegrationLinks() {
    const response = await this.api.get('/integration-links');
    return response.data;
  }

  // Buscar link específico
  async getIntegrationLink(id: string) {
    const response = await this.api.get(`/integration-links/${id}`);
    return response.data;
  }

  // Criar novo link de integração
  async createIntegrationLink(data: {
    expires_at: string;
    max_uses?: number | null;
    notes?: string | null;
  }) {
    const response = await this.api.post('/integration-links', data);
    return response.data;
  }

  // Atualizar link de integração
  async updateIntegrationLink(id: string, data: {
    expires_at?: string;
    max_uses?: number | null;
    is_active?: boolean;
    notes?: string | null;
  }) {
    const response = await this.api.put(`/integration-links/${id}`, data);
    return response.data;
  }

  // Desativar link de integração
  async deactivateIntegrationLink(id: string) {
    const response = await this.api.patch(`/integration-links/${id}/deactivate`);
    return response.data;
  }

  // Excluir permanentemente link de integração
  async deleteIntegrationLink(id: string) {
    const response = await this.api.delete(`/integration-links/${id}`);
    return response.data;
  }
}

// Instância singleton
export const apiService = new ApiService();
export default apiService;

/**
 * Formata um erro da API exibindo tanto a mensagem principal quanto os detalhes de validação (Joi).
 * Use nos catch dos modais e páginas para garantir feedback completo ao usuário.
 */
export function formatApiError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Ocorreu um erro inesperado.';
  }
  const enhanced = err as Error & { details?: string | string[] };
  const details = enhanced.details;
  if (details) {
    const detailsText = Array.isArray(details) ? details.join('; ') : details;
    return `${err.message}: ${detailsText}`;
  }
  return err.message;
}

export interface DowngradeBlockInfo {
  membersToRemove?: number;
  currentCount?: number;
  newLimit?: number;
}

export function getDowngradeBlockInfo(err: unknown): DowngradeBlockInfo | null {
  if (!(err instanceof Error)) return null;
  const data = (err as Error & { originalError?: Record<string, unknown> }).originalError;
  if (!data || typeof data !== 'object' || typeof data.membersToRemove !== 'number') {
    return null;
  }
  return {
    membersToRemove: data.membersToRemove,
    currentCount: typeof data.currentCount === 'number' ? data.currentCount : undefined,
    newLimit: typeof data.newLimit === 'number' ? data.newLimit : undefined,
  };
}
