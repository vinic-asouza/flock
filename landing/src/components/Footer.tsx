'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { landingAnchor } from '@/utils/landingLinks';

interface FooterProps {
  onOpenWaitlist?: () => void;
}

export function Footer({ onOpenWaitlist }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  const linkClass =
    'inline-flex min-h-11 items-center text-gray-600 hover:text-primary transition-colors text-sm';

  return (
    <footer className="bg-[#fffffffe] text-primary py-12 px-4 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-primary text-xl font-bold mb-4">Flock</h3>
            <p className="text-sm text-gray-600">
              Sistema completo para gestão de igrejas.
            </p>
          </div>
          <div>
            <h4 className="text-primary font-semibold mb-2">Links</h4>
            <ul className="space-y-0">
              <li>
                <Link href={landingAnchor('#features', pathname)} className={linkClass}>
                  Recursos
                </Link>
              </li>
              <li>
                <Link href={landingAnchor('#demo', pathname)} className={linkClass}>
                  Demonstração
                </Link>
              </li>
              <li>
                <Link href={landingAnchor('#pricing', pathname)} className={linkClass}>
                  Planos
                </Link>
              </li>
              <li>
                <Link
                  href={landingAnchor('#waitlist', pathname)}
                  className={linkClass}
                  onClick={onOpenWaitlist}
                >
                  Solicitar Contato
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary font-semibold mb-2">Contato</h4>
            <div>
              <a href="mailto:contato@flockapp.com.br" className={linkClass}>
                contato@flockapp.com.br
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-300 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {currentYear} Flock. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
