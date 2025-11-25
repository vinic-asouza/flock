'use client';

import Link from 'next/link';
import { Mail, MessageCircle } from 'lucide-react';

interface FooterProps {
  onOpenWaitlist?: () => void;
}

export function Footer({ onOpenWaitlist }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#fffffffe] text-primary py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-primary text-xl font-bold mb-4">Flock</h3>
            <p className="text-sm text-gray-600">
              Sistema completo para gestão de igrejas.
            </p>
          </div>
          <div>
            <h4 className="text-primary font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="text-gray-600 hover:text-primary transition-colors">
                  Recursos
                </Link>
              </li>
              <li>
                <Link href="#demo" className="text-gray-600 hover:text-primary transition-colors">
                  Demonstração
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
                  Planos
                </Link>
              </li>
              <li>
                <Link href="#waitlist" className="text-gray-600 hover:text-primary transition-colors">
                  Lista de Espera
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-primary" />
                <a href="mailto:contato@flock.com" className="text-gray-600 hover:text-primary transition-colors">
                  contato@flock.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle size={18} className="text-primary" />
                <a 
                  href="https://wa.me/5511999999999" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  (11) 99999-9999
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-300 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {currentYear} Flock. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

