'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  addMonths,
  format,
  isSameMonth,
  isToday,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import apiService, { formatApiError, getApiErrorStatus } from '@/services/api';
import type {
  TeachingClass,
  TeachingLesson,
  TeachingLessonScope,
} from '@/types';
import { TeachingEmptyState } from './TeachingUi';
import { TeachingLessonAttendance } from './TeachingLessonAttendance';
import { TeachingLessonFormModal } from './TeachingLessonFormModal';
import {
  formatLessonDate,
  formatLessonTime,
  getVisibleMonthDays,
  getVisibleMonthRange,
  groupLessonsByDate,
  toDateKey,
} from './teachingLessonUtils';

type ScheduleMode = 'calendar' | 'list';
type DetailTab = 'details' | 'attendance';

function LessonButton({
  lesson,
  selected,
  compact = false,
  onClick,
}: {
  lesson: TeachingLesson;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 w-full min-w-0 rounded-lg border text-left transition-colors ${
        compact ? 'p-1.5' : 'p-3'
      } ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-gray-200 bg-white hover:border-primary/40'
      }`}
    >
      <span className={`block truncate font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
        {formatLessonTime(lesson.start_time)} {compact ? '' : '· '}
        {lesson.title}
      </span>
      {!compact ? (
        <span className="mt-1 block text-xs text-gray-500">
          {lesson.series_id ? 'Aula recorrente' : 'Aula avulsa'}
        </span>
      ) : null}
    </button>
  );
}

