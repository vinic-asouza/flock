'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type {
  TeachingClass,
  TeachingClassStatus,
  TeachingProgram,
} from '@/types';
import { STATUS_OPTIONS } from './constants';
import { toDateInputValue } from './dates';
import { joinTeachingSchedule, splitTeachingSchedule } from './schedule';

export function ProgramFormModal({
  open,
  onClose,
  program,
  congregations,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  program: TeachingProgram | null;
  congregations: Array<{ value: string; label: string }>;
  onSaved: () => Promise<void>;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [congregationId, setCongregationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(program?.name || '');
    setDescription(program?.description || '');
    setScope(program?.congregation_id ? 'one' : 'all');
    setCongregationId(program?.congregation_id || '');
  }, [open, program]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        name,
        description: description || null,
        congregation_id: scope === 'one' ? congregationId : null,
      };
      if (program) await apiService.updateTeachingProgram(program.id, payload);
      else await apiService.createTeachingProgram(payload);
      toast.success(program ? 'Programa atualizado' : 'Programa criado');
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!program) return;
    if (!window.confirm('Excluir este programa também remove as turmas vinculadas. Continuar?')) return;
    try {
      setDeleting(true);
      await apiService.deleteTeachingProgram(program.id);
      toast.success('Programa excluído');
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
      title={program ? 'Editar programa' : 'Novo programa'}
      footer={
        <div className="flex flex-wrap gap-2 justify-between w-full p-4 sm:p-6">
          {program ? (
            <Button variant="danger" onClick={handleDelete} disabled={deleting || saving} className="min-h-11">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose} className="min-h-11">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || name.trim().length < 2} className="min-h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} className="text-base" />
        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-base"
        />
        <Select
          label="Escopo"
          value={scope}
          onChange={(v) => setScope(v as 'all' | 'one')}
          options={[
            { value: 'all', label: 'Todas as congregações' },
            { value: 'one', label: 'Congregação específica' },
          ]}
        />
        {scope === 'one' ? (
          <Select
            label="Congregação"
            value={congregationId}
            onChange={setCongregationId}
            options={congregations}
            searchable
          />
        ) : null}
      </div>
    </Modal>
  );
}

