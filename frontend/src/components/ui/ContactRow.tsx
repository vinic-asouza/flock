'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy, Mail, MessageCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhone } from '@/utils';
import { clsx } from 'clsx';

export type ContactRowKind = 'phone' | 'whatsapp' | 'email';

interface ContactRowProps {
  kind: ContactRowKind;
  value: string;
  className?: string;
}

const KIND_META: Record<
  ContactRowKind,
  { label: string; Icon: typeof Phone; href: (value: string) => string; display: (value: string) => string }
> = {
  phone: {
    label: 'telefone',
    Icon: Phone,
    href: (value) => `tel:${value.replace(/\D/g, '')}`,
    display: (value) => formatPhone(value) || value,
  },
  whatsapp: {
    label: 'WhatsApp',
    Icon: MessageCircle,
    href: (value) => `https://wa.me/${value.replace(/\D/g, '')}`,
    display: (value) => formatPhone(value) || value,
  },
  email: {
    label: 'e-mail',
    Icon: Mail,
    href: (value) => `mailto:${value}`,
    display: (value) => value,
  },
};

export function ContactRow({ kind, value, className }: ContactRowProps) {
  const [copied, setCopied] = useState(false);
  const meta = KIND_META[kind];
  const display = meta.display(value);
  const href = meta.href(value);
  const isExternal = kind === 'whatsapp';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value.trim());
      setCopied(true);
      toast.success('Copiado');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div
      className={clsx(
        'flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5',
        className
      )}
    >
      <meta.Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="min-w-0 flex-1 truncate text-sm text-gray-900 hover:text-primary hover:underline"
        title={display}
      >
        {display}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Copiar ${meta.label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        <span className="sr-only" aria-live="polite">
          {copied ? 'Copiado' : ''}
        </span>
      </button>
    </div>
  );
}

export function ContactRowsList({
  phone,
  whatsapp,
  email,
  className,
}: {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  className?: string;
}): ReactNode {
  const rows: Array<{ kind: ContactRowKind; value: string }> = [];
  if (phone) rows.push({ kind: 'phone', value: phone });
  if (whatsapp) rows.push({ kind: 'whatsapp', value: whatsapp });
  if (email) rows.push({ kind: 'email', value: email });
  if (rows.length === 0) return null;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {rows.map((row) => (
        <ContactRow key={row.kind} kind={row.kind} value={row.value} />
      ))}
    </div>
  );
}