function LessonDetail({
  lesson,
  readOnly,
  dirty,
  onDirtyChange,
  onEdit,
  onDelete,
  onRequestTab,
}: {
  lesson: TeachingLesson;
  readOnly: boolean;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRequestTab: (next: DetailTab) => boolean;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('details');

  useEffect(() => {
    setActiveTab('details');
  }, [lesson.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        tabs={[
          { id: 'details', label: 'Detalhes', panelId: 'lesson-details-panel' },
          { id: 'attendance', label: 'Chamada', panelId: 'lesson-attendance-panel' },
        ]}
        activeTab={activeTab}
        ariaLabel="Detalhes da aula"
        onTabChange={(value) => {
          const next = value as DetailTab;
          if (activeTab === 'attendance' && dirty && !onRequestTab(next)) return;
          setActiveTab(next);
        }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {activeTab === 'details' ? (
          <div id="lesson-details-panel" role="tabpanel" className="space-y-4">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold text-gray-900">
                    {lesson.title}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {formatLessonDate(lesson.lesson_date)} · {formatLessonTime(lesson.start_time)}
                  </p>
                </div>
                {lesson.series_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                    <RotateCw className="h-3 w-3" />
                    Recorrente
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Descrição</h4>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                {lesson.description || 'Nenhuma descrição informada.'}
              </p>
            </div>
            {!readOnly ? (
              <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row">
                <Button variant="secondary" className="min-h-11" onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" className="min-h-11 text-red-600" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div id="lesson-attendance-panel" role="tabpanel">
            <TeachingLessonAttendance
              lesson={lesson}
              readOnly={readOnly}
              onDirtyChange={onDirtyChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function TeachingLessonsTab({
  teachingClass,
  readOnly,
  onDirtyChange,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deepLinkedLessonId = searchParams.get('lessonId');
  const [month, setMonth] = useState(() => new Date());
  const [mode, setMode] = useState<ScheduleMode>('calendar');
  const [lessons, setLessons] = useState<TeachingLesson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkedLessonId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TeachingLesson | null>(null);
  const [initialDate, setInitialDate] = useState<string>();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<TeachingLessonScope>('single');
  const [deleteAttendanceConfirmed, setDeleteAttendanceConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const range = useMemo(() => getVisibleMonthRange(month), [month]);
  const calendarDays = useMemo(() => getVisibleMonthDays(month), [month]);
  const lessonsByDate = useMemo(() => groupLessonsByDate(lessons), [lessons]);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedId) || null;

  useEffect(() => {
    onDirtyChange(attendanceDirty);
  }, [attendanceDirty, onDirtyChange]);

  useEffect(
    () => () => {
      onDirtyChange(false);
    },
    [onDirtyChange]
  );

  const replaceLessonQuery = useCallback(
    (lessonId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (lessonId) params.set('lessonId', lessonId);
      else params.delete('lessonId');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.listTeachingLessons(teachingClass.id, range);
      setLessons(result.data);
      if (deepLinkedLessonId && result.data.some((lesson) => lesson.id === deepLinkedLessonId)) {
        setSelectedId(deepLinkedLessonId);
        if (window.matchMedia('(max-width: 767px)').matches) setMobileDetailOpen(true);
      } else if (
        selectedId &&
        selectedId !== deepLinkedLessonId &&
        !result.data.some((lesson) => lesson.id === selectedId)
      ) {
        setSelectedId(null);
        replaceLessonQuery(null);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [
    deepLinkedLessonId,
    range,
    replaceLessonQuery,
    selectedId,
    teachingClass.id,
  ]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const confirmDiscardAttendance = () =>
    !attendanceDirty ||
    window.confirm('Há alterações de presença não salvas. Deseja descartá-las?');

  const selectLesson = (lesson: TeachingLesson) => {
    if (lesson.id === selectedId) {
      if (window.matchMedia('(max-width: 767px)').matches) setMobileDetailOpen(true);
      return;
    }
    if (!confirmDiscardAttendance()) return;
    setAttendanceDirty(false);
    setSelectedId(lesson.id);
    replaceLessonQuery(lesson.id);
    if (window.matchMedia('(max-width: 767px)').matches) setMobileDetailOpen(true);
  };

  const changeMonth = (next: Date) => {
    if (!confirmDiscardAttendance()) return;
    setAttendanceDirty(false);
    setMonth(next);
  };

  const closeMobileDetail = () => {
    if (!confirmDiscardAttendance()) return;
    setAttendanceDirty(false);
    setMobileDetailOpen(false);
    setSelectedId(null);
    replaceLessonQuery(null);
  };

  const openCreate = (date?: string) => {
    setInitialDate(date);
    setEditingLesson(null);
    setFormOpen(true);
  };

  const openDelete = () => {
    setDeleteScope('single');
    setDeleteAttendanceConfirmed(false);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const deleteLesson = async () => {
    if (!selectedLesson) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await apiService.deleteTeachingLesson(selectedLesson.id, {
        scope: selectedLesson.series_id ? deleteScope : 'single',
        confirm_attendance_deletion: deleteAttendanceConfirmed,
      });
      toast.success(deleteScope === 'following' ? 'Aula e próximas ocorrências excluídas' : 'Aula excluída');
      setDeleteOpen(false);
      setSelectedId(null);
      setMobileDetailOpen(false);
      replaceLessonQuery(null);
      await loadLessons();
    } catch (err) {
      if (getApiErrorStatus(err) === 409 && !deleteAttendanceConfirmed) {
        setDeleteAttendanceConfirmed(true);
        setDeleteError(
          'Esta exclusão também apagará presenças registradas. Confirme novamente para continuar.'
        );
      } else {
        setDeleteError(formatApiError(err));
      }
    } finally {
      setDeleting(false);
    }
  };

  const detail = selectedLesson ? (
    <LessonDetail
      lesson={selectedLesson}
      readOnly={readOnly}
      dirty={attendanceDirty}
      onDirtyChange={setAttendanceDirty}
      onRequestTab={() => {
        if (!confirmDiscardAttendance()) return false;
        setAttendanceDirty(false);
        return true;
      }}
      onEdit={() => {
        setEditingLesson(selectedLesson);
        setFormOpen(true);
      }}
      onDelete={openDelete}
    />
  ) : (
    <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-gray-500">
      <div>
        <CalendarDays className="mx-auto mb-2 h-6 w-6 text-gray-400" />
        Selecione uma aula para ver os detalhes e a chamada.
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
          {([
            ['calendar', 'Calendário', CalendarDays],
            ['list', 'Lista', List],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-11 rounded-md px-3 text-sm font-medium ${
                mode === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Icon className="mr-1 inline h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {!readOnly ? (
          <Button className="min-h-11" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova aula
          </Button>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card className="min-w-0 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              className="min-h-11 min-w-11 px-0"
              aria-label="Mês anterior"
              onClick={() => changeMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 text-center">
              <h3 className="truncate text-sm font-semibold capitalize text-gray-900">
                {format(month, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <button
                type="button"
                className="min-h-11 text-xs font-medium text-primary"
                onClick={() => changeMonth(new Date())}
              >
                Hoje
              </button>
            </div>
            <Button
              variant="ghost"
              className="min-h-11 min-w-11 px-0"
              aria-label="Próximo mês"
              onClick={() => changeMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {error ? (
            <Alert
              variant="error"
              message={error}
              icon={<RotateCw className="h-5 w-5" />}
            />
          ) : null}
          {error ? (
            <Button variant="secondary" className="min-h-11 w-full" onClick={loadLessons}>
              Tentar novamente
            </Button>
          ) : loading ? (
            <div className="flex justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando aulas…
            </div>
          ) : mode === 'calendar' ? (
            <div className="min-w-0">
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-500 sm:text-xs">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-gray-200">
                {calendarDays.map((day) => {
                  const dateKey = toDateKey(day);
                  const dayLessons = lessonsByDate[dateKey] || [];
                  return (
                    <div
                      key={dateKey}
                      className={`min-h-20 min-w-0 border-b border-r border-gray-100 p-1 sm:min-h-28 ${
                        isSameMonth(day, month) ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => !readOnly && openCreate(dateKey)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                            isToday(day) ? 'bg-primary font-semibold text-white' : 'text-gray-600'
                          }`}
                          aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}${
                            readOnly ? '' : ', criar aula'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                        {dayLessons.length > 0 ? (
                          <span
                            className="rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-600"
                            aria-label={`${dayLessons.length} aulas`}
                          >
                            {dayLessons.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {dayLessons.slice(0, 2).map((lesson) => (
                          <LessonButton
                            key={lesson.id}
                            lesson={lesson}
                            selected={lesson.id === selectedId}
                            compact
                            onClick={() => selectLesson(lesson)}
                          />
                        ))}
                        {dayLessons.length > 2 ? (
                          <p className="truncate text-[10px] text-gray-500">
                            +{dayLessons.length - 2} aula(s)
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : lessons.length === 0 ? (
            <TeachingEmptyState
              text="Nenhuma aula neste período."
              action={!readOnly ? <Button onClick={() => openCreate()}>Criar primeira aula</Button> : undefined}
            />
          ) : (
            <ol className="space-y-3">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <p className="mb-1 text-xs font-medium capitalize text-gray-500">
                    {formatLessonDate(lesson.lesson_date)}
                  </p>
                  <LessonButton
                    lesson={lesson}
                    selected={lesson.id === selectedId}
                    onClick={() => selectLesson(lesson)}
                  />
                </li>
              ))}
            </ol>
          )}

          {!loading && !error && lessons.length === 0 && mode === 'calendar' ? (
            <p className="text-center text-sm text-gray-500">Nenhuma aula neste período.</p>
          ) : null}
        </Card>

        <Card className="hidden min-h-[32rem] min-w-0 flex-col md:flex">
          {mobileDetailOpen ? null : detail}
        </Card>
      </div>

      <Modal
        isOpen={mobileDetailOpen && Boolean(selectedLesson)}
        onClose={closeMobileDetail}
        title={selectedLesson?.title || 'Aula'}
        size="lg"
        scrollBody={false}
        closeOnEscape={!attendanceDirty}
        closeOnOverlayClick={!attendanceDirty}
        contentClassName="px-4 sm:px-6"
      >
        {detail}
      </Modal>

      <TeachingLessonFormModal
        open={formOpen}
        classId={teachingClass.id}
        lesson={editingLesson}
        initialDate={initialDate}
        onClose={() => setFormOpen(false)}
        onSaved={async (saved) => {
          await loadLessons();
          if (saved) {
            setSelectedId(saved.id);
            replaceLessonQuery(saved.id);
          } else if (editingLesson) {
            setSelectedId(null);
            setMobileDetailOpen(false);
            replaceLessonQuery(null);
          }
        }}
      />

      {selectedLesson?.series_id && deleteOpen ? (
        <Modal
          isOpen
          onClose={() => !deleting && setDeleteOpen(false)}
          title="Excluir aula recorrente"
          size="sm"
          closeOnEscape={!deleting}
          closeOnOverlayClick={!deleting}
        >
          <div className="space-y-4 p-4 sm:p-6">
            {deleteError ? <Alert variant="error" message={deleteError} /> : null}
            <Select
              label="Excluir"
              value={deleteScope}
              disabled={deleting}
              onChange={(value) => {
                setDeleteScope(value as TeachingLessonScope);
                setDeleteAttendanceConfirmed(false);
                setDeleteError(null);
              }}
              options={[
                { value: 'single', label: 'Somente esta aula' },
                { value: 'following', label: 'Esta e as próximas' },
              ]}
            />
            <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="min-h-11" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" className="min-h-11" onClick={deleteLesson} isLoading={deleting}>
                {deleteAttendanceConfirmed ? 'Confirmar e excluir presenças' : 'Excluir'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : (
        <ConfirmDeleteModal
          isOpen={deleteOpen}
          onClose={() => !deleting && setDeleteOpen(false)}
          title="Excluir aula"
          itemName={selectedLesson?.title}
          message={
            deleteAttendanceConfirmed
              ? 'Esta aula possui presenças. Confirme novamente para excluir a aula e todos os registros de presença.'
              : 'Esta ação remove a aula permanentemente e não pode ser desfeita.'
          }
          error={deleteError}
          isLoading={deleting}
          confirmLabel={deleteAttendanceConfirmed ? 'Excluir aula e presenças' : 'Excluir'}
          onConfirm={deleteLesson}
        />
      )}
    </div>
  );
}
