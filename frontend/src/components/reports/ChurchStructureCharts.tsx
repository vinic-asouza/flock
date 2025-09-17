'use client';

import { ChurchStructure } from '@/types';
import { BarChart } from '@/components/reports/charts/BarChart';
import { Building } from 'lucide-react';

interface ChurchStructureChartsProps {
  data: ChurchStructure;
  loading?: boolean;
  hideCongregations?: boolean;
}

export function ChurchStructureCharts({ data, loading = false, hideCongregations = false }: ChurchStructureChartsProps) {
  // Converter dados de cargos para formato do gráfico
  const rolesData = Object.entries(data.roles)
    .filter(([label]) => label !== 'Sem cargo') // Excluir "Sem cargo"
    .map(([label, value]) => ({
      label,
      value,
      color: getRoleColor(label),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 cargos

  // Converter dados de congregações para formato do gráfico
  const congregationsData = Object.entries(data.congregations)
    .map(([label, value]) => ({
      label,
      value,
      color: getCongregationColor(label),
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribuição por Cargos
          </h3>
          <BarChart data={rolesData} orientation="horizontal" maxBars={8} />
        </div>

        {/* Gráfico de Congregações - apenas se não estiver oculto */}
        {!hideCongregations && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Distribuição por Congregações
            </h3>
            <BarChart data={congregationsData} orientation="horizontal" maxBars={6} />
          </div>
        )}
      </div>
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

function getCongregationColor(congregation: string): string {
  // Todas as congregações usam a cor primária
  return '#090725';
}
