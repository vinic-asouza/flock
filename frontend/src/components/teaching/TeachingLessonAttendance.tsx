'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Loader2, Search, UserCheck, Users, X } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import apiService, { formatApiError } from '@/services/api';
import type {
  TeachingAttendanceItem,
  TeachingAttendanceStatus,
  TeachingLesson,
} from '@/types';
import { READER_TOOLTIP } from './constants';

interface TeachingLessonAttendanceProps {
  lesson: TeachingLesson;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

export function TeachingLessonAttendance({
  lesson,
  readOnly,
  onDirtyChange,
}: TeachingLessonAttendanceProps) {
  const [items, setItems] = useState<TeachingAttendanceItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    unregistered: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [changes, setChanges] = useState<Record<string, TeachingAttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const dirty = Object.keys(changes).length > 0;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getTeachingLessonAttendance(lesson.id, {
        page,
        limit: 10,
        search,
      });
      setItems(result.data);
      setSummary(result.summary);
      setTotalPages(Math.max(1, result.pagination.totalPages));
      setChanges({});
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [lesson.id, page, search]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setSearchInput('');
    setChanges({});
  }, [lesson.id]);

  const displayedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        status: changes[item.enrollment_id] ?? item.status,
      })),
    [items, changes]
  );

  const confirmDiscard = () =>
    !dirty ||
    window.confirm('Há alterações de presença não salvas. Deseja descartá-las?');

  const saveChanges = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiService.saveTeachingLessonAttendance(lesson.id, {
        changes: Object.entries(changes).map(([enrollment_id, status]) => ({
          enrollment_id,
          status: status === 'unregistered' ? null : status,
        })),
        mark_unregistered_present: false,
        overwrite_absent: false,
      });
      toast.success('Chamada salva');
      await loadAttendance();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async (overwriteAbsent: boolean) => {
    try {
      setSaving(true);
      setError(null);
      await apiService.saveTeachingLessonAttendance(lesson.id, {
        changes: Object.entries(changes).map(([enrollment_id, status]) => ({
          enrollment_id,
          status: status === 'unregistered' ? null : status,
        })),
        mark_unregistered_present: true,
        overwrite_absent: overwriteAbsent,
      });
      setBulkConfirmOpen(false);
      toast.success(overwriteAbsent ? 'Todos foram marcados como presentes' : 'Não registradas foram marcadas como presentes');
      await loadAttendance();
    } catch (err) {
      setError(formatApiError(err));
      setBulkConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-sm text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando chamada…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="space-y-2">
          <Alert
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
          {items.length === 0 && !dirty ? (
            <Button
              variant="secondary"
              className="min-h-11 w-full"
              onClick={loadAttendance}
              disabled={saving}
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['Total', summary.total],
          ['Presentes', summary.present],
          ['Ausentes', summary.absent],
          ['Não registradas', summary.unregistered],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
            <div className="text-lg font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!confirmDiscard()) return;
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar inscrito"
            aria-label="Buscar inscrito na chamada"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button type="submit" variant="secondary" className="min-h-11 min-w-11 px-3">
          Buscar
        </Button>
      </form>

      {summary.total === 0 && !search ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-500">Nenhum inscrito elegível para esta aula.</p>
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          Nenhum inscrito corresponde à busca.
        </p>
      ) : (
        <ul className="space-y-2">
          {displayedItems.map((item) => (
            <li
              key={item.enrollment_id}
              className="grid gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{item.display_name}</p>
                <p className="text-xs text-gray-500">
                  {item.kind === 'member' ? 'Membro' : 'Convidado'}
                  {item.removed_from_class ? ' · Removido da turma' : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1 sm:items-end">
                {item.status === 'unregistered' ? (
                  <span className="text-xs text-gray-500">Não registrada</span>
                ) : null}
                <div
                  role="group"
                  aria-label={`Presença de ${item.display_name}`}
                  className="flex flex-wrap gap-2"
                >
                  {(
                    [
                      {
                        value: 'present' as const,
                        label: 'Presente',
                        icon: Check,
                        active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/30',
                      },
                      {
                        value: 'absent' as const,
                        label: 'Ausente',
                        icon: X,
                        active: 'bg-rose-50 text-rose-700 ring-rose-600/30',
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const pressed = item.status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={pressed}
                        disabled={readOnly || saving}
                        title={readOnly ? READER_TOOLTIP : undefined}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                          pressed
                            ? option.active
                            : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          const next: TeachingAttendanceStatus = pressed
                            ? 'unregistered'
                            : option.value;
                          setChanges((current) => {
                            const original = items.find(
                              (row) => row.enrollment_id === item.enrollment_id
                            )?.status;
                            if (original === next) {
                              const rest = { ...current };
                              delete rest[item.enrollment_id];
                              return rest;
                            }
                            return { ...current, [item.enrollment_id]: next };
                          });
                        }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => {
          if (!confirmDiscard()) return;
          setPage(nextPage);
        }}
      />

      {!readOnly && summary.total > 0 ? (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-gray-200 bg-white py-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={saving || summary.unregistered === 0}
            onClick={() => {
              if (summary.absent > 0) setBulkConfirmOpen(true);
              else markAllPresent(false);
            }}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Marcar todos presentes
          </Button>
          <Button
            className="min-h-11"
            isLoading={saving}
            disabled={!dirty}
            onClick={saveChanges}
          >
            Salvar chamada
          </Button>
        </div>
      ) : null}

      <Modal
        isOpen={bulkConfirmOpen}
        onClose={() => !saving && setBulkConfirmOpen(false)}
        title="Há pessoas ausentes"
        description="Escolha como tratar as ausências já registradas."
        size="sm"
        closeOnEscape={!saving}
        closeOnOverlayClick={!saving}
      >
        <div className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Você pode manter quem já está ausente e marcar apenas os não registrados, ou
            sobrescrever também as ausências.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="min-h-11" onClick={() => markAllPresent(false)} disabled={saving}>
              Manter ausentes
            </Button>
            <Button variant="danger" className="min-h-11" onClick={() => markAllPresent(true)} disabled={saving}>
              Sobrescrever ausentes
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={() => setBulkConfirmOpen(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
