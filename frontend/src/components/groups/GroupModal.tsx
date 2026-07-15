'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Edit, Trash2, UserPlus, X, Users, Loader2, ChevronLeft, ChevronRight, Mail, Phone, MessageCircle, Download, Tag, CircleDot, MapPin, User, FileText } from 'lucide-react';
import { GroupWithMembers } from '@/types';
import { Member } from '@/types/reports';
import { apiService, formatApiError } from '@/services/api';
import { Select } from '@/components/ui/Select';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { ExportGroupMembersModal } from '@/components/groups/ExportGroupMembersModal';
import toast from 'react-hot-toast';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | null;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onRefresh?: () => void;
}

export function GroupModal({ isOpen, onClose, groupId, canEdit = true, onEdit, onDelete, onRefresh }: GroupModalProps) {
  const readOnly = canEdit === false;
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorAvailableMembers, setErrorAvailableMembers] = useState<string | null>(null);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPerPage] = useState(10);
  const [fullMembersData, setFullMembersData] = useState<Array<Member & { addedAt?: string }>>([]);
  const [loadingFullMembers, setLoadingFullMembers] = useState(false);
  const [errorMembersList, setErrorMembersList] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

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

  // Resetar página quando mudar de grupo
  useEffect(() => {
    if (groupId) {
      setMembersPage(1);
    }
  }, [groupId]);

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
      setErrorAvailableMembers(null);
      // Se o grupo não tem congregação específica, buscar membros de todas as congregações
      const congregationId = group.congregation_id || undefined;

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
      setErrorAvailableMembers(formatApiError(err));
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
      setErrorMembersList(null);
      // ✅ OTIMIZADO: Usar endpoint getGroupMembers que retorna todos os membros de uma vez
      // em vez de buscar individualmente (N+1 problem)
      const members = await apiService.getGroupMembers(groupId);
      
      // Ordenar por addedAt (mais recente primeiro) - ordem decrescente
      const sortedMembers = members.sort((a: Member & { addedAt?: string }, b: Member & { addedAt?: string }) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA; // Decrescente: mais recente primeiro
      });

      setFullMembersData(sortedMembers as Array<Member & { addedAt?: string }>);
    } catch (err) {
      setErrorMembersList(formatApiError(err));
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
      toast.error(formatApiError(err));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId) return;
    const member = fullMembersData.find(m => m.id === memberId);
    const memberName = member?.name || 'este membro';
    const confirmed = window.confirm(
      `Tem certeza que deseja remover ${memberName} do grupo?\n\nEsta ação não poderá ser desfeita.`
    );
    if (!confirmed) return;
    try {
      setRemovingMemberId(memberId);
      await apiService.removeMemberFromGroup(groupId, memberId);
      await loadGroup();
      await loadAvailableMembers();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setGroup(null);
      setError(null);
      setSelectedMemberId('');
      setMembersPage(1);
      setFullMembersData([]);
      setErrorAvailableMembers(null);
      setErrorMembersList(null);
      setRemovingMemberId(null);
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
          <div className="flex h-full min-h-[55vh] max-h-[calc(90vh-120px)] gap-6 p-6">
            {/* Coluna Esquerda - Informações (30%) */}
            <div className="w-[30%] flex-shrink-0 border-r border-gray-200 pr-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Tag size={18} className="text-gray-400 flex-shrink-0" />
                    Tipo
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(group.type)}`}>
                    {group.type}
                  </span>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <CircleDot size={18} className="text-gray-400 flex-shrink-0" />
                    Status
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    group.status ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {group.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <MapPin size={18} className="text-gray-400 flex-shrink-0" />
                    Congregação
                  </label>
                  <p className="text-gray-900">{group.congregations?.name || '—'}</p>
                </div>
                
                {group.responsible && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                      <User size={18} className="text-gray-400 flex-shrink-0" />
                      Responsável
                    </label>
                    <div className="space-y-2">
                      <p className="text-gray-900 font-medium">{group.responsible.name || '-'}</p>
                      {(group.responsible.email || group.responsible.phone || group.responsible.whatsapp) && (
                        <div className="flex flex-col gap-2 text-sm text-gray-600">
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
                
                {group.description && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <FileText size={18} className="text-gray-400 flex-shrink-0" />
                      Descrição
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap text-sm">{group.description}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      onClick={() => setExportModalOpen(true)}
                      className="w-full"
                    >
                      <Download size={16} className="mr-2" />
                      Exportar PDF
                    </Button>
                    {onEdit && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleClose();
                          onEdit(group.id);
                        }}
                        className="w-full"
                        disabled={readOnly}
                        title={readOnly ? READER_TOOLTIP : undefined}
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
                        className="w-full"
                        disabled={readOnly}
                        title={readOnly ? READER_TOOLTIP : undefined}
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Membros (70%) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Membros ({group.membersList?.length || 0})
                </h3>
              </div>
              
              <div className="space-y-4 flex flex-col flex-1 min-h-0">
                {/* Adicionar membro */}
                {!readOnly && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Membro</label>
                  {errorAvailableMembers && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2.5">
                      <p className="text-xs text-red-700 mb-2">{errorAvailableMembers}</p>
                      <Button type="button" variant="secondary" onClick={loadAvailableMembers} disabled={loadingMembers || addingMember}>
                        Tentar novamente
                      </Button>
                    </div>
                  )}
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
                )}

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
                              {!readOnly && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="absolute top-3 right-3 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                                title="Remover do grupo"
                                disabled={removingMemberId === member.id}
                              >
                                {removingMemberId === member.id ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <X size={18} />
                                )}
                              </button>
                              )}
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
                        <p>{errorMembersList ? 'Falha ao carregar membros vinculados' : 'Nenhum membro vinculado a este grupo'}</p>
                        {errorMembersList && (
                          <div className="mt-3">
                            <p className="text-xs text-red-700 mb-2">{errorMembersList}</p>
                            <Button type="button" variant="secondary" onClick={loadFullMembersData} disabled={loadingFullMembers}>
                              Tentar novamente
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {groupId && (
        <ExportGroupMembersModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          onExport={async (selectedFields) => {
            const blob = await apiService.exportGroupMembersList(groupId, selectedFields);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `grupo-membros-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('PDF exportado com sucesso!');
          }}
        />
      )}
    </>
  );
}