export function ClassFormModal({
  open,
  onClose,
  teachingClass,
  programs,
  programOptions,
  congregations,
  defaultCongregationId,
  lockedProgramId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  teachingClass: TeachingClass | null;
  programs: TeachingProgram[];
  programOptions: Array<{ value: string; label: string }>;
  congregations: Array<{ value: string; label: string }>;
  defaultCongregationId?: string;
  lockedProgramId?: string;
  onSaved: () => Promise<void>;
}) {
  const [programId, setProgramId] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TeachingClassStatus>('draft');
  const [responsibleId, setResponsibleId] = useState('');
  const [responsibleLabel, setResponsibleLabel] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [teacherLabels, setTeacherLabels] = useState<Record<string, string>>({});
  const [teacherPick, setTeacherPick] = useState('');
  const [saving, setSaving] = useState(false);
  const initializedForOpen = useRef(false);

  const selectedProgram = programs.find((p) => p.id === programId);
  const lockedCongregation = selectedProgram?.congregation_id || null;
  const lockedProgramName =
    programOptions.find((p) => p.value === (lockedProgramId || programId))?.label ||
    selectedProgram?.name;

  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: congregationId || null,
    enabled: open && Boolean(congregationId),
  });

  // Só hidrata o form ao abrir / trocar a turma — evita reset ao re-render do pai.
  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false;
      return;
    }
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;

    const initialProgramId =
      teachingClass?.program_id || lockedProgramId || programOptions[0]?.value || '';
    setProgramId(initialProgramId);
    const program = programs.find((p) => p.id === initialProgramId);
    setCongregationId(
      teachingClass?.congregation_id ||
        program?.congregation_id ||
        defaultCongregationId ||
        congregations[0]?.value ||
        ''
    );
    setName(teachingClass?.name || '');
    setLocation(teachingClass?.location || '');
    const split = splitTeachingSchedule(teachingClass?.schedule);
    setScheduleDay(split.day);
    setScheduleTime(split.time);
    setStartDate(toDateInputValue(teachingClass?.start_date));
    setEndDate(toDateInputValue(teachingClass?.end_date));
    setStatus(teachingClass?.status || 'draft');

    const nextResponsibleId =
      teachingClass?.responsible_id || teachingClass?.responsible?.id || '';
    setResponsibleId(nextResponsibleId);
    setResponsibleLabel(teachingClass?.responsible?.name || '');

    const fromTeachers = (teachingClass?.teachers || []).filter(Boolean) as Array<{
      id: string;
      name: string;
    }>;
    const idsFromTeachers = fromTeachers.map((t) => t.id);
    const idsFromApi = teachingClass?.teacher_ids || [];
    const nextTeacherIds =
      idsFromTeachers.length > 0 || idsFromApi.length > 0
        ? [...new Set([...idsFromTeachers, ...idsFromApi])]
        : [];
    setTeacherIds(nextTeacherIds);
    setTeacherLabels(
      Object.fromEntries(
        fromTeachers.filter((t) => t.name?.trim()).map((t) => [t.id, t.name])
      )
    );
    setTeacherPick('');
    setSearch('');
  }, [
    open,
    teachingClass,
    programOptions,
    congregations,
    defaultCongregationId,
    lockedProgramId,
    programs,
    setSearch,
  ]);

  useEffect(() => {
    if (lockedCongregation) setCongregationId(lockedCongregation);
  }, [lockedCongregation]);

  useEffect(() => {
    if (!responsibleId) return;
    const match = memberOptionsData.find((m) => m.id === responsibleId);
    if (match) setResponsibleLabel(match.name);
  }, [memberOptionsData, responsibleId]);

  // Resolve nomes de professores ausentes (hidratação só com IDs ou join sem name).
  const teacherLabelsRef = useRef(teacherLabels);
  teacherLabelsRef.current = teacherLabels;

  useEffect(() => {
    if (!open || teacherIds.length === 0) return;

    setTeacherLabels((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of teacherIds) {
        if (next[id]?.trim()) continue;
        const match = memberOptionsData.find((m) => m.id === id);
        if (match?.name) {
          next[id] = match.name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    const missingIds = teacherIds.filter((id) => {
      if (teacherLabelsRef.current[id]?.trim()) return false;
      return !memberOptionsData.some((m) => m.id === id && m.name);
    });
    if (missingIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const resolved: Record<string, string> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const member = await apiService.getMember(id);
            if (member?.name) resolved[id] = member.name;
          } catch {
            // mantém fallback visual
          }
        })
      );
      if (cancelled || Object.keys(resolved).length === 0) return;
      setTeacherLabels((prev) => ({ ...prev, ...resolved }));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, teacherIds, memberOptionsData]);

  const responsibleOptions = useMemo(() => {
    const base = memberOptionsData
      .filter((m) => !teacherIds.includes(m.id))
      .map((m) => ({ value: m.id, label: m.name }));
    if (responsibleId && !base.some((o) => o.value === responsibleId)) {
      base.unshift({
        value: responsibleId,
        label: responsibleLabel || 'Responsável selecionado',
      });
    }
    return base;
  }, [memberOptionsData, responsibleId, responsibleLabel, teacherIds]);

  const teacherPickOptions = useMemo(() => {
    return memberOptionsData
      .filter((m) => m.id !== responsibleId && !teacherIds.includes(m.id))
      .map((m) => ({ value: m.id, label: m.name }));
  }, [memberOptionsData, responsibleId, teacherIds]);

  const handleResponsibleChange = (value: string) => {
    setResponsibleId(value);
    const match = memberOptionsData.find((m) => m.id === value);
    if (match) setResponsibleLabel(match.name);
    else if (!value) setResponsibleLabel('');
    // Se o novo responsável estava como professor, remove da lista
    if (value) {
      setTeacherIds((prev) => prev.filter((id) => id !== value));
    }
  };

  const handleAddTeacher = (id: string) => {
    if (!id || id === responsibleId || teacherIds.includes(id)) {
      setTeacherPick('');
      return;
    }
    const fromMembers = memberOptionsData.find((m) => m.id === id);
    const fromPick = teacherPickOptions.find((o) => o.value === id);
    const label = fromMembers?.name || fromPick?.label || '';
    setTeacherIds((prev) => [...prev, id]);
    if (label) {
      setTeacherLabels((prev) => ({ ...prev, [id]: label }));
    } else {
      void apiService.getMember(id).then((member) => {
        if (member?.name) {
          setTeacherLabels((prev) => ({ ...prev, [id]: member.name }));
        }
      });
    }
    setTeacherPick('');
  };

  const handleSave = async () => {
    if (!startDate) {
      toast.error('Informe a data de início da turma');
      return;
    }
    if (endDate && endDate < startDate) {
      toast.error('A data de término deve ser igual ou posterior à data de início');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        program_id: programId,
        congregation_id: congregationId,
        name,
        location: location || null,
        schedule: joinTeachingSchedule(scheduleDay, scheduleTime),
        start_date: startDate,
        end_date: endDate || null,
        status,
        responsible_id: responsibleId,
        teacher_ids: teacherIds.filter((id) => id !== responsibleId),
      };
      if (teachingClass) await apiService.updateTeachingClass(teachingClass.id, payload);
      else await apiService.createTeachingClass(payload);
      toast.success(teachingClass ? 'Turma atualizada' : 'Turma criada');
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={teachingClass ? 'Editar turma' : 'Nova turma'}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full p-4 sm:p-6">
          <Button variant="secondary" onClick={onClose} className="min-h-11">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !programId ||
              !congregationId ||
              !responsibleId ||
              !startDate ||
              name.trim().length < 2
            }
            className="min-h-11"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {lockedProgramId ? (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Programa</p>
              <p className="text-base text-gray-900 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                {lockedProgramName}
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Select
                label="Programa"
                value={programId}
                onChange={setProgramId}
                options={programOptions}
                searchable
              />
            </div>
          )}
          <Select
            label="Congregação"
            value={congregationId}
            onChange={(v) => {
              setCongregationId(v);
              setResponsibleId('');
              setResponsibleLabel('');
              setTeacherIds([]);
              setTeacherLabels({});
              setSearch('');
            }}
            options={congregations}
            searchable
            disabled={Boolean(lockedCongregation)}
          />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as TeachingClassStatus)}
            options={STATUS_OPTIONS}
          />
          <div className="sm:col-span-2">
            <Input
              label="Nome da turma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base"
            />
          </div>
          <Input
            label="Local"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="text-base"
            placeholder="Ex.: Sala 2"
          />
          <Input
            label="Dia (opcional)"
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            className="text-base"
            placeholder="Ex.: Domingo"
          />
          <Input
            label="Horário"
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="text-base"
          />
          <Input
            label="Data de início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-base min-h-11"
          />
          <Input
            label="Data de término"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-base min-h-11"
            helperText="Opcional. Deve ser igual ou posterior ao início."
          />
          <div className="sm:col-span-2">
            <Select
              label="Responsável"
              value={responsibleId}
              onChange={handleResponsibleChange}
              options={responsibleOptions}
              searchable
              onSearchChange={setSearch}
              placeholder={congregationId ? 'Digite para buscar…' : 'Selecione a congregação primeiro'}
              disabled={!congregationId}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Select
            label="Adicionar professor"
            value={teacherPick}
            onChange={handleAddTeacher}
            options={teacherPickOptions}
            searchable
            onSearchChange={setSearch}
            placeholder={
              !congregationId
                ? 'Selecione a congregação primeiro'
                : !responsibleId
                  ? 'Selecione o responsável primeiro'
                  : 'Digite para buscar…'
            }
            disabled={!congregationId || !responsibleId}
          />
          <div className="flex flex-wrap gap-2">
            {teacherIds.map((id) => (
              <button
                key={id}
                type="button"
                className="rounded-full bg-slate-100 px-3 py-1 text-sm min-h-11"
                onClick={() => {
                  setTeacherIds((prev) => prev.filter((x) => x !== id));
                  setTeacherLabels((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                }}
              >
                {teacherLabels[id]?.trim() || 'Professor'} ×
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
