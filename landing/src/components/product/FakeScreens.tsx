import {
  BarChart3,
  Building2,
  History,
  LayoutDashboard,
  Network,
  PieChart,
  Search,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { ProductScreenId } from '@/content/productScreens';
import { BarList, Donut, LineChart } from '@/components/charts/Charts';
import { cn } from '@/utils/cn';

/** Dimensões de referência da tela fake; o container escala proporcionalmente. */
export const FAKE_SCREEN_WIDTH = 1040;
export const FAKE_SCREEN_HEIGHT = 650;

const NAV: { id: ProductScreenId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'members', label: 'Membros', icon: Users },
  { id: 'integration', label: 'Integração', icon: UserPlus },
  { id: 'congregations', label: 'Congregações', icon: Building2 },
  { id: 'ministries', label: 'Ministérios', icon: UsersRound },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
];

const PEOPLE = [
  'Ana Paula Ribeiro',
  'Carlos Henrique Lima',
  'Fernanda Souza',
  'João Pedro Almeida',
  'Mariana Costa',
  'Ricardo Oliveira',
  'Beatriz Santos',
];

const AVATARS = ['bg-accent-400', 'bg-brand-700', 'bg-accent-200', 'bg-brand-500', 'bg-accent-300', 'bg-primary', 'bg-accent-500'];

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl border border-gray-100 bg-white p-4 shadow-sm', className)}>{children}</div>;
}

function CardTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
      <Icon aria-hidden className="h-3.5 w-3.5 text-accent-500" />
      {children}
    </p>
  );
}

function Avatar({ index, size = 'h-7 w-7' }: { index: number; size?: string }) {
  return <span className={cn('shrink-0 rounded-full', size, AVATARS[index % AVATARS.length])} />;
}

function Chip({ children, tone = 'accent' }: { children: React.ReactNode; tone?: 'accent' | 'green' | 'gray' }) {
  const tones = {
    accent: 'bg-accent-100 text-accent-500',
    green: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-100 text-gray-500',
  };
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', tones[tone])}>{children}</span>;
}

