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
              <div className="text-2xl font-bold text-gray-900">212</div>
              <div className="text-xs text-gray-500">Membros Ativos</div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-[#0d0a3a] rounded-full" style={{ width: '96%' }} />
          </div>
          <div className="text-xs text-gray-400 mt-2">96% do total</div>
        </div>

        {/* Card 2 - Gráfico de Barras */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-gray-700">Crescimento</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-24">
            {[40, 60, 45, 80, 70, 90, 85].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-primary to-[#0d0a3a] rounded-t transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
                <div className="text-xs text-gray-400 mt-1">{['J', 'F', 'M', 'A', 'M', 'J', 'J'][i]}</div>
              </div>
            ))}
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
                {/* Segmento 1 - 48% */}
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
                {/* Segmento 2 - 52% */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#0d0a3a"
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
              <span className="text-xs text-gray-600">48%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0d0a3a]" />
              <span className="text-xs text-gray-600">52%</span>
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
                <span className="text-sm text-gray-700">Novos</span>
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

