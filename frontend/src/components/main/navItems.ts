import {
  Users,
  Home,
  Layers,
  Settings,
  UserPlus,
  BookOpen,
  UserCog,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visual separator before this item (e.g. settings section). */
  sectionStart?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', href: '/', icon: Home },
  { label: 'Membros', href: '/members', icon: Users },
  { label: 'Integração', href: '/integration', icon: UserPlus },
  { label: 'Grupos', href: '/groups', icon: UserCog },
  { label: 'Congregações', href: '/congregations', icon: Layers },
  { label: 'Calendário', href: '/calendar', icon: Calendar },
  { label: 'Configurações', href: '/settings', icon: Settings, sectionStart: true },
  { label: 'Tutoriais', href: '/tutorials', icon: BookOpen },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}
