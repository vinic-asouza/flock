import type { TutorialModule, TutorialModuleId } from './types';

export const TUTORIAL_MODULES: TutorialModule[] = [
  { id: 'relatorios', label: 'Relatórios', route: '/' },
  { id: 'membros', label: 'Membros', route: '/members' },
  { id: 'integracao', label: 'Integração', route: '/integration' },
  { id: 'congregacoes', label: 'Congregações', route: '/congregations' },
  { id: 'grupos', label: 'Grupos', route: '/groups' },
  { id: 'calendario', label: 'Calendário', route: '/calendar' },
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
