'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  AuthContextType, 
  Church, 
  Session, 
  LoginData, 
  RegisterData, 
  RegisterResponse,
  ForgotPasswordData, 
  ChangePasswordData, 
  ResetPasswordData 
} from '@/types';
import apiService from '@/services/api';

// Função utilitária para preservar propriedades customizadas do erro
const preserveErrorProperties = (error: unknown): Error => {
  if (error instanceof Error) {
    const enhancedError = new Error(error.message);
    // Copiar propriedades customizadas
    if ('details' in error) {
      (enhancedError as any).details = (error as any).details;
    }
    if ('status' in error) {
      (enhancedError as any).status = (error as any).status;
    }
    if ('originalError' in error) {
      (enhancedError as any).originalError = (error as any).originalError;
    }
    return enhancedError;
  }
  return new Error('Erro desconhecido');
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Church | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);

  // Verificar autenticação inicial
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('flock_token');
        const churchData = localStorage.getItem('flock_church');
        
        if (token && churchData) {
          const church = JSON.parse(churchData);
          setUser(church);
          
          // Criar uma sessão básica com o token existente
          const session: Session = {
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Date.now() + 3600 * 1000, // 1 hora a partir de agora
            refresh_token: '',
            user: {
              id: church.user_id,
              aud: 'authenticated',
              role: 'authenticated',
              email: '',
              email_confirmed_at: '',
              phone: '',
              confirmed_at: '',
              last_sign_in_at: '',
              app_metadata: {
                provider: 'email',
                providers: ['email']
              },
              user_metadata: {
                email: '',
                email_verified: false,
                phone_verified: false,
                sub: church.user_id
              },
              identities: [],
              created_at: '',
              updated_at: '',
              is_anonymous: false
            }
          };
          setSession(session);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        // Limpar dados corrompidos
        localStorage.removeItem('flock_token');
        localStorage.removeItem('flock_church');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (data: LoginData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      const response = await apiService.login(data);
      setUser(response.church);
      setSession(response.session);
      setIsOperationLoading(false);
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<RegisterResponse> => {
    try {
      setIsOperationLoading(true);
      const response = await apiService.register(data);
      setIsOperationLoading(false);
      return response;
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsOperationLoading(true);
      // Simular um pequeno delay para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 500));
      apiService.logout();
      setUser(null);
      setSession(null);
      setIsOperationLoading(false);
    } catch (error) {
      setIsOperationLoading(false);
      // Mesmo com erro, limpar os dados locais
      apiService.logout();
      setUser(null);
      setSession(null);
    }
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      await apiService.forgotPassword(data);
      setIsOperationLoading(false);
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const changePassword = useCallback(async (data: ChangePasswordData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      await apiService.changePassword(data);
      setIsOperationLoading(false);
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const resetPassword = useCallback(async (data: ResetPasswordData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      await apiService.resetPassword(data);
      setIsOperationLoading(false);
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const isAuthenticated = useMemo(() => !!user && !!session, [user, session]);



  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    isLoading,
    isOperationLoading,
    isAuthenticated,
    login,
    register,
    logout,
    forgotPassword,
    changePassword,
    resetPassword,
  }), [user, session, isLoading, isOperationLoading, login, register, logout, forgotPassword, changePassword, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
