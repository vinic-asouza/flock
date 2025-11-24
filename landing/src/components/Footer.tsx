'use client';

import Link from 'next/link';

interface FooterProps {
  onOpenWaitlist?: () => void;
}

export function Footer({ onOpenWaitlist }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white text-xl font-bold mb-4">Flock</h3>
            <p className="text-sm">
              Sistema completo para gestão de membros, cargos e congregações de igrejas.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="hover:text-white transition-colors">
                  Recursos
                </Link>
              </li>
              <li>
                <button
                  onClick={onOpenWaitlist}
                  className="hover:text-white transition-colors text-left"
                >
                  Lista de Espera
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contato</h4>
            <p className="text-sm">
              Entre em contato conosco através da lista de espera.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; {currentYear} Flock. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

