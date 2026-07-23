'use client';

import { MainNavLinks } from '@/components/main/MainNavLinks';

interface SidebarProps {
  churchName: string;
}

export function Sidebar({ churchName: _churchName }: SidebarProps) {
  // churchName não é usado atualmente, mas mantido para compatibilidade com a interface
  void _churchName;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full shrink-0">
      <MainNavLinks />
    </aside>
  );
}
