'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { MouseEvent } from 'react';
import { Users, Home, Layers, Settings, Loader2, UserPlus, BookOpen, UserCog, Calendar } from 'lucide-react';

interface SidebarProps {
  churchName: string;
}

const navItems = [
  { label: 'Painel', href: '/', icon: Home },
  { label: 'Membros', href: '/members', icon: Users },
  { label: 'Integração', href: '/integration', icon: UserPlus },
  { label: 'Grupos', href: '/groups', icon: UserCog },
  { label: 'Calendário', href: '/calendar', icon: Calendar },
  { label: 'Congregações', href: '/congregations', icon: Layers },
  { label: 'Configurações', href: '/settings', icon: Settings },
  { label: 'Tutoriais', href: '/tutorials', icon: BookOpen },
];

export function Sidebar({ churchName: _churchName }: SidebarProps) {
  // churchName não é usado atualmente, mas mantido para compatibilidade com a interface
  void _churchName;
  const pathname = usePathname();
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPending) {
      setLoadingHref(null);
    }
  }, [pathname, isPending]);

  const handleNavigation = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }

    if (pathname === href) {
      return;
    }

    event.preventDefault();
    setLoadingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const isLoading = loadingHref === href && isPending;
          
          // Adicionar separador antes de "Configurações"
          const isConfigSection = label === 'Configurações';
          
          return (
            <div key={href}>
              {isConfigSection && (
                <div className="border-t border-gray-200 my-2"></div>
              )}
              <Link
                href={href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                onClick={handleNavigation(href)}
                aria-disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2
                    size={18}
                    className={`shrink-0 animate-spin ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    }`}
                  />
                ) : (
                  <Icon 
                    size={18} 
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    }`} 
                  />
                )}
                <span className="flex-1">{label}</span>
                
                {/* Efeito de brilho sutil para item ativo */}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-transparent opacity-50"></div>
                )}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
} 