import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { validateChurch } from '../validators/churchValidator';
import { ChurchRegistrationData } from '../types';

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

    res.json({
      message: 'Login realizado com sucesso',
      session: authData.session,
      church: churchData
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 