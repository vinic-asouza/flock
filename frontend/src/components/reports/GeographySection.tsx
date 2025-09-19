'use client';

import { useState } from 'react';
import { MapPin, Users, Eye } from 'lucide-react';
import { BarChart } from '@/components/reports/charts/BarChart';
import { GeographyModal } from '@/components/reports/GeographyModal';

interface GeographySectionProps {
  cities: Record<string, number>;
  states: Record<string, number>;
  loading?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
}

export function GeographySection({ 
  cities, 
  states, 
  loading = false, 
  viewMode = 'all', 
  selectedCongregationId 
}: GeographySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Converter dados de cidades para formato do gráfico
  const citiesData = Object.entries(cities)
    .map(([label, value]) => ({
      label,
      value,
      color: getCityColor(label),
    }))
    .sort((a, b) => b.value - a.value);

  // Converter dados de estados para formato do gráfico
  const statesData = Object.entries(states)
    .map(([label, value]) => ({
      label,
      value,
      color: getStateColor(label),
    }))
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
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
          <MapPin size={16} className="text-[#090725]" />
        </div>
        Distribuição Geográfica
      </h2>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cidades */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              Cidades
            </h3>
            <BarChart data={citiesData} orientation="horizontal" />
          </div>

          {/* Estados */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Estados
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
            <BarChart data={statesData} orientation="horizontal" />
          </div>
        </div>
      </div>

      {/* Modal de Membros por Localização */}
      <GeographyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Membros por Localização"
        cities={cities}
        states={states}
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
      />
    </div>
  );
}

// Funções auxiliares para cores
function getCityColor(city: string): string {
  // Todas as cidades usam a cor primária
  return '#090725';
}

function getStateColor(state: string): string {
  // Todos os estados usam a cor primária
  return '#090725';
}
