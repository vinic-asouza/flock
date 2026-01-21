'use client';

import { useState, useMemo } from 'react';
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

interface ChartDataItem {
  label: string;
  value: number;
  id: string | null;
  color: string;
  idForModal?: string | null;
}

export function ChurchStructureCharts({ data, loading = false, hideCongregations = false, viewMode = 'all', selectedCongregationId }: ChurchStructureChartsProps) {
  const [isCongregationsModalOpen, setIsCongregationsModalOpen] = useState(false);


  // Converter dados de congregações para formato do gráfico
  const congregationsData = useMemo((): ChartDataItem[] => {
    // Separar congregações normais e "Sem congregação" (Sede)
    const regularCongregations: ChartDataItem[] = Object.entries(data.congregations)
      .filter(([label, congregationData]) => label !== 'Sem congregação' && congregationData.id)
      .map(([label, congregationData]) => ({
        label,
        value: congregationData.count,
        id: congregationData.id,
        color: getCongregationColor(),
        idForModal: undefined,
      }))
      .sort((a, b) => b.value - a.value);

    // Incluir "Sede" (membros sem congregação)
    const sedeData = data.congregations['Sem congregação'];
    const sedeItem: ChartDataItem | null = sedeData ? {
      label: 'Sede',
      value: sedeData.count,
      id: null,
      idForModal: 'sede', // Valor especial para usar no modal
      color: getCongregationColor(),
    } : null;

    // Calcular total
    const totalValue = Object.values(data.congregations).reduce((sum, item) => sum + item.count, 0);
    const totalItem: ChartDataItem = {
      label: 'Total',
      value: totalValue,
      id: null,
      idForModal: null, // Total não aparece no modal
      color: getCongregationColor(),
    };

    // Combinar: Sede primeiro (se existir), depois congregações, e Total por último
    const result: ChartDataItem[] = [];
    if (sedeItem) {
      result.push(sedeItem);
    }
    result.push(...regularCongregations);
    result.push(totalItem);

    return result;
  }, [data.congregations]);


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
      
      <div className={`grid grid-cols-1 ${hideCongregations ? 'lg:grid-cols-1' : 'lg:grid-cols-1'} gap-6`}>
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
            <BarChart data={congregationsData} orientation="horizontal" maxBars={10} showPercentage={true} />
          </div>
        )}
      </div>

      {/* Modal de Membros por Congregações */}
      {!hideCongregations && (
        <MembersModal
          isOpen={isCongregationsModalOpen}
          onClose={() => setIsCongregationsModalOpen(false)}
          title="Membros por Congregações"
          icon={<Building size={20} className="text-[#090725]" />}
          tabs={congregationsData
            .filter((c): c is ChartDataItem => c.id !== null || c.idForModal === 'sede') // Incluir Sede, excluir Total
            .map(c => ({ 
              ...c, 
              value: c.id || c.idForModal || '', 
              count: c.value 
            }))}
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
function getCongregationColor(): string {
  // Todas as congregações usam a cor primária
  return '#090725';
}
