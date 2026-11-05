export type ProductScreenId =
  | 'dashboard'
  | 'members'
  | 'integration'
  | 'congregations'
  | 'ministries'
  | 'reports';

export interface ScreenCallout {
  label: string;
  /** Posição do ponto, em % da área da tela (0–100). Revisar ao trocar a tela fake por captura real. */
  x: number;
  y: number;
  /** O texto fica acima do ponto, para não cobrir o número. */
  place?: 'above' | 'above-start' | 'above-end';
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
      { label: 'Membros ativos', x: 25, y: 18, place: 'above' },
      { label: 'Em integração', x: 88, y: 18, place: 'above' },
      { label: 'Evolução mensal', x: 68, y: 78, place: 'above-end' },
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
      { label: 'Busca rápida', x: 34, y: 14, place: 'above-start' },
      { label: 'Situação de cada membro', x: 91, y: 34, place: 'above-end' },
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
      { label: 'Quem está chegando', x: 28, y: 22, place: 'above-start' },
      { label: 'Etapa do acompanhamento', x: 84, y: 42, place: 'above-end' },
    ],
  },
  {
    id: 'congregations',
    navLabel: 'Congregações',
    title: 'Cada congregação organizada e visível',
    description: 'Várias congregações no mesmo cadastro, com cada ponto da igreja à vista.',
    alt: 'Lista de congregações com a quantidade de membros de cada uma',
    captureBrief: 'Lista de congregações com a quantidade de membros.',
    callouts: [{ label: 'Membros por congregação', x: 28, y: 28, place: 'above-start' }],
  },
  {
    id: 'ministries',
    navLabel: 'Ministérios',
    title: 'Quem serve em cada área',
    description: 'Áreas de serviço da igreja. Crie, acompanhe e conduza o trabalho dos ministérios.',
    alt: 'Ministérios da igreja com seus integrantes',
    captureBrief: 'Ministérios/grupos com seus integrantes (avaliar o groups.png atual).',
    callouts: [{ label: 'Integrantes de cada ministério', x: 36, y: 30, place: 'above-end' }],
  },
  {
    id: 'reports',
    navLabel: 'Relatórios',
    title: 'Os números que a liderança acompanha',
    description: 'Quantos membros, como está o crescimento e o perfil da congregação.',
    alt: 'Relatórios de demografia e estrutura da igreja',
    captureBrief:
      '"Demografia" (gênero, estado civil, faixa etária) e "Estrutura da igreja" (ministérios e congregações).',
    callouts: [
      { label: 'Faixa etária', x: 84, y: 26, place: 'above-end' },
      { label: 'Distribuição por congregações', x: 82, y: 62, place: 'above-end' },
    ],
  },
];
