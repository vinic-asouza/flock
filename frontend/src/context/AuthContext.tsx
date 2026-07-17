'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  AuthContextType, 
  Church,
  ChurchMembership,
  ChurchUserRole,
  Session, 
  LoginData, 
  RegisterData, 
  RegisterResponse,
  ForgotPasswordData, 
  ChangePasswordData, 
  ResetPasswordData 
} from '@/types';
import apiService from '@/services/api';
import { clearStripeSyncCache } from '@/utils/stripeSyncCache';

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
  const [currentRole, setCurrentRole] = useState<ChurchUserRole | null>(null);
  const [memberships, setMemberships] = useState<ChurchMembership[]>([]);
  const [activeChurchId, setActiveChurchId] = useState<string | null>(null);
  const [churchSelectionRequired, setChurchSelectionRequired] = useState(false);
  const [accessAllCongregations, setAccessAllCongregations] = useState(true);
  const [congregationIds, setCongregationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);

  const applyCongregationScope = useCallback((payload: {
    accessAllCongregations?: boolean;
    congregationIds?: string[];
    role?: ChurchUserRole | null;
  }) => {
    const role = payload.role;
    if (role === 'owner' || role === 'admin') {
      setAccessAllCongregations(true);
      setCongregationIds([]);
      return;
    }
    setAccessAllCongregations(Boolean(payload.accessAllCongregations));
    setCongregationIds(Array.isArray(payload.congregationIds) ? payload.congregationIds : []);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const auth = await apiService.getCheckAuth();

        if (auth.authenticated && auth.code === 'CHURCH_SELECTION_REQUIRED') {
          setMemberships(auth.memberships || []);
          setChurchSelectionRequired(true);
          setUser(null);
          setCurrentRole(null);
          setActiveChurchId(auth.activeChurchId ?? null);
        } else if (auth.authenticated && auth.church) {
          setUser(auth.church);
          const role = (auth.role as ChurchUserRole) ?? 'reader';
          setCurrentRole(role);
          setMemberships(auth.memberships || []);
          setActiveChurchId(auth.activeChurchId ?? auth.church.id);
          setChurchSelectionRequired(false);
          applyCongregationScope({
            role,
            accessAllCongregations: auth.accessAllCongregations,
            congregationIds: auth.congregationIds,
          });
          if (auth.activeChurchId) {
            apiService.setActiveChurchIdClient(auth.activeChurchId);
          }

          let userEmail = '';
          try {
            const accountData = await apiService.getAccountData();
            userEmail = accountData.email || '';
          } catch {
            // ACHADO 18: email não está disponível aqui (sem data.email), mas a falha
            // não é crítica. O email será exibido vazio na UI até que o usuário recarregue.
            console.warn('[AuthContext] getAccountData falhou na inicialização. Email pode ficar vazio na UI.');
          }

          // ACHADO 17: expires_at=0 — o valor real de expiração está no cookie session_id
          // gerenciado pelo backend. Não calcular localmente para evitar inconsistência.
          setSession({
            access_token: 'stored_in_cookie',
            token_type: 'bearer',
            expires_in: 900,
            expires_at: 0,
            refresh_token: 'stored_in_cookie',
            user: {
              id: auth.church.user_id,
              email: userEmail,
              aud: 'authenticated',
              role: 'authenticated',
              email_confirmed_at: new Date().toISOString(),
              phone: '',
              confirmed_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
              app_metadata: { provider: 'email', providers: ['email'] },
              user_metadata: { email: userEmail, email_verified: true, phone_verified: false, sub: auth.church.user_id },
              identities: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_anonymous: false
            }
          });
        } else {
          setUser(null);
          setSession(null);
          setCurrentRole(null);
          setMemberships([]);
          setActiveChurchId(null);
          setChurchSelectionRequired(false);
          setAccessAllCongregations(true);
          setCongregationIds([]);
        }
      } catch {
        setUser(null);
        setSession(null);
        setCurrentRole(null);
        setAccessAllCongregations(true);
        setCongregationIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [applyCongregationScope]);

  const login = useCallback(async (data: LoginData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      const response = await apiService.login(data);
      setUser(response.church);
      const role = (response.role as ChurchUserRole) ?? 'reader';
      setCurrentRole(role);
      const loginRes = response as typeof response & {
        memberships?: ChurchMembership[];
        activeChurchId?: string;
        accessAllCongregations?: boolean;
        congregationIds?: string[];
      };
      if (loginRes.memberships) setMemberships(loginRes.memberships);
      if (loginRes.activeChurchId) {
        setActiveChurchId(loginRes.activeChurchId);
        apiService.setActiveChurchIdClient(loginRes.activeChurchId);
      }
      applyCongregationScope({
        role,
        accessAllCongregations: loginRes.accessAllCongregations,
        congregationIds: loginRes.congregationIds,
      });
      setChurchSelectionRequired(false);
      const userEmail = response.email || data.email;

      // ACHADO 17: expires_at fictício removido — o valor real está no cookie session_id
      // gerenciado pelo backend. Expor um placeholder aqui causaria inconsistência em
      // qualquer lógica que dependa deste campo para verificar expiração.
      setSession({
        access_token: 'stored_in_cookie',
        token_type: 'bearer',
        expires_in: 900,
        expires_at: 0,
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
  }, [applyCongregationScope]);

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
      setCurrentRole(null);
      setMemberships([]);
      setActiveChurchId(null);
      apiService.setActiveChurchIdClient(null);
      setChurchSelectionRequired(false);
      setAccessAllCongregations(true);
      setCongregationIds([]);
      setIsOperationLoading(false);
    } catch {
      setIsOperationLoading(false);
      setUser(null);
      setSession(null);
      setCurrentRole(null);
      setMemberships([]);
      setActiveChurchId(null);
      apiService.setActiveChurchIdClient(null);
      setChurchSelectionRequired(false);
      setAccessAllCongregations(true);
      setCongregationIds([]);
    }
  }, []);

  const switchChurch = useCallback(async (churchId: string): Promise<void> => {
    const result = await apiService.setActiveChurch(churchId);
    clearStripeSyncCache(activeChurchId ?? undefined);
    setUser(result.church);
    const role = (result.role as ChurchUserRole) ?? 'reader';
    setCurrentRole(role);
    setActiveChurchId(churchId);
    apiService.setActiveChurchIdClient(churchId);
    setChurchSelectionRequired(false);
    const scoped = result as typeof result & {
      accessAllCongregations?: boolean;
      congregationIds?: string[];
    };
    applyCongregationScope({
      role,
      accessAllCongregations: scoped.accessAllCongregations,
      congregationIds: scoped.congregationIds,
    });
  }, [activeChurchId, applyCongregationScope]);

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

  const isAuthenticated = useMemo(
    () => !!user || churchSelectionRequired,
    [user, churchSelectionRequired]
  );
  const canEdit = useMemo(() => (currentRole === null ? undefined : currentRole !== 'reader'), [currentRole]);
  const canCreateCongregations = useMemo(() => {
    if (currentRole === 'owner' || currentRole === 'admin') return true;
    if (currentRole === 'editor') return accessAllCongregations;
    return false;
  }, [currentRole, accessAllCongregations]);

  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    currentRole,
    canEdit,
    accessAllCongregations,
    congregationIds,
    canCreateCongregations,
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
    memberships,
    activeChurchId,
    churchSelectionRequired,
    switchChurch,
  }), [user, session, currentRole, canEdit, accessAllCongregations, congregationIds, canCreateCongregations, isLoading, isOperationLoading, isAuthenticated, login, register, logout, forgotPassword, changePassword, resetPassword, updateChurch, refreshChurch, memberships, activeChurchId, churchSelectionRequired, switchChurch]);

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
