import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { validateWaitlist } from '../validators/waitlistValidator';
import { sendEmail } from '../services/emailService';
import { getWaitlistConfirmationTemplate, getWaitlistNotificationTemplate } from '../templates/emailTemplates';

export const subscribe = async (req: Request, res: Response) => {
  try {
    if (req.body?.email) {
      req.body.email = String(req.body.email).trim().toLowerCase();
    }

    // Validar dados da requisição
    const { error: validationError } = validateWaitlist(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message),
      });
    }

    const { name, email, phone, churchName, city, state, plan, message } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: existingEntry, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedEmail)
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
          email: normalizedEmail,
          phone,
          church_name: churchName,
          city,
          state: state.toUpperCase(),
          plan,
          message: message || null,
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

    // Enviar emails (não bloquear o fluxo se der erro)
    try {
      // Email de confirmação para o usuário
      await sendEmail({
        to: normalizedEmail,
        subject: 'Solicitação Recebida - Flock',
        html: getWaitlistConfirmationTemplate({
          userName: name,
          userEmail: normalizedEmail,
        }),
      });

      // Email de notificação para administradores
      const adminEmail = process.env.ADMIN_EMAIL || 'contato@flockapp.com.br';
      await sendEmail({
        to: adminEmail,
        subject: `Novo Cadastro na Waitlist: ${name}`,
        html: getWaitlistNotificationTemplate({
          userName: name,
          userEmail: normalizedEmail,
          phone: phone || undefined,
          churchName: churchName || undefined,
          city: city || undefined,
          state: state || undefined,
          plan: plan || undefined,
          message: message || undefined,
        }),
      });
    } catch (emailError) {
      // Logar erro mas não quebrar o fluxo de cadastro na waitlist
      console.error('Erro ao enviar emails de waitlist:', emailError);
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

