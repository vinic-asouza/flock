'use client';

import { Clipboard, Info, Loader2, Trash2, User, UserPlus, XCircle } from 'lucide-react';
import { EntityDetailLayout, useEntityTab } from '@/components/entity-detail';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { IntegrationMember } from '@/types';
import { formatPhone } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';
import { formatMemberName } from '@/utils/formatMemberName';
import {
  admissionLabels,
  buildEcclesiasticalItems,
  genderLabels,
  maritalLabels,
  statusClasses,
  statusLabels
} from './integrationLabels';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

const INTEGRATION_TABS = ['ficha', 'acompanhamento'] as const;
type IntegrationTab = (typeof INTEGRATION_TABS)[number];

const TAB_ITEMS = [
  { id: 'ficha', label: 'Ficha', panelId: 'ficha-panel' },
  { id: 'acompanhamento', label: 'Acompanhamento', panelId: 'acompanhamento-panel' }
];

interface IntegrationDetailViewProps {
  member: IntegrationMember;
  readOnly?: boolean;
  discarding?: boolean;
  onConvert?: () => void;
  onDiscard?: () => void;
  onRemove?: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

// Datas do backend chegam como YYYY-MM-DD; converter com new Date() desloca o dia em fusos negativos.
function formatDateSafe(date?: string | null): string {
  if (!date) return '—';
  if (date.includes('/')) return date;

  const raw = date.includes('T') ? date.split('T')[0] : date;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function calculateAgeSafe(birth?: string | null): number | null {
  if (!birth) return null;

  const raw = birth.includes('T') ? birth.split('T')[0] : birth;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10))
    : new Date(birth);

  if (isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const diffMonth = today.getMonth() - date.getMonth();
  if (diffMonth < 0 || (diffMonth === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age;
}

export function IntegrationDetailView({
  member,
  readOnly = false,
  discarding = false,
  onConvert,
  onDiscard,
  onRemove
}: IntegrationDetailViewProps) {
  const { activeTab, setActiveTab } = useEntityTab(INTEGRATION_TABS, 'ficha');
  const age = calculateAgeSafe(member.birth);
  const ecclesiasticalItems = buildEcclesiasticalItems(member);
  const initial = formatMemberName(member.name).charAt(0) || '?';
  const inProgress = member.status === 'em_progresso';
  const integrated = member.status === 'integrado';

  return (
    <EntityDetailLayout
      aside={
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium uppercase text-gray-900">
                {formatMemberName(member.name)}
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusClasses[member.status] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusLabels[member.status] ?? member.status}
              </span>
            </div>
          </div>

          <dl className="space-y-3">
            <Field label="Congregação prevista">
              {getCongregationDisplayName(member.expected_congregation) || 'Não definida'}
            </Field>
            <Field label="Tipo de recebimento previsto">
              {member.expected_admission_type
                ? admissionLabels[member.expected_admission_type] || member.expected_admission_type
                : '—'}
            </Field>
            <Field label="Atualizado em">{formatDateSafe(member.updated_at)}</Field>
          </dl>

          {inProgress || integrated ? (
            <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
              {inProgress ? (
                <>
                  <Button
                    variant="primary"
                    onClick={onConvert}
                    disabled={readOnly}
                    title={readOnly ? READER_TOOLTIP : undefined}
                    className="min-h-11 w-full"
                  >
                    <UserPlus size={16} className="mr-2 shrink-0" />
                    Integrar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={onDiscard}
                    disabled={readOnly || discarding}
                    title={readOnly ? READER_TOOLTIP : undefined}
                    className="min-h-11 w-full"
                  >
                    {discarding ? (
                      <>
                        <Loader2 size={16} className="mr-2 shrink-0 animate-spin" />
                        Descartando...
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="mr-2 shrink-0" />
                        Descartar
                      </>
                    )}
                  </Button>
                </>
              ) : null}
              {integrated ? (
                <Button
                  variant="danger"
                  onClick={onRemove}
                  disabled={readOnly}
                  title={readOnly ? READER_TOOLTIP : undefined}
                  className="min-h-11 w-full"
                >
                  <Trash2 size={16} className="mr-2 shrink-0" />
                  Remover da lista
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      }
    >
      <Tabs
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as IntegrationTab)}
        ariaLabel="Conteúdo do integrante"
      />
      <section
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {activeTab === 'ficha' ? (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <User className="h-4 w-4 text-gray-400" />
                Informações pessoais
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Data de nascimento">{formatDateSafe(member.birth)}</Field>
                <Field label="Idade">{age !== null ? `${age} anos` : '—'}</Field>
                <Field label="Gênero">
                  {member.gender ? genderLabels[member.gender] || member.gender : '—'}
                </Field>
                <Field label="Estado civil">
                  {member.marital_status
                    ? maritalLabels[member.marital_status] || member.marital_status
                    : '—'}
                </Field>
                <Field label="Telefone">
                  {member.phone ? (
                    <a
                      href={`tel:${member.phone.replace(/\D/g, '')}`}
                      className="text-primary hover:underline"
                    >
                      {formatPhone(member.phone)}
                    </a>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="WhatsApp">
                  {member.whatsapp ? (
                    <a
                      href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formatPhone(member.whatsapp)}
                    </a>
                  ) : (
                    '—'
                  )}
                </Field>
              </dl>
            </Card>

            {ecclesiasticalItems.length > 0 ? (
              <Card className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Clipboard className="h-4 w-4 text-gray-400" />
                  Informações eclesiásticas
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ecclesiasticalItems.map((item) => (
                    <Field key={item.label} label={item.label}>
                      {item.value}
                    </Field>
                  ))}
                </dl>
              </Card>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'acompanhamento' ? (
          <Card className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Info className="h-4 w-4 text-gray-400" />
              Acompanhamento
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Responsável/Discipulador">{member.mentor?.name || '—'}</Field>
              <Field label="Contato do responsável">
                {formatPhone(member.mentor?.phone || member.mentor?.whatsapp) || '—'}
              </Field>
              <Field label="Status">{statusLabels[member.status] ?? member.status}</Field>
            </dl>
            <div>
              <dt className="text-sm font-medium text-gray-500">Observações</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-900">
                {member.notes || 'Nenhuma anotação registrada'}
              </dd>
            </div>
          </Card>
        ) : null}
      </section>
    </EntityDetailLayout>
  );
}
