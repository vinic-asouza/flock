'use client';

import { useState, useMemo } from 'react';
import { MapPin, Eye } from 'lucide-react';
import { BarChart } from '@/components/reports/charts/BarChart';
import { MemberModalWithSelect } from './MemberModalWithSelect';
import { useGeographyData } from '@/hooks/useGeographyData';
import { getStateName } from '@/utils';

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

  // Usar hook personalizado para gerenciar dados geográficos
  const {
    states: statesOptions,
    filteredCities: citiesOptions,
    selectedState,
    selectedCity,
    setSelectedState,
    setSelectedCity
  } = useGeographyData(cities, states);

  const selectedValues = {
    state: selectedState,
    city: selectedCity
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'state') {
      setSelectedState(value);
      // O hook já limpa a cidade automaticamente
    } else if (key === 'city') {
      setSelectedCity(value);
    }
  };

  const filters = [
    {
      key: 'state',
      label: 'Estado',
      placeholder: 'Selecione um estado',
      options: statesOptions.map(state => ({
        value: state.code,
        label: state.name,
        count: state.count
      })),
      disabled: false
    },
    {
      key: 'city',
      label: `Cidade ${selectedState ? `(${getStateName(selectedState)})` : ''}`,
      placeholder: selectedState ? "Selecione uma cidade" : "Primeiro selecione um estado",
      options: citiesOptions.map(city => ({
        value: city.name,
        label: city.name,
        count: city.count
      })),
      disabled: !selectedState
    }
  ];
  // Converter dados de cidades para formato do gráfico
  const citiesData = useMemo(() => {
    const regularCities = Object.entries(cities)
      .map(([label, value]) => ({
        label,
        value,
        color: getCityColor(),
      }))
      .sort((a, b) => b.value - a.value);

    // Calcular total
    const totalValue = Object.values(cities).reduce((sum, value) => sum + value, 0);
    const totalItem = {
      label: 'Total',
      value: totalValue,
      color: getCityColor(),
    };

    // Combinar: cidades primeiro, Total por último
    return [...regularCities, totalItem];
  }, [cities]);

  // Converter dados de estados para formato do gráfico
  const statesData = useMemo(() => {
    const regularStates = Object.entries(states)
      .map(([label, value]) => ({
        label,
        value,
        color: getStateColor(),
      }))
      .sort((a, b) => b.value - a.value);

    // Calcular total
    const totalValue = Object.values(states).reduce((sum, value) => sum + value, 0);
    const totalItem = {
      label: 'Total',
      value: totalValue,
      color: getStateColor(),
    };

    // Combinar: Total primeiro, depois estados
    return [totalItem, ...regularStates];
  }, [states]);

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
      <MemberModalWithSelect
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Membros por Localização"
        icon={<MapPin size={20} className="text-[#090725]" />}
        filters={filters}
        selectedValues={selectedValues}
        onFilterChange={handleFilterChange}
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
      />
    </div>
  );
}

// Funções auxiliares para cores
function getCityColor(): string {
  // Todas as cidades usam a cor primária
  return '#090725';
}

function getStateColor(): string {
  // Todos os estados usam a cor primária
  return '#090725';
}
