'use client';

import { Eye, Edit, UserMinus, UserPlus, Mail, MessageCircle } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';

interface MemberCardGridProps {
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
  };
  onView?: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
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

export function MemberCardGrid({ member, onView, onEdit, onDeactivate, onReactivate }: MemberCardGridProps) {
  const idade = calcularIdade(member.birth);

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg px-6 py-4 h-full ${!member.active ? 'bg-gray-100' : 'bg-white'}`}>
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome e flags */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-semibold text-gray-900 text-base truncate uppercase" title={member.name}>
            {formatMemberName(member.name)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              member.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {member.active ? 'Ativo' : 'Inativo'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {member.congregation?.name || 'Sede'}
            </span>
            {member.role && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {member.role.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Linha 2: Idade e sexo */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
          <span>{idade !== null ? `${idade} anos` : '-'}</span>
          <span>{member.gender}</span>
        </div>
        
        {/* Linha 3: WhatsApp e Email */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
          {member.whatsapp && (
            <a
              href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-green-600 transition-colors"
            >
              <MessageCircle size={14} />
              {member.whatsapp}
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Mail size={14} />
              {member.email}
            </a>
          )}
        </div>
      </div>
      
      {/* Linha 4: Ações alinhadas à direita */}
      <div className="flex gap-2 justify-end">
        {member.active ? (
          // Botões para membros ativos
          <>
            <button
              title="Visualizar"
              onClick={onView}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
            <button
              title="Editar"
              onClick={onEdit}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Edit size={18} />
            </button>
            <button
              title="Inativar"
              onClick={onDeactivate}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-orange-600 transition-colors"
            >
              <UserMinus size={18} />
            </button>
          </>
        ) : (
          // Botões para membros inativos
          <>
            <button
              title="Visualizar"
              onClick={onView}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
            <button
              title="Reativar"
              onClick={onReactivate}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
            >
              <UserPlus size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
