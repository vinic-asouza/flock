'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Edit, Trash2, UserPlus, X, Users, Info, Loader2, ChevronLeft, ChevronRight, Mail, Phone, MessageCircle } from 'lucide-react';
import { GroupWithMembers } from '@/types';
import { Member } from '@/types/reports';
import { apiService } from '@/services/api';
import { Select } from '@/components/ui/Select';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onRefresh?: () => void;
}

export function GroupModal({ isOpen, onClose, groupId, onEdit, onDelete, onRefresh }: GroupModalProps) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const [addingMember, setAddingMember] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPerPage] = useState(10);
  const [fullMembersData, setFullMembersData] = useState<Array<Member & { addedAt?: string }>>([]);
  const [loadingFullMembers, setLoadingFullMembers] = useState(false);

  useEffect(() => {
    if (isOpen && groupId) {
      loadGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, groupId]);

  useEffect(() => {
    // Carregar membros disponíveis quando o grupo for carregado
    if (group && groupId) {
      loadAvailableMembers();
      loadFullMembersData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, groupId]);

  // Resetar página quando mudar de tab ou grupo
  useEffect(() => {
    if (activeTab === 'members' && groupId) {
      setMembersPage(1);
    }
  }, [activeTab, groupId]);

  const loadGroup = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getGroup(groupId);
      setGroup(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do grupo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMembers = async () => {
    if (!groupId || !group) return;
    try {
      setLoadingMembers(true);
      // Normalizar: se congregation_id é null, usar 'sede' para filtrar membros sem congregação
      const congregationId = group.congregation_id ? group.congregation_id : 'sede';
      
      // Carregar todos os membros da congregação (pode precisar de múltiplas requisições se > 100)
      let allMembers: Member[] = [];
      let page = 1;
      const limit = 100; // Limite máximo permitido pela API
      let hasMore = true;

      while (hasMore) {
        const response = await apiService.listMembers({
          page,
          limit,
          congregation_id: congregationId,
          active: true
        });
        
        const members = response.data || [];
        allMembers = [...allMembers, ...members];
        
        // Verificar se há mais páginas
        hasMore = members.length === limit && response.pagination?.hasNextPage;
        page++;
      }

      // Filtrar membros que já estão no grupo
      const currentMemberIds = (group.membersList || []).map((m) => m.id);
      const available = allMembers.filter((m) => !currentMemberIds.includes(m.id));
      setAvailableMembers(available.map((m) => ({ id: m.id, name: m.name })));
    } catch (err) {
      console.error('Erro ao carregar membros disponíveis:', err);
      setAvailableMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadFullMembersData = async () => {
    if (!groupId || !group || !group.membersList || group.membersList.length === 0) {
      setFullMembersData([]);
      return;
    }

    try {
      setLoadingFullMembers(true);
      // Criar um mapa com os dados de membersList (incluindo addedAt)
      const membersListMap = new Map(
        group.membersList.map((m) => [m.id, { addedAt: m.addedAt }])
      );
      
      // Buscar dados completos dos membros usando a API de membros
      const memberIds = group.membersList.map((m) => m.id);
      const allMembers: Array<Member & { addedAt?: string }> = [];

      // Buscar membros em lotes (máximo 100 por requisição)
      for (let i = 0; i < memberIds.length; i += 100) {
        const batchIds = memberIds.slice(i, i + 100);
        // Buscar cada membro individualmente ou usar busca por IDs
        // Por enquanto, vamos buscar individualmente
        const batchPromises = batchIds.map(async (memberId: string) => {
          try {
            const member = await apiService.getMember(memberId);
            // Preservar o addedAt do membersList
            const memberListData = membersListMap.get(memberId);
            return {
              ...member,
              addedAt: memberListData?.addedAt
            } as Member & { addedAt?: string };
          } catch {
            return null;
          }
        });
        const batchResults = await Promise.all(batchPromises);
        const validMembers = batchResults.filter((m): m is Member & { addedAt?: string } => m !== null);
        allMembers.push(...validMembers);
      }

      // Ordenar por addedAt (mais recente primeiro) - ordem decrescente
      allMembers.sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA; // Decrescente: mais recente primeiro
      });

      setFullMembersData(allMembers);
    } catch (err) {
      console.error('Erro ao carregar dados completos dos membros:', err);
      setFullMembersData([]);
    } finally {
      setLoadingFullMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!groupId || !selectedMemberId) return;
    try {
      setAddingMember(true);
      await apiService.addMemberToGroup(groupId, selectedMemberId);
      setSelectedMemberId('');
      await loadGroup();
      await loadAvailableMembers();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar membro';
      alert(errorMessage);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId) return;
    const confirmed = window.confirm('Tem certeza que deseja remover este membro do grupo?');
    if (!confirmed) return;
    try {
      await apiService.removeMemberFromGroup(groupId, memberId);
      await loadGroup();
      await loadAvailableMembers();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover membro';
      alert(errorMessage);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setGroup(null);
      setError(null);
      setActiveTab('info');
      setSelectedMemberId('');
      setMembersPage(1);
      setFullMembersData([]);
      onClose();
    }
  };

  // Calcular paginação
  const totalMembers = fullMembersData.length;
  const totalPages = Math.ceil(totalMembers / membersPerPage);
  const paginatedMembers = fullMembersData.slice(
    (membersPage - 1) * membersPerPage,
    membersPage * membersPerPage
  );

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Ministério': 'bg-blue-100 text-blue-700',
      'Departamento': 'bg-purple-100 text-purple-700',
      'Grupo': 'bg-green-100 text-green-700',
      'Equipe': 'bg-yellow-100 text-yellow-700',
      'Time': 'bg-orange-100 text-orange-700',
      'Comissão': 'bg-pink-100 text-pink-700',
      'Célula': 'bg-indigo-100 text-indigo-700',
      'Grupo de Crescimento': 'bg-teal-100 text-teal-700',
      'Pequeno Grupo': 'bg-cyan-100 text-cyan-700',
      'Discipulado': 'bg-amber-100 text-amber-700',
      'Classe': 'bg-rose-100 text-rose-700',
      'Núcleo': 'bg-violet-100 text-violet-700',
      'Região': 'bg-slate-100 text-slate-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={group ? `${group.type} - ${group.name}` : 'Carregando...'}
        size="xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadGroup} className="mt-4">Tentar novamente</Button>
          </div>
        ) : group ? (
          <div className="flex flex-col h-full max-h-[calc(90vh-120px)]">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'info'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Info size={16} className="inline mr-2" />
                Informações
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'members'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users size={16} className="inline mr-2" />
                Membros ({group.membersList?.length || 0})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Tipo</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(group.type)}`}>
                        {group.type}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        group.status ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {group.status ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Congregação</label>
                      <p className="text-gray-900">{group.congregations?.name || 'Sede'}</p>
                    </div>
                    {group.responsible && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Responsável</label>
                        <div className="space-y-2">
                          <p className="text-gray-900 font-medium">{group.responsible.name || '-'}</p>
                          {(group.responsible.email || group.responsible.phone || group.responsible.whatsapp) && (
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              {group.responsible.email && (
                                <a
                                  href={`mailto:${group.responsible.email}`}
                                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                >
                                  <Mail size={14} className="text-gray-400" />
                                  {group.responsible.email}
                                </a>
                              )}
                              {group.responsible.phone && (
                                <a
                                  href={`tel:${group.responsible.phone.replace(/\D/g, '')}`}
                                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                >
                                  <Phone size={14} className="text-gray-400" />
                                  {group.responsible.phone}
                                </a>
                              )}
                              {group.responsible.whatsapp && (
                                <a
                                  href={`https://wa.me/${group.responsible.whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                                >
                                  <MessageCircle size={14} className="text-gray-400" />
                                  {group.responsible.whatsapp}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {group.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Descrição</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{group.description}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {onEdit && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleClose();
                          onEdit(group.id);
                        }}
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          handleClose();
                          onDelete(group.id, group.name);
                        }}
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-4 flex flex-col min-h-0">
                  {/* Adicionar membro */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Membro</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={selectedMemberId}
                          onChange={setSelectedMemberId}
                          options={[
                            { value: '', label: 'Selecione um membro' },
                            ...availableMembers.map(m => ({
                              value: m.id,
                              label: m.name
                            }))
                          ]}
                          disabled={loadingMembers || addingMember}
                          searchable={true}
                          placeholder={loadingMembers ? 'Carregando...' : 'Buscar membro'}
                        />
                      </div>
                      <Button
                        onClick={handleAddMember}
                        disabled={!selectedMemberId || addingMember}
                        isLoading={addingMember}
                      >
                        <UserPlus size={16} className="mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de membros */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {loadingFullMembers ? (
                      <div className="flex items-center justify-center flex-1">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 size={20} className="animate-spin" />
                          Carregando membros...
                        </div>
                      </div>
                    ) : paginatedMembers.length > 0 ? (
                      <>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          <div className="space-y-3">
                            {paginatedMembers.map((member) => (
                              <div key={member.id} className="relative group">
                                <MemberCardCompact 
                                  member={member as Parameters<typeof MemberCardCompact>[0]['member']} 
                                />
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="absolute top-3 right-3 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                  title="Remover do grupo"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Paginação */}
                        {totalPages > 1 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                Mostrando {((membersPage - 1) * membersPerPage) + 1} a {Math.min(membersPage * membersPerPage, totalMembers)} de {totalMembers} membro(s)
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setMembersPage(prev => Math.max(1, prev - 1))}
                                  disabled={membersPage === 1}
                                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 transition-colors"
                                  title="Página anterior"
                                >
                                  <ChevronLeft size={16} className="text-gray-600" />
                                </button>
                                <div className="flex items-center gap-1 px-2">
                                  <span className="text-sm text-gray-700 font-medium">
                                    {membersPage}
                                  </span>
                                  <span className="text-sm text-gray-400">
                                    de
                                  </span>
                                  <span className="text-sm text-gray-700 font-medium">
                                    {totalPages}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setMembersPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={membersPage === totalPages}
                                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 transition-colors"
                                  title="Próxima página"
                                >
                                  <ChevronRight size={16} className="text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center flex-1 text-gray-500">
                        <div className="text-center">
                          <Users size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>Nenhum membro vinculado a este grupo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
