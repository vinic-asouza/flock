'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type { ChurchEvent, EventStatus } from '@/types';
import { EVENT_STATUS_OPTIONS } from './constants';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from './EventUi';

export function EventFormModal({
  open,
  onClose,
  event,
  congregations,
  defaultCongregationId,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  event: ChurchEvent | null;
  congregations: Array<{ value: string; label: string }>;
  defaultCongregationId?: string;
  onSaved: () => Promise<void>;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [congregationId, setCongregationId] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [capacity, setCapacity] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [responsibleLabel, setResponsibleLabel] = useState('');
  const [organizerIds, setOrganizerIds] = useState<string[]>([]);
  const [organizerLabels, setOrganizerLabels] = useState<Record<string, string>>({});
  const [organizerPick, setOrganizerPick] = useState('');
  const [groupId, setGroupId] = useState('');
  const [ministryOptions, setMinistryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initializedForOpen = useRef(false);

  const memberCongregationId = scope === 'one' ? congregationId || null : null;
  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: memberCongregationId,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false;
      return;
    }
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;

    setName(event?.name || '');
    setDescription(event?.description || '');
    setStartsAt(toDateTimeLocalValue(event?.starts_at));
    setEndsAt(toDateTimeLocalValue(event?.ends_at));
    setLocation(event?.location || '');
    setScope(event?.congregation_id ? 'one' : 'all');
    setCongregationId(event?.congregation_id || defaultCongregationId || congregations[0]?.value || '');
    setStatus(event?.status || 'draft');
    setCapacity(event?.capacity != null ? String(event.capacity) : '');
    setResponsibleId(event?.responsible_id || event?.responsible?.id || '');
    setResponsibleLabel(event?.responsible?.name || '');
    const organizers = (event?.organizers || []).filter(Boolean) as Array<{ id: string; name: string }>;
    const ids = organizers.length
      ? organizers.map((o) => o.id)
      : event?.organizer_ids || [];
    setOrganizerIds(ids);
    setOrganizerLabels(Object.fromEntries(organizers.map((o) => [o.id, o.name])));
    setGroupId(event?.group_id || '');
    setOrganizerPick('');
    setSearch('');
  }, [open, event, congregations, defaultCongregationId, setSearch]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const params =
          scope === 'one' && congregationId ? { congregation_id: congregationId } : undefined;
        const groups = await apiService.listGroups(params);
        if (cancelled) return;
        setMinistryOptions(
          (groups || []).map((g: { id: string; name: string }) => ({
            value: g.id,
            label: g.name,
          }))
        );
      } catch {
        if (!cancelled) setMinistryOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scope, congregationId]);

  useEffect(() => {
    if (!responsibleId) return;
    const match = memberOptionsData.find((m) => m.id === responsibleId);
    if (match) setResponsibleLabel(match.name);
  }, [memberOptionsData, responsibleId]);

  const responsibleOptions = useMemo(() => {
    const base = memberOptionsData
      .filter((m) => !organizerIds.includes(m.id))
      .map((m) => ({ value: m.id, label: m.name }));
    if (responsibleId && !base.some((o) => o.value === responsibleId)) {
      base.unshift({
        value: responsibleId,
        label: responsibleLabel || 'Responsável selecionado',
      });
    }
    return base;
  }, [memberOptionsData, organizerIds, responsibleId, responsibleLabel]);

  const organizerPickOptions = useMemo(
    () =>
      memberOptionsData
        .filter((m) => m.id !== responsibleId && !organizerIds.includes(m.id))
        .map((m) => ({ value: m.id, label: m.name })),
    [memberOptionsData, responsibleId, organizerIds]
  );

  const handleCongregationChange = (value: string) => {
    setCongregationId(value);
    setResponsibleId('');
    setResponsibleLabel('');
    setOrganizerIds([]);
    setOrganizerLabels({});
    setGroupId('');
    setSearch('');
  };

  const handleScopeChange = (value: string) => {
    const next = value === 'one' ? 'one' : 'all';
    setScope(next);
    setResponsibleId('');
    setResponsibleLabel('');
    setOrganizerIds([]);
    setOrganizerLabels({});
    setGroupId('');
    if (next === 'one' && !congregationId) {
      setCongregationId(defaultCongregationId || congregations[0]?.value || '');
    }
  };

  const handleSave = async () => {
    const startsIso = fromDateTimeLocalValue(startsAt);
    if (!name.trim() || !startsIso || !responsibleId) {
      toast.error('Preencha nome, início e responsável');
      return;
    }
    if (scope === 'one' && !congregationId) {
      toast.error('Selecione a congregação');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        starts_at: startsIso,
        ends_at: fromDateTimeLocalValue(endsAt),
        location: location.trim() || null,
        congregation_id: scope === 'one' ? congregationId : null,
        status,
        capacity: capacity.trim() ? Number(capacity) : null,
        responsible_id: responsibleId,
        group_id: groupId || null,
        organizer_ids: organizerIds,
      };
      if (event) await apiService.updateEvent(event.id, payload);
      else await apiService.createEvent(payload);
      toast.success(event ? 'Evento atualizado' : 'Evento criado');
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm('Excluir este evento também remove inscritos e o link público. Continuar?')) {
      return;
    }
    try {
      setDeleting(true);
      await apiService.deleteEvent(event.id);
      toast.success('Evento excluído');
      onClose();
      if (onDeleted) onDeleted();
      else await onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Novo evento'}
      footer={
        <div className="flex flex-wrap gap-2 justify-between w-full p-4 sm:p-6">
          {event ? (
            <Button variant="danger" onClick={handleDelete} disabled={deleting || saving} className="min-h-11">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose} disabled={saving || deleting} className="min-h-11">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting} className="min-h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        <Input label="Nome *" value={name} onChange={(e) => setName(e.target.value)} className="text-base" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Início *"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="text-base"
          />
          <Input
            label="Fim"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="text-base"
          />
        </div>
        <Input label="Local" value={location} onChange={(e) => setLocation(e.target.value)} className="text-base" />
        <Select
          label="Escopo *"
          value={scope}
          onChange={handleScopeChange}
          options={[
            { value: 'all', label: 'Todas as congregações' },
            { value: 'one', label: 'Congregação específica' },
          ]}
        />
        {scope === 'one' ? (
          <Select
            label="Congregação *"
            value={congregationId}
            onChange={handleCongregationChange}
            options={congregations}
            placeholder="Selecione"
          />
        ) : null}
        <Select
          label="Status *"
          value={status}
          onChange={(v) => setStatus(v as EventStatus)}
          options={EVENT_STATUS_OPTIONS}
        />
        <Input
          label="Capacidade (vagas)"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          helperText="Deixe vazio para ilimitado. Sem lista de espera."
          className="text-base"
        />
        <Select
          label="Responsável *"
          value={responsibleId}
          onChange={(value) => {
            setResponsibleId(value);
            const match = memberOptionsData.find((m) => m.id === value);
            if (match) setResponsibleLabel(match.name);
            if (value) setOrganizerIds((prev) => prev.filter((id) => id !== value));
          }}
          onSearchChange={setSearch}
          searchable
          options={responsibleOptions}
          placeholder="Buscar membro"
        />
        <div className="space-y-2">
          <Select
            label="Organizadores"
            value={organizerPick}
            onChange={(id) => {
              if (!id || id === responsibleId || organizerIds.includes(id)) {
                setOrganizerPick('');
                return;
              }
              const label =
                memberOptionsData.find((m) => m.id === id)?.name ||
                organizerPickOptions.find((o) => o.value === id)?.label ||
                '';
              setOrganizerIds((prev) => [...prev, id]);
              if (label) setOrganizerLabels((prev) => ({ ...prev, [id]: label }));
              setOrganizerPick('');
            }}
            onSearchChange={setSearch}
            searchable
            options={organizerPickOptions}
            placeholder="Adicionar organizador"
          />
          {organizerIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {organizerIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-50 py-1 pl-3 pr-1 text-sm ring-1 ring-inset ring-slate-200"
                >
                  {organizerLabels[id] || 'Organizador'}
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-200"
                    onClick={() => setOrganizerIds((prev) => prev.filter((x) => x !== id))}
                    aria-label="Remover organizador"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Select
          label="Ministério responsável"
          value={groupId}
          onChange={setGroupId}
          options={[{ value: '', label: 'Nenhum' }, ...ministryOptions]}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  );
}
