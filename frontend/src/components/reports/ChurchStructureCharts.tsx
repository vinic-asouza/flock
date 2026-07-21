'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChurchStructure } from '@/types';
import { BarChart } from '@/components/reports/charts/BarChart';
import { Building, Settings } from 'lucide-react';

interface ChurchStructureChartsProps {
  data: ChurchStructure;
  loading?: boolean;
}

interface ChartDataItem {
  label: string;
  value: number;
  id: string | null;
  color: string;
}

export function ChurchStructureCharts({ data, loading = false }: ChurchStructureChartsProps) {
  const router = useRouter();

  const congregationsData = useMemo((): ChartDataItem[] => {
    const regularCongregations: ChartDataItem[] = Object.entries(data.congregations)
      .filter(([label, congregationData]) => label !== 'Sem congregação' && congregationData.id)
      .map(([label, congregationData]) => ({
        label,
        value: congregationData.count,
        id: congregationData.id,
        color: getCongregationColor(),
      }))
      .sort((a, b) => b.value - a.value);

    const noCongregationData = data.congregations['Sem congregação'];
    const noCongregationItem: ChartDataItem | null = noCongregationData
      ? {
          label: 'Sem congregação',
          value: noCongregationData.count,
          id: null,
          color: getCongregationColor(),
        }
      : null;

    const totalValue = Object.values(data.congregations).reduce((sum, item) => sum + item.count, 0);
    const totalItem: ChartDataItem = {
      label: 'Total',
      value: totalValue,
      id: null,
      color: getCongregationColor(),
    };

    const result: ChartDataItem[] = [];
    if (noCongregationItem) {
      result.push(noCongregationItem);
    }
    result.push(...regularCongregations);
    result.push(totalItem);

    return result;
  }, [data.congregations]);

  const handleManageCongregations = () => {
    router.push('/congregations');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <Building size={16} className="text-[#090725]" />
          </div>
          Estrutura da Igreja
        </h2>
        <button
          onClick={handleManageCongregations}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings size={14} />
          Gerenciar Congregações
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribuição por Congregações
          </h3>
          <BarChart data={congregationsData} orientation="horizontal" maxBars={10} showPercentage={true} />
        </div>
      </div>
    </div>
  );
}

function getCongregationColor(): string {
  return '#090725';
}
