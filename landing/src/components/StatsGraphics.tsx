'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, BarChart3, PieChart, FileText, Activity } from 'lucide-react';

export function StatsGraphics() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] lg:min-h-[600px] flex items-center justify-center">
      <div className={`grid grid-cols-2 gap-4 lg:gap-6 w-full max-w-2xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Card 1 - Estatísticas de Membros */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">350</div>
              <div className="text-xs text-gray-500">Membros Ativos</div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '87%' }} />
          </div>
          <div className="text-xs text-gray-400 mt-2">87% do total</div>
        </div>

        {/* Card 2 - Gráfico de Linha */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Crescimento</span>
          </div>
          <div className="relative h-32">
            <svg className="w-full h-full" viewBox="0 0 280 120" preserveAspectRatio="none">
              {/* Área de preenchimento com gradiente */}
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#090725" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#090725" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Valores dos pontos (65, 82, 58, 95, 73, 88, 76, 91) */}
              {(() => {
                const values = [65, 82, 58, 95, 73, 88, 76, 91];
                const maxValue = 100;
                const minValue = 0;
                const range = maxValue - minValue;
                const width = 280;
                const height = 120;
                const padding = 10;
                const chartWidth = width - padding * 2;
                const chartHeight = height - padding * 2;
                
                // Converter valores para coordenadas Y (invertido porque SVG Y aumenta para baixo)
                const points = values.map((value, i) => {
                  const x = padding + (i / (values.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
                  return { x, y, value };
                });
                
                // Criar path para a linha
                const linePath = points.map((p, i) => 
                  `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                ).join(' ');
                
                // Criar path para área preenchida
                const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
                
                return (
                  <>
                    {/* Área preenchida */}
                    <path
                      d={areaPath}
                      fill="url(#lineGradient)"
                      className="transition-all duration-500"
                    />
                    {/* Linha */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#090725"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />
                    {/* Pontos */}
                    {points.map((point, i) => (
                      <g key={i}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#090725"
                          stroke="white"
                          strokeWidth="2"
                          className="transition-all duration-300 hover:r-5"
                        />
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
            {/* Labels dos meses */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
              {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A'].map((month, i) => (
                <span key={i} className="text-xs text-gray-400">{month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3 - Gráfico de Pizza */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Distribuição</span>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                {/* Segmento 1 - 48% Masculino */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#090725"
                  strokeWidth="20"
                  strokeDasharray={`${48 * 2.513} ${251.3}`}
                  className="transition-all duration-500"
                />
                {/* Segmento 2 - 52% Feminino */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#6b6b8f"
                  strokeWidth="20"
                  strokeDasharray={`${52 * 2.513} ${251.3}`}
                  strokeDashoffset={-120.6}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">100%</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#090725]" />
              <span className="text-xs text-gray-600">48% <span className="text-gray-500">Masculino</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#6b6b8f]" />
              <span className="text-xs text-gray-600">52% <span className="text-gray-500">Feminino</span></span>
            </div>
          </div>
        </div>

        {/* Card 4 - Relatórios e Atividades */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Relatórios</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-700">Batismos</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">12</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-700">Admissões</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">8</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-700">Integração</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Elementos decorativos flutuantes */}
      <div className="absolute top-10 right-10 w-16 h-16 bg-primary/10 rounded-full blur-xl opacity-50 animate-pulse" />
      <div className="absolute bottom-10 left-10 w-20 h-20 bg-[#0d0a3a]/10 rounded-full blur-xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

