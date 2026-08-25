'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Edit, Trash2, MapPin, Phone, User, Users, Loader2, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { Congregation } from '@/types/congregation';
import { apiService, formatApiError } from '@/services/api';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import type { Member } from '@/types/reports';
import { getCongregationDisplayName } from '@/utils/congregation';
import { ExportCongregationMembersModal } from '@/components/congregations/ExportCongregationMembersModal';
import toast from 'react-hot-toast';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface CongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  congregationId: string | null;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string, activeMembersCount: number, isPrimary?: boolean) => void;
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
  const [errorMembers, setErrorMembers] = useState<string | null>(null);
  const [membersSearch, setMembersSearch] = useState('');
  const [membersSearchDebounced, setMembersSearchDebounced] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const membersRequestIdRef = useRef(0);

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
    const requestId = ++membersRequestIdRef.current;
    try {
      setLoadingMembers(true);
      setErrorMembers(null);
      const response = await apiService.listMembers({
        page: membersPage,
        limit: MEMBERS_PER_PAGE,
        congregation_id: congregationId,
        active: true,
        ...(membersSearchDebounced ? { search: membersSearchDebounced } : {}),
      });
      if (requestId !== membersRequestIdRef.current) {
        return;
      }
      setMembersResponse({
        data: response.data || [],
        pagination: response.pagination,
      });
    } catch (err) {
      if (requestId !== membersRequestIdRef.current) {
        return;
      }
      setErrorMembers(formatApiError(err));
      setMembersResponse(null);
    } finally {
      if (requestId === membersRequestIdRef.current) {
        setLoadingMembers(false);
      }
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
      setErrorMembers(null);
      setMembersSearch('');
      setMembersSearchDebounced('');
      setExportModalOpen(false);
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

  const renderActionButtons = (layoutClassName: string) => {
    if (!congregation) return null;
    const canExportMembers = (congregation.activeMembersCount ?? 0) > 0;
    return (
      <div className={layoutClassName}>
        <Button
          variant="primary"
          onClick={() => setExportModalOpen(true)}
          className="min-h-11 w-full"
          disabled={!canExportMembers}
          title={
            canExportMembers ? undefined : 'Não há membros ativos para exportar'
          }
        >
          <Download size={16} className="mr-2 shrink-0" />
          Exportar lista
        </Button>
        {onEdit && (
          <Button
            variant="secondary"
            onClick={() => {
              handleClose();
              onEdit(congregation.id);
            }}
            className="min-h-11 w-full"
            disabled={readOnly}
            title={readOnly ? READER_TOOLTIP : undefined}
          >
            <Edit size={16} className="mr-2 shrink-0" />
            Editar
          </Button>
        )}
        {onDelete && (
          <Button
            variant="danger"
            onClick={() => {
              handleClose();
              onDelete(
                congregation.id,
                congregation.name,
                congregation.activeMembersCount ?? 0,
                congregation.is_primary
              );
            }}
            className="min-h-11 w-full"
            disabled={readOnly || congregation.is_primary}
            title={
              congregation.is_primary
                ? 'A congregação principal não pode ser excluída'
                : readOnly
                  ? READER_TOOLTIP
                  : undefined
            }
          >
            <Trash2 size={16} className="mr-2 shrink-0" />
            Excluir
          </Button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const showMobileStickyActions = Boolean(congregation && !loading && !error);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        congregation
          ? `${getCongregationDisplayName(congregation)}${congregation.is_primary ? ' (Principal)' : ''}`
          : 'Carregando...'
      }
      size="xl"
      footer={
        showMobileStickyActions
          ? renderActionButtons(
              'flex flex-col gap-2 p-4 md:hidden'
            )
          : undefined
      }
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
        <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">
          {/* Info — stack no mobile; 30% em md+ */}
          <div className="w-full shrink-0 overflow-y-auto border-b border-gray-200 pb-4 md:w-[30%] md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="space-y-4 md:space-y-6">
              {congregation.abbreviation?.trim() && (
                <div className="min-w-0">
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                    Nome completo
                  </label>
                  <p className="break-words text-gray-900">{congregation.name}</p>
                </div>
              )}

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Users size={18} className="shrink-0 text-gray-400" />
                  Quantidade
                </label>
                <p className="text-gray-900">
                  {congregation.activeMembersCount ?? totalMembers ?? 0} membro(s)
                </p>
              </div>

              <div className="min-w-0">
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <MapPin size={18} className="shrink-0 text-gray-400" />
                  Endereço
                </label>
                <p className="break-words text-gray-900">{fullAddress || '-'}</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Phone size={18} className="shrink-0 text-gray-400" />
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

              <div className="min-w-0">
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <User size={18} className="shrink-0 text-gray-400" />
                  Líder
                </label>
                <p className="break-words text-gray-900">{congregation.leader || '-'}</p>
              </div>

              {/* Ações no painel — só desktop; mobile usa footer sticky do Modal */}
              {renderActionButtons('hidden border-t border-gray-200 pt-4 md:flex md:flex-col md:gap-2')}
            </div>
          </div>

          {/* Membros — empilhados no mobile; flex-1 em md+ */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:p-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900 shrink-0">
                Membros ({congregation.activeMembersCount ?? totalMembers ?? 0})
              </h3>
              <div className="relative w-full min-w-0 sm:min-w-[200px] sm:max-w-sm sm:flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  placeholder="Buscar membros por nome..."
                  className="h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {loadingMembers ? (
                <div className="flex flex-1 items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    Carregando membros...
                  </div>
                </div>
              ) : errorMembers ? (
                <div className="flex flex-1 items-center justify-center py-8">
                  <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                    <p className="mb-3 text-sm font-medium text-red-700">{errorMembers}</p>
                    <Button onClick={loadMembers} variant="secondary" className="min-h-11">
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : members.length > 0 ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto">
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

                  {totalPages > 1 && (
                    <div className="mt-4 shrink-0 border-t border-gray-200 pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50"
                            title="Página anterior"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-sm font-medium text-gray-700">{membersPage}</span>
                            <span className="text-sm text-gray-400">de</span>
                            <span className="text-sm font-medium text-gray-700">{totalPages}</span>
                          </div>
                          <button
                            onClick={() => setMembersPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={!hasNextPage}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50"
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
                <div className="flex flex-1 items-center justify-center py-8 text-gray-500">
                  <div className="px-2 text-center">
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

    {congregationId && (
      <ExportCongregationMembersModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={async (selectedFields) => {
          const { blob, filename } = await apiService.exportCongregationMembersList(
            congregationId,
            selectedFields
          );
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
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
