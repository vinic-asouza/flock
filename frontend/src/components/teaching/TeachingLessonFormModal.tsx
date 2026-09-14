'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarRange, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import apiService, { formatApiError } from '@/services/api';
import type {
  TeachingLesson,
  TeachingLessonRecurrencePayload,
  TeachingLessonScope,
  TeachingLessonSeriesPreview,
  TeachingRecurrenceType,
} from '@/types';
import { WEEKDAY_OPTIONS, formatLessonDate } from './teachingLessonUtils';

type FormKind = 'single' | 'series';

interface TeachingLessonFormModalProps {
  open: boolean;
  classId: string;
  lesson?: TeachingLesson | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: (lesson?: TeachingLesson) => void | Promise<void>;
}

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'interval_days', label: 'A cada N dias' },
];

export function TeachingLessonFormModal({
  open,
  classId,
  lesson,
  initialDate,
  onClose,
  onSaved,
}: TeachingLessonFormModalProps) {
  const recurring = Boolean(lesson?.series_id);
  const [kind, setKind] = useState<FormKind>('single');
  const [scope, setScope] = useState<TeachingLessonScope>('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [recurrenceType, setRecurrenceType] =
    useState<TeachingRecurrenceType>('weekly');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [intervalDays, setIntervalDays] = useState(7);
  const [preview, setPreview] = useState<TeachingLessonSeriesPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const series = lesson?.teaching_lesson_series;
    const date = lesson?.lesson_date || initialDate || new Date().toISOString().slice(0, 10);
    setKind('single');
    setScope('single');
    setTitle(lesson?.title || '');
    setDescription(lesson?.description || '');
    setLessonDate(date);
    setStartTime(lesson?.start_time?.slice(0, 5) || '');
    setRecurrenceType(series?.recurrence_type || 'weekly');
    setStartsOn(lesson?.occurrence_key || series?.starts_on || date);
    setEndsOn(series?.ends_on || date);
    setWeekdays(series?.weekdays || [new Date(`${date}T12:00:00`).getDay()]);
    setDayOfMonth(series?.day_of_month || Number(date.slice(8, 10)) || 1);
    setIntervalDays(series?.interval_days || 7);
    setPreview(null);
    setError(null);
  }, [open, lesson, initialDate]);

  const usesRecurrence = !lesson ? kind === 'series' : scope === 'following';
  const blockingConflicts =
    preview?.conflicts.filter(
      (conflict) => !lesson?.series_id || conflict.series_id !== lesson.series_id
    ) || [];

  const recurrencePayload = useMemo<TeachingLessonRecurrencePayload>(() => {
    const payload: TeachingLessonRecurrencePayload = {
      title: title.trim(),
      description: description.trim() || null,
      start_time: startTime,
      starts_on: startsOn,
      ends_on: endsOn,
      recurrence_type: recurrenceType,
    };
    if (recurrenceType === 'weekly') payload.weekdays = weekdays;
    if (recurrenceType === 'monthly') payload.day_of_month = dayOfMonth;
    if (recurrenceType === 'interval_days') payload.interval_days = intervalDays;
    return payload;
  }, [
    dayOfMonth,
    description,
    endsOn,
    intervalDays,
    recurrenceType,
    startTime,
    startsOn,
    title,
    weekdays,
  ]);

  useEffect(() => {
    setPreview(null);
  }, [recurrencePayload]);

  const formValid =
    title.trim().length >= 2 &&
    title.trim().length <= 150 &&
    description.length <= 5000 &&
    Boolean(startTime) &&
    (usesRecurrence
      ? Boolean(startsOn) &&
        Boolean(endsOn) &&
        endsOn >= startsOn &&
        (recurrenceType !== 'weekly' || weekdays.length > 0)
      : Boolean(lessonDate));

  const close = () => {
    if (!saving && !previewing) onClose();
  };

  const loadPreview = async () => {
    try {
      setPreviewing(true);
      setError(null);
      setPreview(await apiService.previewTeachingLessonSeries(classId, recurrencePayload));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      if (!lesson) {
        if (usesRecurrence) {
          await apiService.createTeachingLessonSeries(classId, recurrencePayload);
          toast.success('Série de aulas criada');
          await onSaved();
        } else {
          const created = await apiService.createTeachingLesson(classId, {
            title: title.trim(),
            description: description.trim() || null,
            lesson_date: lessonDate,
            start_time: startTime,
          });
          toast.success('Aula criada');
          await onSaved(created);
        }
      } else if (scope === 'following') {
        await apiService.updateTeachingLesson(lesson.id, {
          scope,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTime,
          recurrence: {
            recurrence_type: recurrenceType,
            starts_on: startsOn,
            ends_on: endsOn,
            ...(recurrenceType === 'weekly' ? { weekdays } : {}),
            ...(recurrenceType === 'monthly' ? { day_of_month: dayOfMonth } : {}),
            ...(recurrenceType === 'interval_days' ? { interval_days: intervalDays } : {}),
          },
        });
        toast.success('Aula e próximas ocorrências atualizadas');
        await onSaved();
      } else {
        const updated = await apiService.updateTeachingLesson(lesson.id, {
          scope,
          title: title.trim(),
          description: description.trim() || null,
          lesson_date: lessonDate,
          start_time: startTime,
        });
        toast.success('Aula atualizada');
        await onSaved(updated as TeachingLesson);
      }
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title={lesson ? 'Editar aula' : 'Nova aula'}
      description={
        lesson && recurring
          ? 'Escolha se a alteração vale apenas para esta aula ou também para as próximas.'
          : undefined
      }
      size="lg"
      closeOnEscape={!saving && !previewing}
      closeOnOverlayClick={!saving && !previewing}
    >
      <div className="space-y-5 p-4 sm:p-6">
        {!lesson ? (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
            {([
              ['single', 'Aula avulsa'],
              ['series', 'Série recorrente'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={kind === value}
                onClick={() => setKind(value)}
                className={`min-h-11 rounded-md px-3 text-sm font-medium ${
                  kind === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : recurring ? (
          <Select
            label="Aplicar alteração"
            value={scope}
            onChange={(value) => setScope(value as TeachingLessonScope)}
            options={[
              { value: 'single', label: 'Somente esta aula' },
              { value: 'following', label: 'Esta e as próximas' },
            ]}
          />
        ) : null}

        {error ? <Alert variant="error" message={error} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Título"
              value={title}
              maxLength={150}
              onChange={(event) => setTitle(event.target.value)}
              error={title.length > 0 && title.trim().length < 2 ? 'Informe ao menos 2 caracteres.' : undefined}
            />
          </div>
          {usesRecurrence ? (
            <>
              <Input
                label="Início"
                type="date"
                value={startsOn}
                min={lesson?.occurrence_key || undefined}
                onChange={(event) => setStartsOn(event.target.value)}
                disabled={Boolean(lesson)}
              />
              <Input
                label="Fim"
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </>
          ) : (
            <Input
              label="Data"
              type="date"
              value={lessonDate}
              onChange={(event) => setLessonDate(event.target.value)}
            />
          )}
          <Input
            label="Horário"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          {usesRecurrence ? (
            <Select
              label="Recorrência"
              value={recurrenceType}
              onChange={(value) => setRecurrenceType(value as TeachingRecurrenceType)}
              options={RECURRENCE_OPTIONS}
            />
          ) : null}
          <div className="sm:col-span-2">
            <label htmlFor="lesson-description" className="mb-2 block text-sm font-medium text-gray-700">
              Descrição <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <textarea
              id="lesson-description"
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-[15px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {usesRecurrence ? (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            {recurrenceType === 'weekly' ? (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">Dias da semana</legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const selected = weekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={day.label}
                        onClick={() =>
                          setWeekdays((current) =>
                            selected
                              ? current.filter((value) => value !== day.value)
                              : [...current, day.value].sort()
                          )
                        }
                        className={`min-h-11 rounded-md border px-2 text-sm font-medium ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : recurrenceType === 'monthly' ? (
              <Input
                label="Dia do mês"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(event) => setDayOfMonth(Number(event.target.value))}
                helperText="Meses sem este dia serão ignorados e aparecerão na prévia."
              />
            ) : (
              <Input
                label="Repetir a cada"
                type="number"
                min={1}
                max={366}
                value={intervalDays}
                onChange={(event) => setIntervalDays(Number(event.target.value))}
                helperText="Intervalo em dias (1 a 366)."
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={!formValid}
                isLoading={previewing}
                onClick={loadPreview}
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Gerar prévia
              </Button>
              {!preview && !previewing ? (
                <p className="text-sm text-gray-500">A prévia é obrigatória antes de salvar.</p>
              ) : null}
            </div>

            {preview ? (
              <div className="space-y-2 rounded-lg bg-white p-3 text-sm">
                <p className="font-medium text-gray-900">
                  {preview.count} aula{preview.count === 1 ? '' : 's'} ·{' '}
                  {formatLessonDate(preview.first_date)} até {formatLessonDate(preview.last_date)}
                </p>
                <p className="text-gray-600">
                  Meses ignorados: {preview.skipped_months.length || 'nenhum'}
                </p>
                {blockingConflicts.length > 0 ? (
                  <Alert
                    variant="error"
                    title={`${blockingConflicts.length} conflito(s) encontrado(s)`}
                    message="Ajuste as datas ou o horário antes de gerar a série."
                  />
                ) : (
                  <Alert variant="success" message="Nenhum conflito de horário encontrado." />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="min-h-11" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="min-h-11"
            isLoading={saving}
            disabled={
              !formValid ||
              (usesRecurrence && (!preview || blockingConflicts.length > 0))
            }
            onClick={save}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {lesson ? 'Salvar alterações' : usesRecurrence ? 'Criar série' : 'Criar aula'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
