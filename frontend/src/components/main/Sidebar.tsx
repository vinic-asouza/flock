'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Home, Briefcase, Layers, BarChart2, Settings, Church } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  churchName: string;
}

const navItems = [
  { label: 'Painel', href: '/', icon: Home },
  { label: 'Membros', href: '/members', icon: Users },
  { label: 'Cargos', href: '/roles', icon: Briefcase },
  { label: 'Congregações', href: '/congregations', icon: Layers },
  { label: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar({ churchName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              
              <Icon 
                size={18} 
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`} 
              />
              <span className="flex-1">{label}</span>
              
              {/* Efeito de brilho sutil para item ativo */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-transparent opacity-50"></div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
} 