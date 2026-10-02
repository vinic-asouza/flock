'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingClassStatistics } from '@/types';

function shortDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function rateLabel(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`;
}

export function TeachingStatisticsTab({ teachingClass }: { teachingClass: TeachingClass }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TeachingClassStatistics | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getTeachingClassStatistics(teachingClass.id);
      setStats(data);
    } catch (err) {
      setStats(null);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [teachingClass.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-gray-500">Carregando estatísticas…</p>;
  }

  if (error || !stats) {
    return (
      <div className="space-y-3">
        <Alert variant="error" message={error || 'Não foi possível carregar as estatísticas.'} />
        <Button type="button" variant="secondary" className="min-h-11" onClick={() => void load()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const activeTotal = stats.enrollments.active_members + stats.enrollments.active_guests;
  const chartMax = Math.max(
    1,
    ...stats.by_lesson.flatMap((lesson) => [lesson.present, lesson.absent])
  );
  const hasLessons = stats.lessons_count > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <p className="text-2xl font-semibold text-gray-900">{activeTotal}</p>
          <p className="text-sm font-medium text-gray-900">Inscritos ativos</p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.enrollments.active_members} membros · {stats.enrollments.active_guests} convidados
          </p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-gray-900">{stats.enrollments.queue}</p>
          <p className="text-sm font-medium text-gray-900">Para revisar</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-gray-900">{stats.lessons_count}</p>
          <p className="text-sm font-medium text-gray-900">Aulas</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-gray-900">{rateLabel(stats.rate)}</p>
          <p className="text-sm font-medium text-gray-900">Presença</p>
          {stats.rate === null ? (
            <p className="mt-1 text-xs text-gray-500">Sem presenças registradas</p>
          ) : null}
        </Card>
      </div>
      <p className="text-sm text-gray-600">Não registradas: {stats.attendance.unregistered}</p>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Presença por aula</h3>
        {!hasLessons ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            Ainda não há aulas nesta turma.
          </p>
        ) : (
          <>
            <p className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-emerald-600" aria-hidden />
                Presentes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-rose-600" aria-hidden />
                Ausentes
              </span>
            </p>
            <ul className="space-y-3">
              {stats.by_lesson.map((lesson) => {
                const unmarked = lesson.present + lesson.absent === 0;
                const title = lesson.title?.trim() || 'Aula';
                return (
                  <li key={lesson.lesson_id} className="space-y-1">
                    <p className="truncate text-sm text-gray-800">
                      <span className="text-gray-500">{shortDate(lesson.lesson_date)}</span>
                      {' · '}
                      {title}
                    </p>
                    {unmarked ? (
                      <p className="text-xs text-gray-500">sem chamada</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 min-w-0 flex-1 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-emerald-600"
                              style={{ width: `${(lesson.present / chartMax) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-gray-600">{lesson.present}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 min-w-0 flex-1 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-rose-600"
                              style={{ width: `${(lesson.absent / chartMax) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-gray-600">{lesson.absent}</span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Frequência dos inscritos</h3>
        {!hasLessons ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            Ainda não há aulas nesta turma.
          </p>
        ) : stats.by_enrollment.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Nenhum inscrito ativo.</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {stats.by_enrollment.map((row) => (
                <li key={row.enrollment_id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-gray-900">
                      {row.display_name}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{rateLabel(row.rate)}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {row.present} presentes · {row.absent} ausentes · {row.unregistered} não registradas
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="py-2 pr-3 font-medium">Nome</th>
                    <th className="py-2 pr-3 font-medium">Presentes</th>
                    <th className="py-2 pr-3 font-medium">Ausentes</th>
                    <th className="py-2 pr-3 font-medium">Não registradas</th>
                    <th className="py-2 font-medium">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_enrollment.map((row) => (
                    <tr key={row.enrollment_id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-gray-900">{row.display_name}</td>
                      <td className="py-2 pr-3">{row.present}</td>
                      <td className="py-2 pr-3">{row.absent}</td>
                      <td className="py-2 pr-3">{row.unregistered}</td>
                      <td className="py-2">{rateLabel(row.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
