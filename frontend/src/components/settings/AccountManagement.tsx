'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import { formatPhone } from '@/utils';
import { validatePhone } from '@/utils/validations';
import { Edit, Key, Trash2, Mail, Phone, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';

interface AccountData {
  id: string;
  email: string;
  phone: string;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface ChangeEmailData {
  newEmail: string;
  password: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePhoneData {
  newPhone: string;
  password: string;
}

interface DeleteAccountData {
  password: string;
  confirmation: string;
}

// Schemas de validação Zod
const changeEmailSchema = z.object({
  newEmail: z.string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
});

const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Nova senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Nova senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número'),
  confirmPassword: z.string()
    .min(1, 'Confirmação de senha é obrigatória')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

const changePhoneSchema = z.object({
  newPhone: z.string()
    .refine((val) => {
      if (!val || val.trim() === '') return false;
      const cleaned = val.replace(/\D/g, '');
      return validatePhone(cleaned);
    }, {
      message: 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX'
    }),
  password: z.string()
    .min(1, 'Senha é obrigatória')
});

const deleteAccountSchema = z.object({
  password: z.string()
    .min(1, 'Senha é obrigatória'),
  confirmation: z.string()
    .min(1, 'Confirmação é obrigatória')
    .refine((val) => val === 'EXCLUIR CONTA', {
      message: 'Confirmação deve ser exatamente "EXCLUIR CONTA"'
    })
});

export function AccountManagement() {
  const { logout, user, refreshChurch, currentRole } = useAuth();
  const isOwner = currentRole === 'owner';
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para modais
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Estados para erros específicos dos modais
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Estados para verificação de plano
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Dados dos formulários
  const [emailData, setEmailData] = useState<ChangeEmailData>({ newEmail: '', password: '' });
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [phoneData, setPhoneData] = useState<ChangePhoneData>({ newPhone: '', password: '' });
  const [deleteData, setDeleteData] = useState<DeleteAccountData>({ password: '', confirmation: '' });

  // Verificar se há plano pago ativo
  const hasActivePaidPlan = () => {
    if (!user) return false;
    const subscriptionStatus = user.subscription_status;
    const planType = user.plan_type;
    const subscriptionEndDate = user.subscription_end_date;
    
    // Se subscription_end_date está preenchido, significa que a assinatura foi cancelada
    // e está apenas aguardando o término do período pago - permitir exclusão
    if (subscriptionEndDate) {
      return false;
    }
    
    // Verificar se tem assinatura ativa e não é plano gratuito
    const isActive = subscriptionStatus === 'active' && planType && planType !== '100' && planType !== null;
    
    return isActive;
  };

  const handleSyncSubscription = async () => {
    try {
      setIsSyncing(true);
      setDeleteError(null);
      
      await apiService.syncSubscription();
      
      // Atualizar dados da igreja após sincronização
      if (refreshChurch) {
        await refreshChurch();
      }
      
      // Mensagem de sucesso genérica - o componente será re-renderizado e hasActivePaidPlan() será atualizado
      setSuccess('Assinatura sincronizada com sucesso! Se você cancelou sua assinatura, os campos de exclusão aparecerão automaticamente.');
      toast.success('Assinatura sincronizada com sucesso!');
    } catch (err: unknown) {
      const finalMessage = formatApiError(err) || 'Erro ao sincronizar assinatura. Tente novamente.';
      toast.error(finalMessage);
      setDeleteError(finalMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setDeleteError(null);
      
      const { url } = await apiService.createPortalSession();
      
      if (!url) {
        throw new Error('URL do portal não recebida');
      }
      
      // Abrir portal do Stripe em nova guia
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const finalMessage = formatApiError(err) || 'Erro ao acessar o portal de pagamento. Tente novamente.';
      toast.error(finalMessage);
      setDeleteError(finalMessage);
    }
  };


  // Carregar dados da conta
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await apiService.getAccountData();
        setAccountData(data as unknown as AccountData);
      } catch (error: unknown) {
        const errorMessage = formatApiError(error);
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, []);

  const handleChangeEmail = async () => {
    try {
      setIsSaving(true);
      setEmailError(null);
      setSuccess(null);

      // Validar dados com Zod
      const validationResult = changeEmailSchema.safeParse(emailData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        const firstError = errors[0];
        const errorMessage = firstError.message;
        setEmailError(errorMessage);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }

      await apiService.changeEmail(emailData);

      const refreshed = await apiService.getAccountData();
      setAccountData({
        ...(refreshed as unknown as AccountData),
        email: emailData.newEmail,
      });
      
      setSuccess('Email alterado com sucesso! Verifique sua caixa de entrada para confirmar o novo email.');
      toast.success('Email alterado com sucesso! Verifique sua caixa de entrada.');
      setShowEmailModal(false);
      setEmailData({ newEmail: '', password: '' });
      
    } catch (error: unknown) {
      const errorMessage = formatApiError(error);
      toast.error(errorMessage);
      setEmailError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsSaving(true);
      setPasswordError(null);
      setSuccess(null);

      // Validar dados com Zod
      const validationResult = changePasswordSchema.safeParse(passwordData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        const firstError = errors[0];
        const errorMessage = firstError.message;
        setPasswordError(errorMessage);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }

      await apiService.changeAccountPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Senha alterada com sucesso!');
      toast.success('Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (error: unknown) {
      const errorMessage = formatApiError(error);
      toast.error(errorMessage);
      setPasswordError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      setPhoneData(prev => ({
        ...prev,
        newPhone: cleaned
      }));
    }
  };

  // Função para limpar erros quando modais são fechados
  const handleCloseEmailModal = () => {
    setEmailError(null);
    setShowEmailModal(false);
  };

  const handleClosePasswordModal = () => {
    setPasswordError(null);
    setShowPasswordModal(false);
  };

  // const handleClosePhoneModal = () => {
  //   setPhoneError(null);
  //   setShowPhoneModal(false);
  // };

  // const handleCloseDeleteModal = () => {
  //   setDeleteError(null);
  //   setShowDeleteModal(false);
  // };

  const handleChangePhone = async () => {
    try {
      setIsSaving(true);
      setPhoneError(null);
      setSuccess(null);

      // Validar dados com Zod
      const validationResult = changePhoneSchema.safeParse(phoneData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        const firstError = errors[0];
        const errorMessage = firstError.message;
        setPhoneError(errorMessage);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }

      await apiService.changePhone(phoneData);
      
      setSuccess('Telefone alterado com sucesso!');
      toast.success('Telefone alterado com sucesso!');
      setShowPhoneModal(false);
      setPhoneData({ newPhone: '', password: '' });
      
    } catch (error: unknown) {
      const errorMessage = formatApiError(error);
      toast.error(errorMessage);
      setPhoneError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsSaving(true);
      setDeleteError(null);
      setSuccess(null);

      // Validar dados com Zod
      const validationResult = deleteAccountSchema.safeParse(deleteData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        const firstError = errors[0];
        const errorMessage = firstError.message;
        setDeleteError(errorMessage);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }

      await apiService.deleteAccount(deleteData);
      
      setSuccess('Conta excluída com sucesso! Você será redirecionado...');
      toast.success('Conta excluída com sucesso!');
      
      // Fazer logout e redirecionar
      setTimeout(async () => {
        await logout();
        window.location.href = '/login';
      }, 2000);
      
    } catch (error: unknown) {
      const errorMessage = formatApiError(error);
      toast.error(errorMessage);
      setDeleteError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Mensagens de feedback */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Card único com informações da conta */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Informações da Conta
          </h2>
          
          {accountData && (
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">{accountData.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowEmailModal(true)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit size={16} />
                  Alterar
                </Button>
              </div>

              {/* Linha divisória */}
              <div className="border-t border-gray-200"></div>

              {/* Telefone - Desabilitado temporariamente */}
              <div className="flex items-center justify-between py-3 opacity-50">
                <div className="flex items-center gap-3">
                  <Phone className="text-gray-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-500">{accountData.phone || 'Não informado'}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPhoneModal(true)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 cursor-not-allowed"
                  disabled
                >
                  <Edit size={16} />
                  Alterar
                </Button>
              </div>

              {/* Ações de segurança */}
              <div className="flex flex-wrap gap-3 pt-3">
                <Button
                  onClick={() => setShowPasswordModal(true)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Key size={16} />
                  Alterar Senha
                </Button>
                
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 size={16} />
                  Excluir Conta
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal para alterar email */}
      <Modal
        isOpen={showEmailModal}
        onClose={handleCloseEmailModal}
        title="Alterar Email"
      >
        <div className="space-y-4 p-4">
          {emailError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{emailError}</p>
            </div>
          )}
          
          <Input
            label="Novo Email"
            type="email"
            value={emailData.newEmail}
            onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
            placeholder="novo@email.com"
          />
          <Input
            label="Senha Atual"
            type="password"
            value={emailData.password}
            onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Digite sua senha atual"
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button
              onClick={handleCloseEmailModal}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? 'Alterando...' : 'Alterar Email'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para alterar senha */}
      <Modal
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        title="Alterar Senha"
      >
        <div className="space-y-4 p-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{passwordError}</p>
            </div>
          )}
          
          <Input
            label="Senha Atual"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Digite sua senha atual"
          />
          <Input
            label="Nova Senha"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Digite a nova senha"
          />
          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirme a nova senha"
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button
              onClick={handleClosePasswordModal}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para alterar telefone */}
      <Modal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title="Alterar Telefone"
      >
        <div className="space-y-4 p-4">
          {phoneError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{phoneError}</p>
            </div>
          )}
          
          <Input
            label="Novo Telefone"
            type="tel"
            value={formatPhone(phoneData.newPhone)}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
          />
          <Input
            label="Senha Atual"
            type="password"
            value={phoneData.password}
            onChange={(e) => setPhoneData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Digite sua senha atual"
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button
              onClick={() => setShowPhoneModal(false)}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePhone}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? 'Alterando...' : 'Alterar Telefone'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para excluir conta */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteError(null);
          setSuccess(null);
          setDeleteData({ password: '', confirmation: '' });
        }}
        title="Excluir Conta"
      >
        <div className="space-y-4 p-4">
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{deleteError}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ ATENÇÃO: Esta ação é irreversível!
            </p>
            <p className="text-sm text-red-700 mb-2">
              {isOwner
                ? 'Ao excluir sua conta como proprietário(a), todos os dados da igreja serão permanentemente removidos, incluindo:'
                : 'Ao excluir sua conta, seu acesso a esta igreja será removido permanentemente. Os dados da igreja (membros, relatórios e configurações) permanecerão intactos.'}
            </p>
            {isOwner && (
            <ul className="text-sm text-red-700 ml-4 list-disc">
              <li>Dados da igreja</li>
              <li>Lista de membros</li>
              <li>Cargos e congregações</li>
              <li>Relatórios e histórico</li>
            </ul>
            )}
          </div>

          {/* Aviso sobre plano ativo */}
          {hasActivePaidPlan() && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800 font-medium mb-2">
                ⚠️ Plano Pago Ativo Detectado
              </p>
              <p className="text-sm text-orange-700 mb-3">
                Para excluir sua conta, é necessário cancelar sua assinatura ativa primeiro. 
                Após o cancelamento, você poderá excluir sua conta.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleOpenPortal}
                  variant="primary"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Gerenciar Assinatura no Stripe
                </Button>
                <Button
                  onClick={handleSyncSubscription}
                  disabled={isSyncing}
                  variant="secondary"
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Já realizei o cancelamento'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Campos de senha e confirmação - apenas se não houver plano ativo */}
          {!hasActivePaidPlan() && (
            <>
              <Input
                label="Senha Atual"
                type="password"
                value={deleteData.password}
                onChange={(e) => setDeleteData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Digite sua senha atual"
              />
              
              <Input
                label="Confirmação"
                value={deleteData.confirmation}
                onChange={(e) => setDeleteData(prev => ({ ...prev, confirmation: e.target.value }))}
                placeholder="Digite: EXCLUIR CONTA"
              />
            </>
          )}
          
          <div className="flex justify-end gap-3 pt-3">
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteError(null);
                setSuccess(null);
                setDeleteData({ password: '', confirmation: '' });
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            {!hasActivePaidPlan() && (
              <Button
                onClick={handleDeleteAccount}
                disabled={isSaving}
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSaving ? 'Excluindo...' : 'Excluir Conta'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
