import supabase from '../services/supabase';
import { Request } from 'express';

interface AuditLogData {
  entity: 'member' | 'role' | 'congregation';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changesBefore?: any;
  changesAfter?: any;
  ip?: string;
  userAgent?: string;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  church_id?: string;
}

export const logAudit = async (req: AuthRequest, data: AuditLogData) => {
  try {
    if (!req.user?.id) {
      console.warn('Audit log: usuário não autenticado');
      return;
    }

    // Buscar church_id se não estiver disponível
    let churchId = req.church_id;
    if (!churchId) {
      const { data: church } = await supabase
        .from('churches')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      
      if (church) {
        churchId = church.id;
      }
    }

    if (!churchId) {
      console.warn('Audit log: church_id não encontrado');
      return;
    }

    // Inserir log (sem IP e User-Agent por enquanto)
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        church_id: churchId,
        entity: data.entity,
        entity_id: data.entityId,
        action: data.action,
        changes_before: data.changesBefore || null,
        changes_after: data.changesAfter || null
      });

    if (error) {
      console.error('Erro ao inserir audit log:', error);
    }
  } catch (error) {
    console.error('Erro no audit logger:', error);
  }
};
