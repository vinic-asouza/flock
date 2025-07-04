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
      <div className="flex justify-center py-12">
        <Loader className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }
  if (error) {
    return <div className="text-center text-red-500 py-12">{error}</div>;
  }
  if (!members.length) {
    return <div className="text-center text-gray-400 py-12">Nenhum membro encontrado.</div>;
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