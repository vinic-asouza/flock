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
    const enhancedError = new Error(error.message) as Error & {
      details?: string | string[];
      status?: number;
      originalError?: unknown;
    };
    // Copiar propriedades customizadas
    const errorWithProps = error as { details?: string | string[]; status?: number; originalError?: unknown };
    if (errorWithProps.details) {
      enhancedError.details = errorWithProps.details;
    }
    if (errorWithProps.status) {
      enhancedError.status = errorWithProps.status;
    }
    if (errorWithProps.originalError) {
      enhancedError.originalError = errorWithProps.originalError;
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
    const initializeAuth = async () => {
      try {
        // Verificar autenticação via API (cookies são enviados automaticamente)
        // Silenciar erros durante verificação inicial - é esperado que não esteja autenticado
        const response = await apiService.isAuthenticated();
        
        if (response) {
          // Obter dados da igreja
          const church = await apiService.getChurch();
          
          if (church) {
            setUser(church);
            
            // Buscar dados da conta para obter o email (silenciar erros)
            let userEmail = '';
            try {
              const accountData = await apiService.getAccountData();
              userEmail = accountData.email || '';
            } catch {
              // Silenciar erro - não crítico durante inicialização
              // Não logar erro para não poluir o console
            }
            
            // Criar sessão mock para compatibilidade
            setSession({
              access_token: 'stored_in_cookie',
              token_type: 'bearer',
              expires_in: 900, // 15 minutos
              expires_at: Date.now() + 15 * 60 * 1000,
              refresh_token: 'stored_in_cookie',
              user: {
                id: church.user_id,
                email: userEmail,
                aud: 'authenticated',
                role: 'authenticated',
                email_confirmed_at: new Date().toISOString(),
                phone: '',
                confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: { email: userEmail, email_verified: true, phone_verified: false, sub: church.user_id },
                identities: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_anonymous: false
              }
            });
          } else {
            setUser(null);
            setSession(null);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } catch {
        // Silenciar erro durante verificação inicial - é esperado que não esteja autenticado
        // Não logar como erro para não poluir o console
        setUser(null);
        setSession(null);
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
      
      // Buscar dados da conta para obter o email
      let userEmail = data.email; // Usar o email do login como fallback
      try {
        const accountData = await apiService.getAccountData();
        userEmail = accountData.email || data.email;
      } catch {
        // Silenciar erro - não crítico, usar email do login como fallback
      }
      
      // Criar sessão mock para compatibilidade (tokens estão em cookies)
      setSession({
        access_token: 'stored_in_cookie',
        token_type: 'bearer',
        expires_in: 900, // 15 minutos
        expires_at: Date.now() + 15 * 60 * 1000,
        refresh_token: 'stored_in_cookie',
        user: {
          id: response.church.user_id,
          email: userEmail,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { email: userEmail, email_verified: true, phone_verified: false, sub: response.church.user_id },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_anonymous: false
        }
      });
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
      
      // Chamar logout no servidor e limpar dados locais
      await apiService.logout();
      
      setUser(null);
      setSession(null);
      setIsOperationLoading(false);
    } catch {
      setIsOperationLoading(false);
      
      // Mesmo com erro, limpar os dados locais
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

  const updateChurch = useCallback(async (data: Partial<Church>): Promise<Church> => {
    try {
      setIsOperationLoading(true);
      const updatedChurch = await apiService.updateChurch(data);
      setUser(updatedChurch);
      setIsOperationLoading(false);
      return updatedChurch;
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const refreshChurch = useCallback(async (): Promise<void> => {
    try {
      setIsOperationLoading(true);
      const churchData = await apiService.getChurchData();
      setUser(churchData);
      setIsOperationLoading(false);
    } catch (error: unknown) {
      setIsOperationLoading(false);
      throw preserveErrorProperties(error);
    }
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

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
    updateChurch,
    refreshChurch,
  }), [user, session, isLoading, isOperationLoading, isAuthenticated, login, register, logout, forgotPassword, changePassword, resetPassword, updateChurch, refreshChurch]);

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
