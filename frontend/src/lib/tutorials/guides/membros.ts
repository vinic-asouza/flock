import type { TutorialGuide } from '../types';

const cadastrarMembroSteps = [
  'Clique em Membros na barra lateral.',
  'Clique em Adicionar membro.',
  'Preencha pelo menos o nome completo e os campos marcados como obrigatórios (*).',
  'Selecione a congregação à qual o membro pertence.',
  'Revise contatos (telefone, e-mail) se disponíveis.',
  'Clique em Salvar.',
];

const cadastrarMembroDetails = [
  'Campos de endereço podem ser preenchidos automaticamente ao digitar o CEP.',
  'O plano da igreja define um limite de membros — o contador aparece no topo do app.',
  'Membros inativos continuam no sistema mas não entram nos relatórios padrão.',
];

export const membrosGuides: TutorialGuide[] = [
  {
    slug: 'membros-cadastrar',
    title: 'Como cadastrar um membro',
    module: 'membros',
    role: 'editor',
    route: '/members',
    estimatedMinutes: 3,
    tags: ['cadastro', 'membro'],
    steps: cadastrarMembroSteps,
    details: cadastrarMembroDetails,
    related: ['membros-editar', 'membros-filtrar'],
  },
  {
    slug: 'membros-editar',
    title: 'Editar dados de um membro',
    module: 'membros',
    role: 'editor',
    route: '/members',
    estimatedMinutes: 2,
    tags: ['editar', 'membro'],
    steps: [
      'Em Membros, localize o membro (busca ou filtros).',
      'Clique no membro para abrir a visualização.',
      'Clique em Editar.',
      'Altere os campos necessários.',
      'Clique em Salvar.',
    ],
    related: ['membros-cadastrar', 'membros-desativar'],
  },
  {
    slug: 'membros-desativar',
    title: 'Desativar ou reativar um membro',
    module: 'membros',
    role: 'editor',
    route: '/members',
    estimatedMinutes: 2,
    tags: ['desativar', 'membro'],
    steps: [
      'Abra o membro na lista.',
      'Escolha Desativar (ou Reativar se já inativo).',
      'Confirme na janela de confirmação.',
    ],
    details: [
      'Desativar não exclui o registro — preserva histórico. Membros inativos saem dos relatórios padrão.',
    ],
    related: ['membros-editar', 'membros-filtrar'],
  },
  {
    slug: 'membros-filtrar',
    title: 'Buscar e filtrar membros',
    module: 'membros',
    role: 'reader',
    route: '/members',
    estimatedMinutes: 2,
    tags: ['busca', 'filtro', 'membro'],
    steps: [
      'Use a barra de busca para nome ou termos gerais.',
      'Aplique filtros rápidos: status (ativo/inativo), congregação, gênero.',
      'Abra Filtros avançados para faixa etária, datas de batismo/admissão, cidade, etc.',
      'Filtros ativos aparecem como chips — clique no X para remover.',
      'Alterne entre visualização em lista ou cards.',
    ],
    related: ['membros-cadastrar', 'membros-exportar'],
  },
  {
    slug: 'membros-importar',
    title: 'Importar membros via CSV',
    module: 'membros',
    role: 'editor',
    route: '/members',
    estimatedMinutes: 4,
    tags: ['importar', 'csv', 'membro'],
    steps: [
      'Clique no botão de importar (ícone de upload).',
      'Selecione um arquivo .csv (máx. 10 MB).',
      'Aguarde a validação — corrija erros exibidos no preview.',
      'Confirme a importação.',
      'Verifique o resumo de registros importados.',
    ],
    details: [
      'Use o modelo de colunas esperado pelo sistema. Importação respeita limite do plano.',
    ],
    related: ['membros-cadastrar', 'membros-exportar'],
  },
  {
    slug: 'membros-exportar',
    title: 'Exportar lista de membros',
    module: 'membros',
    role: 'reader',
    route: '/members',
    estimatedMinutes: 2,
    tags: ['exportar', 'pdf', 'csv', 'membro'],
    steps: [
      'Aplique filtros desejados (opcional).',
      'Abra o menu/modal de exportar.',
      'Escolha PDF ou CSV.',
      'Confirme e faça download.',
    ],
    related: ['membros-filtrar', 'membros-importar'],
  },
];

export { cadastrarMembroSteps, cadastrarMembroDetails };
