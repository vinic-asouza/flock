'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Pencil, Plus, School, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  ClassDetailModal,
  ClassFormModal,
  ProgramFormModal,
} from '@/components/teaching/TeachingModals';
import { StatusBadge, TeachingEmptyState } from '@/components/teaching/TeachingUi';
import { READER_TOOLTIP } from '@/components/teaching/constants';
import {
  TeachingViewSelector,
  useTeachingViewParams,
} from '@/components/teaching/useTeachingViewParams';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingProgram } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

function TeachingProgramContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const programId = String(params.programId || '');
  const { view, congregationId, queryString } = useTeachingViewParams();

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<TeachingProgram | null>(null);
  const [classes, setClasses] = useState<TeachingClass[]>([]);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [detailClass, setDetailClass] = useState<TeachingClass | null>(null);
  const [editingClass, setEditingClass] = useState<TeachingClass | null>(null);

  const programLockedCongregation = program?.congregation_id || null;
  const showViewSelector = Boolean(program) && !programLockedCongregation;
  const waitingForCongregation =
    showViewSelector && view === 'congregation' && !congregationId;

  const loadData = useCallback(async () => {
    if (!programId) return;
    try {
      setLoading(true);
      const [programData, congregationsData] = await Promise.all([
        apiService.getTeachingProgram(programId),
        apiService.listCongregations(),
      ]);
      setProgram(programData);
      setCongregations(
        congregationsData.map((c: { id: string; name: string; abbreviation?: string | null }) => ({
          value: c.id,
          label: getCongregationDisplayName(c),
        }))
      );

      const classParams: { program_id: string; congregation_id?: string } = {
        program_id: programId,
      };
      if (!programData.congregation_id) {
        if (view === 'congregation' && !congregationId) {
          setClasses([]);
          return;
        }
        if (view === 'congregation' && congregationId) {
          classParams.congregation_id = congregationId;
        }
      }

      const classesData = await apiService.listTeachingClasses(classParams);
      setClasses(classesData);
    } catch (err) {
      toast.error(formatApiError(err));
      setProgram(null);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [congregationId, programId, view]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const programList = useMemo(() => (program ? [program] : []), [program]);
  const programOptions = useMemo(
    () => (program ? [{ value: program.id, label: program.name }] : []),
    [program]
  );

  const openCreateClass = () => {
    setEditingClass(null);
    setClassModalOpen(true);
  };

  const scopeLabel = program
    ? program.congregation_id
      ? program.congregations
        ? getCongregationDisplayName(program.congregations)
        : 'Congregação'
      : 'Todas as congregações'
    : '';

  if (!loading && !program) {
    return (
      <div className="space-y-4">
        <Link
          href={`/teaching${queryString}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary min-h-11"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos programas
        </Link>
        <TeachingEmptyState text="Programa não encontrado ou sem acesso nesta visão." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/teaching${queryString}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary min-h-11"
      >
        <ArrowLeft className="h-4 w-4" />
        Programas
      </Link>

      <PageHeader
        title={program?.name || 'Programa'}
        subtitle={
          program
            ? `${scopeLabel}${program.description ? ` · ${program.description}` : ''}`
            : 'Carregando…'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {!readOnly && program ? (
              <>
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setProgramModalOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar programa
                </Button>
                <Button onClick={openCreateClass} className="min-h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova turma
                </Button>
              </>
            ) : readOnly ? (
              <span title={READER_TOOLTIP} className="text-sm text-gray-500">
                Somente leitura
              </span>
            ) : null}
          </div>
        }
      />

      {showViewSelector ? <TeachingViewSelector /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      ) : waitingForCongregation && !programLockedCongregation ? (
        <p className="text-sm text-gray-500 py-8">Selecione uma congregação para continuar.</p>
      ) : classes.length === 0 ? (
        <TeachingEmptyState
          text="Nenhuma turma neste programa ainda. Crie a primeira para gerenciar inscritos e gerar o link público."
          action={
            !readOnly ? (
              <Button onClick={openCreateClass} className="min-h-11">
                <Plus className="h-4 w-4 mr-2" />
                Criar turma
              </Button>
            ) : undefined
          }
        />
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
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <School className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.congregations
                        ? getCongregationDisplayName(item.congregations)
                        : 'Congregação'}
                      {item.schedule ? ` · ${item.schedule}` : ''}
                    </div>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="text-sm text-gray-500 mt-3 flex items-center gap-1 pl-12">
                <Users className="h-3.5 w-3.5" />
                {item.responsible?.name || 'Sem responsável'}
              </div>
            </button>
          ))}
        </div>
      )}

      {program ? (
        <ProgramFormModal
          open={programModalOpen}
          onClose={() => setProgramModalOpen(false)}
          program={program}
          congregations={congregations}
          onSaved={loadData}
          onDeleted={() => router.push(`/teaching${queryString}`)}
        />
      ) : null}

      {program ? (
        <ClassFormModal
          open={classModalOpen}
          onClose={() => setClassModalOpen(false)}
          teachingClass={editingClass}
          programs={programList}
          programOptions={programOptions}
          congregations={congregations}
          defaultCongregationId={program.congregation_id || congregationId}
          lockedProgramId={program.id}
          onSaved={loadData}
        />
      ) : null}

      {detailClass ? (
        <ClassDetailModal
          teachingClass={detailClass}
          readOnly={readOnly}
          onClose={() => setDetailClass(null)}
          onEdit={(cls) => {
            setEditingClass(cls);
            setDetailClass(null);
            setClassModalOpen(true);
          }}
          onChanged={async () => {
            await loadData();
            try {
              const refreshed = await apiService.getTeachingClass(detailClass.id);
              setDetailClass(refreshed);
            } catch {
              setDetailClass(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

export default function TeachingProgramPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      }
    >
      <TeachingProgramContent />
    </Suspense>
  );
}
