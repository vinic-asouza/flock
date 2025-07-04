'use client';

import { useEffect, useState } from 'react';
import { MemberCard } from './MemberCard';
import { Pagination } from '../commom/Pagination';
import apiService from '@/services/api';
import { Loader } from 'lucide-react';
import { MemberFilters } from '@/app/(main)/members/page';

interface Member {
  id: string;
  name: string;
  birth: string; // ISO date
  active: boolean;
  role?: { name: string } | null;
  congregation?: { name: string } | null;
  congregation_id?: string | null;
  gender: string;
  marital_status: string;
  whatsapp?: string | null;
  email?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

function filtersToApiParams(filters: MemberFilters, sorting?: { sort_by: string; sort_order: 'asc' | 'desc' }) {
  const params: any = {};
  
  // Apenas adicionar parâmetros que têm valores válidos
  if (filters.search && filters.search.trim()) params.search = filters.search.trim();
  if (filters.status === 'active') params.active = true;
  if (filters.status === 'inactive') params.active = false;
  if (filters.roleId && filters.roleId.trim()) params.role_id = filters.roleId.trim();
  if (filters.congregationId && filters.congregationId.trim()) params.congregation_id = filters.congregationId.trim();
  if (filters.gender && filters.gender.trim()) params.gender = filters.gender.trim();
  if (filters.maritalStatus && filters.maritalStatus.trim()) params.marital_status = filters.maritalStatus.trim();
  if (filters.nationality && filters.nationality.trim()) params.nationality = filters.nationality.trim();
  if (filters.state && filters.state.trim()) params.state = filters.state.trim();
  if (filters.city && filters.city.trim()) params.city = filters.city.trim();
  if (filters.neighborhood && filters.neighborhood.trim()) params.neighborhood = filters.neighborhood.trim();
  if (filters.ageFrom && filters.ageFrom.trim()) params.age_from = parseInt(filters.ageFrom);
  if (filters.ageTo && filters.ageTo.trim()) params.age_to = parseInt(filters.ageTo);
  if (filters.occupation && filters.occupation.trim()) params.occupation = filters.occupation.trim();
  if (filters.baptismDateFrom && filters.baptismDateFrom.trim()) params.baptism_date_from = filters.baptismDateFrom.trim();
  if (filters.baptismDateTo && filters.baptismDateTo.trim()) params.baptism_date_to = filters.baptismDateTo.trim();
  if (filters.admissionDateFrom && filters.admissionDateFrom.trim()) params.admission_date_from = filters.admissionDateFrom.trim();
  if (filters.admissionDateTo && filters.admissionDateTo.trim()) params.admission_date_to = filters.admissionDateTo.trim();
  
  // Adicionar parâmetros de ordenação
  if (sorting) {
    params.sort_by = sorting.sort_by;
    params.sort_order = sorting.sort_order;
  }
  
  return params;
}

export function MemberList({ 
  onTotalChange, 
  filters, 
  sorting 
}: { 
  onTotalChange?: (total: number) => void; 
  filters: MemberFilters;
  sorting?: { sort_by: string; sort_order: 'asc' | 'desc' };
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Resetar página ao mudar qualquer filtro ou ordenação
  useEffect(() => {
    setPage(1);
  }, [filters, sorting]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { ...filtersToApiParams(filters, sorting), page, limit: 10 };
    
    apiService.listMembers(params)
      .then((res: { data: Member[]; pagination: PaginationInfo }) => {
        setMembers(res.data);
        setPagination(res.pagination);
        if (onTotalChange) onTotalChange(res.pagination.total);
      })
      .catch((error) => {
        setError(`Erro ao carregar membros: ${error.message}`);
      })
      .finally(() => setLoading(false));
  }, [page, onTotalChange, filters, sorting]);

  const handleView = (id: string) => {
    window.location.href = `/members/${id}`;
  };
  const handleEdit = (id: string) => {
    window.location.href = `/members/${id}/edit`;
  };
  const handleDelete = (id: string) => {
    // Implementar modal de confirmação futuramente
    alert('Remover membro: ' + id);
  };

  if (loading) {
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
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
} 