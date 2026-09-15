import type { TutorialGuide } from '../types';

const criarMinisterioSteps = [
  'Clique em Ministérios na barra lateral.',
  'Clique em Criar Ministério (ou botão equivalente com ícone +).',
  'Informe o nome do ministério.',
  '(Opcional) Associe uma congregação e um responsável (membro).',
  'Clique em Salvar.',
];

export const gruposGuides: TutorialGuide[] = [
  {
    slug: 'grupos-cadastrar',
    title: 'Criar um ministério',
    module: 'grupos',
    role: 'editor',
    route: '/ministries',
    estimatedMinutes: 3,
    tags: ['cadastro', 'ministério'],
    steps: criarMinisterioSteps,
    related: ['grupos-membros', 'grupos-filtrar'],
  },
  {
    slug: 'grupos-membros',
    title: 'Adicionar membros a um ministério',
    module: 'grupos',
    role: 'editor',
    route: '/ministries',
    estimatedMinutes: 2,
    tags: ['membros', 'ministério'],
    steps: [
      'Abra o ministério na lista.',
      'Na seção de membros, adicione participantes.',
      'Salve as alterações.',
    ],
    details: ['Apenas membros cadastrados podem compor ministérios.'],
    related: ['grupos-cadastrar', 'membros-cadastrar'],
  },
  {
    slug: 'grupos-filtrar',
    title: 'Filtrar ministérios',
    module: 'grupos',
    role: 'reader',
    route: '/ministries',
    estimatedMinutes: 2,
    tags: ['filtro', 'ministério'],
    steps: [
      'Use busca por nome.',
      'Filtre por congregação ou status (ativo/inativo).',
      'A barra de resumo no topo mostra totais de ministérios e membros.',
    ],
    related: ['grupos-cadastrar', 'grupos-membros', 'grupos-exportar'],
  },
  {
    slug: 'grupos-exportar',
    title: 'Exportar lista de ministérios em PDF',
    module: 'grupos',
    role: 'reader',
    route: '/ministries',
    estimatedMinutes: 2,
    tags: ['exportar', 'pdf', 'ministério'],
    steps: [
      'Abra Ministérios na barra lateral.',
      '(Opcional) Aplique filtros de busca, congregação ou status na listagem — eles também valem no PDF.',
      'Clique em Exportar PDF.',
      'O documento reflete os filtros ativos da listagem.',
    ],
    related: ['grupos-filtrar', 'congregacoes-exportar'],
  },
];
