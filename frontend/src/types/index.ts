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
  session: Session;
  church: Church;
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

export interface AuthContextType {
  user: Church | null;
  session: Session | null;
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