'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Users, Home, Briefcase, Layers, BarChart2, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  churchName: string;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Membros', href: '/members', icon: Users },
  { label: 'Cargos', href: '/roles', icon: Briefcase },
  { label: 'Congregações', href: '/congregations', icon: Layers },
  { label: 'Relatórios', href: '/reports', icon: BarChart2 },
  { label: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar({ churchName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="flex items-center h-16 px-6 border-b border-gray-100">
        <span className="font-bold text-lg text-primary truncate" title={churchName}>{churchName}</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${pathname.startsWith(href) ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
} 