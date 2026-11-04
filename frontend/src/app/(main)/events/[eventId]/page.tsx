'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Pencil } from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { Button } from '@/components/ui/Button';
import { EventDetailView } from '@/components/events/EventDetailView';
import { EventStatusBadge } from '@/components/events/EventUi';
import { READER_TOOLTIP } from '@/components/events/constants';
import { useEventViewParams } from '@/components/events/useEventViewParams';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { ChurchEvent } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const { queryString } = useEventViewParams();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<ChurchEvent | null>(null);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventData, congregationsData] = await Promise.all([
        apiService.getEvent(eventId),
        apiService.listCongregations(),
      ]);
      setEvent(eventData);
      setCongregations(
        congregationsData.map((c: { id: string; name: string; abbreviation?: string | null }) => ({
          value: c.id,
          label: getCongregationDisplayName(c),
        }))
      );
    } catch (err) {
      toast.error(formatApiError(err));
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando evento…
      </div>
    );
  }

  if (!event) {
    return <p className="py-16 text-center text-sm text-gray-500">Evento não encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref={`/events${queryString}`}
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        actions={
          !readOnly ? (
            <Button variant="secondary" className="min-h-11" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <span title={READER_TOOLTIP} className="text-sm text-gray-500">
              Somente leitura
            </span>
          )
        }
      />
      <EventDetailView
        event={event}
        readOnly={readOnly}
        congregations={congregations}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        onDeleted={() => router.push(`/events${queryString}`)}
      />
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
