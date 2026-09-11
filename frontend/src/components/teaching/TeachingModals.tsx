'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Trash2,
  User,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/common/Pagination';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type {
  TeachingClass,
  TeachingClassStatus,
  TeachingEnrollment,
  TeachingProgram,
  TeachingPublicLink,
} from '@/types';
import { formatPhone } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';
import { STATUS_OPTIONS } from './constants';
import { StatusBadge } from './TeachingUi';
import { joinTeachingSchedule, splitTeachingSchedule } from './schedule';

const ENROLLMENTS_PER_PAGE = 8;

function EnrollmentKindBadge({ kind }: { kind: TeachingEnrollment['kind'] }) {
  if (kind === 'member') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <UserRound className="h-3 w-3" />
        Membro
      </span>
    );
  }
  if (kind === 'guest') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
        <User className="h-3 w-3" />
        Convidado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
      Possível membro
    </span>
  );
}

function EnrollmentWhatsAppLink({
  whatsapp,
}: {
  whatsapp?: string | null;
}) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 transition-colors leading-tight"
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      {formatPhone(whatsapp)}
    </a>
  );
}

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
    setStatus(teachingClass?.status || 'draft');

    const nextResponsibleId =
      teachingClass?.responsible_id || teachingClass?.responsible?.id || '';
    setResponsibleId(nextResponsibleId);
    setResponsibleLabel(teachingClass?.responsible?.name || '');

    const fromTeachers = (teachingClass?.teachers || []).filter(Boolean) as Array<{
      id: string;
      name: string;
    }>;
    const nextTeacherIds =
      fromTeachers.length > 0
        ? fromTeachers.map((t) => t.id)
        : teachingClass?.teacher_ids || [];
    setTeacherIds(nextTeacherIds);
    setTeacherLabels(
      Object.fromEntries(fromTeachers.map((t) => [t.id, t.name]))
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

  useEffect(() => {
    if (teacherIds.length === 0) return;
    setTeacherLabels((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of teacherIds) {
        const match = memberOptionsData.find((m) => m.id === id);
        if (match && next[id] !== match.name) {
          next[id] = match.name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [memberOptionsData, teacherIds]);

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
    const match = memberOptionsData.find((m) => m.id === id);
    setTeacherIds((prev) => [...prev, id]);
    if (match) {
      setTeacherLabels((prev) => ({ ...prev, [id]: match.name }));
    }
    setTeacherPick('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        program_id: programId,
        congregation_id: congregationId,
        name,
        location: location || null,
        schedule: joinTeachingSchedule(scheduleDay, scheduleTime),
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
            disabled={saving || !programId || !congregationId || !responsibleId || name.trim().length < 2}
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
                {teacherLabels[id] || id} ×
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ClassDetailModal({
  teachingClass,
  readOnly,
  onClose,
  onEdit,
  onChanged,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [classDetails, setClassDetails] = useState(teachingClass);
  const [enrollments, setEnrollments] = useState<TeachingEnrollment[]>([]);
  const [link, setLink] = useState<TeachingPublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestBirth, setGuestBirth] = useState('');
  const [addMode, setAddMode] = useState<'member' | 'guest'>('member');
  const [enrollmentsPage, setEnrollmentsPage] = useState(1);
  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: teachingClass.congregation_id,
    enabled: !readOnly,
  });

  const memberSelectOptions = useMemo(() => {
    const base = memberOptionsData.map((m) => ({ value: m.id, label: m.name }));
    if (memberId && !base.some((o) => o.value === memberId)) {
      base.unshift({ value: memberId, label: memberLabel || 'Membro selecionado' });
    }
    return base;
  }, [memberOptionsData, memberId, memberLabel]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [enrollmentsData, linkData, classData] = await Promise.all([
        apiService.listTeachingEnrollments(teachingClass.id),
        apiService.getTeachingPublicLink(teachingClass.id),
        apiService.getTeachingClass(teachingClass.id),
      ]);
      setEnrollments(enrollmentsData);
      setLink(linkData);
      setClassDetails(classData);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [teachingClass.id]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = enrollments.filter((e) => e.kind === 'possible_member');
  const others = enrollments.filter((e) => e.kind !== 'possible_member');

  const enrollmentsTotalPages = Math.max(1, Math.ceil(others.length / ENROLLMENTS_PER_PAGE));
  const pagedEnrollments = useMemo(() => {
    const start = (enrollmentsPage - 1) * ENROLLMENTS_PER_PAGE;
    return others.slice(start, start + ENROLLMENTS_PER_PAGE);
  }, [others, enrollmentsPage]);

  useEffect(() => {
    setEnrollmentsPage(1);
  }, [others.length]);

  useEffect(() => {
    if (enrollmentsPage > enrollmentsTotalPages) {
      setEnrollmentsPage(enrollmentsTotalPages);
    }
  }, [enrollmentsPage, enrollmentsTotalPages]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={classDetails.name}
      size="3xl"
      scrollBody={false}
      footer={
        <div className="flex flex-wrap gap-2 justify-between w-full p-4 sm:p-6">
          {!readOnly ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onEdit} className="min-h-11">
                Editar
              </Button>
              <Button
                variant="danger"
                className="min-h-11"
                onClick={async () => {
                  if (!window.confirm('Excluir esta turma e suas matrículas?')) return;
                  try {
                    await apiService.deleteTeachingClass(teachingClass.id);
                    toast.success('Turma excluída');
                    onClose();
                    await onChanged();
                  } catch (err) {
                    toast.error(formatApiError(err));
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button variant="secondary" onClick={onClose} className="min-h-11 ml-auto">
            Fechar
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
        {/* Coluna esquerda — fixa (sem scroll) */}
        <aside className="w-full shrink-0 space-y-5 border-b border-gray-200 p-4 sm:p-6 md:w-[34%] md:overflow-hidden md:border-b-0 md:border-r md:border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={classDetails.status} />
            <span className="text-sm text-gray-500">
              {classDetails.program?.name} ·{' '}
              {classDetails.congregations
                ? getCongregationDisplayName(classDetails.congregations)
                : 'Congregação'}
            </span>
          </div>

          {(classDetails.location || classDetails.schedule) && (
            <section className="space-y-2 text-sm">
              {classDetails.location ? (
                <p className="flex items-start gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{classDetails.location}</span>
                </p>
              ) : null}
              {classDetails.schedule ? (
                <p className="flex items-start gap-2 text-gray-700">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{classDetails.schedule}</span>
                </p>
              ) : null}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              Equipe
            </h3>
            <p className="text-sm">Responsável: {classDetails.responsible?.name || '—'}</p>
            <p className="text-sm text-gray-500">
              Professores:{' '}
              {(classDetails.teachers || []).filter(Boolean).map((t) => t!.name).join(', ') || 'Nenhum'}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-gray-400" /> Link público
            </h3>
            {link ? (
              <div className="flex flex-col gap-2">
                <Input value={link.url} readOnly className="text-base" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    onClick={async () => {
                      await navigator.clipboard.writeText(link.url);
                      toast.success('Link copiado');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  {!readOnly ? (
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={async () => {
                        try {
                          const updated = await apiService.updateTeachingPublicLink(teachingClass.id, {
                            is_active: !link.is_active,
                          });
                          setLink(updated);
                          toast.success(updated.is_active ? 'Link ativado' : 'Link desativado');
                        } catch (err) {
                          toast.error(formatApiError(err));
                        }
                      }}
                    >
                      {link.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : !readOnly ? (
              <Button
                className="min-h-11"
                onClick={async () => {
                  try {
                    const created = await apiService.createTeachingPublicLink(teachingClass.id);
                    setLink(created);
                    toast.success('Link criado');
                  } catch (err) {
                    toast.error(formatApiError(err));
                  }
                }}
              >
                Gerar link
              </Button>
            ) : (
              <p className="text-sm text-gray-500">Nenhum link gerado.</p>
            )}
            {classDetails.status !== 'open' && classDetails.status !== 'in_progress' ? (
              <p className="text-xs text-gray-500">
                Inscrições públicas só são aceitas com status Aberta ou Em andamento.
              </p>
            ) : null}
          </section>
        </aside>

        {/* Coluna direita — inscritos (scroll) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 space-y-5">
          {!readOnly ? (
            <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-gray-400" />
                Adicionar inscrito
              </h3>
              <Select
                label="Tipo"
                value={addMode}
                onChange={(value) => {
                  setAddMode(value as 'member' | 'guest');
                  setMemberId('');
                  setMemberLabel('');
                  setGuestName('');
                  setGuestWhatsapp('');
                  setGuestBirth('');
                  setSearch('');
                }}
                options={[
                  { value: 'member', label: 'Membro' },
                  { value: 'guest', label: 'Convidado' },
                ]}
              />
              {addMode === 'member' ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Select
                    label="Membro"
                    value={memberId}
                    onChange={(value) => {
                      setMemberId(value);
                      const match = memberOptionsData.find((m) => m.id === value);
                      setMemberLabel(match?.name || '');
                    }}
                    options={memberSelectOptions}
                    searchable
                    onSearchChange={setSearch}
                    placeholder="Digite para buscar…"
                  />
                  <Button
                    className="min-h-11 self-end"
                    onClick={async () => {
                      try {
                        await apiService.createTeachingEnrollment(teachingClass.id, {
                          type: 'member',
                          member_id: memberId,
                        });
                        setMemberId('');
                        setMemberLabel('');
                        toast.success('Membro inscrito');
                        await load();
                        await onChanged();
                      } catch (err) {
                        toast.error(formatApiError(err));
                      }
                    }}
                    disabled={!memberId}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Vincular
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <Input
                      label="Nome"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="text-base"
                    />
                    <Input
                      label="WhatsApp"
                      value={guestWhatsapp}
                      onChange={(e) => setGuestWhatsapp(e.target.value)}
                      className="text-base"
                    />
                    <Input
                      label="Nascimento"
                      type="date"
                      value={guestBirth}
                      onChange={(e) => setGuestBirth(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={async () => {
                        try {
                          await apiService.createTeachingEnrollment(teachingClass.id, {
                            type: 'guest',
                            full_name: guestName,
                            whatsapp: guestWhatsapp,
                            birth_date: guestBirth,
                          });
                          setGuestName('');
                          setGuestWhatsapp('');
                          setGuestBirth('');
                          toast.success('Convidado inscrito');
                          await load();
                        } catch (err) {
                          toast.error(formatApiError(err));
                        }
                      }}
                      disabled={guestName.trim().length < 2 || !guestWhatsapp || !guestBirth}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar convidado
                    </Button>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {queue.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">Para revisar · Possível membro</h3>
                  {queue.map((item) => {
                    const candidates =
                      item.queue_candidates ||
                      (item as { candidates?: TeachingEnrollment['queue_candidates'] }).candidates ||
                      [];
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <EnrollmentKindBadge kind="possible_member" />
                          <div className="font-medium">{item.display_name || item.full_name}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Digitado: {item.whatsapp_masked || item.whatsapp} · nasc. {item.birth_date} · idade{' '}
                          {item.age ?? '—'}
                        </div>
                        <div className="space-y-2">
                          {candidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/80 bg-white p-2.5"
                            >
                              <div className="text-sm">
                                <div className="font-medium">{candidate.name}</div>
                                <div className="text-gray-500">
                                  {candidate.whatsapp_masked ||
                                    (candidate as { whatsapp?: string }).whatsapp}{' '}
                                  · {candidate.age ?? '—'} anos · N{candidate.signals?.N ? '✓' : '✗'} W
                                  {candidate.signals?.W ? '✓' : '✗'} D{candidate.signals?.D ? '✓' : '✗'}
                                </div>
                              </div>
                              {!readOnly ? (
                                <Button
                                  className="min-h-11"
                                  onClick={async () => {
                                    try {
                                      await apiService.resolveTeachingEnrollment(item.id, {
                                        action: 'link_member',
                                        member_id: candidate.id,
                                      });
                                      toast.success('Vinculado ao membro');
                                      await load();
                                    } catch (err) {
                                      toast.error(formatApiError(err));
                                    }
                                  }}
                                >
                                  Vincular
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {!readOnly ? (
                          <Button
                            variant="secondary"
                            className="min-h-11"
                            onClick={async () => {
                              try {
                                await apiService.resolveTeachingEnrollment(item.id, {
                                  action: 'keep_guest',
                                });
                                toast.success('Mantido como convidado');
                                await load();
                              } catch (err) {
                                toast.error(formatApiError(err));
                              }
                            }}
                          >
                            Manter convidado
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    Inscritos ({others.length})
                  </h3>
                </div>
                {others.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum inscrito ainda.
                  </div>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {pagedEnrollments.map((item) => {
                        const name =
                          item.kind === 'member'
                            ? item.member?.name || item.display_name || 'Membro'
                            : item.full_name || item.display_name || 'Convidado';
                        const contact =
                          item.whatsapp ||
                          item.member?.whatsapp ||
                          null;
                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
                          >
                            <div className="min-w-0 flex items-start gap-3">
                              <div
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                  item.kind === 'member'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-sky-50 text-sky-700'
                                }`}
                              >
                                {item.kind === 'member' ? (
                                  <UserRound className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-sm text-gray-900 truncate">
                                    {name}
                                  </span>
                                  <EnrollmentKindBadge kind={item.kind} />
                                </div>
                                <EnrollmentWhatsAppLink whatsapp={contact} />
                              </div>
                            </div>
                            {!readOnly ? (
                              <Button
                                variant="ghost"
                                className="min-h-11 min-w-11 shrink-0 text-gray-500 hover:text-red-600"
                                aria-label="Remover inscrição"
                                onClick={async () => {
                                  try {
                                    await apiService.deleteTeachingEnrollment(item.id);
                                    toast.success('Inscrição removida');
                                    await load();
                                  } catch (err) {
                                    toast.error(formatApiError(err));
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    <Pagination
                      page={enrollmentsPage}
                      totalPages={enrollmentsTotalPages}
                      onPageChange={setEnrollmentsPage}
                    />
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
