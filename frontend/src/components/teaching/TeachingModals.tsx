'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Link2, Loader2, Trash2, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
import { STATUS_OPTIONS } from './constants';
import { StatusBadge } from './TeachingUi';
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
  const [status, setStatus] = useState<TeachingClassStatus>('draft');
  const [responsibleId, setResponsibleId] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [teacherPick, setTeacherPick] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId);
  const lockedCongregation = selectedProgram?.congregation_id || null;
  const lockedProgramName =
    programOptions.find((p) => p.value === (lockedProgramId || programId))?.label ||
    selectedProgram?.name;

  const { options: memberOptions, setSearch } = useMemberOptions({
    congregationId: congregationId || null,
    enabled: open && Boolean(congregationId),
  });

  useEffect(() => {
    if (!open) return;
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
    setResponsibleId(teachingClass?.responsible_id || teachingClass?.responsible?.id || '');
    setTeacherIds((teachingClass?.teachers || []).filter(Boolean).map((t) => t!.id));
    setTeacherPick('');
  }, [
    open,
    teachingClass,
    programOptions,
    congregations,
    defaultCongregationId,
    lockedProgramId,
    programs,
  ]);

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
              setTeacherIds([]);
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
              onChange={setResponsibleId}
              options={memberOptions.map((m) => ({ value: m.id, label: m.name }))}
              searchable
              onSearchChange={setSearch}
            />
          </div>
        </div>
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
      size="2xl"
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
      <div className="flex flex-col gap-6 p-4 sm:p-6 md:flex-row md:gap-0">
        {/* Coluna esquerda — informações da turma */}
        <div className="w-full space-y-5 md:w-[38%] md:shrink-0 md:border-r md:border-gray-200 md:pr-6">
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
            <section className="space-y-1 text-sm">
              {classDetails.location ? (
                <p>
                  <span className="text-gray-500">Local: </span>
                  {classDetails.location}
                </p>
              ) : null}
              {classDetails.schedule ? (
                <p>
                  <span className="text-gray-500">Horário: </span>
                  {classDetails.schedule}
                </p>
              ) : null}
            </section>
          )}

          <section className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">Equipe</h3>
            <p className="text-sm">Responsável: {classDetails.responsible?.name || '—'}</p>
            <p className="text-sm text-gray-500">
              Professores:{' '}
              {(classDetails.teachers || []).filter(Boolean).map((t) => t!.name).join(', ') || 'Nenhum'}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Link público
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
        </div>

        {/* Coluna direita — inscritos */}
        <div className="w-full min-w-0 space-y-5 border-t border-gray-200 pt-5 md:border-t-0 md:pt-0 md:pl-6">
          {!readOnly ? (
            <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
              <h3 className="text-sm font-medium text-gray-900">Adicionar inscrito</h3>
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
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  label="Convidado — nome"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-base sm:col-span-2"
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
                  <h3 className="text-sm font-medium text-gray-900">Para revisar · Possível membro</h3>
                  {queue.map((item) => {
                    const candidates =
                      item.queue_candidates ||
                      (item as { candidates?: TeachingEnrollment['queue_candidates'] }).candidates ||
                      [];
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2"
                      >
                        <div className="font-medium">{item.display_name || item.full_name}</div>
                        <div className="text-sm text-gray-500">
                          Digitado: {item.whatsapp_masked || item.whatsapp} · nasc. {item.birth_date} · idade{' '}
                          {item.age ?? '—'}
                        </div>
                        <div className="space-y-2">
                          {candidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white p-2"
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

              <section className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Inscritos ({others.length})
                </h3>
                {others.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum inscrito ainda.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-gray-200">
                    {others.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div>
                          <div className="font-medium text-sm">
                            {item.kind === 'member'
                              ? (item as { member?: { name?: string } }).member?.name ||
                                item.display_name ||
                                'Membro'
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
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
