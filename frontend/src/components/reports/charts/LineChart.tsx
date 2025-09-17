'use client';

import { LineChartData } from '@/types';

interface LineChartProps {
  data: LineChartData[];
  height?: number;
}

export function LineChart({ data, height = 300 }: LineChartProps) {
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
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + (ratio * chartHeight);
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          );
        })}

        {/* Linha de batismos */}
        <polyline
          points={baptismsPoints}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Linha de admissões */}
        <polyline
          points={admissionsPoints}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos de batismos */}
        {data.map((d, index) => (
          <circle
            key={`baptisms-${index}`}
            cx={getX(index) + padding}
            cy={getY(d.baptisms) + padding}
            r="4"
            fill="#3B82F6"
            className="hover:r-6 transition-all cursor-pointer"
          />
        ))}

        {/* Pontos de admissões */}
        {data.map((d, index) => (
          <circle
            key={`admissions-${index}`}
            cx={getX(index) + padding}
            cy={getY(d.admissions) + padding}
            r="4"
            fill="#10B981"
            className="hover:r-6 transition-all cursor-pointer"
          />
        ))}

        {/* Eixo Y */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Eixo X */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Labels do eixo Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = Math.round(ratio * maxValue);
          const y = padding + (ratio * chartHeight);
          return (
            <text
              key={ratio}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {value}
            </text>
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
