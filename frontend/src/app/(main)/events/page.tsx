'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CalendarDays, ChevronRight, Loader2, MapPin, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EventFormModal } from '@/components/events/EventFormModal';
import {
  CongregationBadge,
  EventEmptyState,
  EventStatusBadge,
  formatEventDateTime,
  formatSpots,
} from '@/components/events/EventUi';
import { READER_TOOLTIP } from '@/components/events/constants';
import {
  EventViewSelector,
  useEventViewParams,
} from '@/components/events/useEventViewParams';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { ChurchEvent } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

function EventsHubContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const { view, congregationId, queryString } = useEventViewParams();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const waitingForCongregation = view === 'congregation' && !congregationId;

  const loadData = useCallback(async () => {
    if (waitingForCongregation) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params =
      view === 'congregation' && congregationId
        ? { congregation_id: congregationId }
        : undefined;

    try {
      const response = await apiService.listEvents(params);
      setEvents(response.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
      setEvents([]);
    }

    try {
      const congregationsData = await apiService.listCongregations();
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Eventos"
        subtitle="Gerencie congressos, conferências e encontros especiais."
        actions={
          !readOnly ? (
            <Button onClick={() => setModalOpen(true)} className="min-h-11">
              <Plus className="h-4 w-4 mr-2" />
              Novo evento
            </Button>
          ) : (
            <span title={READER_TOOLTIP} className="text-sm text-gray-500">
              Somente leitura
            </span>
          )
        }
      />

      <EventViewSelector />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      ) : waitingForCongregation ? (
        <EventEmptyState text="Selecione uma congregação para ver os eventos desta visão." />
      ) : events.length === 0 ? (
        <EventEmptyState
          text="Nenhum evento nesta visão. Crie um encontro especial para começar."
          action={
            !readOnly ? (
              <Button onClick={() => setModalOpen(true)} className="min-h-11">
                <Plus className="h-4 w-4 mr-2" />
                Criar evento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}${queryString}`}
              className="group block rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="truncate font-medium text-gray-900">{event.name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <EventStatusBadge status={event.status} />
                      <CongregationBadge
                        congregation={event.congregations}
                        allCongregations={!event.congregation_id}
                      />
                    </div>
                  </div>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary" />
              </div>
              <div className="mt-3 space-y-1.5 pl-12 text-sm text-gray-600">
                <div>{formatEventDateTime(event.starts_at)}</div>
                {event.location ? (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Vagas: {formatSpots(event)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <EventFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={null}
        congregations={congregations}
        defaultCongregationId={congregationId}
        onSaved={loadData}
      />
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      }
    >
      <EventsHubContent />
    </Suspense>
  );
}
