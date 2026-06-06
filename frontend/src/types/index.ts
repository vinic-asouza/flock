// Tipos baseados na documentação do backend

export interface Church {
  id: string;
  user_id: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  email_church?: string;
  phone_church?: string;
  created_at: string;
  // Campos de assinatura Stripe
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null;
  plan_type?: '100' | '200' | '500' | '800' | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  subscription_updated_at?: string | null;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string;
    phone: string;
    confirmed_at: string;
    last_sign_in_at: string;
    app_metadata: {
      provider: string;
      providers: string[];
    };
    user_metadata: {
      email: string;
      email_verified: boolean;
      phone_verified: boolean;
      sub: string;
    };
    identities: Array<{
      identity_id: string;
      id: string;
      user_id: string;
      identity_data: {
        email: string;
        email_verified: boolean;
        phone_verified: boolean;
        sub: string;
      };
      provider: string;
      last_sign_in_at: string;
      created_at: string;
      updated_at: string;
      email: string;
    }>;
    created_at: string;
    updated_at: string;
    is_anonymous: boolean;
  };
}

export interface LoginResponse {
  message: string;
  church: Church;
  role?: ChurchUserRole;
  email?: string;
  memberships?: ChurchMembership[];
  activeChurchId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  link_token?: string;
  checkout_session_id?: string;
}

export interface ChurchMembership {
  churchId: string;
  role: ChurchUserRole;
  churchName: string;
}

export interface RegisterResponse {
  message: string;
  church: Church;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordData {
  newPassword: string;
  token: string;
}

/** Papel do usuário na igreja (compatível com backend) */
export type ChurchUserRole = 'owner' | 'admin' | 'editor' | 'reader';

/** Resposta do endpoint /refresh/check */
export interface CheckAuthResponse {
  authenticated: boolean;
  user?: { id: string; email: string };
  church?: Church;
  role?: ChurchUserRole;
  memberships?: ChurchMembership[];
  activeChurchId?: string | null;
  code?: 'CHURCH_SELECTION_REQUIRED';
  message?: string;
}

/** Item da listagem de usuários da igreja */
export interface ChurchUserListItem {
  id: string;
  user_id: string;
  role: ChurchUserRole;
  status: string;
  email: string | null;
  roleLabel: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: Church | null;
  session: Session | null;
  /** Papel do usuário na igreja (owner | admin | editor | reader) */
  currentRole: ChurchUserRole | null;
  /** false quando currentRole === 'reader'; true para editor/admin/owner; undefined se não autenticado */
  canEdit: boolean | undefined;
  isLoading: boolean;
  isOperationLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  updateChurch: (data: Partial<Church>) => Promise<Church>;
  refreshChurch: () => Promise<void>;
  memberships: ChurchMembership[];
  activeChurchId: string | null;
  churchSelectionRequired: boolean;
  switchChurch: (churchId: string) => Promise<void>;
}

// Tipos para componentes de formulário
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: unknown; // Zod schema
}

// Estados de loading e erro
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Resposta padrão da API
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  details?: string | string[];
}

// Estrutura de erro da API
export interface ApiError {
  error: string;
  details?: string | string[];
  message?: string;
}

// Re-export dos tipos de relatórios
export * from './reports';
export * from './integration';

// Tipos para importação de membros
export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    errors: ValidationError[];
  }>;
  preview: Array<{
    name: string;
    birth?: string;
    gender?: string;
    [key: string]: unknown;
  }>;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
  skipped: Array<{
    row: number;
    reason: string;
  }>;
}

// Tipos para Grupos
export type GroupType = 
  | 'Ministério' 
  | 'Departamento' 
  | 'Grupo' 
  | 'Equipe' 
  | 'Time' 
  | 'Comissão' 
  | 'Célula' 
  | 'Grupo de Crescimento' 
  | 'Pequeno Grupo' 
  | 'Discipulado' 
  | 'Classe' 
  | 'Núcleo' 
  | 'Região';

export interface Group {
  id: string;
  church_id: string;
  congregation_id?: string | null;
  type: GroupType;
  name: string;
  description?: string | null;
  responsible_id?: string | null;
  status: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  congregations?: {
    id: string;
    name: string;
  } | null;
  members?: {
    id: string;
    name: string;
  } | null; // Responsável (via foreign key responsible_id)
  memberCount?: number;
}

export interface GroupWithMembers extends Omit<Group, 'members'> {
  // Responsável (renomeado para evitar colisão)
  responsible?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  } | null;
  // Membros vinculados (quando buscar grupo específico)
  membersList?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    active: boolean;
    congregation_id?: string | null;
    memberGroupId?: string;
    addedAt?: string;
    congregations?: {
      id: string;
      name: string;
    } | null;
  }>;
}

export interface GroupPayload {
  name: string;
  type: GroupType;
  description?: string;
  congregation_id?: string | null;
  responsible_id?: string | null;
  status?: boolean;
}

export interface GroupFilters {
  search: string;
  congregationId: string;
  type: GroupType | '';
  status: 'active' | 'inactive' | 'all';
}