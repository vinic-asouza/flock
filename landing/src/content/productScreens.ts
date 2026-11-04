export type ProductScreenId =
  | 'dashboard'
  | 'members'
  | 'integration'
  | 'congregations'
  | 'ministries'
  | 'reports';

export interface ScreenCallout {
  label: string;
  /** Posição em % da área da tela (0–100). Revisar ao trocar a tela fake por captura real. */
  x: number;
  y: number;
}

export interface ProductScreen {
  id: ProductScreenId;
  navLabel: string;
  title: string;
  description: string;
  /**
   * Captura real em `/public/demo/`. Enquanto vazio, a demonstração renderiza a tela fake em código.
   * Padrão da captura: conta de demonstração com dados fictícios, datas atuais, tema claro,
   * proporção 16:10, largura mínima de 2560 px (2x).
   */
  src?: string;
  alt: string;
  /** O que a captura real precisa mostrar. */
  captureBrief: string;
  callouts: ScreenCallout[];
}

export const PRODUCT_SCREENS: ProductScreen[] = [
  {
    id: 'dashboard',
    navLabel: 'Painel',
    title: 'A visão geral da sua igreja',
    description: 'Membros ativos, crescimento e quem está em integração. A visão geral que a liderança precisa.',
    alt: 'Painel do Flock com membros ativos, novos membros, pessoas em integração e evolução mensal',
    captureBrief:
      'Cards de Membros ativos, Membros inativos, Histórico, Novos membros (últimos 30 dias) e Em integração; bloco "Estatísticas de membresia" (batismos/admissões e integrantes em progresso); gráfico de evolução mensal.',
    callouts: [
      { label: 'Membros ativos', x: 30, y: 11 },
      { label: 'Em integração', x: 88, y: 11 },
      { label: 'Evolução mensal', x: 58, y: 84 },
    ],
  },
  {
    id: 'members',
    navLabel: 'Membros',
    title: 'Encontre qualquer pessoa na hora',
    description: 'O rol completo da igreja: quem é membro, quem saiu e dados sempre atualizados.',
    alt: 'Listagem do rol de membros com busca e situação de cada membro',
    captureBrief: 'Listagem do rol de membros com busca e status.',
    callouts: [
      { label: 'Busca rápida', x: 35, y: 20 },
      { label: 'Situação de cada membro', x: 84, y: 45 },
    ],
  },
  {
    id: 'integration',
    navLabel: 'Integração',
    title: 'Quem está chegando',
    description:
      'As pessoas que estão conhecendo a igreja, antes de se tornarem membros. Acompanhe cada passo do caminho.',
    alt: 'Lista de pessoas em integração com o status do acompanhamento',
    captureBrief: 'Pessoas em integração com status "Em progresso".',
    callouts: [
      { label: 'Quem está chegando', x: 42, y: 29 },
      { label: 'Etapa do acompanhamento', x: 80, y: 29 },
    ],
  },
  {
    id: 'congregations',
    navLabel: 'Congregações',
    title: 'Cada congregação organizada e visível',
    description: 'Várias congregações no mesmo cadastro, com cada ponto da igreja à vista.',
    alt: 'Lista de congregações com a quantidade de membros de cada uma',
    captureBrief: 'Lista de congregações com a quantidade de membros.',
    callouts: [{ label: 'Membros por congregação', x: 59, y: 35 }],
  },
  {
    id: 'ministries',
    navLabel: 'Ministérios',
    title: 'Quem serve em cada área',
    description: 'Áreas de serviço da igreja. Crie, acompanhe e conduza o trabalho dos ministérios.',
    alt: 'Ministérios da igreja com seus integrantes',
    captureBrief: 'Ministérios/grupos com seus integrantes (avaliar o groups.png atual).',
    callouts: [{ label: 'Integrantes de cada ministério', x: 46, y: 35 }],
  },
  {
    id: 'reports',
    navLabel: 'Relatórios',
    title: 'Os números que a liderança acompanha',
    description: 'Quantos membros, como está o crescimento e o perfil da congregação.',
    alt: 'Relatórios de demografia e estrutura da igreja',
    captureBrief:
      '"Demografia" (gênero, estado civil, faixa etária) e "Estrutura da igreja" (cargos e congregações).',
    callouts: [
      { label: 'Faixa etária', x: 88, y: 19 },
      { label: 'Distribuição por congregações', x: 86, y: 58 },
    ],
  },
];
