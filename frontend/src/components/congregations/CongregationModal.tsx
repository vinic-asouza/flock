'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Edit, Trash2, MapPin, Phone, User, Users, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Congregation } from '@/types/congregation';
import { apiService } from '@/services/api';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import type { Member } from '@/types/reports';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface CongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  congregationId: string | null;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onRefresh?: () => void;
}

const MEMBERS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export function CongregationModal({
  isOpen,
  onClose,
  congregationId,
  canEdit = true,
  onEdit,
  onDelete,
}: CongregationModalProps) {
  const readOnly = canEdit === false;
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membersPage, setMembersPage] = useState(1);
  const [membersResponse, setMembersResponse] = useState<{
    data: Member[];
    pagination?: { total: number; page: number; limit: number; totalPages?: number };
  } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');
  const [membersSearchDebounced, setMembersSearchDebounced] = useState('');

  // Debounce do termo de busca
  useEffect(() => {
    const t = setTimeout(() => {
      setMembersSearchDebounced(membersSearch.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [membersSearch]);

  // Resetar página quando congregação ou busca mudar
  useEffect(() => {
    if (congregationId) {
      setMembersPage(1);
    }
  }, [congregationId, membersSearchDebounced]);

  const loadCongregation = useCallback(async () => {
    if (!congregationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getCongregation(congregationId);
      setCongregation(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados da congregação';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [congregationId]);

  const loadMembers = useCallback(async () => {
    if (!congregationId) return;
    try {
      setLoadingMembers(true);
      const response = await apiService.listMembers({
        page: membersPage,
        limit: MEMBERS_PER_PAGE,
        congregation_id: congregationId,
        active: true,
        ...(membersSearchDebounced ? { search: membersSearchDebounced } : {}),
      });
      setMembersResponse({
        data: response.data || [],
        pagination: response.pagination,
      });
    } catch {
      setMembersResponse({ data: [] });
    } finally {
      setLoadingMembers(false);
    }
  }, [congregationId, membersPage, membersSearchDebounced]);

  useEffect(() => {
    if (isOpen && congregationId) {
      loadCongregation();
    }
  }, [isOpen, congregationId, loadCongregation]);

  useEffect(() => {
    if (isOpen && congregationId) {
      loadMembers();
    }
  }, [isOpen, congregationId, loadMembers]);

  const handleClose = () => {
    if (!loading) {
      setCongregation(null);
      setError(null);
      setMembersPage(1);
      setMembersResponse(null);
      setMembersSearch('');
      setMembersSearchDebounced('');
      onClose();
    }
  };

  const members = membersResponse?.data ?? [];
  const pagination = membersResponse?.pagination;
  const totalMembers = pagination?.total ?? congregation?.activeMembersCount ?? 0;
  const totalPages = pagination?.totalPages ?? (totalMembers > 0 ? Math.ceil(totalMembers / MEMBERS_PER_PAGE) : 1);
  const hasNextPage = membersPage < totalPages;
  const hasPrevPage = membersPage > 1;

  const fullAddress = congregation
    ? [congregation.address, congregation.city, congregation.state].filter(Boolean).join(', ')
    : '';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={congregation ? congregation.name : 'Carregando...'}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadCongregation} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : congregation ? (
        <div className="flex h-full min-h-[55vh] max-h-[calc(90vh-120px)] gap-6 p-6">
          {/* Coluna Esquerda - Informações (30%) */}
          <div className="w-[30%] flex-shrink-0 border-r border-gray-200 pr-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <Users size={18} className="text-gray-400 flex-shrink-0" />
                  Quantidade
                </label>
                <p className="text-gray-900">
                  {congregation.activeMembersCount ?? totalMembers ?? 0} membro(s)
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <MapPin size={18} className="text-gray-400 flex-shrink-0" />
                  Endereço
                </label>
                <p className="text-gray-900 break-words">{fullAddress || '-'}</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <Phone size={18} className="text-gray-400 flex-shrink-0" />
                  Contato
                </label>
                <p className="text-gray-900">
                  {congregation.phone ? (
                    <a
                      href={`tel:${congregation.phone.replace(/\D/g, '')}`}
                      className="text-primary hover:underline"
                    >
                      {congregation.phone}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <User size={18} className="text-gray-400 flex-shrink-0" />
                  Líder
                </label>
                <p className="text-gray-900">{congregation.leader || '-'}</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex flex-col gap-2">
                  {onEdit && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleClose();
                        onEdit(congregation.id);
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
                        onDelete(congregation.id, congregation.name);
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

          {/* Coluna Direita - Listagem de membros (70%) */}
          <div className="flex-1 flex flex-col min-h-0 p-2 overflow-hidden">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">
                Membros ({congregation.activeMembersCount ?? totalMembers ?? 0})
              </h3>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  placeholder="Buscar membros por nome..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {loadingMembers ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    Carregando membros...
                  </div>
                </div>
              ) : members.length > 0 ? (
                <>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="space-y-3">
                      {members.map((member) => (
                        <MemberCardCompact
                          key={member.id}
                          member={
                            member as Parameters<typeof MemberCardCompact>[0]['member']
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Mostrando{' '}
                          {(membersPage - 1) * MEMBERS_PER_PAGE + 1} a{' '}
                          {Math.min(membersPage * MEMBERS_PER_PAGE, totalMembers)} de{' '}
                          {totalMembers} membro(s)
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setMembersPage((prev) => Math.max(1, prev - 1))}
                            disabled={!hasPrevPage}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 transition-colors"
                            title="Página anterior"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-sm text-gray-700 font-medium">{membersPage}</span>
                            <span className="text-sm text-gray-400">de</span>
                            <span className="text-sm text-gray-700 font-medium">{totalPages}</span>
                          </div>
                          <button
                            onClick={() => setMembersPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={!hasNextPage}
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
                    <p>Nenhum membro vinculado a esta congregação</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
