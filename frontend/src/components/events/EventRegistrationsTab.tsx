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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type { ChurchEvent, EventRegistration } from '@/types';
import { formatPhone, maskPhoneInput } from '@/utils';
import { getNameInitials } from '@/utils/getNameInitials';
import { getCongregationDisplayName } from '@/utils/congregation';

const REGISTRATIONS_PER_PAGE = 8;

function formatBirthDate(value?: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('T')[0].split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function ProfileAvatar({ name, kind }: { name: string; kind: 'member' | 'guest' }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
        kind === 'member' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
      }`}
      aria-hidden
    >
      {getNameInitials(name)}
    </span>
  );
}

function RegistrationKindBadge({ kind }: { kind: EventRegistration['kind'] }) {
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

function WhatsAppLink({ whatsapp }: { whatsapp?: string | null }) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs leading-tight text-gray-600 transition-colors hover:text-green-600"
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      {formatPhone(whatsapp)}
    </a>
  );
}

function ContactLine({
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
  congregation?: { id: string; name: string; abbreviation?: string | null } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-600">
      <WhatsAppLink whatsapp={whatsapp} />
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
  onDismiss,
}: {
  item: EventRegistration;
  readOnly: boolean;
  onLinkMember: (candidateId: string) => Promise<void>;
  onKeepGuest: () => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  const candidates = item.queue_candidates || [];
  const [selectedId, setSelectedId] = useState(candidates[0]?.id || '');
  const selected = candidates.find((c) => c.id === selectedId) || candidates[0];
  const selectedAlreadyEnrolled = Boolean(selected?.already_enrolled);

  return (
    <Card className="space-y-2 border-amber-200 bg-amber-50/50">
      <div className="flex flex-wrap items-center gap-2">
        <RegistrationKindBadge kind="possible_member" />
        <div className="text-sm font-medium text-gray-900">
          {item.display_name || item.full_name}
        </div>
      </div>
      <ContactLine
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
            const selectable = candidates.length > 1;
            return (
              <div
                key={candidate.id}
                role={selectable ? 'button' : undefined}
                tabIndex={selectable ? 0 : undefined}
                onClick={selectable ? () => setSelectedId(candidate.id) : undefined}
                onKeyDown={
                  selectable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(candidate.id);
                        }
                      }
                    : undefined
                }
                className={`rounded-md px-0 py-0.5 ${
                  selectable
                    ? `cursor-pointer ${
                        isSelected ? 'bg-white/70 px-2 py-1 ring-1 ring-inset ring-primary/25' : ''
                      }`
                    : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                  {candidate.already_enrolled ? (
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                      Já no evento
                    </span>
                  ) : null}
                </div>
                <ContactLine
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
          Este membro já está inscrito. Remova a inscrição da fila ou mantenha como convidado se
          for outra pessoa.
        </p>
      ) : null}
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {selectedAlreadyEnrolled ? (
            <Button className="min-h-11" onClick={onDismiss}>
              Remover da fila
            </Button>
          ) : selected ? (
            <Button className="min-h-11" onClick={() => onLinkMember(selected.id)}>
              Vincular membro
            </Button>
          ) : null}
          <Button variant="secondary" className="min-h-11" onClick={onKeepGuest}>
            Manter convidado
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Users; children: ReactNode }) {
  return (
    <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
      <span>{children}</span>
    </h3>
  );
}

