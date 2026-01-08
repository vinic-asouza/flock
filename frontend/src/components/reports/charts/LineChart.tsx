'use client';

import { useState, useRef, useEffect } from 'react';
import { LineChartData } from '@/types';

interface LineChartProps {
  data: LineChartData[];
  height?: number;
}

export function LineChart({ data, height = 300 }: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum dado disponível
      </div>
    );
  }

  const minWidth = 800;
  const width = Math.max(containerWidth, minWidth);
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const maxValue = Math.max(...data.map(d => d.total));
  const safeMaxValue = maxValue === 0 ? 1 : maxValue;

  const indexDivisor = data.length > 1 ? data.length - 1 : 1;

  // Função para converter valor em coordenada Y
  const getY = (value: number) => {
    return chartHeight - (value / safeMaxValue) * chartHeight;
  };

  // Função para converter índice em coordenada X
  const getX = (index: number) => {
    return (index / indexDivisor) * chartWidth;
  };

  // Gerar pontos para a linha de total
  const totalPoints = data
    .map((d, index) => `${getX(index) + padding},${getY(d.total) + padding}`)
    .join(' ');

  return (
    <div ref={containerRef} className="w-full relative">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Linha de total */}
        <polyline
          points={totalPoints}
          fill="none"
          stroke="#090725"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos */}
        {data.map((d, index) => {
          const x = getX(index) + padding;
          const y = getY(d.total) + padding;
          return (
            <circle
              key={`total-${index}`}
              cx={x}
              cy={y}
              r="5"
              fill="#090725"
              className="hover:r-7 transition-all cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ index, x, y })}
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
            {d.label}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && containerRef.current && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {data[hoveredPoint.index].label}: {data[hoveredPoint.index].total} membro(s)
        </div>
      )}

      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#090725]"></div>
          <span className="text-sm text-gray-700">Total de Membros (Acumulado)</span>
        </div>
      </div>
    </div>
  );
}
