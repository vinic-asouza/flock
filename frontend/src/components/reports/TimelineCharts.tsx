'use client';

import { useState, useMemo } from 'react';
import { Timeline, Member } from '@/types';
import { LineChart } from '@/components/reports/charts/LineChart';
import { Select } from '@/components/ui/Select';
import { Calendar, Droplets, UserPlus, TrendingUp, Users, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TimelineChartsProps {
  data: Timeline;
  loading?: boolean;
  showCongregationColumn?: boolean;
}

export function TimelineCharts({ data, loading = false, showCongregationColumn = true }: TimelineChartsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [yearlyMembersPage, setYearlyMembersPage] = useState(1);
  const [monthlyMembersPage, setMonthlyMembersPage] = useState(1);

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

  // Obter membros do ano selecionado (paginados)
  const yearlyMembers = useMemo(() => {
    if (!selectedYear || !data.membersByYear || !data.membersByYear[selectedYear]) return [];
    return data.membersByYear[selectedYear];
  }, [selectedYear, data]);

  const yearlyMembersPaginated = useMemo(() => {
    const startIndex = (yearlyMembersPage - 1) * 5;
    const endIndex = startIndex + 5;
    return yearlyMembers.slice(startIndex, endIndex);
  }, [yearlyMembers, yearlyMembersPage]);

  const yearlyMembersTotalPages = useMemo(() => {
    return Math.ceil(yearlyMembers.length / 5);
  }, [yearlyMembers.length]);

  // Obter membros do mês selecionado (paginados)
  const monthlyMembers = useMemo(() => {
    if (!selectedYear || !selectedMonth || !data.membersByMonth) return [];
    const yearMonthKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    return data.membersByMonth[yearMonthKey] || [];
  }, [selectedYear, selectedMonth, data]);

  const monthlyMembersPaginated = useMemo(() => {
    const startIndex = (monthlyMembersPage - 1) * 5;
    const endIndex = startIndex + 5;
    return monthlyMembers.slice(startIndex, endIndex);
  }, [monthlyMembers, monthlyMembersPage]);

  const monthlyMembersTotalPages = useMemo(() => {
    return Math.ceil(monthlyMembers.length / 5);
  }, [monthlyMembers.length]);

  // Resetar páginas quando mudar ano/mês
  useMemo(() => {
    setYearlyMembersPage(1);
  }, [selectedYear]);

  useMemo(() => {
    setMonthlyMembersPage(1);
  }, [selectedMonth]);

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
          
          <div className="space-y-4">
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
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Droplets size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Batismos</div>
                    <div className="text-xl font-bold text-[#090725]">
                      {yearlyTotals.baptisms}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-50">
                    <UserPlus size={18} className="text-green-600" />
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

            {/* Lista de Membros Anuais */}
            {selectedYear && yearlyMembers.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Novos Membros ({yearlyMembers.length})
                  </h4>
                  
                  {/* Paginação Anual */}
                  {yearlyMembersTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setYearlyMembersPage(prev => Math.max(1, prev - 1))}
                        disabled={yearlyMembersPage === 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} className="text-gray-600" />
                      </button>
                      <span className="text-xs text-gray-500 px-2">
                        {yearlyMembersPage}/{yearlyMembersTotalPages}
                      </span>
                      <button
                        onClick={() => setYearlyMembersPage(prev => Math.min(yearlyMembersTotalPages, prev + 1))}
                        disabled={yearlyMembersPage === yearlyMembersTotalPages}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} className="text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {yearlyMembersPaginated.map((member) => (
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

                {/* Atalho Gerenciar Membros */}
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
          
          <div className="space-y-4">
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
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Droplets size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Batismos</div>
                    <div className="text-xl font-bold text-[#090725]">
                      {monthlyTotals.baptisms}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-50">
                    <UserPlus size={18} className="text-green-600" />
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

            {/* Lista de Membros Mensais */}
            {selectedYear && selectedMonth && monthlyMembers.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Novos Membros ({monthlyMembers.length})
                  </h4>
                  
                  {/* Paginação Mensal */}
                  {monthlyMembersTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMonthlyMembersPage(prev => Math.max(1, prev - 1))}
                        disabled={monthlyMembersPage === 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} className="text-gray-600" />
                      </button>
                      <span className="text-xs text-gray-500 px-2">
                        {monthlyMembersPage}/{monthlyMembersTotalPages}
                      </span>
                      <button
                        onClick={() => setMonthlyMembersPage(prev => Math.min(monthlyMembersTotalPages, prev + 1))}
                        disabled={monthlyMembersPage === monthlyMembersTotalPages}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} className="text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {monthlyMembersPaginated.map((member) => (
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

                {/* Atalho Gerenciar Membros */}
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
