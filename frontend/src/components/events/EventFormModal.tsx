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

type FieldErrors = {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  congregationId?: string;
  responsibleId?: string;
};

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [baseline, setBaseline] = useState('');
  const initializedForOpen = useRef(false);

  const memberCongregationId = scope === 'one' ? congregationId || null : null;
  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: memberCongregationId,
    enabled: open,
  });

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        startsAt,
        endsAt,
        location,
        scope,
        congregationId,
        status,
        capacity,
        responsibleId,
        organizerIds,
        groupId,
      }),
    [
      name,
      description,
      startsAt,
      endsAt,
      location,
      scope,
      congregationId,
      status,
      capacity,
      responsibleId,
      organizerIds,
      groupId,
    ]
  );

  const isDirty = Boolean(baseline) && snapshot !== baseline;

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false;
      return;
    }
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;

    const nextName = event?.name || '';
    const nextDescription = event?.description || '';
    const nextStartsAt = toDateTimeLocalValue(event?.starts_at);
    const nextEndsAt = toDateTimeLocalValue(event?.ends_at);
    const nextLocation = event?.location || '';
    const nextScope: 'all' | 'one' = event?.congregation_id ? 'one' : 'all';
    const nextCongregationId =
      event?.congregation_id || defaultCongregationId || congregations[0]?.value || '';
    const nextStatus: EventStatus = event?.status || 'draft';
    const nextCapacity = event?.capacity != null ? String(event.capacity) : '';
    const nextResponsibleId = event?.responsible_id || event?.responsible?.id || '';
    const nextResponsibleLabel = event?.responsible?.name || '';
    const organizers = (event?.organizers || []).filter(Boolean) as Array<{ id: string; name: string }>;
    const nextOrganizerIds = organizers.length
      ? organizers.map((o) => o.id)
      : event?.organizer_ids || [];
    const nextOrganizerLabels = Object.fromEntries(organizers.map((o) => [o.id, o.name]));
    const nextGroupId = event?.group_id || '';

    setName(nextName);
    setDescription(nextDescription);
    setStartsAt(nextStartsAt);
    setEndsAt(nextEndsAt);
    setLocation(nextLocation);
    setScope(nextScope);
    setCongregationId(nextCongregationId);
    setStatus(nextStatus);
    setCapacity(nextCapacity);
    setResponsibleId(nextResponsibleId);
    setResponsibleLabel(nextResponsibleLabel);
    setOrganizerIds(nextOrganizerIds);
    setOrganizerLabels(nextOrganizerLabels);
    setGroupId(nextGroupId);
    setOrganizerPick('');
    setSearch('');
    setFieldErrors({});
    setBaseline(
      JSON.stringify({
        name: nextName,
        description: nextDescription,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        location: nextLocation,
        scope: nextScope,
        congregationId: nextCongregationId,
        status: nextStatus,
        capacity: nextCapacity,
        responsibleId: nextResponsibleId,
        organizerIds: nextOrganizerIds,
        groupId: nextGroupId,
      })
    );
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

  const requestClose = () => {
    if (saving || deleting) return;
    if (isDirty && !window.confirm('Descartar alterações não salvas?')) return;
    onClose();
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'Informe o nome do evento';
    if (!startsAt) next.startsAt = 'Informe a data de início';
    if (!responsibleId) next.responsibleId = 'Selecione o responsável';
    if (scope === 'one' && !congregationId) next.congregationId = 'Selecione a congregação';

    const startsIso = fromDateTimeLocalValue(startsAt);
    const endsIso = fromDateTimeLocalValue(endsAt);
    if (startsIso && endsIso && endsIso < startsIso) {
      next.endsAt = 'A data de término deve ser igual ou posterior à data de início';
    }

    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error('Corrija os campos destacados antes de salvar');
      return false;
    }
    return true;
  };

  const confirmClearTeamFields = () => {
    const hasTeam = Boolean(responsibleId || groupId || organizerIds.length > 0);
    if (!hasTeam) return true;
    return window.confirm(
      'Trocar o escopo limpa responsável, organizadores e ministério. Continuar?'
    );
  };

  const clearTeamFields = () => {
    setResponsibleId('');
    setResponsibleLabel('');
    setOrganizerIds([]);
    setOrganizerLabels({});
    setGroupId('');
    setSearch('');
  };

  const handleCongregationChange = (value: string) => {
    if (value === congregationId) return;
    if (!confirmClearTeamFields()) return;
    clearTeamFields();
    setCongregationId(value);
    setFieldErrors((prev) => ({ ...prev, congregationId: undefined, responsibleId: undefined }));
  };

  const handleScopeChange = (value: string) => {
    const next = value === 'one' ? 'one' : 'all';
    if (next === scope) return;
    if (!confirmClearTeamFields()) return;
    clearTeamFields();
    setScope(next);
    if (next === 'one' && !congregationId) {
      setCongregationId(defaultCongregationId || congregations[0]?.value || '');
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    const startsIso = fromDateTimeLocalValue(startsAt);
    if (!startsIso) return;

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
      setBaseline(snapshot);
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
      onClose={requestClose}
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
            <Button variant="secondary" onClick={requestClose} disabled={saving || deleting} className="min-h-11">
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
        <Input
          label="Nome *"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={fieldErrors.name}
          className="text-base"
        />
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
            onChange={(e) => {
              setStartsAt(e.target.value);
              setFieldErrors((prev) => ({ ...prev, startsAt: undefined, endsAt: undefined }));
            }}
            error={fieldErrors.startsAt}
            className="text-base"
          />
          <Input
            label="Fim"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => {
              setEndsAt(e.target.value);
              setFieldErrors((prev) => ({ ...prev, endsAt: undefined }));
            }}
            error={fieldErrors.endsAt}
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
            error={fieldErrors.congregationId}
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
            setFieldErrors((prev) => ({ ...prev, responsibleId: undefined }));
            const match = memberOptionsData.find((m) => m.id === value);
            if (match) setResponsibleLabel(match.name);
            if (value) setOrganizerIds((prev) => prev.filter((id) => id !== value));
          }}
          onSearchChange={setSearch}
          searchable
          options={responsibleOptions}
          placeholder="Buscar membro"
          error={fieldErrors.responsibleId}
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
