'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Percent, UserSearch, Users } from 'lucide-react';
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

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
  hint,
}: {
  icon: typeof Users;
  iconClass: string;
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Card>
  );
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
        <StatCard
          icon={Users}
          iconClass="bg-emerald-50 text-emerald-700"
          value={activeTotal}
          label="Inscritos ativos"
          hint={`${stats.enrollments.active_members} membros · ${stats.enrollments.active_guests} convidados`}
        />
        <StatCard
          icon={UserSearch}
          iconClass="bg-amber-50 text-amber-800"
          value={stats.enrollments.queue}
          label="Para revisar"
        />
        <StatCard
          icon={CalendarDays}
          iconClass="bg-sky-50 text-sky-700"
          value={stats.lessons_count}
          label="Aulas"
        />
        <StatCard
          icon={Percent}
          iconClass="bg-primary/10 text-primary"
          value={rateLabel(stats.rate)}
          label="Presença"
          hint={stats.rate === null ? 'Sem presenças registradas' : undefined}
        />
      </div>
      <p className="text-sm text-gray-600">Não registradas: {stats.attendance.unregistered}</p>

      <Card className="space-y-3">
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
      </Card>

      <Card className="space-y-3">
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
              {stats.by_enrollment.map((row, index) => (
                <li
                  key={row.enrollment_id}
                  className={`rounded-xl border border-gray-200 p-3 ${
                    index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
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
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Presentes</th>
                    <th className="px-3 py-2 font-medium">Ausentes</th>
                    <th className="px-3 py-2 font-medium">Não registradas</th>
                    <th className="px-3 py-2 font-medium">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_enrollment.map((row, index) => (
                    <tr
                      key={row.enrollment_id}
                      className={index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="px-3 py-2 text-gray-900">{row.display_name}</td>
                      <td className="px-3 py-2">{row.present}</td>
                      <td className="px-3 py-2">{row.absent}</td>
                      <td className="px-3 py-2">{row.unregistered}</td>
                      <td className="px-3 py-2">{rateLabel(row.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
