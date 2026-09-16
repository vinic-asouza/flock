import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createTeachingMaterialSchema,
  updateTeachingMaterialSchema,
} from '../validators/teachingValidator';
import { logAudit } from '../utils/auditLogger';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';

async function loadClassForChurch(classId: string, churchId: string) {
  return supabase
    .from('teaching_classes')
    .select('id, church_id, congregation_id, name, status')
    .eq('id', classId)
    .eq('church_id', churchId)
    .single();
}

export const listTeachingMaterials = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id: classId } = req.params;

    const { data: cls, error: classError } = await loadClassForChurch(classId, churchId);
    if (classError || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { data, error } = await supabase
      .from('teaching_materials')
      .select('*')
      .eq('class_id', classId)
      .eq('church_id', churchId)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao listar materiais',
        details: error.message,
      });
    }

    return res.json({ data: data || [] });
  } catch (err) {
    logError('Erro ao listar materiais de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar materiais',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createTeachingMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createTeachingMaterialSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id: classId } = req.params;

    const { data: cls, error: classError } = await loadClassForChurch(classId, churchId);
    if (classError || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const payload =
      value.type === 'link'
        ? {
            church_id: churchId,
            class_id: classId,
            type: 'link' as const,
            title: value.title,
            url: value.url,
            content: null,
          }
        : {
            church_id: churchId,
            class_id: classId,
            type: 'note' as const,
            title: value.title,
            url: null,
            content: value.content,
          };

    const { data: material, error: createError } = await supabase
      .from('teaching_materials')
      .insert([payload])
      .select()
      .single();

    if (createError || !material) {
      return res.status(400).json({
        error: 'Erro ao criar material',
        details: createError?.message || 'Não foi possível criar o material',
      });
    }

    await logAudit(req, {
      entity: 'teaching_material',
      entityId: material.id,
      action: 'create',
      changesAfter: material,
    });

    return res.status(201).json(material);
  } catch (err) {
    logError('Erro ao criar material de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar material',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const updateTeachingMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = updateTeachingMaterialSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { materialId } = req.params;

    const { data: existing, error: loadError } = await supabase
      .from('teaching_materials')
      .select('*')
      .eq('id', materialId)
      .eq('church_id', churchId)
      .single();

    if (loadError || !existing) {
      return res.status(404).json({
        error: 'Material não encontrado',
        details: 'Não foi possível encontrar o material solicitado',
      });
    }

    const { data: cls, error: classError } = await loadClassForChurch(existing.class_id, churchId);
    if (classError || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma do material',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    if (existing.type === 'link' && value.content !== undefined) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'Link não deve ter conteúdo',
      });
    }
    if (existing.type === 'note' && value.url !== undefined) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'Anotação não deve ter URL',
      });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (value.title !== undefined) updates.title = value.title;
    if (existing.type === 'link' && value.url !== undefined) updates.url = value.url;
    if (existing.type === 'note' && value.content !== undefined) updates.content = value.content;

    const { data: material, error: updateError } = await supabase
      .from('teaching_materials')
      .update(updates)
      .eq('id', materialId)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !material) {
      return res.status(400).json({
        error: 'Erro ao atualizar material',
        details: updateError?.message || 'Não foi possível atualizar o material',
      });
    }

    await logAudit(req, {
      entity: 'teaching_material',
      entityId: material.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: material,
    });

    return res.json(material);
  } catch (err) {
    logError('Erro ao atualizar material de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar material',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteTeachingMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { materialId } = req.params;

    const { data: existing, error: loadError } = await supabase
      .from('teaching_materials')
      .select('*')
      .eq('id', materialId)
      .eq('church_id', churchId)
      .single();

    if (loadError || !existing) {
      return res.status(404).json({
        error: 'Material não encontrado',
        details: 'Não foi possível encontrar o material solicitado',
      });
    }

    const { data: cls, error: classError } = await loadClassForChurch(existing.class_id, churchId);
    if (classError || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma do material',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { error: deleteError } = await supabase
      .from('teaching_materials')
      .delete()
      .eq('id', materialId)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir material',
        details: deleteError.message,
      });
    }

    await logAudit(req, {
      entity: 'teaching_material',
      entityId: materialId,
      action: 'delete',
      changesBefore: existing,
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir material de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao excluir material',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
