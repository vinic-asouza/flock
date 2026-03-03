'use client';

import { Eye, Edit, UserMinus, UserPlus, Mail, MessageCircle, Phone, MapPin, Briefcase, Church, Users } from 'lucide-react';
import { formatMemberName } from '@/utils/formatMemberName';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface MemberCardGridProps {
  member: {
    id: string;
    name: string;
    birth: string; // ISO date
    active: boolean;
    congregation?: { name: string } | null;
    groups?: Array<{
      id: string;
      name: string;
      type: string;
      status: boolean;
    }>;
    gender: string;
    marital_status: string;
    occupation?: string | null;
    spouse?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
  };
  canEdit?: boolean;
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

function formatPhone(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function MemberCardGrid({ member, canEdit = true, onView, onEdit, onDeactivate, onReactivate }: MemberCardGridProps) {
  const idade = calcularIdade(member.birth);
  const readOnly = canEdit === false;

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg px-6 py-4 h-full ${!member.active ? 'bg-gray-100' : 'bg-white'}`}>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Linha 1: Nome e status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900 text-base truncate uppercase flex-1 min-w-0" title={member.name}>
            {formatMemberName(member.name)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            member.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
          }`}>
            {member.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        
        {/* Informações Pessoais */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {idade !== null && (
            <span>{idade} anos</span>
          )}
          {member.occupation && (
            <span className="flex items-center gap-1">
              <Briefcase size={12} className="text-gray-400" />
              {member.occupation}
            </span>
          )}
        </div>

        {/* Informações de Contato */}
        {(member.phone || member.whatsapp || member.email) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {member.phone && (
              <a href={`tel:${member.phone.replace(/\D/g, '')}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                {formatPhone(member.phone)}
              </a>
            )}
            {member.whatsapp && (
              <a
                href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-green-600 transition-colors"
              >
                <MessageCircle size={14} className="text-gray-400 flex-shrink-0" />
                {formatPhone(member.whatsapp)}
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors truncate max-w-xs"
                title={member.email}
              >
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                {member.email}
              </a>
            )}
          </div>
        )}

        {/* Informações de Endereço */}
        {(member.address || member.neighborhood || member.city || member.state) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {member.address && (
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span>{member.address}</span>
                {member.complement && <span>, {member.complement}</span>}
              </span>
            )}
            {(member.neighborhood || member.city || member.state) && (
              <span>
                {member.neighborhood && <span>{member.neighborhood}</span>}
                {member.neighborhood && (member.city || member.state) && <span> - </span>}
                {member.city && <span>{member.city}</span>}
                {member.city && member.state && <span>/</span>}
                {member.state && <span>{member.state}</span>}
              </span>
            )}
          </div>
        )}

        {/* Badges de congregação e grupos */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Church size={12} className="text-gray-600" />
            {member.congregation?.name || 'Sede'}
          </span>
          {member.groups && member.groups.length > 0 && member.groups
            .filter(group => group.status) // Apenas grupos ativos
            .slice(0, 3) // Máximo de 3 grupos no card
            .map((group) => (
              <span 
                key={group.id} 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                title={`${group.type} - ${group.name}`}
              >
                <Users size={12} className="text-purple-600" />
                <span className="text-purple-600">{group.type}</span>
                <span className="text-purple-500">•</span>
                <span>{group.name}</span>
              </span>
            ))}
          {member.groups && member.groups.filter(group => group.status).length > 3 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              +{member.groups.filter(group => group.status).length - 3}
            </span>
          )}
        </div>
      </div>
      
      {/* Ações alinhadas à direita */}
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
              title={readOnly ? READER_TOOLTIP : 'Editar'}
              onClick={onEdit}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Edit size={18} />
            </button>
            <button
              title={readOnly ? READER_TOOLTIP : 'Inativar'}
              onClick={onDeactivate}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserMinus size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              title="Visualizar"
              onClick={onView}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
              <Eye size={18} />
            </button>
            <button
              title={readOnly ? READER_TOOLTIP : 'Reativar'}
              onClick={onReactivate}
              disabled={readOnly}
              className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
