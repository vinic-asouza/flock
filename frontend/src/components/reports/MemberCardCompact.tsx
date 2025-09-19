'use client';

import { Mail, MessageCircle } from 'lucide-react';

interface MemberCardCompactProps {
  member: {
    id: string;
    name: string;
    birth: string; // ISO date
    active: boolean;
    role?: { name: string } | null;
    congregation?: { name: string } | null;
    gender: string;
    marital_status: string;
    whatsapp?: string | null;
    email?: string | null;
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
          <span className="font-medium text-gray-900 text-sm truncate max-w-xs" title={member.name}>
            {member.name}
          </span>
          {/* <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
            {member.active ? 'Ativo' : 'Inativo'}
          </span> */}
          {member.role?.name && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {member.role.name}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {member.congregation?.name || 'Sede'}
          </span>
        </div>
        {/* Linha 2: Dados menores */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span>{idade !== null ? `${idade} Anos` : '-'}</span>
          <span>{member.gender}</span>
          <span>{member.marital_status}</span>
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
        
        {/* Linha 3: Endereço */}
        {(member.address || member.neighborhood || member.city || member.state) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
            {member.address && <span>{member.address}</span>}
            {member.neighborhood && <span>{member.neighborhood}</span>}
            {member.city && member.state && <span>{member.city} - {member.state}</span>}
            {member.city && !member.state && <span>{member.city}</span>}
            {!member.city && member.state && <span>{member.state}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
