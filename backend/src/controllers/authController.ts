import { Request, Response } from 'express';
import supabase, { supabaseAdmin } from '../services/supabase';

// Para queries de banco de dados usa service_role (bypassa RLS)
// supabase (anon) mantido apenas para supabase.auth.* (signUp, signIn, getUser)
const db = supabaseAdmin;
import { insertSubscriptionEvent } from '../services/stripeWebhookService';
import { sendOpsAlert } from '../services/opsAlertService';
import { billingLog } from '../utils/structuredLogger';
import { recordSubscriptionLinkFailed } from '../utils/billingMetrics';
import { validateChurch } from '../validators/churchValidator';
import { ChurchRegistrationData, AuthRequest } from '../types';
import {
  setAccessToken,
  setRefreshToken,
  setSessionCookie,
  clearAuthCookies,
  cookieConfig,
  setActiveChurchId,
  clearPendingLinkToken,
} from '../utils/cookieUtils';
import { stripe } from '../services/stripe';
import { listChurchMembershipsForUser, resolveChurchContextForUser } from '../services/churchContext';
import { sanitizeChurchForRole } from '../utils/churchDto';
import { sendEmail } from '../services/emailService';
import { getWelcomeEmailTemplate, getNewUserNotificationTemplate } from '../templates/emailTemplates';

