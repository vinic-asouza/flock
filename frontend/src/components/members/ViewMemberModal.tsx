'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader, Mail, MessageCircle, User, Trash2, UserMinus, UserPlus, Phone, Church, Download, Home } from 'lucide-react';
import apiService from '@/services/api';
import { formatMemberName } from '@/utils/formatMemberName';
import { calculateAge } from '@/utils';

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
  neighborhood?: string;
  city: string;
  state: string;
  cep?: string;
  baptism_date?: string;
  admission?: string;
  admission_date?: string;
  father_name?: string;
  mother_name?: string;
  children?: Array<{
    name: string;
    birth?: string;
    dependent?: boolean;
  }>;
  congregation?: { name: string } | null;
  groups?: Array<{
    id: string;
    name: string;
    type: string;
    status: boolean;
    congregation_id?: string | null;
    congregations?: {
      id: string;
      name: string;
    } | null;
  }>;
  active: boolean;
}

interface ViewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDeletePermanently: () => void;
}


function formatarData(data: string): string {
  if (!data) return '-';

  // Se a data já está em formato DD/MM/AAAA, retornar como está
  if (data.includes('/')) {
    return data;
  }

  // Extrair apenas a parte da data (antes do T, se existir)
  const datePart = data.includes('T') ? data.split('T')[0] : data;

  // Conversão segura de YYYY-MM-DD -> DD/MM/AAAA sem usar Date()
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback para formatos inesperados
  try {
    const dateObj = new Date(data);
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '-';
  }
}

