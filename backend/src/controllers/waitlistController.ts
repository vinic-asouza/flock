import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { validateWaitlist } from '../validators/waitlistValidator';

export const subscribe = async (req: Request, res: Response) => {
  try {
    // Validar dados da requisição
    const { error: validationError } = validateWaitlist(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message),
      });
    }

    const { name, email, phone, churchName, city, state } = req.body;

    // Verificar se já existe um cadastro com este email
    const { data: existingEntry, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 é o código para "não encontrado"
      return res.status(500).json({
        error: 'Erro ao verificar email',
        details: checkError.message,
      });
    }

    if (existingEntry) {
      return res.status(400).json({
        error: 'Email já cadastrado',
        details: 'Este email já está na lista de espera',
      });
    }

    // Inserir na lista de espera
    const { data: waitlistEntry, error: insertError } = await supabase
      .from('waitlist')
      .insert([
        {
          name,
          email,
          phone,
          church_name: churchName,
          city,
          state: state.toUpperCase(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: 'Erro ao cadastrar na lista de espera',
        details: insertError.message,
      });
    }

    res.status(201).json({
      message: 'Cadastro realizado com sucesso',
      data: {
        id: waitlistEntry.id,
        email: waitlistEntry.email,
      },
    });
  } catch (error) {
    console.error('Erro ao cadastrar na lista de espera:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

