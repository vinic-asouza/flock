'use client';

import { useState, useMemo } from 'react';
import { Timeline } from '@/types';
import { LineChart } from '@/components/reports/charts/LineChart';
import { Select } from '@/components/ui/Select';
import { Calendar, Droplets, UserPlus, TrendingUp } from 'lucide-react';

interface TimelineChartsProps {
  data: Timeline;
  loading?: boolean;
}

export function TimelineCharts({ data, loading = false }: TimelineChartsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Obter anos disponíveis
  const availableYears = useMemo(() => {
    const years = Object.keys(data.baptismsByYear)
      .concat(Object.keys(data.admissionsByYear))
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => parseInt(b) - parseInt(a)); // Mais recente primeiro
    
    return years.map(year => ({ value: year, label: year }));
  }, [data]);

  // Obter meses disponíveis
  const availableMonths = useMemo(() => {
    const months = [
      { value: '01', label: 'Janeiro' },
      { value: '02', label: 'Fevereiro' },
      { value: '03', label: 'Março' },
      { value: '04', label: 'Abril' },
      { value: '05', label: 'Maio' },
      { value: '06', label: 'Junho' },
      { value: '07', label: 'Julho' },
      { value: '08', label: 'Agosto' },
      { value: '09', label: 'Setembro' },
      { value: '10', label: 'Outubro' },
      { value: '11', label: 'Novembro' },
      { value: '12', label: 'Dezembro' },
    ];
    return months;
  }, []);

  // Definir ano padrão (mais recente)
  useMemo(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0].value);
    }
  }, [availableYears, selectedYear]);

  // Definir mês padrão (janeiro)
  useMemo(() => {
    if (!selectedMonth) {
      setSelectedMonth('01');
    }
  }, [selectedMonth]);

  // Gerar dados mensais para o ano selecionado
  const monthlyData = useMemo(() => {
    if (!selectedYear) return [];

    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    return months.map((month, index) => {
      const monthKey = String(index + 1).padStart(2, '0');
      const yearMonthKey = `${selectedYear}-${monthKey}`;
      
      return {
        year: month,
        baptisms: data.baptismsByMonth[yearMonthKey] || 0,
        admissions: data.admissionsByMonth[yearMonthKey] || 0,
      };
    });
  }, [selectedYear, data]);

  // Calcular totais anuais (soma de todos os meses)
  const yearlyTotals = useMemo(() => {
    if (!monthlyData.length) return { baptisms: 0, admissions: 0 };
    
    return monthlyData.reduce(
      (totals, month) => ({
        baptisms: totals.baptisms + month.baptisms,
        admissions: totals.admissions + month.admissions,
      }),
      { baptisms: 0, admissions: 0 }
    );
  }, [monthlyData]);

  // Calcular totais do mês selecionado
  const monthlyTotals = useMemo(() => {
    if (!selectedMonth || !monthlyData.length) return { baptisms: 0, admissions: 0 };
    
    const monthIndex = parseInt(selectedMonth) - 1;
    const monthData = monthlyData[monthIndex];
    
    if (!monthData) return { baptisms: 0, admissions: 0 };
    
    return {
      baptisms: monthData.baptisms,
      admissions: monthData.admissions,
    };
  }, [selectedMonth, monthlyData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[#090725]/10">
          <TrendingUp size={16} className="text-[#090725]" />
        </div>
        Batismos e Admissões
      </h2>
      
      {/* Cards Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card Anual */}
        <div className="bg-white rounded-lg border border-[#090725]/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-[#090725]/10">
              <Calendar size={16} className="text-[#090725]" />
            </div>
            <h3 className="text-base font-medium text-gray-900">Dados Anuais</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 flex items-center">
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                options={availableYears}
                placeholder="Selecione o ano"
                label=""
              />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Droplets size={14} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Batismos</div>
                  <div className="text-xl font-bold text-[#090725]">
                    {yearlyTotals.baptisms}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-50">
                  <UserPlus size={14} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Admissões</div>
                  <div className="text-xl font-bold text-[#090725]">
                    {yearlyTotals.admissions}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Mensal */}
        <div className="bg-white rounded-lg border border-[#090725]/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-[#090725]/10">
              <Calendar size={16} className="text-[#090725]" />
            </div>
            <h3 className="text-base font-medium text-gray-900">Dados Mensais</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 flex items-center">
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={availableMonths}
                placeholder="Selecione o mês"
                label=""
              />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Droplets size={14} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Batismos</div>
                  <div className="text-xl font-bold text-[#090725]">
                    {monthlyTotals.baptisms}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-50">
                  <UserPlus size={14} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Admissões</div>
                  <div className="text-xl font-bold text-[#090725]">
                    {monthlyTotals.admissions}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráfico */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <TrendingUp size={16} className="text-[#090725]" />
          </div>
          Gráfico de Evolução Mensal
        </h3>
        <LineChart data={monthlyData} />
      </div>
    </div>
  );
}
