'use client';

import { useState, useMemo } from 'react';
import { Demographics } from '@/types';
import { PieChart } from '@/components/reports/charts/PieChart';
import { BarChart } from '@/components/reports/charts/BarChart';
import { MembersModal } from './MembersModal';
import { Users, Heart, Calendar, Eye } from 'lucide-react';

interface DemographicsChartsProps {
  data: Demographics;
  loading?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
}

export function DemographicsCharts({ data, loading = false, viewMode = 'all', selectedCongregationId }: DemographicsChartsProps) {
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isMaritalStatusModalOpen, setIsMaritalStatusModalOpen] = useState(false);
  const [isAgeRangeModalOpen, setIsAgeRangeModalOpen] = useState(false);

  // Converter dados de gênero para formato do gráfico
  const genderData = Object.entries(data.gender).map(([label, value]) => ({
    label,
    value: value as number,
    color: label === 'Masculino' ? '#60A5FA' : label === 'Feminino' ? '#F87171' : '#34D399',
  }));

  // Converter dados de estado civil para formato do gráfico
  const maritalStatusData = Object.entries(data.maritalStatus).map(([label, value]) => ({
    label,
    value: value as number,
    color: getMaritalStatusColor(label),
  }));

  // Converter dados de faixa etária para formato do gráfico
  const ageRangeData = useMemo(() => {
    const regularAgeRanges = Object.entries(data.ageRanges).map(([range, value]) => ({
      label: getAgeRangeLabel(range),
      value: value as number, // Para o gráfico, value é o número
      count: value as number,
      color: getAgeRangeColor(range),
      rangeKey: range, // Adicionar o range original para uso no modal
    }));

    // Calcular total
    const totalValue = Object.values(data.ageRanges).reduce((sum, value) => sum + (value as number), 0);
    const totalItem = {
      label: 'Total',
      value: totalValue,
      count: totalValue,
      color: getAgeRangeColor('Total'),
      rangeKey: null, // Total não aparece no modal
    };

    // Combinar: faixas etárias primeiro, Total por último
    return [...regularAgeRanges, totalItem];
  }, [data.ageRanges]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-3 bg-gray-200 rounded w-28 mb-3"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#090725]/10">
          <Users size={16} className="text-[#090725]" />
        </div>
        Demografia
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Gênero */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              Gênero
            </h3>
            {/* Botão para visualizar membros */}
            <button
              onClick={() => setIsGenderModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>
          <PieChart data={genderData} />
        </div>

        {/* Gráfico de Estado Civil */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              Estado Civil
            </h3>
            {/* Botão para visualizar membros */}
            <button
              onClick={() => setIsMaritalStatusModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>
          <PieChart data={maritalStatusData} />
        </div>

        {/* Gráfico de Faixa Etária */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              Faixa Etária
            </h3>
            {/* Botão para visualizar membros */}
            <button
              onClick={() => setIsAgeRangeModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={14} />
              Visualizar
            </button>
          </div>
          <BarChart data={ageRangeData} orientation="horizontal" showPercentage={true} />
        </div>
      </div>

      {/* Modal de Membros por Gênero */}
      <MembersModal
        isOpen={isGenderModalOpen}
        onClose={() => setIsGenderModalOpen(false)}
        title="Membros por Gênero"
        icon={<Users size={20} className="text-[#090725]" />}
        tabs={genderData.map(g => ({ ...g, value: g.label, count: g.value }))}
        filterKey="gender"
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
        sideLayout={true}
      />

      {/* Modal de Membros por Estado Civil */}
      <MembersModal
        isOpen={isMaritalStatusModalOpen}
        onClose={() => setIsMaritalStatusModalOpen(false)}
        title="Membros por Estado Civil"
        icon={<Heart size={20} className="text-[#090725]" />}
        tabs={maritalStatusData.map(m => ({ ...m, value: m.label, count: m.value }))}
        filterKey="marital_status"
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
        sideLayout={true}
      />

      {/* Modal de Membros por Faixa Etária */}
      <MembersModal
        isOpen={isAgeRangeModalOpen}
        onClose={() => setIsAgeRangeModalOpen(false)}
        title="Membros por Faixa Etária"
        icon={<Calendar size={20} className="text-[#090725]" />}
        tabs={ageRangeData
          .filter(a => a.rangeKey !== null) // Excluir Total (apenas para visualização no gráfico)
          .map(a => ({ ...a, value: a.rangeKey! }))}
        filterKey="age_range" // Não usado quando customParamsBuilder está presente
        viewMode={viewMode}
        selectedCongregationId={selectedCongregationId}
        sideLayout={true}
        customParamsBuilder={(tabValue) => {
          const ageBounds = getAgeRangeBounds(tabValue);
          return {
            age_from: ageBounds.age_from,
            age_to: ageBounds.age_to,
            active: true,
          };
        }}
      />
    </div>
  );
}

// Funções auxiliares para cores
function getMaritalStatusColor(status: string): string {
  // Normalizar o status para comparação
  const normalizedStatus = status.toLowerCase().trim();
  
  const colors: Record<string, string> = {
    'solteiro(a)': '#60A5FA',      // Azul pastel mais intenso
    'solteiro': '#60A5FA',
    'solteira': '#60A5FA',
    'casado(a)': '#F87171',        // Vermelho pastel mais intenso
    'casado': '#F87171',
    'casada': '#F87171',
    'divorciado(a)': '#34D399',    // Verde pastel mais intenso
    'divorciado': '#34D399',
    'divorciada': '#34D399',
    'viúvo(a)': '#FBBF24',         // Amarelo pastel mais intenso
    'viúvo': '#FBBF24',
    'viúva': '#FBBF24',
    'união estável': '#A78BFA',    // Roxo pastel mais intenso
    'uniao estavel': '#A78BFA',
    'não informado': '#9CA3AF',    // Cinza pastel mais intenso
    'nao informado': '#9CA3AF',
    'sem informação': '#9CA3AF',
    'sem informacao': '#9CA3AF',
  };
  
  return colors[normalizedStatus] || '#D1D5DB';
}

function getAgeRangeColor(range: string): string {
  const colors: Record<string, string> = {
    '0-12': '#60A5FA',      // Crianças - Azul pastel mais intenso
    '13-17': '#F87171',     // Adolescentes - Vermelho pastel mais intenso
    '18-25': '#34D399',     // Jovens - Verde pastel mais intenso
    '26-35': '#FBBF24',     // Jovens Adultos - Amarelo pastel mais intenso
    '36-50': '#A78BFA',     // Adultos - Roxo pastel mais intenso
    '51-65': '#22D3EE',     // Meia-idade - Ciano pastel mais intenso
    '65+': '#F87171',       // Idosos - Vermelho pastel mais intenso
    'Total': '#939393',     // Total - Cor primária
  };
  return colors[range] || '#9CA3AF';
}

// Função para obter nomenclatura da faixa etária
function getAgeRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    '0-12': 'Crianças (0-12 anos)',
    '13-17': 'Adolescentes (13-17 anos)',
    '18-25': 'Jovens (18-25 anos)',
    '26-35': 'Jovens Adultos (26-35 anos)',
    '36-50': 'Adultos (36-50 anos)',
    '51-65': 'Meia-idade (51-65 anos)',
    '65+': 'Idosos (65+ anos)',
  };
  return labels[range] || range;
}

/** Alinhado aos buckets de getMemberReports (calculateAge). */
function getAgeRangeBounds(ageRange: string): { age_from: number; age_to: number } {
  const ageRanges: Record<string, { age_from: number; age_to: number }> = {
    '0-12': { age_from: 0, age_to: 12 },
    '13-17': { age_from: 13, age_to: 17 },
    '18-25': { age_from: 18, age_to: 25 },
    '26-35': { age_from: 26, age_to: 35 },
    '36-50': { age_from: 36, age_to: 50 },
    '51-65': { age_from: 51, age_to: 65 },
    '65+': { age_from: 66, age_to: 150 },
  };

  return ageRanges[ageRange] ?? { age_from: 0, age_to: 150 };
}
