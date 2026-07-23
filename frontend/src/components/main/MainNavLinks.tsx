'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { NAV_ITEMS, isNavItemActive } from '@/components/main/navItems';

type MainNavLinksProps = {
  /** Called after a successful in-app navigation (e.g. close mobile drawer). */
  onNavigate?: () => void;
  className?: string;
};

export function MainNavLinks({ onNavigate, className }: MainNavLinksProps) {
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
      onNavigate?.();
      return;
    }

    event.preventDefault();
    setLoadingHref(href);
    onNavigate?.();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <nav className={className ?? 'flex-1 px-2 py-4 space-y-1'} aria-label="Navegação principal">
      {NAV_ITEMS.map(({ label, href, icon: Icon, sectionStart }) => {
        const isActive = isNavItemActive(pathname, href);
        const isLoading = loadingHref === href && isPending;

        return (
          <div key={href}>
            {sectionStart && <div className="border-t border-gray-200 my-2" />}
            <Link
              href={href}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              onClick={handleNavigation(href)}
              aria-current={isActive ? 'page' : undefined}
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
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-transparent opacity-50 pointer-events-none" />
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
