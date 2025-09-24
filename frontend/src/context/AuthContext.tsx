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
    const initializeAuth = async () => {
      try {
        console.log('Inicializando autenticação...');
        
        // Aguardar um pouco para garantir que cookies foram processados
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar autenticação via API (cookies são enviados automaticamente)
        const response = await apiService.isAuthenticated();
        console.log('Resposta de autenticação:', response);
        
        if (response) {
          // Obter dados da igreja
          const church = await apiService.getChurch();
          console.log('Dados da igreja:', church);
          
          if (church) {
            console.log('Usuário autenticado, definindo estado...');
            setUser(church);
            // Criar sessão mock para compatibilidade
            setSession({
              access_token: 'stored_in_cookie',
              token_type: 'bearer',
              expires_in: 900, // 15 minutos
              expires_at: Date.now() + 15 * 60 * 1000,
              refresh_token: 'stored_in_cookie',
              user: {
                id: church.user_id,
                email: '', // Email será obtido via API quando necessário
                aud: 'authenticated',
                role: 'authenticated',
                email_confirmed_at: new Date().toISOString(),
                phone: '',
                confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: { email: '', email_verified: true, phone_verified: false, sub: church.user_id },
                identities: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_anonymous: false
              }
            });
          } else {
            console.log('Igreja não encontrada, usuário não autenticado');
            setUser(null);
            setSession(null);
          }
        } else {
          console.log('Usuário não autenticado');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        // Limpar estado local
        setUser(null);
        setSession(null);
      } finally {
        console.log('Finalizando inicialização de autenticação');
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
      // Criar sessão mock para compatibilidade (tokens estão em cookies)
      setSession({
        access_token: 'stored_in_cookie',
        token_type: 'bearer',
        expires_in: 900, // 15 minutos
        expires_at: Date.now() + 15 * 60 * 1000,
        refresh_token: 'stored_in_cookie',
        user: {
          id: response.church.user_id,
          email: '', // Email será obtido via API quando necessário
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { email: '', email_verified: true, phone_verified: false, sub: response.church.user_id },
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
      console.log('Iniciando logout...');
      setIsOperationLoading(true);
      
      // Chamar logout no servidor e limpar dados locais
      await apiService.logout();
      
      console.log('Logout no servidor concluído, limpando estado local...');
      setUser(null);
      setSession(null);
      setIsOperationLoading(false);
      
      console.log('Logout concluído com sucesso');
    } catch (error) {
      console.error('Erro durante logout:', error);
      setIsOperationLoading(false);
      
      // Mesmo com erro, limpar os dados locais
      console.log('Limpando estado local mesmo com erro...');
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
  }), [user, session, isLoading, isOperationLoading, login, register, logout, forgotPassword, changePassword, resetPassword, updateChurch, refreshChurch]);

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
