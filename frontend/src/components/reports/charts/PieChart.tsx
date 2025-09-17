'use client';

import { useState } from 'react';
import { PieChartData } from '@/types';

interface PieChartProps {
  data: PieChartData[];
  size?: number;
}

export function PieChart({ data, size = 200 }: PieChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum dado disponível
      </div>
    );
  }

  // Calcular total para percentuais
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calcular ângulos para cada fatia
  let currentAngle = 0;
  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    currentAngle += angle;

    return {
      ...item,
      percentage: Math.round(percentage * 10) / 10,
      startAngle,
      endAngle,
    };
  });

  // Gerar path para cada fatia
  const createPath = (startAngle: number, endAngle: number, radius: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const radius = (size - 40) / 2;

  const handleMouseEnter = (index: number, event: React.MouseEvent) => {
    setHoveredSlice(index);
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({ 
      x: event.clientX - rect.left, 
      y: event.clientY - rect.top 
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredSlice !== null) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMousePosition({ 
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top 
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredSlice(null);
  };

  return (
    <div className="flex flex-col items-center relative">
      <svg 
        width={size} 
        height={size} 
        className="mb-4"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {slices.map((slice, index) => (
          <path
            key={index}
            d={createPath(slice.startAngle, slice.endAngle, radius)}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity cursor-pointer"
            onMouseEnter={(e) => handleMouseEnter(index, e)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredSlice !== null && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x,
            top: mousePosition.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium">{slices[hoveredSlice].label}</div>
          <div className="text-gray-300">
            {slices[hoveredSlice].value} ({slices[hoveredSlice].percentage}%)
          </div>
        </div>
      )}
      
      {/* Legenda */}
      <div className="space-y-2 w-full">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700">{slice.label}</span>
            </div>
            <div className="text-gray-600">
              {slice.value} ({slice.percentage}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
