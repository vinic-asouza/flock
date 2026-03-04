/**
 * Templates de email em HTML
 */
import { renderTemplate } from './templateLoader';

/**
 * Template de boas-vindas para novo usuário registrado
 */
export const getWelcomeEmailTemplate = (data: {
  userName: string;
  churchName: string;
  email: string;
}): string => {
  return renderTemplate('welcome', data);
};

/**
 * Template de notificação para administradores sobre novo registro
 */
export const getNewUserNotificationTemplate = (data: {
  userName: string;
  churchName: string;
  email: string;
  cnpj?: string;
  phone?: string;
}): string => {
  return renderTemplate('new-user-notification', data);
};

/**
 * Template de confirmação de alteração de senha
 */
export const getPasswordChangedTemplate = (data: {
  userName: string;
  changeDate: string;
  ipAddress?: string;
}): string => {
  return renderTemplate('password-changed', data);
};

/**
 * Template de notificação de alteração de email
 */
export const getEmailChangeNotificationTemplate = (data: {
  userName: string;
  oldEmail: string;
  newEmail: string;
  changeDate: string;
  ipAddress?: string;
}): string => {
  return renderTemplate('email-change-notification', data);
};

/**
 * Template de confirmação de exclusão de conta
 */
export const getAccountDeletedTemplate = (data: {
  userName: string;
  userEmail: string;
  deletionDate: string;
  ipAddress?: string;
}): string => {
  return renderTemplate('account-deleted', data);
};

/**
 * Template de confirmação de cadastro na waitlist
 */
export const getWaitlistConfirmationTemplate = (data: {
  userName: string;
  userEmail: string;
}): string => {
  return renderTemplate('waitlist-confirmation', data);
};

/**
 * Template de notificação para administradores sobre novo cadastro na waitlist
 */
export const getWaitlistNotificationTemplate = (data: {
  userName: string;
  userEmail: string;
  phone?: string;
  churchName?: string;
  city?: string;
  state?: string;
  plan?: string;
  message?: string;
}): string => {
  return renderTemplate('waitlist-notification', data);
};

/**
 * Template de aviso de limite de membros
 */
export const getMemberLimitWarningTemplate = (data: {
  userName: string;
  currentCount: number;
  limit: number;
  remaining: number;
  planName: string;
  percentage: number;
  warningTitle: string;
  warningColor: string;
  borderColor: string;
  isLimitReached: boolean;
}): string => {
  return renderTemplate('member-limit-warning', data);
};

/**
 * Template de convite para usuário adicionado a uma igreja
 */
export const getChurchUserInvitationTemplate = (data: {
  churchName: string;
  roleLabel: string;
  appUrl: string;
}): string => {
  return renderTemplate('church-user-invitation', data);
};