function DashboardScreen() {
  const stats = [
    { icon: Users, label: 'Membros ativos', value: '212', tone: 'text-emerald-600 bg-emerald-50' },
    { icon: UserMinus, label: 'Membros inativos', value: '8', tone: 'text-rose-500 bg-rose-50' },
    { icon: History, label: 'Histórico', value: '220', tone: 'text-accent-500 bg-accent-100' },
    { icon: UserPlus, label: 'Novos membros', value: '3', hint: 'Últimos 30 dias', tone: 'text-accent-500 bg-accent-100' },
    { icon: TrendingUp, label: 'Em integração', value: '3', hint: 'Processo ativo', tone: 'text-amber-600 bg-amber-50' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {stats.map(({ icon: Icon, label, value, hint, tone }) => (
          <Card key={label} className="p-3">
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tone)}>
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </span>
            <p className="mt-2 text-[11px] text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardTitle icon={UserPlus}>Batismos e admissões</CardTitle>
          <p className="mt-3 text-[11px] font-medium text-gray-500">Novos membros (3)</p>
          <ul className="mt-2 space-y-1.5">
            {PEOPLE.slice(0, 3).map((name, i) => (
              <li key={name} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] text-gray-700">
                <Avatar index={i} size="h-5 w-5" />
                {name}
                <span className="ml-auto">
                  <Chip tone="gray">Sede</Chip>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle icon={TrendingUp}>Integração</CardTitle>
          <p className="mt-3 text-[11px] font-medium text-gray-500">Integrantes em progresso (3)</p>
          <ul className="mt-2 space-y-1.5">
            {PEOPLE.slice(3, 6).map((name, i) => (
              <li key={name} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] text-gray-700">
                <Avatar index={i + 3} size="h-5 w-5" />
                {name}
                <span className="ml-auto">
                  <Chip>Em progresso</Chip>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="pb-2">
        <CardTitle icon={BarChart3}>Gráfico de evolução mensal</CardTitle>
        <LineChart
          values={[180, 184, 183, 190, 194, 193, 199, 203, 205, 208, 210, 212]}
          labels={['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']}
          className="mt-2 h-[92px]"
          height={80}
        />
      </Card>
    </div>
  );
}

function MembersScreen() {
  const rows = PEOPLE.map((name, i) => ({
    name,
    congregation: i % 3 === 2 ? 'Congregação Norte' : 'Sede',
    status: i === 5 ? 'Inativo' : 'Ativo',
  }));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[12px] text-gray-400">
          <Search aria-hidden className="h-4 w-4" />
          Buscar por nome, e-mail ou telefone
        </div>
        <span className="rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-white">+ Novo membro</span>
      </div>
      <Card className="overflow-x-auto p-0">
        <div className="min-w-[32rem]">
        <div className="grid grid-cols-[2fr_1.3fr_1fr] border-b border-gray-100 px-4 py-2.5 text-[11px] font-semibold text-gray-500">
          <span>Nome</span>
          <span>Congregação</span>
          <span className="text-right">Situação</span>
        </div>
        {rows.map((row, i) => (
          <div key={row.name} className="grid grid-cols-[2fr_1.3fr_1fr] items-center border-b border-gray-50 px-4 py-2.5 text-[12px] last:border-0">
            <span className="flex items-center gap-2.5 font-medium text-gray-800">
              <Avatar index={i} />
              {row.name}
            </span>
            <span className="text-gray-600">{row.congregation}</span>
            <span className="text-right">
              <Chip tone={row.status === 'Ativo' ? 'green' : 'gray'}>{row.status}</Chip>
            </span>
          </div>
        ))}
        </div>
      </Card>
    </div>
  );
}

function IntegrationScreen() {
  const people = [
    { name: 'Lucas Martins', since: 'há 2 semanas', status: 'Em progresso' },
    { name: 'Juliana Ferreira', since: 'há 3 semanas', status: 'Em progresso' },
    { name: 'Rafael Gomes', since: 'há 1 mês', status: 'Em progresso' },
    { name: 'Camila Rocha', since: 'há 2 meses', status: 'Concluído' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Em progresso', value: '3' },
          { label: 'Concluídos', value: '12' },
          { label: 'Total acompanhado', value: '15' },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-[11px] text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-2">
        <CardTitle icon={UserPlus}>Integrantes</CardTitle>
        {people.map((person, i) => (
          <div key={person.name} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-[12px]">
            <Avatar index={i + 2} />
            <div>
              <p className="font-medium text-gray-800">{person.name}</p>
              <p className="text-[10px] text-gray-400">Primeiro contato {person.since}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[0, 1, 2].map((step) => (
                <span
                  key={step}
                  className={cn(
                    'h-1.5 w-8 rounded-full',
                    person.status === 'Concluído' || step < 2 ? 'bg-accent-500' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="w-24 text-right">
              <Chip tone={person.status === 'Concluído' ? 'green' : 'accent'}>{person.status}</Chip>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function CongregationsScreen() {
  const items = [
    { name: 'Sede', members: 148, city: 'Centro' },
    { name: 'Congregação Norte', members: 64, city: 'Zona Norte' },
    { name: 'Congregação Sul', members: 41, city: 'Zona Sul' },
    { name: 'Congregação Leste', members: 27, city: 'Zona Leste' },
  ];
  const max = Math.max(...items.map((item) => item.members));
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <Card key={item.name}>
          <div className="flex items-center gap-2.5">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', i === 0 ? 'bg-primary text-white' : 'bg-accent-100 text-accent-500')}>
              <Building2 aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{item.name}</p>
              <p className="text-[11px] text-gray-400">{item.city}</p>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">{item.members}</p>
          <p className="text-[11px] text-gray-500">membros</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${(item.members / max) * 100}%` }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function MinistriesScreen() {
  const groups = [
    { name: 'Louvor', members: 14, leader: 'Mariana Costa' },
    { name: 'Infantil', members: 9, leader: 'Beatriz Santos' },
    { name: 'Recepção', members: 11, leader: 'João Pedro Almeida' },
    { name: 'Jovens', members: 22, leader: 'Ricardo Oliveira' },
    { name: 'Intercessão', members: 7, leader: 'Ana Paula Ribeiro' },
    { name: 'Mídia', members: 6, leader: 'Carlos Henrique Lima' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {groups.map((group, gi) => (
        <Card key={group.name}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100 text-accent-500">
            <UsersRound aria-hidden className="h-4 w-4" />
          </span>
          <p className="mt-3 text-[13px] font-semibold text-gray-900">{group.name}</p>
          <p className="text-[11px] text-gray-500">Líder: {group.leader}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn('h-6 w-6 rounded-full ring-2 ring-white', AVATARS[(i + gi) % AVATARS.length])} />
              ))}
            </span>
            <span className="text-[11px] font-semibold text-gray-600">{group.members} integrantes</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReportsScreen() {
  return (
    <div className="space-y-3">
      <CardTitle icon={PieChart}>Demografia</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-[11px] font-semibold text-gray-700">Distribuição por gênero</p>
          <div className="mt-3 flex justify-center">
            <Donut
              size={96}
              thickness={20}
              segments={[
                { label: 'Feminino', value: 52, color: '#7d71f5' },
                { label: 'Masculino', value: 48, color: '#090725' },
              ]}
              center={<span className="text-[11px] font-bold text-gray-900">212</span>}
            />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold text-gray-700">Estado civil</p>
          <div className="mt-3 flex justify-center">
            <Donut
              size={96}
              thickness={20}
              segments={[
                { label: 'Casado(a)', value: 46, color: '#5346f0' },
                { label: 'Solteiro(a)', value: 38, color: '#a99ffb' },
                { label: 'Divorciado(a)', value: 9, color: '#33305a' },
                { label: 'Viúvo(a)', value: 7, color: '#cfc9ff' },
              ]}
            />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold text-gray-700">Faixa etária</p>
          <BarList
            className="mt-2 space-y-1.5"
            items={[
              { label: 'Crianças (0–12)', value: 34 },
              { label: 'Adolescentes (13–17)', value: 21 },
              { label: 'Jovens (18–29)', value: 48 },
              { label: 'Adultos (30–59)', value: 86 },
              { label: 'Idosos (60+)', value: 23 },
            ]}
          />
        </Card>
      </div>
      <CardTitle icon={Network}>Estrutura da igreja</CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[11px] font-semibold text-gray-700">Distribuição por ministérios</p>
          <BarList
            className="mt-2"
            items={[
              { label: 'Jovens', value: 22 },
              { label: 'Louvor', value: 14 },
              { label: 'Recepção', value: 11 },
            ]}
          />
        </Card>
        <Card>
          <p className="text-[11px] font-semibold text-gray-700">Distribuição por congregações</p>
          <BarList
            className="mt-2"
            items={[
              { label: 'Sede', value: 148 },
              { label: 'Congregação Norte', value: 64 },
              { label: 'Congregação Sul', value: 41 },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

const SCREENS: Record<ProductScreenId, () => React.JSX.Element> = {
  dashboard: DashboardScreen,
  members: MembersScreen,
  integration: IntegrationScreen,
  congregations: CongregationsScreen,
  ministries: MinistriesScreen,
  reports: ReportsScreen,
};

/** Tela ilustrativa do produto (placeholder até existir captura real). */
export function FakeScreen({ id, focus = false }: { id: ProductScreenId; focus?: boolean }) {
  const Screen = SCREENS[id];
  const current = NAV.find((item) => item.id === id);
  return (
    <div
      aria-hidden
      className={cn('flex bg-canvas text-left', focus && 'demo-focus min-h-full flex-col')}
      style={focus ? undefined : { width: FAKE_SCREEN_WIDTH, height: FAKE_SCREEN_HEIGHT }}
    >
      {!focus && (
      <aside className="flex w-[188px] shrink-0 flex-col bg-brand-950 px-3 py-4 text-white">
        <p className="flex items-center gap-2 px-2 text-[15px] font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[11px]">F</span>
          Flock
        </p>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ id: navId, label, icon: Icon }) => (
            <span
              key={navId}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium',
                navId === id ? 'bg-white text-primary' : 'text-white/65'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          ))}
        </nav>
      </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-gray-200/70 bg-white px-5">
          <p className="text-[14px] font-bold text-gray-900">{current?.label}</p>
          <span className="flex items-center gap-2 text-[11px] text-gray-500">
            Igreja Exemplo
            <span className="h-7 w-7 rounded-full bg-accent-200" />
          </span>
        </header>
        <div className={cn('min-h-0 flex-1 p-5', focus ? 'overflow-visible' : 'overflow-hidden')}>
          <Screen />
        </div>
      </div>
    </div>
  );
}
