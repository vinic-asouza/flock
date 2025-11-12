'use client';

import { useState, useMemo, useEffect } from 'react';
import { Timeline, Member } from '@/types';
import { LineChart } from '@/components/reports/charts/LineChart';
import { Select } from '@/components/ui/Select';
import { Droplets, UserPlus, TrendingUp, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TimelineChartsProps {
  data: Timeline;
  loading?: boolean;
  showCongregationColumn?: boolean;
}

export function TimelineCharts({ data, loading = false, showCongregationColumn = true }: TimelineChartsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [membersPage, setMembersPage] = useState(1);

  // Função para calcular idade
  const calcularIdade = (birth: string): number | null => {
    if (!birth) return null;
    const today = new Date();
    const birthDate = new Date(birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Função para obter cor da congregação (agora sempre cinza)
  const getCongregationColor = () => {
    return 'bg-gray-200 text-gray-800';
  };

  // Função para determinar tipo de entrada do membro
  const getMemberEntryType = (member: Member) => {
    const baptismDate = member.baptism_date ? new Date(member.baptism_date) : null;
    const admissionDate = member.admission_date ? new Date(member.admission_date) : null;
    
    // Se não tem nenhuma data, considera admissão
    if (!baptismDate && !admissionDate) return 'admission';
    
    // Se só tem batismo, considera batismo
    if (baptismDate && !admissionDate) return 'baptism';
    
    // Se só tem admissão, considera admissão
    if (!baptismDate && admissionDate) return 'admission';
    
    // Se tem ambas as datas
    if (baptismDate && admissionDate) {
      // Se as datas são iguais, considera batismo
      if (baptismDate.getTime() === admissionDate.getTime()) return 'baptism';
      
      // Se batismo é anterior à admissão, considera admissão
      if (baptismDate < admissionDate) return 'admission';
      
      // Caso contrário, considera batismo
      return 'baptism';
    }
    
    return 'admission';
  };

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
    return [
      { value: 'all', label: 'Todos' },
      ...months,
    ];
  }, []);

  // Definir ano padrão (ano atual)
  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      const currentYear = new Date().getFullYear().toString();
      const yearExists = availableYears.some(year => year.value === currentYear);
      setSelectedYear(yearExists ? currentYear : availableYears[0].value);
    }
  }, [availableYears, selectedYear]);

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

  const selectedTotals = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      return yearlyTotals;
    }

    if (!selectedYear) {
      return { baptisms: 0, admissions: 0 };
    }

    const yearMonthKey = `${selectedYear}-${selectedMonthFilter.padStart(2, '0')}`;

    return {
      baptisms: data.baptismsByMonth[yearMonthKey] || 0,
      admissions: data.admissionsByMonth[yearMonthKey] || 0,
    };
  }, [selectedMonthFilter, yearlyTotals, selectedYear, data]);

  // Obter membros do ano selecionado (paginados)
  const members = useMemo(() => {
    if (!selectedYear) return [];

    if (selectedMonthFilter === 'all') {
      if (!data.membersByYear || !data.membersByYear[selectedYear]) return [];
      return data.membersByYear[selectedYear];
    }

    const yearMonthKey = `${selectedYear}-${selectedMonthFilter.padStart(2, '0')}`;
    return data.membersByMonth?.[yearMonthKey] || [];
  }, [selectedYear, selectedMonthFilter, data]);

  const membersPaginated = useMemo(() => {
    const startIndex = (membersPage - 1) * 5;
    const endIndex = startIndex + 5;
    return members.slice(startIndex, endIndex);
  }, [members, membersPage]);

  const membersTotalPages = useMemo(() => {
    return Math.ceil(members.length / 5);
  }, [members.length]);

  useEffect(() => {
    setMembersPage(1);
  }, [selectedYear, selectedMonthFilter]);

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

      <div className="bg-white rounded-lg border border-[#090725]/10 p-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-32">
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={availableYears}
                  placeholder="Selecione o ano"
                  label=""
                />
              </div>
              <div className="w-32">
                <Select
                  value={selectedMonthFilter}
                  onChange={setSelectedMonthFilter}
                  options={availableMonths}
                  placeholder="Selecione o mês"
                  label=""
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Droplets size={18} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Batismos {selectedMonthFilter === 'all' ? 'no ano' : 'no mês'}
                  </div>
                  <div className="text-xl font-bold text-[#090725]">
                    {selectedTotals.baptisms}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-50">
                  <UserPlus size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Admissões {selectedMonthFilter === 'all' ? 'no ano' : 'no mês'}
                  </div>
                  <div className="text-xl font-bold text-[#090725]">
                    {selectedTotals.admissions}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedYear && members.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Novos Membros ({members.length})
                </h4>

                {membersTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMembersPage(prev => Math.max(1, prev - 1))}
                      disabled={membersPage === 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} className="text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-500 px-2">
                      {membersPage}/{membersTotalPages}
                    </span>
                    <button
                      onClick={() => setMembersPage(prev => Math.min(membersTotalPages, prev + 1))}
                      disabled={membersPage === membersTotalPages}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} className="text-gray-600" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {membersPaginated.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getMemberEntryType(member) === 'baptism' ? (
                          <Droplets size={12} className="text-blue-600 flex-shrink-0" />
                        ) : (
                          <UserPlus size={12} className="text-green-600 flex-shrink-0" />
                        )}
                        <div className="text-[13px] font-medium text-gray-900 truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {calcularIdade(member.birth)} anos
                        </div>
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${getCongregationColor()}`}>
                          {member.congregation ? member.congregation.name : 'Sede'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <Link 
                  href="/members"
                  className="inline-flex items-center gap-1 text-xs text-[#090725] hover:text-[#090725]/80 font-medium"
                >
                  <ExternalLink size={12} />
                  Gerenciar Membros
                </Link>
              </div>
            </div>
          )}

          {selectedYear && members.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              Nenhum membro encontrado para o filtro selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          Gráfico de Evolução Mensal
        </h3>
        <LineChart data={monthlyData} />
      </div>
    </div>
  );
}
