'use client';

import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Check,
  Church,
  Clock,
  Copy,
  Link2,
  MapPin,
  Power,
  Users,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import apiService, { formatApiError, getApiErrorStatus } from '@/services/api';
import type { TeachingClass, TeachingPublicLink } from '@/types';
import { formatDate } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';
import { formatClassPeriod } from './dates';
import { TeachingEnrollmentsTab } from './TeachingEnrollmentsTab';
import { TeachingEmptyState } from './TeachingUi';
import {
  type TeachingClassTab,
  useTeachingClassTab,
} from './useTeachingClassTab';

const CLASS_TABS: Array<{
  id: TeachingClassTab;
  label: string;
  panelId: string;
}> = [
  { id: 'inscritos', label: 'Inscritos', panelId: 'inscritos-panel' },
  { id: 'aulas', label: 'Aulas', panelId: 'aulas-panel' },
  { id: 'materiais', label: 'Materiais', panelId: 'materiais-panel' },
  { id: 'certificados', label: 'Certificados', panelId: 'certificados-panel' },
];

const PLACEHOLDER_COPY: Record<Exclude<TeachingClassTab, 'inscritos'>, string> = {
  aulas: 'O cronograma e a presença desta turma serão gerenciados aqui.',
  materiais: 'Links e anotações da turma serão gerenciados aqui.',
  certificados:
    'A emissão de certificados estará disponível após o encerramento da turma.',
};

function PersonChip({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-inset ring-slate-200">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {initial}
      </span>
      <span className="truncate text-sm text-gray-900">{name}</span>
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  extra,
}: {
  icon: typeof Users;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
      <span>{children}</span>
      {extra}
    </h3>
  );
}

export function TeachingClassDetailView({
  teachingClass,
  readOnly,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
}) {
  const [link, setLink] = useState<TeachingPublicLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { activeTab, setActiveTab } = useTeachingClassTab();
  const teachers = (teachingClass.teachers || []).filter(Boolean) as Array<{
    id: string;
    name: string;
  }>;
  const publicEnrollmentAllowed =
    teachingClass.status === 'open' || teachingClass.status === 'in_progress';

  useEffect(() => {
    let active = true;

    apiService
      .getTeachingPublicLink(teachingClass.id)
      .then((linkData) => {
        if (active) setLink(linkData);
      })
      .catch((error: unknown) => {
        if (getApiErrorStatus(error) === 404) {
          if (active) setLink(null);
          return;
        }
        toast.error(formatApiError(error));
      });

    return () => {
      active = false;
    };
  }, [teachingClass.id]);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <aside className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-4 md:w-[340px] lg:w-[360px]">
        <Card className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Sobre a turma</h3>
          <dl className="space-y-3">
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Church className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Congregação
              </dt>
              <dd className="text-sm text-gray-900">
                {teachingClass.congregations
                  ? getCongregationDisplayName(teachingClass.congregations)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Local
              </dt>
              <dd className="text-sm text-gray-900">{teachingClass.location || '—'}</dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <Clock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Horário
              </dt>
              <dd className="text-sm text-gray-900">{teachingClass.schedule || '—'}</dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                Período
              </dt>
              <dd className="text-sm text-gray-900">
                {teachingClass.start_date ? (
                  <>
                    {formatClassPeriod(teachingClass.start_date, teachingClass.end_date)}
                    {!teachingClass.end_date ? (
                      <span className="text-gray-500"> · sem término</span>
                    ) : null}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                Criada em
              </dt>
              <dd className="text-sm text-gray-900">
                {formatDate(teachingClass.created_at) || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3">
          <SectionTitle icon={Users}>Equipe</SectionTitle>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Responsável
              </p>
              {teachingClass.responsible?.name ? (
                <PersonChip name={teachingClass.responsible.name} />
              ) : (
                <p className="text-sm text-gray-500">Sem responsável.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Professores
              </p>
              {teachers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teachers.map((teacher) => (
                    <PersonChip key={teacher.id} name={teacher.name} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum professor adicional.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionTitle
            icon={Link2}
            extra={
              link ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    link.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-gray-100 text-gray-600 ring-gray-500/20'
                  }`}
                >
                  {link.is_active ? 'Ativo' : 'Inativo'}
                </span>
              ) : null
            }
          >
            Link público
          </SectionTitle>
          {link ? (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  value={link.url}
                  readOnly
                  className="text-base"
                  aria-label="URL do link público"
                />
              </div>
              <Button
                variant="secondary"
                className="min-h-11 min-w-11 shrink-0 px-0"
                aria-label={linkCopied ? 'Link copiado' : 'Copiar link'}
                title={linkCopied ? 'Link copiado' : 'Copiar link'}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link.url);
                    setLinkCopied(true);
                    toast.success('Link copiado');
                    window.setTimeout(() => setLinkCopied(false), 2000);
                  } catch {
                    toast.error('Não foi possível copiar o link');
                  }
                }}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              {!readOnly ? (
                <Button
                  variant="secondary"
                  className="min-h-11 min-w-11 shrink-0 px-0"
                  aria-label={link.is_active ? 'Desativar link' : 'Ativar link'}
                  title={link.is_active ? 'Desativar link' : 'Ativar link'}
                  onClick={async () => {
                    try {
                      const updated = await apiService.updateTeachingPublicLink(
                        teachingClass.id,
                        { is_active: !link.is_active }
                      );
                      setLink(updated);
                      toast.success(updated.is_active ? 'Link ativado' : 'Link desativado');
                    } catch (error) {
                      toast.error(formatApiError(error));
                    }
                  }}
                >
                  <Power
                    className={`h-4 w-4 ${
                      link.is_active ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  />
                </Button>
              ) : null}
            </div>
          ) : !readOnly ? (
            <Button
              className="min-h-11 w-full"
              onClick={async () => {
                try {
                  const created = await apiService.createTeachingPublicLink(
                    teachingClass.id
                  );
                  setLink(created);
                  toast.success('Link criado');
                } catch (error) {
                  toast.error(formatApiError(error));
                }
              }}
            >
              Gerar link
            </Button>
          ) : (
            <p className="text-sm text-gray-500">Nenhum link gerado.</p>
          )}
          {!publicEnrollmentAllowed ? (
            <Alert
              variant="warning"
              message="Inscrições públicas só são aceitas com status Aberta ou Em andamento."
            />
          ) : link && !link.is_active ? (
            <p className="text-xs text-gray-500">
              Visitantes não conseguem se inscrever enquanto o link estiver inativo.
            </p>
          ) : null}
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <Tabs
          tabs={CLASS_TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TeachingClassTab)}
          ariaLabel="Conteúdo da turma"
        />

        <section
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {activeTab === 'inscritos' ? (
            <TeachingEnrollmentsTab
              teachingClass={teachingClass}
              readOnly={readOnly}
            />
          ) : (
            <TeachingEmptyState text={PLACEHOLDER_COPY[activeTab]} />
          )}
        </section>
      </div>
    </div>
  );
}
