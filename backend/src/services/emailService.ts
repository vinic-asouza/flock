import nodemailer from 'nodemailer';

/**
 * Configuração do transporte SMTP
 */
const createTransporter = () => {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.umbler.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'contato@flockapp.com.br',
      pass: process.env.SMTP_PASS || 'sua_senha_aqui',
    },
    // Adicionar timeout e opções de conexão
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  return nodemailer.createTransport(smtpConfig);
};

/**
 * Verifica se o serviço de email está configurado
 */
export const isEmailConfigured = (): boolean => {
  const configured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  
  if (!configured) {
    console.warn('⚠️ Email não configurado. Verifique as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS');
  }
  
  return configured;
};

/**
 * Envia um email
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // Se não estiver configurado, apenas logar e retornar (não quebrar o fluxo)
  if (!isEmailConfigured()) {
    console.warn('⚠️ Email não configurado. Email não será enviado.');
    console.log('📧 Email que seria enviado:', {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    const transporter = createTransporter();

    // Verificar conexão antes de enviar
    console.log(`🔍 Tentando conectar ao servidor SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso');

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'Flock App',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'contato@flockapp.com.br',
      },
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Remove HTML tags para versão texto
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado com sucesso:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });
  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error);
    
    // Mensagens de erro mais amigáveis
    if (error.code === 'EAI_AGAIN' || error.code === 'EDNS') {
      console.error('💡 Erro de DNS. Verifique se o SMTP_HOST está correto.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Conexão recusada. Verifique se o SMTP_HOST e SMTP_PORT estão corretos.');
    } else if (error.code === 'EAUTH') {
      console.error('💡 Erro de autenticação. Verifique SMTP_USER e SMTP_PASS.');
    }
    
    // Não lançar erro para não quebrar o fluxo principal
    // Apenas logar o erro
  }
};

/**
 * Verifica conexão SMTP
 */
export const verifySMTPConnection = async (): Promise<boolean> => {
  if (!isEmailConfigured()) {
    console.warn('⚠️ Email não configurado');
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso');
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao verificar conexão SMTP:', error);
    
    if (error.code === 'EAI_AGAIN' || error.code === 'EDNS') {
      console.error('💡 Erro de DNS. Verifique se o SMTP_HOST está correto.');
    }
    
    return false;
  }
};
