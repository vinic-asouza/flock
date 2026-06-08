export type TutorialRole = 'reader' | 'editor';

export type TutorialModuleId =
  | 'relatorios'
  | 'membros'
  | 'integracao'
  | 'congregacoes'
  | 'grupos'
  | 'calendario';

export type TutorialGuide = {
  slug: string;
  title: string;
  module: TutorialModuleId;
  role: TutorialRole;
  route: string;
  estimatedMinutes: number;
  tags: string[];
  steps: string[];
  details?: string[];
  related: string[];
  trailOrder?: number;
};

export type TutorialModule = {
  id: TutorialModuleId;
  label: string;
  route: string;
};
