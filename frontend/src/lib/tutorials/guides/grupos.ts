import type { TutorialGuide } from '../types';

const criarGrupoSteps = [
  'Clique em Grupos na barra lateral.',
  'Clique em Adicionar grupo (ou botão equivalente com ícone +).',
  'Informe o nome e escolha o tipo (ministério, célula, departamento, etc.).',
  '(Opcional) Associe uma congregação e um responsável (membro).',
  'Clique em Salvar.',
];

export const gruposGuides: TutorialGuide[] = [
  {
    slug: 'grupos-cadastrar',
    title: 'Criar um grupo',
    module: 'grupos',
    role: 'editor',
    route: '/groups',
    estimatedMinutes: 3,
    tags: ['cadastro', 'grupo', 'ministério'],
    steps: criarGrupoSteps,
    related: ['grupos-membros', 'grupos-filtrar'],
  },
  {
    slug: 'grupos-membros',
    title: 'Adicionar membros a um grupo',
    module: 'grupos',
    role: 'editor',
    route: '/groups',
    estimatedMinutes: 2,
    tags: ['membros', 'grupo'],
    steps: [
      'Abra o grupo na lista.',
      'Na seção de membros, adicione participantes.',
      'Salve as alterações.',
    ],
    details: ['Apenas membros cadastrados podem compor grupos.'],
    related: ['grupos-cadastrar', 'membros-cadastrar'],
  },
  {
    slug: 'grupos-filtrar',
    title: 'Filtrar grupos',
    module: 'grupos',
    role: 'reader',
    route: '/groups',
    estimatedMinutes: 2,
    tags: ['filtro', 'grupo'],
    steps: [
      'Use busca por nome.',
      'Filtre por congregação, tipo ou status (ativo/inativo).',
      'A barra de resumo no topo mostra totais por tipo.',
    ],
    related: ['grupos-cadastrar', 'grupos-membros'],
  },
];
