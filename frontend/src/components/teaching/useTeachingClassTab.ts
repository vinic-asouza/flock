'use client';

import { useEntityTab } from '@/components/entity-detail';

export const TEACHING_CLASS_TABS = [
  'inscritos',
  'aulas',
  'materiais',
  'certificados',
] as const;

export type TeachingClassTab = (typeof TEACHING_CLASS_TABS)[number];

export function useTeachingClassTab() {
  return useEntityTab(TEACHING_CLASS_TABS, 'inscritos');
}