export function EventRegistrationsTab({
  event,
  readOnly,
  onChanged,
}: {
  event: ChurchEvent;
  readOnly: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestBirth, setGuestBirth] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [addMode, setAddMode] = useState<'member' | 'guest'>('member');
  const [addError, setAddError] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const { options: memberOptionsData, setSearch } = useMemberOptions({
    congregationId: event.congregation_id,
    enabled: !readOnly,
  });

  const isFull = event.capacity != null && (event.registration_count ?? 0) >= event.capacity;

  const enrolledMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of registrations) {
      if (row.kind === 'member' && row.member_id) ids.add(row.member_id);
    }
    return ids;
  }, [registrations]);

  const takenWhatsapps = useMemo(() => {
    const digits = new Set<string>();
    for (const row of registrations) {
      const value = (row.whatsapp || row.member?.whatsapp || '').replace(/\D/g, '');
      if (value.length >= 10) digits.add(value);
    }
    return digits;
  }, [registrations]);

  const memberAlreadyEnrolled = Boolean(memberId && enrolledMemberIds.has(memberId));
  const guestDigits = guestWhatsapp.replace(/\D/g, '');
  const guestWhatsappTaken = guestDigits.length >= 10 && takenWhatsapps.has(guestDigits);

  const memberSelectOptions = useMemo(() => {
    const base = memberOptionsData.map((member) => ({
      value: member.id,
      label: enrolledMemberIds.has(member.id) ? `${member.name} · Já inscrito` : member.name,
    }));
    if (memberId && !base.some((option) => option.value === memberId)) {
      const label = memberLabel || 'Membro selecionado';
      base.unshift({
        value: memberId,
        label: enrolledMemberIds.has(memberId) ? `${label} · Já inscrito` : label,
      });
    }
    return base;
  }, [memberOptionsData, memberId, memberLabel, enrolledMemberIds]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const firstPage = await apiService.listEventRegistrations(event.id, { page: 1, limit: 100 });
      const listed = [...(firstPage.queue || []), ...(firstPage.data || [])];
      let pagination = firstPage.pagination;
      let currentPage = 1;

      while (pagination?.hasNextPage && currentPage < (pagination.totalPages || currentPage)) {
        currentPage += 1;
        const next = await apiService.listEventRegistrations(event.id, {
          page: currentPage,
          limit: 100,
        });
        listed.push(...(next.data || []));
        pagination = next.pagination;
      }

      setRegistrations(listed);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAll = async () => {
    await load();
    await onChanged?.();
  };

  const queue = registrations.filter((r) => r.kind === 'possible_member');
  const others = registrations.filter((r) => r.kind !== 'possible_member');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return others;
    const digits = q.replace(/\D/g, '');
    return others.filter((item) => {
      const name =
        item.kind === 'member'
          ? item.member?.name || item.display_name || ''
          : item.full_name || item.display_name || '';
      const contact = item.whatsapp || item.member?.whatsapp || '';
      return (
        name.toLowerCase().includes(q) ||
        (digits.length >= 3 && contact.replace(/\D/g, '').includes(digits))
      );
    });
  }, [others, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REGISTRATIONS_PER_PAGE));
  const paged = useMemo(() => {
    const start = (page - 1) * REGISTRATIONS_PER_PAGE;
    return filtered.slice(start, start + REGISTRATIONS_PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [others.length, query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetAddForm = () => {
    setMemberId('');
    setMemberLabel('');
    setAddError('');
    setGuestName('');
    setGuestWhatsapp('');
    setGuestBirth('');
    setGuestEmail('');
    setSearch('');
  };

  const handleRemove = async (id: string) => {
    try {
      await apiService.deleteEventRegistration(id);
      toast.success('Inscrição removida');
      await refreshAll();
    } catch (error) {
      toast.error(formatApiError(error));
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <Card className="space-y-4">
          <SectionTitle icon={UserPlus}>Adicionar inscrito</SectionTitle>
          {isFull ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              O evento está lotado. Aumente a capacidade para adicionar novos inscritos.
            </p>
          ) : null}
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
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Select
                  label="Membro"
                  value={memberId}
                  onChange={(value) => {
                    setMemberId(value);
                    setAddError('');
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
                      await apiService.createEventRegistration(event.id, {
                        type: 'member',
                        member_id: memberId,
                      });
                      resetAddForm();
                      toast.success('Membro inscrito');
                      await refreshAll();
                    } catch (error) {
                      const message = formatApiError(error);
                      setAddError(message);
                      toast.error(message);
                    }
                  }}
                  disabled={!memberId || memberAlreadyEnrolled || isFull}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Vincular
                </Button>
              </div>
              {memberAlreadyEnrolled ? (
                <p className="text-sm text-amber-800">Este membro já está inscrito neste evento.</p>
              ) : addError ? (
                <p className="text-sm text-red-600">{addError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
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
                  className={`text-base ${
                    guestWhatsappTaken
                      ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/20'
                      : ''
                  }`}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  aria-invalid={guestWhatsappTaken || undefined}
                  aria-describedby={guestWhatsappTaken ? 'guest-whatsapp-taken' : undefined}
                />
                <Input
                  label="Nascimento"
                  type="date"
                  value={guestBirth}
                  onChange={(e) => setGuestBirth(e.target.value)}
                  className="text-base"
                />
                <Input
                  label="E-mail (opcional)"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="text-base"
                />
              </div>
              {guestWhatsappTaken ? (
                <p id="guest-whatsapp-taken" className="text-sm text-red-600">
                  Já existe um inscrito com este WhatsApp.
                </p>
              ) : null}
              <Button
                className="min-h-11 w-full whitespace-nowrap sm:w-auto"
                onClick={async () => {
                  try {
                    await apiService.createEventRegistration(event.id, {
                      type: 'guest',
                      full_name: guestName,
                      whatsapp: guestDigits,
                      birth_date: guestBirth,
                      email: guestEmail.trim() || undefined,
                    });
                    resetAddForm();
                    toast.success('Convidado inscrito');
                    await refreshAll();
                  } catch (error) {
                    toast.error(formatApiError(error));
                  }
                }}
                disabled={
                  guestName.trim().length < 2 ||
                  guestDigits.length < 10 ||
                  !guestBirth ||
                  guestWhatsappTaken ||
                  isFull
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
                      await apiService.resolveEventRegistration(item.id, {
                        action: 'link_member',
                        member_id: candidateId,
                      });
                      toast.success('Vinculado ao membro');
                      await refreshAll();
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                  onDismiss={async () => {
                    try {
                      await apiService.deleteEventRegistration(item.id);
                      toast.success('Inscrição removida da fila');
                      await refreshAll();
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                  onKeepGuest={async () => {
                    try {
                      await apiService.resolveEventRegistration(item.id, {
                        action: 'keep_guest',
                      });
                      toast.success('Mantido como convidado');
                      await refreshAll();
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
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Nenhum inscrito corresponde à busca.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {paged.map((item) => {
                    const name =
                      item.kind === 'member'
                        ? item.member?.name || item.display_name || 'Membro'
                        : item.full_name || item.display_name || 'Convidado';
                    const contact = item.whatsapp || item.member?.whatsapp || null;
                    return (
                      <li
                        key={item.id}
                        className="group relative flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 pr-12">
                          <ProfileAvatar
                            name={name}
                            kind={item.kind === 'member' ? 'member' : 'guest'}
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-gray-900">
                                {name}
                              </span>
                              <RegistrationKindBadge kind={item.kind} />
                            </div>
                            <WhatsAppLink whatsapp={contact} />
                          </div>
                        </div>
                        {!readOnly ? (
                          <Button
                            variant="ghost"
                            className="absolute right-2 top-1/2 z-10 min-h-11 min-w-11 -translate-y-1/2 text-gray-500 hover:text-red-600"
                            aria-label={`Remover inscrição de ${name}`}
                            onClick={() => handleRemove(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
