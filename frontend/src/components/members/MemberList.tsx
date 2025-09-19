'use client';

import { useEffect } from 'react';
import { MemberCard } from './MemberCard';
import { MemberCardGrid } from './MemberCardGrid';
import { ViewMode } from './ViewModeSelector';
import { Pagination } from '../commom/Pagination';
import { MemberFilters } from '@/app/(main)/members/page';
import { useMembers } from '@/context/MembersContext';

export function MemberList({ 
  onTotalChange, 
  filters, 
  sorting,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  viewModeSelector,
  viewMode,
  isViewModeLoaded
}: { 
  onTotalChange?: (total: number) => void; 
  filters: MemberFilters;
  sorting?: { sort_by: string; sort_order: 'asc' | 'desc' };
  onView?: (id: string, name: string) => void;
  onEdit?: (id: string) => void;
  onDeactivate?: (id: string, name: string) => void;
  onReactivate?: (id: string, name: string) => void;
  viewModeSelector?: React.ReactNode;
  viewMode: ViewMode;
  isViewModeLoaded?: boolean;
}) {
  const {
    members,
    pagination,
    loading,
    error,
    currentPage,
    loadMembers,
    setPage
  } = useMembers();

  // Carregar membros quando filtros, ordenação ou página mudarem
  useEffect(() => {
    if (sorting) {
      loadMembers(filters, sorting, currentPage);
    }
  }, [filters, sorting, currentPage, loadMembers]);

  // Recarregar lista quando necessário
  useEffect(() => {
    const handleRefresh = () => {
      if (sorting) {
        loadMembers(filters, sorting, currentPage);
      }
    };

    // Adicionar listener para eventos de atualização
    window.addEventListener('memberUpdated', handleRefresh);
    
    return () => {
      window.removeEventListener('memberUpdated', handleRefresh);
    };
  }, [filters, sorting, currentPage, loadMembers]);

  // Notificar mudança no total
  useEffect(() => {
    if (pagination && onTotalChange) {
      onTotalChange(pagination.total);
    }
  }, [pagination, onTotalChange]);

  const handleView = (id: string, name: string) => {
    onView?.(id, name);
  };

  const handleEdit = (id: string) => {
    onEdit?.(id);
  };

  const handleDeactivate = (id: string, name: string) => {
    onDeactivate?.(id, name);
  };

  const handleReactivate = (id: string, name: string) => {
    onReactivate?.(id, name);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (loading || !isViewModeLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">Carregando membros...</p>
        <p className="text-sm text-gray-500">Buscando informações</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  
  if (!members.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum membro encontrado</p>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Não encontramos membros com os filtros aplicados. Tente ajustar os critérios de busca.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Seletor de modo de visualização (se fornecido) */}
      {viewModeSelector}

      {/* Lista de membros */}
      {viewMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onView={() => handleView(member.id, member.name)}
              onEdit={() => handleEdit(member.id)}
              onDeactivate={() => handleDeactivate(member.id, member.name)}
              onReactivate={() => handleReactivate(member.id, member.name)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <MemberCardGrid
              key={member.id}
              member={member}
              onView={() => handleView(member.id, member.name)}
              onEdit={() => handleEdit(member.id)}
              onDeactivate={() => handleDeactivate(member.id, member.name)}
              onReactivate={() => handleReactivate(member.id, member.name)}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
} 