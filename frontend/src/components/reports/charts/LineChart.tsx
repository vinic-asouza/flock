'use client';

import { useState } from 'react';
import { LineChartData } from '@/types';

interface LineChartProps {
  data: LineChartData[];
  height?: number;
}

export function LineChart({ data, height = 300 }: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ type: 'baptisms' | 'admissions', index: number, x: number, y: number } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum dado disponível
      </div>
    );
  }

  const width = 800;
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Encontrar valores máximos para escalar o gráfico
  const maxBaptisms = Math.max(...data.map(d => d.baptisms));
  const maxAdmissions = Math.max(...data.map(d => d.admissions));
  const maxValue = Math.max(maxBaptisms, maxAdmissions);

  // Função para converter valor em coordenada Y
  const getY = (value: number) => {
    return chartHeight - (value / maxValue) * chartHeight;
  };

  // Função para converter índice em coordenada X
  const getX = (index: number) => {
    return (index / (data.length - 1)) * chartWidth;
  };

  // Gerar pontos para a linha de batismos
  const baptismsPoints = data
    .map((d, index) => `${getX(index) + padding},${getY(d.baptisms) + padding}`)
    .join(' ');

  // Gerar pontos para a linha de admissões
  const admissionsPoints = data
    .map((d, index) => `${getX(index) + padding},${getY(d.admissions) + padding}`)
    .join(' ');

  return (
    <div className="w-full overflow-x-auto relative">
      <svg width={width} height={height} className="mx-auto">
        {/* Linha de batismos */}
        <polyline
          points={baptismsPoints}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Linha de admissões */}
        <polyline
          points={admissionsPoints}
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos de batismos */}
        {data.map((d, index) => {
          const x = getX(index) + padding;
          const y = getY(d.baptisms) + padding;
          return (
            <circle
              key={`baptisms-${index}`}
              cx={x}
              cy={y}
              r="5"
              fill="#3B82F6"
              className="hover:r-7 transition-all cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ type: 'baptisms', index, x, y })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {/* Pontos de admissões */}
        {data.map((d, index) => {
          const x = getX(index) + padding;
          const y = getY(d.admissions) + padding;
          return (
            <circle
              key={`admissions-${index}`}
              cx={x}
              cy={y}
              r="5"
              fill="#10B981"
              className="hover:r-7 transition-all cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ type: 'admissions', index, x, y })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {/* Labels do eixo X */}
        {data.map((d, index) => (
          <text
            key={index}
            x={getX(index) + padding}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {d.year}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
          style={{
            left: `${hoveredPoint.x + 10}px`,
            top: `${hoveredPoint.y - 10}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {data[hoveredPoint.index].year}: {data[hoveredPoint.index][hoveredPoint.type]}
        </div>
      )}

      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className="text-sm text-gray-700">Batismos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500"></div>
          <span className="text-sm text-gray-700">Admissões</span>
        </div>
      </div>
    </div>
  );
}
