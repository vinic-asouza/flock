'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, Users, Eye } from 'lucide-react';
import { TopOccupation, Member } from '@/types';
import { MemberModalWithSelect } from './MemberModalWithSelect';
import { apiService } from '@/services/api';

interface OccupationsTableProps {
  data: TopOccupation[];
  loading?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
}

export function OccupationsTable({ data, loading = false, viewMode = 'all', selectedCongregationId }: OccupationsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOccupation, setSelectedOccupation] = useState('');
  const [allOccupations, setAllOccupations] = useState<TopOccupation[]>([]);
  const [loadingOccupations, setLoadingOccupations] = useState(false);

  const fetchAllOccupations = useCallback(async () => {
    setLoadingOccupations(true);
    try {
      // Preparar filtros baseados no viewMode
      interface MemberListFilters {
        active: boolean;
        limit: number;
        page: number;
        congregation_id?: string;
      }
      
      const filters: MemberListFilters = {
        active: true,
        limit: 100, // Limite máximo permitido pela API
        page: 1
      };

      if (viewMode === 'sede') {
        filters.congregation_id = 'sede';
      } else if (viewMode === 'congregation' && selectedCongregationId) {
        filters.congregation_id = selectedCongregationId;
      }

      // Buscar primeira página para obter informações de paginação
      const firstPageResponse = await apiService.listMembers(filters);
      
      if (!firstPageResponse.data || !Array.isArray(firstPageResponse.data)) {
        // Se não houver dados, usar as top 10 que já temos
        setAllOccupations(data);
        return;
      }

      // Extrair todas as ocupações únicas e contar
      const occupationMap = new Map<string, number>();
      
      // Processar primeira página
      firstPageResponse.data.forEach((member: Member) => {
        const occupation = member.occupation || 'Não informado';
        occupationMap.set(occupation, (occupationMap.get(occupation) || 0) + 1);
      });

      // Se houver mais páginas, buscar todas
      const totalPages = firstPageResponse.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const allPagesPromises = [];
        for (let page = 2; page <= totalPages; page++) {
          allPagesPromises.push(
            apiService.listMembers({ ...filters, page })
          );
        }
        
        const allPagesResults = await Promise.all(allPagesPromises);
        allPagesResults.forEach((pageResponse) => {
          if (pageResponse.data && Array.isArray(pageResponse.data)) {
            pageResponse.data.forEach((member: Member) => {
              const occupation = member.occupation || 'Não informado';
              occupationMap.set(occupation, (occupationMap.get(occupation) || 0) + 1);
            });
          }
        });
      }

      // Converter para array e ordenar por contagem
      const occupationsArray: TopOccupation[] = Array.from(occupationMap.entries())
        .map(([occupation, count]) => ({ occupation, count }))
        .sort((a, b) => b.count - a.count);

      setAllOccupations(occupationsArray);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar todas as ocupações';
      toast.error(errorMessage);
      // Em caso de erro, usar as top 10 que já temos
      setAllOccupations(data);
    } finally {
      setLoadingOccupations(false);
    }
  }, [viewMode, selectedCongregationId, data]);

  // Buscar todas as ocupações quando o modal for aberto
  useEffect(() => {
    if (isModalOpen && allOccupations.length === 0) {
      fetchAllOccupations();
    }
  }, [isModalOpen, allOccupations.length, fetchAllOccupations]);

  const selectedValues = {
    occupation: selectedOccupation
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'occupation') {
      setSelectedOccupation(value);
    }
  };

  // Usar todas as ocupações no modal, ou as top 10 como fallback
  const occupationOptions = allOccupations.length > 0 
    ? allOccupations.map(occupation => ({
        value: occupation.occupation,
        label: occupation.occupation,
        count: occupation.count
      }))
    : data.map(occupation => ({
        value: occupation.occupation,
        label: occupation.occupation,
        count: occupation.count
      }));

  const filters = [
    {
      key: 'occupation',
      label: 'Ocupação',
      placeholder: 'Digite para buscar uma ocupação...',
      options: occupationOptions,
      disabled: loadingOccupations,
      useSearch: true // Usar campo de busca ao invés de select
    }
  ];
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="bg-white rounded-lg border border-[#090725]/10 p-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="px-4 py-3 border-b border-gray-100 last:border-b-0 md:odd:border-r md:odd:border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <Briefcase size={16} className="text-[#090725]" />
          </div>
          Ocupações
        </h2>
        <div className="bg-white rounded-lg border border-[#090725]/10 p-4">
          <div className="text-center text-gray-500 py-6">
            Nenhuma ocupação registrada
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#090725]/10">
          <Briefcase size={16} className="text-[#090725]" />
        </div>
        Ocupações
      </h2>
      
      <div className="bg-white rounded-lg border border-[#090725]/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users size={14} className="text-gray-500" />
              Distribuição por Profissão
            </h3>
            {/* Botão para visualizar membros */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Primeira coluna: posições 1-5 */}
          <div className="space-y-0">
            {data.slice(0, 5).map((occupation, index) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 md:border-r md:border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-[#090725]/10 text-[#090725] rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {occupation.occupation}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-base font-semibold text-[#090725]">
                      {occupation.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      {occupation.count === 1 ? 'membro' : 'membros'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Segunda coluna: posições 6-10 */}
          <div className="space-y-0">
            {data.slice(5, 10).map((occupation, index) => (
              <div
                key={index + 5}
                className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-[#090725]/10 text-[#090725] rounded-full text-xs font-medium">
                      {index + 6}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {occupation.occupation}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-base font-semibold text-[#090725]">
                      {occupation.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      {occupation.count === 1 ? 'membro' : 'membros'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {data.length > 10 && (
          <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500">
            Mostrando as 10 ocupações mais comuns
          </div>
        )}
      </div>

      {/* Modal de Membros por Ocupação */}
      <MemberModalWithSelect
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Membros por Ocupação"
        icon={<Briefcase size={20} className="text-[#090725]" />}
        filters={filters}
        selectedValues={selectedValues}
        onFilterChange={handleFilterChange}
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
      />
    </div>
  );
}
