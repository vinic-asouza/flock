import type { TutorialGuide } from '../types';

export const relatoriosGuides: TutorialGuide[] = [
  {
    slug: 'relatorios-filtrar',
    title: 'Filtrar relatórios por congregação',
    module: 'relatorios',
    role: 'reader',
    route: '/',
    estimatedMinutes: 2,
    tags: ['filtro', 'congregação', 'dashboard'],
    steps: [
      'Acesse Painel.',
      'No seletor de visualização, escolha Todas as congregações ou Congregação.',
      'Se escolher Congregação, selecione qual congregação na lista.',
      'Os gráficos e cards atualizam automaticamente.',
    ],
    details: ['Exportação PDF respeita o filtro ativo.'],
    related: ['relatorios-exportar', 'pp-01-conhecer-painel'],
  },
  {
    slug: 'relatorios-exportar',
    title: 'Exportar relatório em PDF',
    module: 'relatorios',
    role: 'reader',
    route: '/',
    estimatedMinutes: 2,
    tags: ['exportar', 'pdf', 'dashboard'],
    steps: [
      'Acesse Painel e aplique o filtro desejado.',
      'Clique em Exportar PDF.',
      'Aguarde o download do arquivo no navegador.',
    ],
    details: [
      'Se nenhuma congregação estiver selecionada no modo "Congregação", a exportação fica bloqueada.',
    ],
    related: ['relatorios-filtrar', 'relatorios-interpretar'],
  },
  {
    slug: 'relatorios-interpretar',
    title: 'Entender os gráficos do Painel',
    module: 'relatorios',
    role: 'reader',
    route: '/',
    estimatedMinutes: 3,
    tags: ['gráficos', 'analytics', 'dashboard'],
    steps: [
      'Cards de resumo — totais rápidos (membros, batizados, etc.).',
      'Demografia — distribuição por gênero, faixa etária e estado civil.',
      'Estrutura — membros por congregação.',
      'Grupos — participação em ministérios/células.',
      'Timeline — evolução de recebimento e batismos ao longo do tempo.',
      'Geografia — mapa por cidade/bairro.',
      'Ocupações — tabela de profissões declaradas.',
    ],
    details: ['Dados refletem membros ativos no escopo do filtro selecionado.'],
    related: ['relatorios-filtrar', 'pp-01-conhecer-painel'],
  },
];
