'use client';

import Link from 'next/link';
import {
  Church,
  Home,
  Mail,
  MessageCircle,
  Phone,
  User,
  Users,
} from 'lucide-react';
import {
  EntityDetailLayout,
  useEntityTab,
} from '@/components/entity-detail';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { formatMemberName } from '@/utils/formatMemberName';
import { calculateAge, formatDate, formatPhone } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';

export type MemberDetail = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth: string;
  gender: string;
  marital_status: string;
  nationality?: string;
  hometown?: string;
  document?: string;
  spouse?: string;
  wedding_date?: string;
  spouse_is_member?: boolean;
  occupation?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  baptism_date?: string;
  admission?: string;
  admission_date?: string;
  father_name?: string;
  father_is_member?: 'sim' | 'nao' | 'falecido';
  mother_name?: string;
  mother_is_member?: 'sim' | 'nao' | 'falecido';
  children?: Array<{ name: string; birth?: string; dependent?: boolean }>;
  congregation?: { id?: string; name: string; abbreviation?: string | null } | null;
  groups?: Array<{
    id: string;
    name: string;
    type: string;
    status: boolean;
  }>;
  active: boolean;
};

const MEMBER_TABS = ['dados', 'familia', 'vinculos'] as const;
type MemberTab = (typeof MEMBER_TABS)[number];

