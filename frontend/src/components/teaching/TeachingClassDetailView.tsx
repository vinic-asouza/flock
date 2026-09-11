'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Power,
  Trash2,
  User,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/common/Pagination';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingEnrollment, TeachingPublicLink } from '@/types';
import { formatPhone, maskPhoneInput } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';
import { StatusBadge } from './TeachingUi';

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

function EnrollmentWhatsAppLink({ whatsapp }: { whatsapp?: string | null }) {
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
        apiService.getTeachingPublicLink(teachingClass.id),
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
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-0">
      <aside className="w-full shrink-0 space-y-5 md:sticky md:top-4 md:w-[34%] md:border-r md:border-gray-200 md:pr-6">
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
          <h3 className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2">
              <Link2 className="h-4 w-4 text-gray-400" /> Link público
            </span>
            {link ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  link.is_active
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-gray-100 text-gray-600 ring-gray-500/20'
                }`}
              >
                {link.is_active ? 'Ativo' : 'Inativo'}
              </span>
            ) : null}
          </h3>
          {link ? (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input value={link.url} readOnly className="text-base" />
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

      <div className="min-w-0 flex-1 space-y-5 border-t border-gray-200 pt-5 md:border-t-0 md:pt-0 md:pl-6">
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
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] sm:items-end">
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
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={async () => {
                    try {
                      await apiService.createTeachingEnrollment(teachingClass.id, {
                        type: 'guest',
                        full_name: guestName,
                        whatsapp: guestWhatsapp.replace(/\D/g, ''),
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
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Inscritos ({others.length})
              </h3>
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
                      const contact = item.whatsapp || item.member?.whatsapp || null;
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
  );
}
