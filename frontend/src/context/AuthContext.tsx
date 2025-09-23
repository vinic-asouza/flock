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
        const sessionData = localStorage.getItem('flock_session');
        
        if (token && churchData && sessionData) {
          const church = JSON.parse(churchData);
          const session = JSON.parse(sessionData);
          
          // Verificar se a sessão ainda é válida
          if (session.expires_at && Date.now() < session.expires_at) {
            setUser(church);
            setSession(session);
          } else {
            // Sessão expirada, limpar dados
            localStorage.removeItem('flock_token');
            localStorage.removeItem('flock_church');
            localStorage.removeItem('flock_session');
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        // Limpar dados corrompidos
        localStorage.removeItem('flock_token');
        localStorage.removeItem('flock_church');
        localStorage.removeItem('flock_session');
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
      // Chamar logout no servidor e limpar dados locais
      await apiService.logout();
      setUser(null);
      setSession(null);
      setIsOperationLoading(false);
    } catch (error) {
      setIsOperationLoading(false);
      // Mesmo com erro, limpar os dados locais
      setUser(null);
      setSession(null);
      console.error('Erro durante logout:', error);
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
