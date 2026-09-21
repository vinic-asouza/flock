import type { TutorialModule, TutorialModuleId } from './types';

/** Módulos expostos na superfície de Tutoriais (MVP). Calendário oculto — DEV-128. */
export const TUTORIAL_MODULES: TutorialModule[] = [
  { id: 'relatorios', label: 'Relatórios', route: '/' },
  { id: 'membros', label: 'Membros', route: '/members' },
  { id: 'integracao', label: 'Integração', route: '/integration' },
  { id: 'congregacoes', label: 'Congregações', route: '/congregations' },
  { id: 'grupos', label: 'Ministérios', route: '/ministries' },
];

export function getModuleById(id: TutorialModuleId): TutorialModule {
  const mod = TUTORIAL_MODULES.find((m) => m.id === id);
  if (!mod) {
    throw new Error(`Módulo de tutorial desconhecido: ${id}`);
  }
  return mod;
}

export function getModuleLabel(id: TutorialModuleId): string {
  return getModuleById(id).label;
}
