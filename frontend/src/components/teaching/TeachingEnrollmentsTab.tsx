'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Loader2,
  MessageCircle,
  Search,
  Trash2,
  User,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingEnrollment } from '@/types';
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

function EnrollmentWhatsAppLink({
  whatsapp,
  compact = false,
}: {
  whatsapp?: string | null;
  compact?: boolean;
}) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs leading-tight text-gray-600 transition-colors hover:text-green-600 ${
        compact ? '' : 'min-h-11 sm:min-h-0'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      {formatPhone(whatsapp)}
    </a>
  );
}

function QueueContactLine({
  whatsapp,
  email,
  birth,
  age,
  congregation,
}: {
  whatsapp?: string | null;
  email?: string | null;
  birth?: string | null;
  age?: number | null;
  congregation?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-600">
      <EnrollmentWhatsAppLink whatsapp={whatsapp} compact />
      {email ? <span className="truncate">{email}</span> : null}
      <span>nasc. {formatBirthDate(birth)}</span>
      <span>{age ?? '—'} anos</span>
      {congregation ? <span>{getCongregationDisplayName(congregation)}</span> : null}
    </div>
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

function QueueReviewCard({
  item,
  readOnly,
  onLinkMember,
  onKeepGuest,
  onDismissQueue,
}: {
  item: TeachingEnrollment;
  readOnly: boolean;
  onLinkMember: (candidateId: string) => Promise<void>;
  onKeepGuest: () => Promise<void>;
  onDismissQueue: () => Promise<void>;
}) {
  const candidates =
    item.queue_candidates ||
    (item as { candidates?: TeachingEnrollment['queue_candidates'] }).candidates ||
    [];
  const [selectedId, setSelectedId] = useState(candidates[0]?.id || '');
  const selected = candidates.find((candidate) => candidate.id === selectedId) || candidates[0];
  const selectedAlreadyEnrolled = Boolean(selected?.already_enrolled);

  return (
    <Card className="space-y-2 border-amber-200 bg-amber-50/50">
      <div className="flex flex-wrap items-center gap-2">
        <EnrollmentKindBadge kind="possible_member" />
        <div className="text-sm font-medium text-gray-900">
          {item.display_name || item.full_name}
        </div>
      </div>
      <QueueContactLine
        whatsapp={item.whatsapp}
        email={item.email}
        birth={item.birth_date}
        age={item.age}
      />
      {candidates.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum candidato no rol para vincular.</p>
      ) : (
        <div className="space-y-1.5">
          {candidates.map((candidate) => {
            const isSelected = selected?.id === candidate.id;
            return (
              <div
                key={candidate.id}
                role={candidates.length > 1 ? 'button' : undefined}
                tabIndex={candidates.length > 1 ? 0 : undefined}
                onClick={
                  candidates.length > 1 ? () => setSelectedId(candidate.id) : undefined
                }
                onKeyDown={
                  candidates.length > 1
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(candidate.id);
                        }
                      }
                    : undefined
                }
                className={`rounded-md px-0 py-0.5 ${
                  candidates.length > 1
                    ? `cursor-pointer ${
                        isSelected
                          ? 'bg-white/70 px-2 py-1 ring-1 ring-inset ring-primary/25'
                          : ''
                      }`
                    : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                  {candidate.already_enrolled ? (
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                      Já na turma
                    </span>
                  ) : null}
                </div>
                <QueueContactLine
                  whatsapp={candidate.whatsapp || candidate.whatsapp_masked}
                  email={candidate.email}
                  birth={candidate.birth}
                  age={candidate.age}
                  congregation={candidate.congregation}
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  <MatchSignal ok={Boolean(candidate.signals?.N)} label="Nome" />
                  <MatchSignal ok={Boolean(candidate.signals?.W)} label="WhatsApp" />
                  <MatchSignal ok={Boolean(candidate.signals?.D)} label="Nascimento" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selectedAlreadyEnrolled ? (
        <p className="text-xs text-amber-900">
          Este membro já está inscrito. Remova a inscrição da fila ou mantenha como
          convidado se for outra pessoa.
        </p>
      ) : null}
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {selectedAlreadyEnrolled ? (
            <Button className="min-h-11" onClick={onDismissQueue}>
              Remover da fila
            </Button>
          ) : selected ? (
            <Button className="min-h-11" onClick={() => onLinkMember(selected.id)}>
              Vincular membro
            </Button>
          ) : null}
          <Button variant="secondary" className="min-h-11" onClick={onKeepGuest}>
            Manter Convidado
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: ReactNode;
}) {
  return (
    <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
      <span>{children}</span>
    </h3>
  );
}

export function TeachingEnrollmentsTab({
  teachingClass,
  readOnly,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
}) {
  const [enrollments, setEnrollments] = useState<TeachingEnrollment[]>([]);
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

  const memberSelectOptions = useMemo(() => {
    const base = memberOptionsData.map((member) => ({
      value: member.id,
      label: member.name,
    }));
    if (memberId && !base.some((option) => option.value === memberId)) {
      base.unshift({ value: memberId, label: memberLabel || 'Membro selecionado' });
    }
    return base;
  }, [memberOptionsData, memberId, memberLabel]);

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const firstPage = await apiService.listTeachingEnrollments(teachingClass.id, {
        page: 1,
        limit: 100,
      });
      const listed = [...(firstPage.queue || []), ...(firstPage.data || [])];
      let pagination = firstPage.pagination;
      let page = 1;

      while (pagination?.hasNextPage && page < (pagination.totalPages || page)) {
        page += 1;
        const next = await apiService.listTeachingEnrollments(teachingClass.id, {
          page,
          limit: 100,
        });
        listed.push(...(next.data || []));
        pagination = next.pagination;
      }

      setEnrollments(listed);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [teachingClass.id]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const queue = enrollments.filter((enrollment) => enrollment.kind === 'possible_member');
  const others = enrollments.filter((enrollment) => enrollment.kind !== 'possible_member');

  const filteredEnrollments = useMemo(() => {
    const query = enrollmentQuery.trim().toLowerCase();
    if (!query) return others;
    const digits = query.replace(/\D/g, '');

    return others.filter((item) => {
      const name =
        item.kind === 'member'
          ? item.member?.name || item.display_name || ''
          : item.full_name || item.display_name || '';
      const contact = item.whatsapp || item.member?.whatsapp || '';
      return (
        name.toLowerCase().includes(query) ||
        (digits.length >= 3 && contact.replace(/\D/g, '').includes(digits))
      );
    });
  }, [others, enrollmentQuery]);

  const enrollmentsTotalPages = Math.max(
    1,
    Math.ceil(filteredEnrollments.length / ENROLLMENTS_PER_PAGE)
  );
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
    <div className="space-y-4">
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
                  const match = memberOptionsData.find((member) => member.id === value);
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
                    await loadEnrollments();
                  } catch (error) {
                    toast.error(formatApiError(error));
                  }
                }}
                disabled={!memberId}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Vincular
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.8fr)_minmax(10rem,1fr)_minmax(8.5rem,0.85fr)_auto] sm:items-end">
              <Input
                label="Nome"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                className="text-base"
              />
              <Input
                label="WhatsApp"
                value={guestWhatsapp}
                onChange={(event) => setGuestWhatsapp(maskPhoneInput(event.target.value))}
                className="text-base"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
              />
              <Input
                label="Nascimento"
                type="date"
                value={guestBirth}
                onChange={(event) => setGuestBirth(event.target.value)}
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
                    await loadEnrollments();
                  } catch (error) {
                    toast.error(formatApiError(error));
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando inscritos…
        </Card>
      ) : (
        <>
          {queue.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-gray-900">Para revisar</h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  {queue.length} possível{queue.length === 1 ? ' membro' : ' membros'}
                </span>
              </div>
              {queue.map((item) => (
                <QueueReviewCard
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  onLinkMember={async (candidateId) => {
                    try {
                      const result = await apiService.resolveTeachingEnrollment(item.id, {
                        action: 'link_member',
                        member_id: candidateId,
                      });
                      toast.success(
                        result?.already_enrolled
                          ? 'Este membro já estava na turma. A inscrição da fila foi encerrada.'
                          : 'Vinculado ao membro'
                      );
                      await loadEnrollments();
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                  onDismissQueue={async () => {
                    try {
                      await apiService.deleteTeachingEnrollment(item.id);
                      toast.success('Inscrição removida da fila');
                      await loadEnrollments();
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                  onKeepGuest={async () => {
                    try {
                      await apiService.resolveTeachingEnrollment(item.id, {
                        action: 'keep_guest',
                      });
                      toast.success('Mantido como convidado');
                      await loadEnrollments();
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                />
              ))}
            </section>
          ) : null}

          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitle icon={Users}>Inscritos ({others.length})</SectionTitle>
              {others.length > 0 ? (
                <div className="w-full sm:max-w-xs">
                  <Input
                    value={enrollmentQuery}
                    onChange={(event) => setEnrollmentQuery(event.target.value)}
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
                    const memberId = item.member?.id || item.member_id;

                    if (item.kind === 'member' && item.member) {
                      return (
                        <li key={item.id} className="group relative min-w-0">
                          <MemberCardCompact
                            href={memberId ? `/members/${memberId}` : undefined}
                            member={{
                              id: item.member.id,
                              name: item.member.name,
                              birth: item.member.birth || item.birth_date || null,
                              active: true,
                              congregation: item.member.congregations || null,
                              whatsapp: item.member.whatsapp || item.whatsapp || null,
                              email: item.email || null,
                            }}
                          />
                          {!readOnly ? (
                            <Button
                              variant="ghost"
                              className="absolute right-2 top-2 min-h-11 min-w-11 text-gray-500 opacity-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label={`Remover inscrição de ${name}`}
                              onClick={async () => {
                                try {
                                  await apiService.deleteTeachingEnrollment(item.id);
                                  toast.success('Inscrição removida');
                                  await loadEnrollments();
                                } catch (error) {
                                  toast.error(formatApiError(error));
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </li>
                      );
                    }

                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
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
                              <span className="truncate text-sm font-medium text-gray-900">
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
                                await loadEnrollments();
                              } catch (error) {
                                toast.error(formatApiError(error));
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
  );
}
