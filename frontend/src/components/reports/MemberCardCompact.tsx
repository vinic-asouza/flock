'use client';

import { Mail, MessageCircle, Phone } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';

interface MemberCardCompactProps {
  member: {
    id: string;
    name: string;
    birth: string; // ISO date
    active: boolean;
    congregation?: { name: string } | null;
    gender: string;
    marital_status: string;
    occupation?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
}

function calcularIdade(birth: string): number | null {
  if (!birth) return null;
  const birthDate = new Date(birth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function MemberCardCompact({ member }: MemberCardCompactProps) {
  const idade = calcularIdade(member.birth);
  return (
    <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome e selos */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm truncate max-w-xs uppercase" title={member.name}>
            {formatMemberName(member.name)}
          </span>
          {/* <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
            {member.active ? 'Ativo' : 'Inativo'}
          </span> */}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {member.congregation?.name || 'Sede'}
          </span>
        </div>
        {/* Linha única: Idade e contatos */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {idade !== null && <span>{idade} Anos</span>}
          {member.phone && (
            <a
              href={`tel:${member.phone.replace(/\D/g, '')}`}
              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Phone size={14} className="transition-colors" />
              {member.phone}
            </a>
          )}
          {member.whatsapp && (
            <a
              href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
            >
              <MessageCircle size={14} className="transition-colors" />
              {member.whatsapp}
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Mail size={14} className="transition-colors" />
              {member.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
