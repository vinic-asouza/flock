import { primeirosPassosGuides } from './primeiros-passos';
import { relatoriosGuides } from './relatorios';
import { membrosGuides } from './membros';
import { integracaoGuides } from './integracao';
import { congregacoesGuides } from './congregacoes';
import { gruposGuides } from './grupos';

/** Guias ativos na superfície. `calendario.ts` permanece no repo (não importado) — DEV-128. */
export const ALL_TUTORIAL_GUIDES = [
  ...primeirosPassosGuides,
  ...relatoriosGuides,
  ...membrosGuides,
  ...integracaoGuides,
  ...congregacoesGuides,
  ...gruposGuides,
];

export {
  primeirosPassosGuides,
  relatoriosGuides,
  membrosGuides,
  integracaoGuides,
  congregacoesGuides,
  gruposGuides,
};
