'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Link2, MapPin, Power, Users } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EntityDetailLayout } from '@/components/entity-detail';
import apiService, { formatApiError, getApiErrorStatus } from '@/services/api';
import type { ChurchEvent, EventPublicLink } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';
import { EventFormModal } from './EventFormModal';
import { EventRegistrationsTab } from './EventRegistrationsTab';
import {
  CongregationBadge,
  EventStatusBadge,
  formatEventDateTime,
  formatSpots,
} from './EventUi';

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

export function EventDetailView({
  event: initialEvent,
  readOnly,
  congregations,
  headerActions,
  onDeleted,
  editOpen,
  onEditOpenChange,
}: {
  event: ChurchEvent;
  readOnly: boolean;
  congregations: Array<{ value: string; label: string }>;
  headerActions?: React.ReactNode;
  onDeleted: () => void;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [link, setLink] = useState<EventPublicLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  const publicEnrollmentAllowed =
    event.status === 'open' || event.status === 'in_progress';
  const organizers = (event.organizers || []).filter(Boolean) as Array<{ id: string; name: string }>;
  const spotsLabel = formatSpots(event);
  const isFull =
    event.capacity != null && (event.registration_count || 0) >= event.capacity;

  const refreshEvent = useCallback(async () => {
    const next = await apiService.getEvent(event.id);
    setEvent(next);
  }, [event.id]);

  const loadLink = useCallback(async () => {
    try {
      const data = await apiService.getEventPublicLink(event.id);
      setLink(data);
    } catch (err) {
      if (getApiErrorStatus(err) === 404) setLink(null);
      else toast.error(formatApiError(err));
    }
  }, [event.id]);

  useEffect(() => {
    setEvent(initialEvent);
  }, [initialEvent]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const createLink = async () => {
    try {
      setLinkBusy(true);
      const data = await apiService.createEventPublicLink(event.id);
      setLink(data);
      toast.success('Link público criado');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLinkBusy(false);
    }
  };

  const toggleLink = async () => {
    if (!link) return;
    try {
      setLinkBusy(true);
      const data = await apiService.updateEventPublicLink(event.id, {
        is_active: !link.is_active,
      });
      setLink(data);
      toast.success(data.is_active ? 'Link ativado' : 'Link desativado');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLinkBusy(false);
    }
  };

  const copyLink = async () => {
    if (!link?.url) return;
    await navigator.clipboard.writeText(link.url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  return (
    <>
      {headerActions}
      <EntityDetailLayout
        aside={
          <>
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <EventStatusBadge status={event.status} />
                <CongregationBadge
                  congregation={event.congregations}
                  allCongregations={!event.congregation_id}
                />
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Quando</dt>
                  <dd className="text-gray-900">{formatEventDateTime(event.starts_at)}</dd>
                  {event.ends_at ? (
                    <dd className="text-gray-500">até {formatEventDateTime(event.ends_at)}</dd>
                  ) : null}
                </div>
                <div>
                  <dt className="mb-1 flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    Local
                  </dt>
                  <dd className="text-gray-900">{event.location || '—'}</dd>
                  {event.congregations ? (
                    <dd className="text-gray-500">
                      {getCongregationDisplayName(event.congregations)}
                    </dd>
                  ) : null}
                </div>
                {event.groups?.name ? (
                  <div>
                    <dt className="text-gray-500">Ministério responsável</dt>
                    <dd className="text-gray-900">{event.groups.name}</dd>
                  </div>
                ) : null}
                {event.description ? (
                  <div>
                    <dt className="text-gray-500">Descrição</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{event.description}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            <Card className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Users className="h-4 w-4 text-gray-400" />
                Equipe
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.responsible?.name ? (
                  <PersonChip name={`${event.responsible.name} (responsável)`} />
                ) : null}
                {organizers.map((o) => (
                  <PersonChip key={o.id} name={o.name} />
                ))}
              </div>
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Vagas</h3>
              <div className="text-sm text-gray-700">{spotsLabel}</div>
              {isFull ? (
                <Alert variant="warning" message="Vagas esgotadas." />
              ) : null}
            </Card>

            <Card className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Link2 className="h-4 w-4 text-gray-400" />
                Link público
              </h3>
              {!publicEnrollmentAllowed ? (
                <p className="text-sm text-gray-500">
                  Disponível só com status Aberto ou Em andamento.
                </p>
              ) : null}
              {link ? (
                <div className="space-y-2">
                  <code className="block truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-gray-700">
                    {link.url}
                  </code>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="min-h-11" onClick={copyLink}>
                        {linkCopied ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copiar
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-h-11"
                        onClick={toggleLink}
                        disabled={linkBusy}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        {link.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : !readOnly ? (
                <Button className="min-h-11" onClick={createLink} disabled={linkBusy}>
                  Gerar link público
                </Button>
              ) : (
                <p className="text-sm text-gray-500">Nenhum link gerado.</p>
              )}
            </Card>
          </>
        }
      >
        <Card>
          <h3 className="mb-4 text-sm font-medium text-gray-900">Inscritos</h3>
          <EventRegistrationsTab event={event} readOnly={readOnly} onChanged={refreshEvent} />
        </Card>
      </EntityDetailLayout>

      <EventFormModal
        open={editOpen}
        onClose={() => onEditOpenChange(false)}
        event={event}
        congregations={congregations}
        onSaved={async () => {
          await refreshEvent();
          await loadLink();
        }}
        onDeleted={onDeleted}
      />
    </>
  );
}
