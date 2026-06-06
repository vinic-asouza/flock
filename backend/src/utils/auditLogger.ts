import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';
import { AuthRequest } from '../types';

interface AuditLogData {
  entity: 'member' | 'congregation' | 'integration_member' | 'public_registration_link' | 'public_integration_link' | 'group' | 'member_group' | 'calendar_item' | 'account' | 'church';
  entityId: string | null;
  action: 'create' | 'update' | 'delete' | 'convert' | 'import' | 'deactivate';
  changesBefore?: any;
  changesAfter?: any;
  ip?: string;
  userAgent?: string;
}

export const logAudit = async (req: AuthRequest, data: AuditLogData) => {
  try {
    if (!req.user?.id) {
      logError('Audit log: usuário não autenticado');
      return;
    }

    const churchId = req.church?.churchId;

    if (!churchId) {
      logError('Audit log: church_id não encontrado');
      return;
    }

    if (!data.entityId) {
      logError('Audit log: entity_id é obrigatório');
      return;
    }

    // Capturar IP e User-Agent do request
    const ipAddress = req.ip || 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
      req.socket.remoteAddress || 
      null;
    
    const userAgent = req.headers['user-agent'] || null;

    // Inserir log com IP e User-Agent
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        church_id: churchId,
        entity: data.entity,
        entity_id: data.entityId,
        action: data.action,
        changes_before: data.changesBefore || null,
        changes_after: data.changesAfter || null,
        ip: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      logError('Erro ao inserir audit log:', error);
    }
  } catch (error) {
    logError('Erro no audit logger:', error);
  }
};
