import type { TutorialGuide } from '../types';

const cadastrarIntegranteSteps = [
  'Clique em Integração na barra lateral.',
  'Clique em Adicionar integrante.',
  'Preencha nome, data de nascimento e contatos básicos.',
  'Indique a congregação esperada e, se souber, o mentor.',
  'Clique em Salvar.',
];

export const integracaoGuides: TutorialGuide[] = [
  {
    slug: 'integracao-cadastrar',
    title: 'Cadastrar um integrante manualmente',
    module: 'integracao',
    role: 'editor',
    route: '/integration',
    estimatedMinutes: 3,
    tags: ['cadastro', 'integração', 'visitante'],
    steps: cadastrarIntegranteSteps,
    related: ['integracao-converter', 'integracao-filtrar'],
  },
  {
    slug: 'integracao-converter',
    title: 'Converter integrante em membro',
    module: 'integracao',
    role: 'editor',
    route: '/integration',
    estimatedMinutes: 3,
    tags: ['converter', 'membro', 'integração'],
    steps: [
      'Em Integração, abra o integrante desejado.',
      'Clique em Converter para membro.',
      'Revise/complemente os dados no formulário de membro.',
      'Clique em Salvar.',
      'O integrante passa ao status integrado; o membro aparece em Membros.',
    ],
    details: [
      'Verifique se há vagas no plano — a conversão consome uma vaga de membro.',
    ],
    related: ['integracao-cadastrar', 'membros-cadastrar'],
  },
  {
    slug: 'integracao-filtrar',
    title: 'Filtrar integrantes',
    module: 'integracao',
    role: 'reader',
    route: '/integration',
    estimatedMinutes: 2,
    tags: ['filtro', 'integração'],
    steps: [
      'Use a busca por nome.',
      'Filtre por status, congregação esperada ou mentor.',
      'Chips de filtros ativos permitem limpar rapidamente.',
    ],
    related: ['integracao-cadastrar', 'integracao-descartar'],
  },
  {
    slug: 'integracao-descartar',
    title: 'Descartar um integrante',
    module: 'integracao',
    role: 'editor',
    route: '/integration',
    estimatedMinutes: 2,
    tags: ['descartar', 'integração'],
    steps: [
      'Abra o integrante.',
      'Selecione Descartar.',
      'Confirme a ação.',
    ],
    details: [
      'Use quando o candidato desistiu ou não prosseguirá — diferente de converter.',
    ],
    related: ['integracao-converter', 'integracao-filtrar'],
  },
];
