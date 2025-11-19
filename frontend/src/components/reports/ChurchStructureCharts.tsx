'use client';

import { useState } from 'react';
import { ChurchStructure } from '@/types';
import { BarChart } from '@/components/reports/charts/BarChart';
import { MembersModal } from './MembersModal';
import { Building, Eye } from 'lucide-react';

interface ChurchStructureChartsProps {
  data: ChurchStructure;
  loading?: boolean;
  hideCongregations?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
}

export function ChurchStructureCharts({ data, loading = false, hideCongregations = false, viewMode = 'all', selectedCongregationId }: ChurchStructureChartsProps) {
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isCongregationsModalOpen, setIsCongregationsModalOpen] = useState(false);
  // Converter dados de cargos para formato do gráfico
  const rolesData = Object.entries(data.roles)
    .filter(([label, roleData]) => label !== 'Sem cargo' && roleData.id) // Excluir "Sem cargo" e cargos sem ID
    .map(([label, roleData]) => ({
      label,
      value: roleData.count,
      id: roleData.id,
      color: getRoleColor(label),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 cargos


  // Converter dados de congregações para formato do gráfico
  const congregationsData = Object.entries(data.congregations)
    .filter(([label, congregationData]) => label !== 'Sem congregação' && congregationData.id) // Excluir "Sem congregação" e congregações sem ID
    .map(([label, congregationData]) => ({
      label,
      value: congregationData.count,
      id: congregationData.id,
      color: getCongregationColor(),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 congregações


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className={`grid grid-cols-1 ${hideCongregations ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
          {Array.from({ length: hideCongregations ? 1 : 2 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#090725]/10">
          <Building size={16} className="text-[#090725]" />
        </div>
        Estrutura da Igreja
      </h2>
      
      <div className={`grid grid-cols-1 ${hideCongregations ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
        {/* Gráfico de Cargos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Distribuição por Cargos
            </h3>
            {/* Botão para visualizar membros */}
            <button
              onClick={() => setIsRolesModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>
          <BarChart data={rolesData} orientation="horizontal" maxBars={8} />
        </div>

        {/* Gráfico de Congregações - apenas se não estiver oculto */}
        {!hideCongregations && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Distribuição por Congregações
              </h3>
              {/* Botão para visualizar membros */}
              <button
                onClick={() => setIsCongregationsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Eye size={14} />
                Visualizar
              </button>
            </div>
            <BarChart data={congregationsData} orientation="horizontal" maxBars={6} />
          </div>
        )}
      </div>

      {/* Modal de Membros por Cargos */}
      <MembersModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        title="Membros por Cargos"
        icon={<Building size={20} className="text-[#090725]" />}
        tabs={rolesData.map(r => ({ ...r, value: r.id!, count: r.value }))}
        filterKey="role_id"
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
        sideLayout={true}
      />

      {/* Modal de Membros por Congregações */}
      {!hideCongregations && (
        <MembersModal
          isOpen={isCongregationsModalOpen}
          onClose={() => setIsCongregationsModalOpen(false)}
          title="Membros por Congregações"
          icon={<Building size={20} className="text-[#090725]" />}
          tabs={congregationsData.map(c => ({ ...c, value: c.id!, count: c.value }))}
          filterKey="congregation_id"
          viewMode={viewMode}
          selectedCongregationId={selectedCongregationId}
          sideLayout={true}
        />
      )}
    </div>
  );
}

// Funções auxiliares para cores
function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    'Pastor(a) titular': '#090725',        // Cor primária
    'Pastor(a) auxiliar': '#090725',       // Cor primária
    'Presbítero(a)': '#090725',            // Cor primária
    'Diácono(isa)': '#090725',             // Cor primária
    'Obreiro(a)': '#090725',               // Cor primária
    'Liderança': '#090725',                // Cor primária
    'Líder de célula/pg': '#090725',       // Cor primária
    'Líder de ministério': '#090725',      // Cor primária
    'Conselho': '#090725',                 // Cor primária
    'Secretário(a)': '#090725',            // Cor primária
    'Administrativo': '#090725',           // Cor primária
  };
  return colors[role] || '#090725';
}

function getCongregationColor(): string {
  // Todas as congregações usam a cor primária
  return '#090725';
}
