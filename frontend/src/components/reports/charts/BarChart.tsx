'use client';

import { BarChartData } from '@/types';

interface BarChartProps {
  data: BarChartData[];
  orientation?: 'horizontal' | 'vertical';
  maxBars?: number;
  showPercentage?: boolean;
}

export function BarChart({ 
  data, 
  orientation = 'vertical', 
  maxBars = 10,
  showPercentage = false
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum dado disponível
      </div>
    );
  }

  // Limitar número de barras e ordenar por valor
  const sortedData = data
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);

  const maxValue = Math.max(...sortedData.map(item => item.value));
  
  // Calcular total real (excluindo itens com label "Total" para cálculo de porcentagem)
  const totalForPercentage = showPercentage 
    ? sortedData
        .filter(item => item.label !== 'Total')
        .reduce((sum, item) => sum + item.value, 0)
    : 0;

  if (orientation === 'horizontal') {
    return (
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 truncate">{item.label}</span>
                <span className="text-gray-600 font-medium">
                  {item.value}
                  {showPercentage && item.label !== 'Total' && totalForPercentage > 0 && (
                    <span className="text-gray-500 ml-1">
                      ({(item.value / totalForPercentage * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Gráfico vertical
  return (
    <div className="flex items-end justify-between h-64 space-x-2">
      {sortedData.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const height = (percentage / 100) * 200; // Altura máxima de 200px
        
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="text-xs text-gray-600 mb-1 text-center">
              {item.value}
            </div>
            <div
              className="w-full rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${height}px`,
                backgroundColor: item.color,
                minHeight: item.value > 0 ? '4px' : '0px',
              }}
            />
            <div className="text-xs text-gray-700 mt-2 text-center transform -rotate-45 origin-left">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
