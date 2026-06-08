import type { TutorialGuide } from '../types';

const cadastrarCongregacaoSteps = [
  'Clique em Congregações na barra lateral.',
  'Clique em Adicionar congregação.',
  'Preencha o nome da congregação (obrigatório).',
  'Informe endereço, cidade e estado — a busca de cidade usa a base do IBGE.',
  '(Opcional) Selecione um líder entre os membros já cadastrados.',
  'Clique em Salvar.',
];

const cadastrarCongregacaoDetails = [
  'A Sede é a congregação principal da igreja e já existe por padrão — você cadastra filiais ou pontos adicionais.',
  'Congregações aparecem depois nos formulários de membros, grupos e calendário.',
  'Se você ainda não tem membros, o campo líder ficará vazio — pode editar depois.',
];

export const congregacoesGuides: TutorialGuide[] = [
  {
    slug: 'congregacoes-cadastrar',
    title: 'Cadastrar uma congregação',
    module: 'congregacoes',
    role: 'editor',
    route: '/congregations',
    estimatedMinutes: 3,
    tags: ['cadastro', 'congregação'],
    steps: cadastrarCongregacaoSteps,
    details: cadastrarCongregacaoDetails,
    related: ['congregacoes-editar', 'membros-cadastrar'],
  },
  {
    slug: 'congregacoes-editar',
    title: 'Editar ou excluir congregação',
    module: 'congregacoes',
    role: 'editor',
    route: '/congregations',
    estimatedMinutes: 2,
    tags: ['editar', 'excluir', 'congregação'],
    steps: [
      'Na lista, clique na congregação.',
      'Para editar: Editar → altere campos → Salvar.',
      'Para excluir: Excluir → confirme.',
    ],
    details: [
      'Exclusão pode ser bloqueada se houver membros vinculados — verifique mensagem do sistema.',
    ],
    related: ['congregacoes-cadastrar', 'congregacoes-exportar'],
  },
  {
    slug: 'congregacoes-exportar',
    title: 'Exportar lista de congregações',
    module: 'congregacoes',
    role: 'reader',
    route: '/congregations',
    estimatedMinutes: 2,
    tags: ['exportar', 'pdf', 'congregação'],
    steps: [
      '(Opcional) Use a busca para filtrar.',
      'Clique em Exportar PDF.',
      'Faça download do arquivo.',
    ],
    related: ['congregacoes-cadastrar', 'congregacoes-editar'],
  },
];
