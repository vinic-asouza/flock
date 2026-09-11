'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { ClassFormModal } from '@/components/teaching/TeachingModals';
import { TeachingClassDetailView } from '@/components/teaching/TeachingClassDetailView';
import { StatusBadge, TeachingEmptyState } from '@/components/teaching/TeachingUi';
import { READER_TOOLTIP } from '@/components/teaching/constants';
import { useTeachingViewParams } from '@/components/teaching/useTeachingViewParams';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingProgram } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

function TeachingClassContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const programId = String(params.programId || '');
  const classId = String(params.classId || '');
  const { congregationId, queryString } = useTeachingViewParams();

  const [loading, setLoading] = useState(true);
  const [teachingClass, setTeachingClass] = useState<TeachingClass | null>(null);
  const [program, setProgram] = useState<TeachingProgram | null>(null);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const backHref = `/teaching/${programId}${queryString}`;

  const loadClass = useCallback(async () => {
    if (!classId || !programId) return;
    try {
      setLoading(true);
      setNotFound(false);
      const [classData, congregationsData] = await Promise.all([
        apiService.getTeachingClass(classId),
        apiService.listCongregations(),
      ]);

      if (classData.program_id !== programId) {
        setTeachingClass(null);
        setProgram(null);
        setNotFound(true);
        return;
      }

      setTeachingClass(classData);
      setProgram(classData.program || null);
      setCongregations(
        congregationsData.map((c: { id: string; name: string; abbreviation?: string | null }) => ({
          value: c.id,
          label: getCongregationDisplayName(c),
        }))
      );

      if (!classData.program) {
        try {
          const programData = await apiService.getTeachingProgram(programId);
          setProgram(programData);
        } catch {
          /* programa já pode vir na turma */
        }
      }
    } catch (err) {
      toast.error(formatApiError(err));
      setTeachingClass(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [classId, programId]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  const programList = useMemo(() => (program ? [program] : []), [program]);
  const programOptions = useMemo(
    () => (program ? [{ value: program.id, label: program.name }] : []),
    [program]
  );

  const subtitle = teachingClass
    ? [
        teachingClass.program?.name || program?.name,
        teachingClass.congregations
          ? getCongregationDisplayName(teachingClass.congregations)
          : null,
        teachingClass.schedule || null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  if (!loading && (notFound || !teachingClass)) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary min-h-11"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às turmas
        </Link>
        <TeachingEmptyState text="Turma não encontrada ou não pertence a este programa." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary min-h-11"
      >
        <ArrowLeft className="h-4 w-4" />
        Turmas do programa
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {teachingClass?.name || 'Turma'}
            </h1>
            {teachingClass ? <StatusBadge status={teachingClass.status} /> : null}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {loading ? 'Carregando…' : subtitle || ' '}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
          {!readOnly && teachingClass ? (
            <>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="ghost"
                className="min-h-11 text-red-600 hover:text-red-700"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </>
          ) : readOnly ? (
            <span title={READER_TOOLTIP} className="text-sm text-gray-500">
              Somente leitura
            </span>
          ) : null}
        </div>
      </div>

      {loading || !teachingClass ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      ) : (
        <TeachingClassDetailView
          teachingClass={teachingClass}
          readOnly={readOnly}
          onDetailsChange={setTeachingClass}
        />
      )}

      {teachingClass && program ? (
        <ClassFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          teachingClass={teachingClass}
          programs={programList}
          programOptions={programOptions}
          congregations={congregations}
          defaultCongregationId={
            teachingClass.congregation_id || program.congregation_id || congregationId
          }
          lockedProgramId={program.id}
          onSaved={async () => {
            await loadClass();
          }}
        />
      ) : null}

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir turma"
        itemName={teachingClass?.name}
        message="Esta ação remove a turma e todas as matrículas. Não é possível desfazer."
        isLoading={deleting}
        onConfirm={async () => {
          if (!teachingClass) return;
          try {
            setDeleting(true);
            await apiService.deleteTeachingClass(teachingClass.id);
            toast.success('Turma excluída');
            setDeleteOpen(false);
            router.push(backHref);
          } catch (err) {
            toast.error(formatApiError(err));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}

export default function TeachingClassPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando…
        </div>
      }
    >
      <TeachingClassContent />
    </Suspense>
  );
}
