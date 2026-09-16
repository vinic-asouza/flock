'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, FileText, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingMaterial, TeachingMaterialType } from '@/types';
import { formatDate } from '@/utils';
import { TeachingEmptyState } from './TeachingUi';

const TYPE_OPTIONS = [
  { value: 'link', label: 'Link' },
  { value: 'note', label: 'Anotação' },
];

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function TypeBadge({ type }: { type: TeachingMaterialType }) {
  const isLink = type === 'link';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        isLink
          ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
          : 'bg-amber-50 text-amber-800 ring-amber-600/20'
      }`}
    >
      {isLink ? <Link2 className="h-3 w-3" aria-hidden /> : <FileText className="h-3 w-3" aria-hidden />}
      {isLink ? 'Link' : 'Anotação'}
    </span>
  );
}

function NoteBody({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = content.length > 180 || content.split('\n').length > 3;
  return (
    <div className="space-y-1">
      <p
        className={`whitespace-pre-wrap text-sm text-gray-700 ${
          !expanded && long ? 'line-clamp-3' : ''
        }`}
      >
        {content}
      </p>
      {long ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline min-h-11 px-0"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </div>
  );
}

export function TeachingMaterialsTab({
  teachingClass,
  readOnly,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
}) {
  const titleFieldId = useId();
  const [items, setItems] = useState<TeachingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeachingMaterial | null>(null);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TeachingMaterialType>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{ title?: string; url?: string; content?: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await apiService.listTeachingMaterials(teachingClass.id);
      setItems(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setLoadError(true);
      setItems([]);
      toast.error(formatApiError(err) || 'Não foi possível carregar os materiais.');
    } finally {
      setLoading(false);
    }
  }, [teachingClass.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setType('link');
    setTitle('');
    setUrl('');
    setContent('');
    setErrors({});
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: TeachingMaterial) => {
    setEditing(item);
    setType(item.type);
    setTitle(item.title);
    setUrl(item.url || '');
    setContent(item.content || '');
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    const dirty =
      title !== (editing?.title || '') ||
      url !== (editing?.url || '') ||
      content !== (editing?.content || '') ||
      (!editing && type !== 'link');
    if (dirty && !window.confirm('Descartar alterações não salvas?')) return;
    setModalOpen(false);
    resetForm();
  };

  const validate = () => {
    const next: typeof errors = {};
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) next.title = 'O título deve ter pelo menos 2 caracteres';
    if (trimmedTitle.length > 120) next.title = 'O título não pode ter mais de 120 caracteres';
    if (type === 'link') {
      if (!url.trim()) next.url = 'A URL é obrigatória';
      else if (!isValidHttpUrl(url.trim())) next.url = 'A URL deve usar http:// ou https://';
    } else if (!content.trim()) {
      next.content = 'O conteúdo é obrigatório';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const payload =
          editing.type === 'link'
            ? { title: title.trim(), url: url.trim() }
            : { title: title.trim(), content: content.trim() };
        await apiService.updateTeachingMaterial(editing.id, payload);
      } else if (type === 'link') {
        await apiService.createTeachingMaterial(teachingClass.id, {
          type: 'link',
          title: title.trim(),
          url: url.trim(),
        });
      } else {
        await apiService.createTeachingMaterial(teachingClass.id, {
          type: 'note',
          title: title.trim(),
          content: content.trim(),
        });
      }
      toast.success('Material salvo.');
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: TeachingMaterial) => {
    if (!window.confirm(`Excluir este material?\n\n${item.title}`)) return;
    try {
      await apiService.deleteTeachingMaterial(item.id);
      toast.success('Material excluído.');
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500" role="status">
        Carregando materiais…
      </div>
    );
  }

  if (loadError) {
    return (
      <TeachingEmptyState
        text="Não foi possível carregar os materiais."
        action={
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Materiais</h2>
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? 'Nenhum item'
              : `${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
          </p>
        </div>
        {!readOnly ? (
          <Button type="button" onClick={openCreate} className="w-full sm:w-auto min-h-11">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Adicionar material
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <TeachingEmptyState
          text={
            readOnly
              ? 'Ainda não há materiais nesta turma.'
              : 'Ainda não há materiais nesta turma. Adicione links e anotações para consulta rápida da equipe.'
          }
          action={
            !readOnly ? (
              <Button type="button" onClick={openCreate} className="min-h-11">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Adicionar material
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={item.type} />
                    <h3 className="truncate text-sm font-medium text-gray-900">{item.title}</h3>
                  </div>
                  {item.type === 'link' && item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline break-all"
                    >
                      <span className="truncate">{item.url}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  ) : null}
                  {item.type === 'note' && item.content ? <NoteBody content={item.content} /> : null}
                  <p className="text-xs text-gray-500">
                    Atualizado em {formatDate(item.updated_at)}
                  </p>
                </div>
                {!readOnly ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11"
                      aria-label={`Editar ${item.title}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11 text-red-600 hover:text-red-700"
                      aria-label={`Excluir ${item.title}`}
                      onClick={() => void handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar material' : 'Adicionar material'}
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} isLoading={saving}>
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {editing ? (
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Tipo</p>
              <TypeBadge type={editing.type} />
            </div>
          ) : (
            <Select
              label="Tipo"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(value) => {
                setType(value as TeachingMaterialType);
                setErrors({});
              }}
            />
          )}

          <Input
            id={titleFieldId}
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            maxLength={120}
            autoFocus
          />

          {(editing ? editing.type === 'link' : type === 'link') ? (
            <Input
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={errors.url}
              helperText="Use http:// ou https://"
              placeholder="https://"
              inputMode="url"
            />
          ) : (
            <div className="space-y-2">
              <label htmlFor={`${titleFieldId}-content`} className="block text-sm font-medium text-gray-700">
                Conteúdo
              </label>
              <textarea
                id={`${titleFieldId}-content`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={5000}
                className={`block w-full rounded-md border bg-white px-3 py-2 text-[16px] text-[#222] placeholder-[#888] font-sans focus:outline-none focus:ring-1 sm:text-[15px] ${
                  errors.content
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-primary focus:ring-primary/20'
                }`}
                aria-invalid={Boolean(errors.content)}
              />
              {errors.content ? <p className="text-sm text-red-600">{errors.content}</p> : null}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
