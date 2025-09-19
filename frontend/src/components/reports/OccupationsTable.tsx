'use client';

import { useState } from 'react';
import { Briefcase, Users, Eye } from 'lucide-react';
import { TopOccupation } from '@/types';
import { MemberModalWithSelect } from './MemberModalWithSelect';

interface OccupationsTableProps {
  data: TopOccupation[];
  loading?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
}

export function OccupationsTable({ data, loading = false, viewMode = 'all', selectedCongregationId }: OccupationsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOccupation, setSelectedOccupation] = useState('');

  const selectedValues = {
    occupation: selectedOccupation
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'occupation') {
      setSelectedOccupation(value);
    }
  };

  const filters = [
    {
      key: 'occupation',
      label: 'Ocupação',
      placeholder: 'Selecione uma ocupação',
      options: data.map(occupation => ({
        value: occupation.occupation,
        label: occupation.occupation,
        count: occupation.count
      })),
      disabled: false
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
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-semibold text-[#090725]">
                        {occupation.count}
                      </div>
                      <div className="text-xs text-gray-500">
                        {occupation.count === 1 ? 'membro' : 'membros'}
                      </div>
                    </div>
                    
                    {/* Barra de progresso visual */}
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#090725] h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${(occupation.count / data[0].count) * 100}%`,
                        }}
                      />
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
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-semibold text-[#090725]">
                        {occupation.count}
                      </div>
                      <div className="text-xs text-gray-500">
                        {occupation.count === 1 ? 'membro' : 'membros'}
                      </div>
                    </div>
                    
                    {/* Barra de progresso visual */}
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#090725] h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${(occupation.count / data[0].count) * 100}%`,
                        }}
                      />
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
