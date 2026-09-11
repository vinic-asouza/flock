'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronRight, Loader2, Plus, BookOpen, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ProgramFormModal } from '@/components/teaching/TeachingModals';
import { CongregationBadge, TeachingEmptyState } from '@/components/teaching/TeachingUi';
import { READER_TOOLTIP } from '@/components/teaching/constants';
import {
  TeachingViewSelector,
  useTeachingViewParams,
} from '@/components/teaching/useTeachingViewParams';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingProgram } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

function TeachingHubContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const { view, congregationId, queryString } = useTeachingViewParams();

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<TeachingProgram[]>([]);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [programModalOpen, setProgramModalOpen] = useState(false);

  const waitingForCongregation = view === 'congregation' && !congregationId;

  const loadData = useCallback(async () => {
    if (waitingForCongregation) {
      setPrograms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params =
      view === 'congregation' && congregationId
        ? { congregation_id: congregationId }
        : undefined;

    try {
      const programsData = await apiService.listTeachingPrograms(params);
      setPrograms(programsData);
    } catch (err) {
      toast.error(formatApiError(err));
      setPrograms([]);
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

  const openCreateProgram = () => setProgramModalOpen(true);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ensino"
        subtitle="Comece pelos programas. Depois abra um programa para gerenciar as turmas."
        actions={
          !readOnly ? (
            <Button onClick={openCreateProgram} className="min-h-11">
              <Plus className="h-4 w-4 mr-2" />
              Novo programa
            </Button>
          ) : (
            <span title={READER_TOOLTIP} className="text-sm text-gray-500">
              Somente leitura
            </span>
          )
        }
      />

      <TeachingViewSelector />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      ) : waitingForCongregation ? (
        <TeachingEmptyState text="Selecione uma congregação para ver os programas desta visão." />
      ) : programs.length === 0 ? (
        <TeachingEmptyState
          text="Ainda não há programas. Crie o primeiro (ex.: EBD 2026) para depois abrir turmas."
          action={
            !readOnly ? (
              <Button onClick={openCreateProgram} className="min-h-11">
                <Plus className="h-4 w-4 mr-2" />
                Criar programa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const count = program.class_count || 0;
            return (
              <Link
                key={program.id}
                href={`/teaching/${program.id}${queryString}`}
                className="group block rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="truncate font-medium text-gray-900">{program.name}</div>
                      <CongregationBadge
                        congregation={program.congregations}
                        allCongregations={!program.congregation_id}
                      />
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary" />
                </div>
                {program.description ? (
                  <p className="mt-3 line-clamp-2 pl-12 text-sm text-gray-500">{program.description}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-1.5 pl-12 text-sm text-gray-600">
                  <Users className="h-3.5 w-3.5" />
                  {count === 0
                    ? 'Nenhuma turma ainda'
                    : count === 1
                      ? '1 turma'
                      : `${count} turmas`}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProgramFormModal
        open={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        program={null}
        congregations={congregations}
        onSaved={loadData}
      />
    </div>
  );
}

export default function TeachingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      }
    >
      <TeachingHubContent />
    </Suspense>
  );
}
