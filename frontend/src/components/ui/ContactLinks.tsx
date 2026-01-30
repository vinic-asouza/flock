'use client';

import React from 'react';
import { MessageCircle, Mail, Phone } from 'lucide-react';
import { formatPhone } from '@/utils';
import { clsx } from 'clsx';

interface ContactLinksProps {
  whatsapp?: string | null;
  email?: string | null;
  phone?: string | null;
  className?: string;
  iconSize?: number;
  showLabels?: boolean;
}

/**
 * Componente ContactLinks para padronizar links de contato (WhatsApp, Email, Telefone)
 * Usado em cards de membros e integrações
 */
export function ContactLinks({
  whatsapp,
  email,
  phone,
  className,
  iconSize = 16,
  showLabels = true,
}: ContactLinksProps) {
  const links: Array<{
    type: 'whatsapp' | 'email' | 'phone';
    href: string;
    icon: React.ReactNode;
    text: string;
    color: string;
  }> = [];

  if (whatsapp) {
    links.push({
      type: 'whatsapp',
      href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
      icon: <MessageCircle size={iconSize} className="transition-colors" />,
      text: formatPhone(whatsapp),
      color: 'text-gray-600 hover:text-green-600',
    });
  }

  if (email) {
    links.push({
      type: 'email',
      href: `mailto:${email}`,
      icon: <Mail size={iconSize} className="transition-colors" />,
      text: email,
      color: 'text-gray-600 hover:text-blue-600',
    });
  }

  if (phone && !whatsapp) {
    // Só mostra telefone se não tiver WhatsApp (para evitar duplicação)
    links.push({
      type: 'phone',
      href: `tel:${phone.replace(/\D/g, '')}`,
      icon: <Phone size={iconSize} className="transition-colors" />,
      text: formatPhone(phone),
      color: 'text-gray-600 hover:text-blue-600',
    });
  }

  if (links.length === 0) return null;

  return (
    <div className={clsx('flex flex-wrap items-center gap-4', className)}>
      {links.map((link) => (
        <a
          key={link.type}
          href={link.href}
          target={link.type === 'whatsapp' ? '_blank' : undefined}
          rel={link.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
          className={clsx(
            'flex items-center gap-1 cursor-pointer transition-colors',
            link.color
          )}
        >
          {link.icon}
          {showLabels && <span>{link.text}</span>}
          {!showLabels && <span className="sr-only">{link.text}</span>}
        </a>
      ))}
    </div>
  );
}