export const register = async (req: Request<{}, {}, ChurchRegistrationData>, res: Response) => {
  try {
    // Validar dados da requisição
    const { error: validationError } = validateChurch(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const { email, password, phone, cnpj, link_token: linkTokenBody, checkout_session_id, ...churchData } =
      req.body;

    let link_token =
      linkTokenBody ||
      req.cookies?.[cookieConfig.names.pendingLinkToken];

    if (!link_token && checkout_session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(checkout_session_id);
        if (session.metadata?.link_token) {
          link_token = session.metadata.link_token;
        }
      } catch (sessionErr) {
        console.warn('[Register] Não foi possível resolver link_token pela sessão Stripe:', sessionErr);
      }
    }

    // Verificar se já existe uma igreja com o CNPJ informado
    const { data: existingChurch, error: cnpjCheckError } = await db
      .from('churches')
      .select('id')
      .eq('cnpj', cnpj)
      .single();

    if (cnpjCheckError && cnpjCheckError.code !== 'PGRST116') { // PGRST116 é o código para "não encontrado"
      return res.status(500).json({
        error: 'Erro ao verificar CNPJ',
        details: cnpjCheckError.message
      });
    }

    if (existingChurch) {
      return res.status(400).json({
        error: 'CNPJ já cadastrado',
        details: 'Já existe uma igreja cadastrada com este CNPJ'
      });
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback`
      }
    });

    if (authError) {
      // Se o erro for de email já existente, retornar mensagem específica
      if (authError.message.includes('already registered')) {
        return res.status(400).json({
          error: 'Email já cadastrado',
          details: 'Já existe um usuário cadastrado com este email'
        });
      }
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: authError.message
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: 'Não foi possível criar o usuário'
      });
    }

    // Inserir dados da igreja
    const { data: churchRecord, error: churchError } = await db
      .from('churches')
      .insert([{
        user_id: authData.user.id,
        cnpj,
        ...churchData
      }])
      .select()
      .single();

    if (churchError) {
      // Se houver erro ao criar igreja, deletar o usuário criado
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({
        error: 'Erro ao criar igreja',
        details: churchError.message
      });
    }

    let pendingSubscription: Record<string, unknown> | null = null;
    let pendingError: { message: string } | null = null;
    let subscriptionLinkFailed = false;

    if (link_token) {
      const { data, error: tokenErr } = await db
        .from('pending_subscriptions')
        .select('*')
        .eq('link_token', link_token)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      pendingError = tokenErr;
      pendingSubscription = data;

      if (pendingSubscription && pendingSubscription.email !== email) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({
          error: 'Email não corresponde ao checkout',
          details: 'Use o mesmo email informado no pagamento',
        });
      }
    }

    if (!pendingError && pendingSubscription) {
      // DB07/DB04: RPC atômica — UPDATE churches (incluindo last_stripe_event_created) +
      // DELETE pending em uma única transação. Pending só é removida após confirmação do update.
      const { data: rpcResult, error: rpcError } = await db.rpc('link_pending_to_church', {
        p_pending_id: pendingSubscription.id as string,
        p_church_id: churchRecord.id,
      });

      const rpcOk = !rpcError && (rpcResult as Record<string, unknown>)?.ok === true;
      if (rpcOk) {
        billingLog({
          event: 'link_pending',
          church_id: churchRecord.id,
          outcome: 'success',
        });
        await insertSubscriptionEvent({
          church_id: churchRecord.id,
          event_type: 'link_pending',
          new_plan: (pendingSubscription.plan_type as string) ?? null,
          new_status: (pendingSubscription.subscription_status as string) ?? null,
          source: 'api',
          payload: { pending_id: pendingSubscription.id },
        });
      } else {
        const reason = (rpcResult as Record<string, unknown>)?.error ?? rpcError?.message ?? 'unknown';
        billingLog({
          event: 'link_pending',
          church_id: churchRecord.id,
          outcome: 'failed',
          error: String(reason),
        });
        subscriptionLinkFailed = true;
        recordSubscriptionLinkFailed();
        sendOpsAlert('Falha ao vincular assinatura pendente no registro', {
          church_id: churchRecord.id,
          pending_id: pendingSubscription.id,
          reason,
        });
      }
    }

    // Enviar emails em background (não bloquear a resposta)
    // Usar IIFE para executar assincronamente sem await
    (async () => {
      try {
        const userName = churchData.name || email.split('@')[0];
        const churchName = churchRecord.name || churchData.name || 'Igreja';

        // Email de boas-vindas para o usuário
        await sendEmail({
          to: email,
          subject: 'Bem-vindo ao Flock!',
          html: getWelcomeEmailTemplate({
            userName,
            churchName,
            email,
          }),
        });

        // Email de notificação para administradores
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'contato@flockapp.com.br',
          subject: `Novo usuário registrado: ${churchName}`,
          html: getNewUserNotificationTemplate({
            userName,
            churchName,
            email,
            cnpj,
            phone,
          }),
        });
      } catch (emailError) {
        // Logar erro mas não quebrar o fluxo de registro
        console.error('Erro ao enviar emails de boas-vindas:', emailError);
      }
    })(); // IIFE - executa imediatamente sem bloquear

    setActiveChurchId(res, churchRecord.id);
    clearPendingLinkToken(res);

    res.status(201).json({
      message: 'Igreja registrada com sucesso',
      church: churchRecord,
      subscriptionLinked: !!pendingSubscription && !subscriptionLinkFailed,
      subscriptionLinkFailed,
      activeChurchId: churchRecord.id,
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const login = async (req: Request<{}, {}, { email: string; password: string }>, res: Response) => {
  try {
    const { email, password } = req.body;

    // Autenticar usuário
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      const raw = (authError?.message || '').toLowerCase();
      const isUnconfirmed = raw.includes('not confirmed') || raw.includes('confirm your email') || raw.includes('email not confirmed');
      if (isUnconfirmed) {
        return res.status(401).json({
          error: 'Email não confirmado',
          details: 'Necessário realizar confirmação de email. Verifique sua caixa de entrada.'
        });
      }
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: authError?.message
      });
    }

    const memberships = await listChurchMembershipsForUser(authData.user.id);
    if (memberships.length === 0) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja.',
      });
    }

    const activeChurchId = memberships[0].churchId;
    setActiveChurchId(res, activeChurchId);

    const context = await resolveChurchContextForUser(authData.user.id, activeChurchId);
    if (!context) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível resolver a igreja ativa.',
      });
    }

    const { data: churchData, error: churchError } = await db
      .from('churches')
      .select('*')
      .eq('id', context.churchId)
      .single();

    if (churchError || !churchData) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: churchError?.message ?? 'Igreja não encontrada.',
      });
    }

    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at,
    });

    res.json({
      message: 'Login realizado com sucesso',
      church: sanitizeChurchForRole(churchData, context.role),
      role: context.role,
      email: authData.user.email,
      memberships,
      activeChurchId,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Obter token do cookie (método preferido) ou do header (fallback)
    let token = req.cookies[cookieConfig.names.accessToken];
    
    if (!token) {
      // Fallback para header Authorization
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      // Mesmo sem token, limpar cookies e retornar sucesso
      console.log('Logout sem token - limpando cookies');
      clearAuthCookies(res);
      return res.json({
        message: 'Logout realizado com sucesso',
        details: 'Sua sessão foi encerrada com segurança'
      });
    }

    // Verificar se o token é válido antes de invalidar
    const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !user) {
      // Token inválido, mas ainda assim limpar cookies
      console.log('Token inválido no logout - limpando cookies');
      clearAuthCookies(res);
      return res.json({
        message: 'Logout realizado com sucesso',
        details: 'Sua sessão foi encerrada com segurança'
      });
    }

    // ACHADO 04: usar supabaseAdmin para invalidar a sessão do usuário no Supabase.
    // O cliente anon (supabase.auth.signOut) encerra apenas a sessão anônima do client,
    // não a sessão autenticada do usuário. O admin.signOut invalida o token server-side.
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.signOut(user.id);
      } catch (signOutError) {
        console.warn('[Logout] Erro ao invalidar sessão via supabaseAdmin:', signOutError);
      }
    } else {
      console.warn('[Logout] supabaseAdmin não disponível (SUPABASE_SERVICE_ROLE_KEY ausente). Sessão do Supabase pode permanecer ativa.');
    }

    // ACHADO 08: blacklist em memória — tokens revogados voltam a ser válidos após restart.
    // TODO: substituir por Redis ou tabela revoked_tokens no Supabase antes de ir para produção com alta criticidade.
    if (!global.tokenBlacklist) {
      global.tokenBlacklist = new Set();
    }
    
    // Calcular tempo de expiração do token
    try {
      const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const currentTime = Math.floor(Date.now() / 1000);
      const timeToExpire = tokenPayload.exp - currentTime;
      
      // Adicionar à blacklist com tempo de expiração
      global.tokenBlacklist.add(token);
      
      // Remover da blacklist após expiração (timeout)
      if (timeToExpire > 0) {
        setTimeout(() => {
          global.tokenBlacklist?.delete(token);
        }, timeToExpire * 1000);
      }
    } catch (parseError) {
      console.error('Erro ao processar token:', parseError);
      // Mesmo com erro, adicionar à blacklist por segurança
      global.tokenBlacklist.add(token);
    }

    // Limpar cookies de autenticação
    clearAuthCookies(res);

    res.json({
      message: 'Logout realizado com sucesso',
      details: 'Sua sessão foi encerrada com segurança'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    // Mesmo com erro, tentar limpar cookies
    clearAuthCookies(res);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 