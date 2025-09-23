import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { validateChurch } from '../validators/churchValidator';
import { ChurchRegistrationData, AuthRequest } from '../types';
import { setAccessToken, setRefreshToken, setSessionCookie, clearAuthCookies, cookieConfig } from '../utils/cookieUtils';

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
        emailRedirectTo: `${process.env.APP_URL || 'http://localhost:4000'}/auth/callback`
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

    res.status(201).json({
      message: 'Igreja registrada com sucesso',
      church: churchRecord
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
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: authError?.message
      });
    }

    // Buscar dados da igreja
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (churchError) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: churchError.message
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