function converterDataParaISO(data: string): string | null {
  if (!data) return null;
  // Se já está em formato ISO (YYYY-MM-DD), retornar como está
  if (data.match(/^\d{4}-\d{2}-\d{2}/)) {
    return data;
  }
  // Se está em formato DD/MM/AAAA, converter para ISO
  if (data.includes('/')) {
    const parts = data.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return null;
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

export function ViewMemberModal({ isOpen, onClose, memberId, onEdit, onDeactivate, onReactivate, onDeletePermanently }: ViewMemberModalProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen && memberId) {
      loadMember();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, memberId]);

  const loadMember = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMember(memberId);
      setMember(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do membro';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !exporting) {
      setMember(null);
      setError(null);
      onClose();
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const blob = await apiService.exportMemberPDF(memberId);
      
      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membro-${member?.name.replace(/\s+/g, '-').toLowerCase() || 'desconhecido'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar PDF';
      setError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const idade = member ? calculateAge(member.birth) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Detalhes do Membro"
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col min-h-[70vh]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        )}

        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {member && !loading && (
          <>
            {/* Conteúdo principal */}
            <div className="flex-1 p-6 space-y-6">
              {/* Header com nome e status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 uppercase">{formatMemberName(member.name)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {member.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting || loading}
                >
                  {exporting ? (
                    <>
                      <Loader className="animate-spin mr-2" size={16} />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Exportar PDF
                    </>
                  )}
                </Button>
              </div>

              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <User size={20} />
                  Informações Pessoais
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primeira coluna */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Gênero</span>
                      <p className="text-gray-900">{member.gender}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Idade</span>
                      <p className="text-gray-900">{idade !== null ? `${idade} anos` : '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Data de Nascimento</span>
                      <p className="text-gray-900">{formatarData(member.birth)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estado Civil</span>
                      <p className="text-gray-900">{member.marital_status}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Nacionalidade</span>
                      <p className="text-gray-900">{member.nationality}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Profissão</span>
                      <p className="text-gray-900">{member.occupation}</p>
                    </div>
                  </div>

                  {/* Segunda coluna */}
                  <div className="space-y-3">
                    {member.spouse && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Cônjuge</span>
                        <p className="text-gray-900">{member.spouse}</p>
                      </div>
                    )}
                    {member.father_name && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nome do Pai</span>
                        <p className="text-gray-900">{member.father_name}</p>
                      </div>
                    )}
                    {member.mother_name && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nome da Mãe</span>
                        <p className="text-gray-900">{member.mother_name}</p>
                      </div>
                    )}
                    {member.children && member.children.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Filhos</span>
                        <div className="mt-1 space-y-3">
                          {member.children.map((child, index) => {
                            const birthISO = child.birth ? converterDataParaISO(child.birth) : null;
                            const childAge = birthISO ? calculateAge(birthISO) : null;
                            return (
                              <div key={index} className="space-y-1">
                                <p className="text-gray-900">{child.name}</p>
                                <div className="flex flex-wrap gap-2">
                                  {childAge !== null && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {childAge} {childAge === 1 ? 'ano' : 'anos'}
                                    </span>
                                  )}
                                  {child.dependent === true && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Dependente
                                    </span>
                                  )}
                                  {child.dependent === false && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      Não dependente
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contato, Endereço e Informações Eclesiásticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna 1: Contato e Endereço */}
                <div className="space-y-6">
                  {/* Contato */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Mail size={20} />
                      Contato
                    </h4>

                    <div className="space-y-3">
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
                          <Phone size={16} className="text-gray-400" />
                          <span className="text-gray-900">{formatarTelefone(member.phone)}</span>
                        </div>
                      )}
                      {member.whatsapp && (
                        <div className="flex items-center gap-2">
                          <MessageCircle size={16} className="text-green-600" />
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
                        {member.neighborhood && `${member.neighborhood} - `}{member.city}/{member.state}
                      </p>
                      {member.cep && (
                        <p className="text-gray-900">CEP: {member.cep}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Informações Eclesiásticas */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Church size={20} />
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
                      <span className="text-sm font-medium text-gray-500">Data de Recebimento</span>
                      <p className="text-gray-900">{formatarData(member.admission_date || '')}</p>
                    </div>
                    {member.admission && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Tipo de Recebimento</span>
                        <p className="text-gray-900">{member.admission}</p>
                      </div>
                    )}
                    {member.groups && member.groups.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Grupos / Ministérios</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {member.groups
                            .filter(group => group.status) // Apenas grupos ativos
                            .map((group) => (
                              <span
                                key={group.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                              >
                                <span className="text-purple-600">{group.type}</span>
                                <span className="text-purple-500">•</span>
                                <span>{group.name}</span>
                              </span>
                            ))}
                          {member.groups.filter(group => !group.status).length > 0 && (
                            <>
                              <div className="w-full mt-2 pt-2 border-t border-gray-200">
                                <span className="text-xs text-gray-500">Grupos Inativos:</span>
                              </div>
                              {member.groups
                                .filter(group => !group.status)
                                .map((group) => (
                                  <span
                                    key={group.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 opacity-75"
                                  >
                                    <span className="text-gray-500">{group.type}</span>
                                    <span className="text-gray-400">•</span>
                                    <span>{group.name}</span>
                                  </span>
                                ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {(!member.groups || member.groups.length === 0) && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Grupos / Ministérios</span>
                        <p className="text-gray-500 text-sm mt-1">Nenhum grupo vinculado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer fixo */}
            <div className="flex-shrink-0 border-t border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <Button
                  variant="danger"
                  onClick={onDeletePermanently}
                  disabled={loading}
                >
                  <Trash2 size={16} className="mr-2" />
                  Excluir Permanentemente
                </Button>
                <div className="flex space-x-3">
                  {member.active ? (
                    // Botão para membros ativos
                    <Button
                      variant="secondary"
                      onClick={onDeactivate}
                      disabled={loading}
                    >
                      <UserMinus size={16} className="mr-2" />
                      Inativar Membro
                    </Button>
                  ) : (
                    // Botão para membros inativos
                    <Button
                      variant="secondary"
                      onClick={onReactivate}
                      disabled={loading}
                    >
                      <UserPlus size={16} className="mr-2" />
                      Reativar
                    </Button>
                  )}
                  <Button
                    onClick={onEdit}
                    disabled={loading}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
} 