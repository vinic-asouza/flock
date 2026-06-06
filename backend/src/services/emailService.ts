import { Resend } from 'resend';
import { redactRecipients } from '../utils/redact';
import { billingWarn, billingLog, billingError } from '../utils/structuredLogger';

/**
 * Cliente Resend (singleton)
 */
let resendClient: Resend | null = null;

/**
 * Inicializa o cliente Resend
 */
const getResendClient = (): Resend | null => {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY não configurada. Emails não serão enviados.');
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

/**
 * Verifica se o serviço de email está configurado
 */
export const isEmailConfigured = (): boolean => {
  const configured = !!process.env.RESEND_API_KEY;
  
  if (!configured) {
    console.warn('⚠️ Email não configurado. Verifique a variável RESEND_API_KEY');
  }
  
  return configured;
};

/**
 * Opções para envio de email
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string; // Para respostas chegarem no Umbler
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Envia um email via Resend API
 */
export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // Se não estiver configurado, apenas logar e retornar (não quebrar o fluxo)
  if (!isEmailConfigured()) {
    billingWarn({
      event: 'email_skipped',
      reason: 'not_configured',
      to: redactRecipients(options.to),
      subject: options.subject,
    });
    return;
  }

  const client = getResendClient();
  if (!client) {
    console.error('❌ Cliente Resend não inicializado');
    return;
  }

  try {
    // Converter destinatários para array se necessário
    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const ccArray = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
    const bccArray = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined;

    // Email remetente configurável
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'contato@flockapp.com.br';
    const fromName = process.env.RESEND_FROM_NAME || 'Flock App';
    const from = `${fromName} <${fromEmail}>`;

    // Reply-To padrão para respostas chegarem no Umbler
    const replyTo = options.replyTo || process.env.ADMIN_EMAIL || 'contato@flockapp.com.br';

    // Enviar email
    const { data, error } = await client.emails.send({
      from,
      to: toArray,
      cc: ccArray,
      bcc: bccArray,
      reply_to: replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Remove HTML tags para versão texto
    });

    if (error) {
      throw new Error(`Resend API Error: ${JSON.stringify(error)}`);
    }

    billingLog({
      event: 'email_sent',
      message_id: data?.id,
      to: redactRecipients(options.to),
      subject: options.subject,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    billingError({
      event: 'email_failed',
      to: redactRecipients(options.to),
      subject: options.subject,
      error: errMsg,
    });
  }
};

/**
 * Envia email para administradores (helper)
 */
export const sendAdminEmail = async (options: Omit<SendEmailOptions, 'to'>): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'contato@flockapp.com.br';
  return sendEmail({
    ...options,
    to: adminEmail,
  });
};

/**
 * Verifica conexão com Resend (não necessário, mas mantém compatibilidade)
 */
export const verifySMTPConnection = async (): Promise<boolean> => {
  if (!isEmailConfigured()) {
    console.warn('⚠️ Email não configurado');
    return false;
  }

  // Resend não precisa de verificação de conexão prévia
  // A API é stateless e verifica na hora do envio
  console.log('✅ Resend configurado (verificação não necessária)');
  return true;
};