const TAB_ITEMS = [
  { id: 'dados', label: 'Dados', panelId: 'dados-panel' },
  { id: 'familia', label: 'Família', panelId: 'familia-panel' },
  { id: 'vinculos', label: 'Vínculos', panelId: 'vinculos-panel' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

function memberFlag(value: boolean | 'sim' | 'nao' | 'falecido' | undefined) {
  if (value === true || value === 'sim') return '(Membro)';
  if (value === false || value === 'nao') return '(Não membro)';
  if (value === 'falecido') return '(Falecido)';
  return null;
}

export function MemberDetailView({ member }: { member: MemberDetail }) {
  const { activeTab, setActiveTab } = useEntityTab(MEMBER_TABS, 'dados');
  const idade = calculateAge(member.birth);
  const activeGroups = (member.groups || []).filter((g) => g.status);
  const inactiveGroups = (member.groups || []).filter((g) => !g.status);
  const initial = formatMemberName(member.name).charAt(0) || '?';
  const hasFamily =
    Boolean(member.spouse) ||
    Boolean(member.father_name) ||
    Boolean(member.mother_name) ||
    Boolean(member.children?.length);

  return (
    <EntityDetailLayout
      aside={
        <>
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 uppercase">
                  {formatMemberName(member.name)}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    member.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <dl className="space-y-3">
              <Field label="Congregação">
                {getCongregationDisplayName(member.congregation) || '—'}
              </Field>
              {member.admission ? (
                <Field label="Tipo de recebimento">{member.admission}</Field>
              ) : null}
              {member.baptism_date ? (
                <Field label="Batismo">{formatDate(member.baptism_date) || '—'}</Field>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              {member.phone ? (
                <a
                  href={`tel:${member.phone.replace(/\D/g, '')}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700 hover:border-primary hover:text-primary"
                  aria-label="Ligar"
                >
                  <Phone className="h-4 w-4" />
                  {formatPhone(member.phone)}
                </a>
              ) : null}
              {member.whatsapp ? (
                <a
                  href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700 hover:border-emerald-600 hover:text-emerald-700"
                  aria-label="Enviar WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
              {member.email ? (
                <a
                  href={`mailto:${member.email}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700 hover:border-primary hover:text-primary"
                  aria-label="Enviar e-mail"
                >
                  <Mail className="h-4 w-4" />
                  E-mail
                </a>
              ) : null}
            </div>
            <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
              {activeGroups.length}{' '}
              {activeGroups.length === 1 ? 'ministério' : 'ministérios'}
            </span>
          </Card>
        </>
      }
    >
      <Tabs
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as MemberTab)}
        ariaLabel="Conteúdo do membro"
      />
      <section
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {activeTab === 'dados' ? (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <User className="h-4 w-4 text-gray-400" />
                Informações pessoais
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Gênero">{member.gender || '—'}</Field>
                <Field label="Idade">{idade !== null ? `${idade} anos` : '—'}</Field>
                <Field label="Nascimento">{formatDate(member.birth) || '—'}</Field>
                <Field label="Estado civil">{member.marital_status || '—'}</Field>
                {member.hometown ? (
                  <Field label="Natural de">{member.hometown}</Field>
                ) : null}
                {member.nationality ? (
                  <Field label="Nacionalidade">{member.nationality}</Field>
                ) : null}
                {member.document ? (
                  <Field label="Documento">{member.document}</Field>
                ) : null}
                {member.occupation ? (
                  <Field label="Profissão">{member.occupation}</Field>
                ) : null}
                {member.wedding_date ? (
                  <Field
                    label={
                      member.marital_status === 'União Estável'
                        ? 'Data da união'
                        : 'Data do casamento'
                    }
                  >
                    {formatDate(member.wedding_date) || '—'}
                  </Field>
                ) : null}
              </dl>
            </Card>
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Home className="h-4 w-4 text-gray-400" />
                Endereço
              </h3>
              <div className="space-y-1 text-sm text-gray-900">
                {member.address ? (
                  <p>
                    {member.address}
                    {member.address_number ? `, ${member.address_number}` : ''}
                  </p>
                ) : (
                  <p className="text-gray-500">Não informado</p>
                )}
                {member.complement ? <p>{member.complement}</p> : null}
                {(member.neighborhood || member.city || member.state) && (
                  <p>
                    {member.neighborhood ? `${member.neighborhood} - ` : ''}
                    {member.city}
                    {member.state ? `/${member.state}` : ''}
                  </p>
                )}
                {member.cep ? <p>CEP: {member.cep}</p> : null}
              </div>
            </Card>
          </div>
        ) : null}

        {activeTab === 'familia' ? (
          hasFamily ? (
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Users className="h-4 w-4 text-gray-400" />
                Família
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {member.spouse ? (
                  <Field label="Cônjuge">
                    {member.spouse}{' '}
                    <span className="text-xs text-gray-500">
                      {memberFlag(member.spouse_is_member)}
                    </span>
                  </Field>
                ) : null}
                {member.father_name ? (
                  <Field label="Pai">
                    {member.father_name}{' '}
                    <span className="text-xs text-gray-500">
                      {memberFlag(member.father_is_member)}
                    </span>
                  </Field>
                ) : null}
                {member.mother_name ? (
                  <Field label="Mãe">
                    {member.mother_name}{' '}
                    <span className="text-xs text-gray-500">
                      {memberFlag(member.mother_is_member)}
                    </span>
                  </Field>
                ) : null}
              </dl>
              {member.children && member.children.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Filhos</p>
                  <ul className="space-y-2">
                    {member.children.map((child, index) => {
                      const age = child.birth ? calculateAge(child.birth) : null;
                      return (
                        <li key={`${child.name}-${index}`} className="text-sm text-gray-900">
                          {child.name}
                          {age !== null ? (
                            <span className="ml-2 text-xs text-blue-700">
                              {age} {age === 1 ? 'ano' : 'anos'}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : (
            <Card className="py-10 text-center">
              <p className="text-sm font-medium text-gray-900">
                Nenhum vínculo familiar cadastrado.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Cadastre cônjuge, pais ou filhos na edição do membro.
              </p>
            </Card>
          )
        ) : null}

        {activeTab === 'vinculos' ? (
          <div className="space-y-4">
            <Card className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Church className="h-4 w-4 text-gray-400" />
                Congregação
              </h3>
              <p className="text-sm text-gray-900">
                {getCongregationDisplayName(member.congregation) || '—'}
              </p>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Recebimento">
                  {formatDate(member.admission_date) || '—'}
                </Field>
                <Field label="Tipo">{member.admission || '—'}</Field>
                <Field label="Batismo">
                  {formatDate(member.baptism_date) || '—'}
                </Field>
              </dl>
            </Card>
            <Card className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Ministérios</h3>
              {activeGroups.length === 0 && inactiveGroups.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum ministério vinculado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/ministries/${group.id}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200"
                    >
                      {group.name}
                    </Link>
                  ))}
                  {inactiveGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/ministries/${group.id}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 opacity-80"
                    >
                      {group.name} (inativo)
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </section>
    </EntityDetailLayout>
  );
}
