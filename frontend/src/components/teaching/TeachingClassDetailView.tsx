'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Church,
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Power,
  Search,
  Trash2,
  User,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/common/Pagination';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingEnrollment, TeachingPublicLink } from '@/types';
import { formatPhone, maskPhoneInput } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';

const ENROLLMENTS_PER_PAGE = 8;

function formatBirthDate(value?: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

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

function EnrollmentWhatsAppLink({ whatsapp }: { whatsapp?: string | null }) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 transition-colors leading-tight min-h-11 sm:min-h-0"
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      {formatPhone(whatsapp)}
    </a>
  );
}

function MatchSignal({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        ok
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-gray-100 text-gray-500 ring-gray-500/20'
      }`}
    >
      {ok ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

function PersonChip({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-inset ring-slate-200">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {initial}
      </span>
      <span className="truncate text-sm text-gray-900">{name}</span>
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  extra,
}: {
  icon: typeof Users;
  children: ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
      <span>{children}</span>
      {extra}
    </h3>
  );
}

export function TeachingClassDetailView({
  teachingClass,
  readOnly,
  onDetailsChange,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
  onDetailsChange?: (cls: TeachingClass) => void;
}) {
  const [classDetails, setClassDetails] = useState(teachingClass);
  const [enrollments, setEnrollments] = useState<TeachingEnrollment[]>([]);
  const [link, setLink] = useState<TeachingPublicLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestBirth, setGuestBirth] = useState('');
  const [addMode, setAddMode] = useState<'member' | 'guest'>('member');
  const [enrollmentsPage, setEnrollmentsPage] = useState(1);
  const [enrollmentQuery, setEnrollmentQuery] = useState('');
  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: teachingClass.congregation_id,
    enabled: !readOnly,
  });

  useEffect(() => {
    setClassDetails(teachingClass);
  }, [teachingClass]);

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
        apiService.getTeachingPublicLink(teachingClass.id).catch((err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) return null;
          throw err;
        }),
        apiService.getTeachingClass(teachingClass.id),
      ]);
      setEnrollments(enrollmentsData);
      setLink(linkData);
      setClassDetails(classData);
      onDetailsChange?.(classData);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [teachingClass.id, onDetailsChange]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = enrollments.filter((e) => e.kind === 'possible_member');
  const others = enrollments.filter((e) => e.kind !== 'possible_member');
  const teachers = (classDetails.teachers || []).filter(Boolean) as Array<{
    id: string;
    name: string;
  }>;
  const publicEnrollmentAllowed =
    classDetails.status === 'open' || classDetails.status === 'in_progress';

  const filteredEnrollments = useMemo(() => {
    const q = enrollmentQuery.trim().toLowerCase();
    if (!q) return others;
    const digits = q.replace(/\D/g, '');
    return others.filter((item) => {
      const name =
        item.kind === 'member'
          ? item.member?.name || item.display_name || ''
          : item.full_name || item.display_name || '';
      const contact = item.whatsapp || item.member?.whatsapp || '';
      const nameMatch = name.toLowerCase().includes(q);
      const phoneMatch = digits.length >= 3 && contact.replace(/\D/g, '').includes(digits);
      return nameMatch || phoneMatch;
    });
  }, [others, enrollmentQuery]);

  const enrollmentsTotalPages = Math.max(1, Math.ceil(filteredEnrollments.length / ENROLLMENTS_PER_PAGE));
  const pagedEnrollments = useMemo(() => {
    const start = (enrollmentsPage - 1) * ENROLLMENTS_PER_PAGE;
    return filteredEnrollments.slice(start, start + ENROLLMENTS_PER_PAGE);
  }, [filteredEnrollments, enrollmentsPage]);

  useEffect(() => {
    setEnrollmentsPage(1);
  }, [others.length, enrollmentQuery]);

  useEffect(() => {
    if (enrollmentsPage > enrollmentsTotalPages) {
      setEnrollmentsPage(enrollmentsTotalPages);
    }
  }, [enrollmentsPage, enrollmentsTotalPages]);

  const resetAddForm = () => {
    setMemberId('');
    setMemberLabel('');
    setGuestName('');
    setGuestWhatsapp('');
    setGuestBirth('');
    setSearch('');
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <aside className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-4 md:w-[340px] lg:w-[360px]">
        <Card className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Sobre a turma</h3>
          <dl className="space-y-3">
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Church className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Congregação
              </dt>
              <dd className="text-sm text-gray-900">
                {classDetails.congregations
                  ? getCongregationDisplayName(classDetails.congregations)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Local
              </dt>
              <dd className="text-sm text-gray-900">{classDetails.location || '—'}</dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Clock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Horário
              </dt>
              <dd className="text-sm text-gray-900">{classDetails.schedule || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3">
          <SectionTitle icon={Users}>Equipe</SectionTitle>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Responsável</p>
              {classDetails.responsible?.name ? (
                <PersonChip name={classDetails.responsible.name} />
              ) : (
                <p className="text-sm text-gray-500">Sem responsável.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Professores</p>
              {teachers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teachers.map((teacher) => (
                    <PersonChip key={teacher.id} name={teacher.name} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum professor adicional.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionTitle
            icon={Link2}
            extra={
              link ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    link.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-gray-100 text-gray-600 ring-gray-500/20'
                  }`}
                >
                  {link.is_active ? 'Ativo' : 'Inativo'}
                </span>
              ) : null
            }
          >
            Link público
          </SectionTitle>
          {link ? (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input value={link.url} readOnly className="text-base" aria-label="URL do link público" />
              </div>
              <Button
                variant="secondary"
                className="min-h-11 min-w-11 shrink-0 px-0"
                aria-label={linkCopied ? 'Link copiado' : 'Copiar link'}
                title={linkCopied ? 'Link copiado' : 'Copiar link'}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link.url);
                    setLinkCopied(true);
                    toast.success('Link copiado');
                    window.setTimeout(() => setLinkCopied(false), 2000);
                  } catch {
                    toast.error('Não foi possível copiar o link');
                  }
                }}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              {!readOnly ? (
                <Button
                  variant="secondary"
                  className="min-h-11 min-w-11 shrink-0 px-0"
                  aria-label={link.is_active ? 'Desativar link' : 'Ativar link'}
                  title={link.is_active ? 'Desativar link' : 'Ativar link'}
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
                  <Power
                    className={`h-4 w-4 ${link.is_active ? 'text-emerald-600' : 'text-gray-400'}`}
                  />
                </Button>
              ) : null}
            </div>
          ) : !readOnly ? (
            <Button
              className="min-h-11 w-full"
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
          {!publicEnrollmentAllowed ? (
            <Alert
              variant="warning"
              message="Inscrições públicas só são aceitas com status Aberta ou Em andamento."
            />
          ) : link && !link.is_active ? (
            <p className="text-xs text-gray-500">
              Visitantes não conseguem se inscrever enquanto o link estiver inativo.
            </p>
          ) : null}
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {!readOnly ? (
          <Card className="space-y-4">
            <SectionTitle icon={UserPlus}>Adicionar inscrito</SectionTitle>
            <div
              className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1"
              role="tablist"
              aria-label="Tipo de inscrito"
            >
              {(
                [
                  { id: 'member', label: 'Membro' },
                  { id: 'guest', label: 'Convidado' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={addMode === option.id}
                  className={`min-h-11 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    addMode === option.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => {
                    setAddMode(option.id);
                    resetAddForm();
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {addMode === 'member' ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
                  className="min-h-11 w-full sm:w-auto"
                  onClick={async () => {
                    try {
                      await apiService.createTeachingEnrollment(teachingClass.id, {
                        type: 'member',
                        member_id: memberId,
                      });
                      resetAddForm();
                      toast.success('Membro inscrito');
                      await load();
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
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.8fr)_minmax(10rem,1fr)_minmax(8.5rem,0.85fr)_auto] sm:items-end">
                <Input
                  label="Nome"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-base"
                />
                <Input
                  label="WhatsApp"
                  value={guestWhatsapp}
                  onChange={(e) => setGuestWhatsapp(maskPhoneInput(e.target.value))}
                  className="text-base"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                />
                <Input
                  label="Nascimento"
                  type="date"
                  value={guestBirth}
                  onChange={(e) => setGuestBirth(e.target.value)}
                  className="text-base"
                />
                <Button
                  className="min-h-11 w-full whitespace-nowrap sm:w-auto"
                  onClick={async () => {
                    try {
                      await apiService.createTeachingEnrollment(teachingClass.id, {
                        type: 'guest',
                        full_name: guestName,
                        whatsapp: guestWhatsapp.replace(/\D/g, ''),
                        birth_date: guestBirth,
                      });
                      resetAddForm();
                      toast.success('Convidado inscrito');
                      await load();
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                  disabled={
                    guestName.trim().length < 2 ||
                    guestWhatsapp.replace(/\D/g, '').length < 10 ||
                    !guestBirth
                  }
                >
                  Adicionar
                </Button>
              </div>
            )}
          </Card>
        ) : null}

        {loading ? (
          <Card className="flex justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando inscritos…
          </Card>
        ) : (
          <>
            {queue.length > 0 ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900">Para revisar</h3>
                  <span className="text-xs text-amber-800 bg-amber-50 ring-1 ring-inset ring-amber-600/20 rounded-full px-2 py-0.5">
                    {queue.length} possível{queue.length === 1 ? ' membro' : ' membros'}
                  </span>
                </div>
                {queue.map((item) => {
                  const candidates =
                    item.queue_candidates ||
                    (item as { candidates?: TeachingEnrollment['queue_candidates'] }).candidates ||
                    [];
                  return (
                    <Card key={item.id} className="space-y-3 border-amber-200 bg-amber-50/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <EnrollmentKindBadge kind="possible_member" />
                        <div className="font-medium text-gray-900">
                          {item.display_name || item.full_name}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Digitado: {item.whatsapp_masked || item.whatsapp || '—'} · nasc.{' '}
                        {formatBirthDate(item.birth_date)} · {item.age ?? '—'} anos
                      </p>
                      {candidates.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum candidato no rol para vincular.</p>
                      ) : (
                        <div className="space-y-2">
                          {candidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white bg-white p-3"
                            >
                              <div className="min-w-0 space-y-2">
                                <div className="font-medium text-sm text-gray-900">{candidate.name}</div>
                                <p className="text-sm text-gray-500">
                                  {candidate.whatsapp_masked ||
                                    (candidate as { whatsapp?: string }).whatsapp}{' '}
                                  · {candidate.age ?? '—'} anos
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  <MatchSignal ok={Boolean(candidate.signals?.N)} label="Nome" />
                                  <MatchSignal ok={Boolean(candidate.signals?.W)} label="WhatsApp" />
                                  <MatchSignal ok={Boolean(candidate.signals?.D)} label="Nascimento" />
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
                      )}
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
                    </Card>
                  );
                })}
              </section>
            ) : null}

            <Card className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <SectionTitle icon={Users}>Inscritos ({others.length})</SectionTitle>
                {others.length > 0 ? (
                  <div className="w-full sm:max-w-xs">
                    <Input
                      value={enrollmentQuery}
                      onChange={(e) => setEnrollmentQuery(e.target.value)}
                      placeholder="Buscar por nome ou WhatsApp"
                      className="text-base"
                      aria-label="Buscar inscritos"
                      icon={<Search className="h-4 w-4" />}
                    />
                  </div>
                ) : null}
              </div>
              {others.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-10 text-center">
                  <Users className="mx-auto mb-2 h-5 w-5 text-gray-400" aria-hidden />
                  <p className="text-sm text-gray-500">Nenhum inscrito ainda.</p>
                  {!readOnly ? (
                    <p className="mt-1 text-xs text-gray-400">
                      Vincule um membro, adicione um convidado ou compartilhe o link público.
                    </p>
                  ) : null}
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Nenhum inscrito corresponde à busca.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {pagedEnrollments.map((item) => {
                      const name =
                        item.kind === 'member'
                          ? item.member?.name || item.display_name || 'Membro'
                          : item.full_name || item.display_name || 'Convidado';
                      const contact = item.whatsapp || item.member?.whatsapp || null;
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
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
                              aria-label={`Remover inscrição de ${name}`}
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
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
