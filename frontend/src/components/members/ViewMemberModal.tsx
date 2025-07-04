'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader, Mail, MessageCircle, MapPin, Calendar, User, Briefcase, Home } from 'lucide-react';
import apiService from '@/services/api';

interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  document?: string;
  spouse?: string;
  occupation: string;
  address: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep?: string;
  baptism_date?: string;
  admission?: string;
  admission_date?: string;
  role?: { name: string } | null;
  congregation?: { name: string } | null;
  active: boolean;
}

interface ViewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onEdit: () => void;
  onDelete: () => void;
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

function formatarData(data: string): string {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarTelefone(telefone: string): string {
  if (!telefone) return '-';
  const numbers = telefone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
}

export function ViewMemberModal({ isOpen, onClose, memberId, onEdit, onDelete }: ViewMemberModalProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && memberId) {
      loadMember();
    }
  }, [isOpen, memberId]);

  const loadMember = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMember(memberId);
      setMember(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do membro');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMember(null);
      setError(null);
      onClose();
    }
  };

  const idade = member ? calcularIdade(member.birth) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Detalhes do Membro"
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {member && !loading && (
        <div className="p-6 space-y-6">
          {/* Header com nome e status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.active ? 'Ativo' : 'Inativo'}
                </span>
                {member.role && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {member.role.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <User size={20} />
                Informações Pessoais
              </h4>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Idade</span>
                  <p className="text-gray-900">{idade !== null ? `${idade} anos` : '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Gênero</span>
                  <p className="text-gray-900">{member.gender}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Estado Civil</span>
                  <p className="text-gray-900">{member.marital_status}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Nacionalidade</span>
                  <p className="text-gray-900">{member.nationality}</p>
                </div>
                {member.document && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Documento</span>
                    <p className="text-gray-900">{member.document}</p>
                  </div>
                )}
                {member.spouse && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cônjuge</span>
                    <p className="text-gray-900">{member.spouse}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Profissão</span>
                  <p className="text-gray-900">{member.occupation}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Briefcase size={20} />
                Informações Eclesiásticas
              </h4>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Congregação</span>
                  <p className="text-gray-900">{member.congregation?.name || 'Sede'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Data de Batismo</span>
                  <p className="text-gray-900">{formatarData(member.baptism_date || '')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Data de Admissão</span>
                  <p className="text-gray-900">{formatarData(member.admission_date || '')}</p>
                </div>
                {member.admission && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tipo de Admissão</span>
                    <p className="text-gray-900">{member.admission}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Mail size={20} />
              Contato
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                    {member.email}
                  </a>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-gray-400" />
                  <span className="text-gray-900">{formatarTelefone(member.phone)}</span>
                </div>
              )}
              {member.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-gray-400" />
                  <a 
                    href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {formatarTelefone(member.whatsapp)}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Home size={20} />
              Endereço
            </h4>
            
            <div className="space-y-2">
              <p className="text-gray-900">{member.address}</p>
              {member.complement && (
                <p className="text-gray-900">{member.complement}</p>
              )}
              <p className="text-gray-900">
                {member.neighborhood} - {member.city}/{member.state}
              </p>
              {member.cep && (
                <p className="text-gray-900">CEP: {member.cep}</p>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onDelete}
              disabled={loading}
            >
              Excluir
            </Button>
            <Button
              onClick={onEdit}
              disabled={loading}
            >
              Editar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
} 