import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { getChurchContextForUser } from '../services/churchContext';
import { validateChurch } from '../validators/churchValidator';
import { ChurchRegistrationData, AuthRequest } from '../types';
import { setAccessToken, setRefreshToken, setSessionCookie, clearAuthCookies, cookieConfig } from '../utils/cookieUtils';
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

    const { email, password, phone, cnpj, ...churchData } = req.body;

    // Verificar se já existe uma igreja com o CNPJ informado
    const { data: existingChurch, error: cnpjCheckError } = await supabase
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
    const { data: churchRecord, error: churchError } = await supabase
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

    // Verificar se há assinatura pendente vinculada ao email
    const { data: pendingSubscription, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('email', email)
      .gt('expires_at', new Date().toISOString()) // Apenas assinaturas não expiradas
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pendingError && pendingSubscription) {
      // Vincular assinatura pendente à igreja criada
      const { error: linkError } = await supabase
        .from('churches')
        .update({
          stripe_customer_id: pendingSubscription.stripe_customer_id,
          stripe_subscription_id: pendingSubscription.stripe_subscription_id,
          subscription_status: pendingSubscription.subscription_status,
          plan_type: pendingSubscription.plan_type,
          subscription_start_date: pendingSubscription.subscription_start_date,
        })
        .eq('id', churchRecord.id);

      if (!linkError) {
        // Remover da tabela de pendentes após vincular com sucesso
        await supabase
          .from('pending_subscriptions')
          .delete()
          .eq('id', pendingSubscription.id);
        
        console.log(`✅ Assinatura pendente vinculada à igreja ${churchRecord.id}`);
      } else {
        console.error('Erro ao vincular assinatura pendente:', linkError);
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

    // Retornar resposta imediatamente, sem esperar emails
    res.status(201).json({
      message: 'Igreja registrada com sucesso',
      church: churchRecord,
      subscriptionLinked: !!pendingSubscription
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

    // Resolver igreja: church_users (convidados) ou churches.user_id (owner)
    const context = await getChurchContextForUser(authData.user.id);
    if (!context) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja.'
      });
    }

    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', context.churchId)
      .single();

    if (churchError || !churchData) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: churchError?.message ?? 'Igreja não encontrada.'
      });
    }

    // Definir cookies seguros
    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at
    });

    res.json({
      message: 'Login realizado com sucesso',
      church: churchData
      // Não retornar tokens no JSON - agora estão em cookies seguros
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

    // Tentar fazer logout no Supabase (se suportado)
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      // Se o Supabase não suportar logout server-side, continuamos com a blacklist
      console.warn('Supabase signOut não suportado no servidor:', signOutError);
    }

    // Adicionar token à blacklist (implementação simples em memória)
    // Em produção, usar Redis ou banco de dados
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