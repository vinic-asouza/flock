'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Link2, Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ViewSelector, type ViewMode } from '@/components/reports/ViewSelector';
import { useAuth } from '@/context/AuthContext';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type {
  TeachingClass,
  TeachingClassStatus,
  TeachingEnrollment,
  TeachingProgram,
  TeachingPublicLink,
} from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

const STATUS_LABELS: Record<TeachingClassStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Encerrada',
  archived: 'Arquivada',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

export default function TeachingPage() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;

  const [view, setView] = useState<ViewMode>('all');
  const [congregationId, setCongregationId] = useState<string | undefined>();
  const [tab, setTab] = useState<'classes' | 'programs'>('classes');
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<TeachingProgram[]>([]);
  const [classes, setClasses] = useState<TeachingClass[]>([]);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);

  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [detailClass, setDetailClass] = useState<TeachingClass | null>(null);
  const [editingProgram, setEditingProgram] = useState<TeachingProgram | null>(null);
  const [editingClass, setEditingClass] = useState<TeachingClass | null>(null);

  const waitingForCongregation = view === 'congregation' && !congregationId;

  const loadData = useCallback(async () => {
    if (waitingForCongregation) {
      setPrograms([]);
      setClasses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params =
        view === 'congregation' && congregationId
          ? { congregation_id: congregationId }
          : undefined;
      const [programsData, classesData, congregationsData] = await Promise.all([
        apiService.listTeachingPrograms(params),
        apiService.listTeachingClasses(params),
        apiService.listCongregations(),
      ]);
      setPrograms(programsData);
      setClasses(classesData);
      setCongregations(
        congregationsData.map((c: { id: string; name: string; abbreviation?: string | null }) => ({
          value: c.id,
          label: getCongregationDisplayName(c),
        }))
      );
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [congregationId, view, waitingForCongregation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p.id, label: p.name })),
    [programs]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ensino"
        subtitle="Programas e turmas formativas (EBD, cursos e treinamentos)."
        actions={
          !readOnly ? (
            <Button
              onClick={() => {
                if (tab === 'programs') {
                  setEditingProgram(null);
                  setProgramModalOpen(true);
                } else {
                  setEditingClass(null);
                  setClassModalOpen(true);
                }
              }}
              className="min-h-11"
            >
              <Plus className="h-4 w-4 mr-2" />
              {tab === 'programs' ? 'Novo programa' : 'Nova turma'}
            </Button>
          ) : (
            <span title={READER_TOOLTIP} className="text-sm text-gray-500">
              Somente leitura
            </span>
          )
        }
      />

      <ViewSelector
        selectedView={view}
        selectedCongregationId={congregationId}
        onViewChange={(nextView, nextId) => {
          setView(nextView);
          setCongregationId(nextId);
        }}
      />

      <Tabs
        tabs={[
          { id: 'classes', label: 'Turmas' },
          { id: 'programs', label: 'Programas' },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as 'classes' | 'programs')}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      ) : waitingForCongregation ? (
        <p className="text-sm text-gray-500 py-8">Selecione uma congregação para continuar.</p>
      ) : tab === 'programs' ? (
        programs.length === 0 ? (
          <EmptyState text='Crie um programa (ex.: EBD 2026) para organizar turmas.' />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <button
                key={program.id}
                type="button"
                className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-primary/40 transition"
                onClick={() => {
                  if (readOnly) return;
                  setEditingProgram(program);
                  setProgramModalOpen(true);
                }}
              >
                <div className="font-medium text-gray-900">{program.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {program.congregation_id
                    ? program.congregations
                      ? getCongregationDisplayName(program.congregations)
                      : 'Congregação'
                    : 'Todas as congregações'}
                </div>
                {program.description ? (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{program.description}</p>
                ) : null}
              </button>
            ))}
          </div>
        )
      ) : classes.length === 0 ? (
        <EmptyState text="Nenhuma turma nesta visão." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-primary/40 transition"
              onClick={() => setDetailClass(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">{item.name}</div>
                <StatusBadge status={item.status} />
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {item.program?.name || 'Programa'} ·{' '}
                {item.congregations ? getCongregationDisplayName(item.congregations) : 'Congregação'}
              </div>
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {item.responsible?.name || 'Sem responsável'}
              </div>
            </button>
          ))}
        </div>
      )}

      <ProgramFormModal
        open={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        program={editingProgram}
        congregations={congregations}
        onSaved={loadData}
      />

      <ClassFormModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        teachingClass={editingClass}
        programs={programs}
        programOptions={programOptions}
        congregations={congregations}
        defaultCongregationId={congregationId}
        onSaved={loadData}
      />

      {detailClass ? (
        <ClassDetailModal
          teachingClass={detailClass}
          readOnly={readOnly}
          onClose={() => setDetailClass(null)}
          onEdit={() => {
            setEditingClass(detailClass);
            setDetailClass(null);
            setClassModalOpen(true);
          }}
          onChanged={async () => {
            await loadData();
            const refreshed = await apiService.getTeachingClass(detailClass.id);
            setDetailClass(refreshed);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 py-12 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: TeachingClassStatus }) {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {STATUS_LABELS[status]}
    </span>
  );
}

function ProgramFormModal({
  open,
  onClose,
  program,
  congregations,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  program: TeachingProgram | null;
  congregations: Array<{ value: string; label: string }>;
  onSaved: () => Promise<void>;
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
      await onSaved();
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
        <div className="flex flex-wrap gap-2 justify-between w-full">
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
      <div className="space-y-4">
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

function ClassFormModal({
  open,
  onClose,
  teachingClass,
  programs,
  programOptions,
  congregations,
  defaultCongregationId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  teachingClass: TeachingClass | null;
  programs: TeachingProgram[];
  programOptions: Array<{ value: string; label: string }>;
  congregations: Array<{ value: string; label: string }>;
  defaultCongregationId?: string;
  onSaved: () => Promise<void>;
}) {
  const [programId, setProgramId] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [schedule, setSchedule] = useState('');
  const [status, setStatus] = useState<TeachingClassStatus>('draft');
  const [responsibleId, setResponsibleId] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [teacherPick, setTeacherPick] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId);
  const lockedCongregation = selectedProgram?.congregation_id || null;

  const { options: memberOptions, setSearch } = useMemberOptions({
    congregationId: congregationId || null,
    enabled: open && Boolean(congregationId),
  });

  useEffect(() => {
    if (!open) return;
    setProgramId(teachingClass?.program_id || programOptions[0]?.value || '');
    setCongregationId(
      teachingClass?.congregation_id || lockedCongregation || defaultCongregationId || congregations[0]?.value || ''
    );
    setName(teachingClass?.name || '');
    setLocation(teachingClass?.location || '');
    setSchedule(teachingClass?.schedule || '');
    setStatus(teachingClass?.status || 'draft');
    setResponsibleId(teachingClass?.responsible_id || teachingClass?.responsible?.id || '');
    setTeacherIds((teachingClass?.teachers || []).filter(Boolean).map((t) => t!.id));
  }, [open, teachingClass, programOptions, congregations, defaultCongregationId, lockedCongregation]);

  useEffect(() => {
    if (lockedCongregation) setCongregationId(lockedCongregation);
  }, [lockedCongregation]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        program_id: programId,
        congregation_id: congregationId,
        name,
        location: location || null,
        schedule: schedule || null,
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
      footer={
        <div className="flex gap-2 justify-end w-full">
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
      <div className="space-y-4">
        <Select label="Programa" value={programId} onChange={setProgramId} options={programOptions} searchable />
        <Select
          label="Congregação"
          value={congregationId}
          onChange={(v) => {
            setCongregationId(v);
            setResponsibleId('');
            setTeacherIds([]);
          }}
          options={congregations}
          searchable
          disabled={Boolean(lockedCongregation)}
        />
        <Input label="Nome da turma" value={name} onChange={(e) => setName(e.target.value)} className="text-base" />
        <Input label="Local" value={location} onChange={(e) => setLocation(e.target.value)} className="text-base" />
        <Input label="Horário" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="text-base" />
        <Select label="Status" value={status} onChange={(v) => setStatus(v as TeachingClassStatus)} options={STATUS_OPTIONS} />
        <Select
          label="Responsável"
          value={responsibleId}
          onChange={setResponsibleId}
          options={memberOptions.map((m) => ({ value: m.id, label: m.name }))}
          searchable
          onSearchChange={setSearch}
        />
        <div className="space-y-2">
          <Select
            label="Adicionar professor"
            value={teacherPick}
            onChange={(id) => {
              if (!id || id === responsibleId || teacherIds.includes(id)) return;
              setTeacherIds((prev) => [...prev, id]);
              setTeacherPick('');
            }}
            options={memberOptions
              .filter((m) => m.id !== responsibleId && !teacherIds.includes(m.id))
              .map((m) => ({ value: m.id, label: m.name }))}
            searchable
            onSearchChange={setSearch}
            placeholder="Selecione um membro"
          />
          <div className="flex flex-wrap gap-2">
            {teacherIds.map((id) => {
              const member = memberOptions.find((m) => m.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm min-h-11"
                  onClick={() => setTeacherIds((prev) => prev.filter((x) => x !== id))}
                >
                  {member?.name || id} ×
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ClassDetailModal({
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
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestBirth, setGuestBirth] = useState('');
  const { options: memberOptions, setSearch } = useMemberOptions({
    congregationId: teachingClass.congregation_id,
    enabled: !readOnly,
  });

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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={classDetails.name}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2 justify-between w-full">
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
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge status={classDetails.status} />
          <span className="text-sm text-gray-500">
            {classDetails.program?.name} ·{' '}
            {classDetails.congregations
              ? getCongregationDisplayName(classDetails.congregations)
              : 'Congregação'}
          </span>
        </div>

        <section className="space-y-1">
          <h3 className="text-sm font-medium">Equipe</h3>
          <p className="text-sm">Responsável: {classDetails.responsible?.name || '—'}</p>
          <p className="text-sm text-gray-500">
            Professores:{' '}
            {(classDetails.teachers || []).filter(Boolean).map((t) => t!.name).join(', ') || 'Nenhum'}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Link público
          </h3>
          {link ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={link.url} readOnly className="text-base flex-1" />
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

        {!readOnly ? (
          <section className="space-y-3 rounded-lg border border-gray-200 p-3">
            <h3 className="text-sm font-medium">Adicionar aluno</h3>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select
                label="Membro"
                value={memberId}
                onChange={setMemberId}
                options={memberOptions.map((m) => ({ value: m.id, label: m.name }))}
                searchable
                onSearchChange={setSearch}
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
                    toast.success('Membro matriculado');
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
            <div className="grid gap-2 sm:grid-cols-3">
              <Input label="Convidado — nome" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="text-base" />
              <Input label="WhatsApp" value={guestWhatsapp} onChange={(e) => setGuestWhatsapp(e.target.value)} className="text-base" />
              <Input
                label="Nascimento"
                type="date"
                value={guestBirth}
                onChange={(e) => setGuestBirth(e.target.value)}
                className="text-base"
              />
            </div>
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
                  toast.success('Convidado matriculado');
                  await load();
                } catch (err) {
                  toast.error(formatApiError(err));
                }
              }}
              disabled={guestName.trim().length < 2 || !guestWhatsapp || !guestBirth}
            >
              Adicionar convidado
            </Button>
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
                <h3 className="text-sm font-medium">Para revisar · Possível membro</h3>
                {queue.map((item) => {
                  const candidates =
                    item.queue_candidates ||
                    (item as { candidates?: TeachingEnrollment['queue_candidates'] }).candidates ||
                    [];
                  return (
                  <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                    <div className="font-medium">{item.display_name || item.full_name}</div>
                    <div className="text-sm text-gray-500">
                      Digitado: {item.whatsapp_masked || item.whatsapp} · nasc. {item.birth_date} · idade{' '}
                      {item.age ?? '—'}
                    </div>
                    <div className="space-y-2">
                      {candidates.map((candidate) => (
                        <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white p-2">
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
                            await apiService.resolveTeachingEnrollment(item.id, { action: 'keep_guest' });
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

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Alunos ({others.length})</h3>
              {others.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum aluno matriculado ainda.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-gray-200">
                  {others.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <div className="font-medium text-sm">
                          {item.kind === 'member'
                            ? (item as { member?: { name?: string } }).member?.name || item.display_name || 'Membro'
                            : item.full_name || item.display_name || 'Convidado'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.kind === 'member' ? 'Membro' : 'Convidado'}
                          {item.whatsapp_masked || item.whatsapp
                            ? ` · ${item.whatsapp_masked || item.whatsapp}`
                            : ''}
                        </div>
                      </div>
                      {!readOnly ? (
                        <Button
                          variant="ghost"
                          className="min-h-11"
                          onClick={async () => {
                            try {
                              await apiService.deleteTeachingEnrollment(item.id);
                              toast.success('Matrícula removida');
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
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
