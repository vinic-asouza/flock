import type { TutorialGuide } from '../types';

const criarEventoSteps = [
  'Clique em Calendário na barra lateral.',
  'Clique em Novo evento ou clique em um dia vazio no calendário mensal.',
  'Preencha título, tipo, data e, se aplicável, horário.',
  '(Opcional) Associe congregação, grupo ou responsável.',
  'Clique em Salvar.',
];

const criarEventoDetails = [
  'Use a aba Lista para ver todos os eventos do ano.',
  'Eventos recorrentes podem ser configurados no formulário — edite com cuidado pois alterações podem afetar a série.',
  'O contador de aniversariantes do mês aparece no topo do calendário.',
];

export const calendarioGuides: TutorialGuide[] = [
  {
    slug: 'calendario-criar',
    title: 'Criar um evento',
    module: 'calendario',
    role: 'editor',
    route: '/calendar',
    estimatedMinutes: 3,
    tags: ['evento', 'calendário', 'agenda'],
    steps: criarEventoSteps,
    details: criarEventoDetails,
    related: ['calendario-filtrar', 'calendario-aniversariantes'],
  },
  {
    slug: 'calendario-filtrar',
    title: 'Filtrar eventos no calendário',
    module: 'calendario',
    role: 'reader',
    route: '/calendar',
    estimatedMinutes: 2,
    tags: ['filtro', 'calendário'],
    steps: [
      'Use os filtros horizontais: tipo, congregação, grupo, período.',
      'Alterne entre visão Calendário (mês) e Lista (ano).',
      'Navegue entre meses/anos pelas setas.',
    ],
    related: ['calendario-criar', 'calendario-aniversariantes'],
  },
  {
    slug: 'calendario-aniversariantes',
    title: 'Ver aniversariantes do mês',
    module: 'calendario',
    role: 'reader',
    route: '/calendar',
    estimatedMinutes: 2,
    tags: ['aniversário', 'calendário'],
    steps: [
      'No Calendário, observe o indicador de aniversariantes.',
      'Clique para abrir a lista completa do mês.',
      'Use os contatos exibidos para parabenizar.',
    ],
    details: ['Aniversários vêm das datas de nascimento cadastradas em Membros.'],
    related: ['calendario-criar', 'membros-cadastrar'],
  },
];
