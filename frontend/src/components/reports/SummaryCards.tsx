'use client';

import { Users, UserCheck, UserX, UserPlus, Droplets, TrendingUp } from 'lucide-react';
import { MemberReportsSummary } from '@/types';

interface SummaryCardsProps {
  data: MemberReportsSummary;
  loading?: boolean;
  filterInfo?: {
    congregation_id: string | null;
  };
  congregationName?: string;
}

export function SummaryCards({ data, loading = false, filterInfo, congregationName }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Membros Ativos',
      value: data.activeMembers,
      percentage: data.activePercentage,
      icon: UserCheck,
      color: 'text-[#090725]',
      bgColor: 'bg-[#090725]/5',
      borderColor: 'border-[#090725]/10',
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#008236]',
    },
    {
      title: 'Membros Inativos',
      value: data.inactiveMembers,
      icon: UserX,
      color: 'text-[#090725]',
      bgColor: 'bg-[#090725]/5',
      borderColor: 'border-[#090725]/10',
      iconBg: 'bg-[#fef2f2]',
      iconColor: 'text-[#dc2626]',
    },
    {
      title: 'Total de Membros',
      value: data.totalMembers,
      icon: Users,
      color: 'text-[#090725]',
      bgColor: 'bg-[#090725]/5',
      borderColor: 'border-[#090725]/10',
      iconBg: 'bg-gray-100',
      iconColor: 'text-[#090725]',
    },
    {
      title: 'Novos Membros',
      subtitle: 'Últimos 30 dias',
      value: data.recentMembers,
      icon: UserPlus,
      color: 'text-[#090725]',
      bgColor: 'bg-[#090725]/5',
      borderColor: 'border-[#090725]/10',
      iconBg: 'bg-gray-100',
      iconColor: 'text-[#090725]',
    },
    {
      title: 'Novos Batismos',
      subtitle: 'Últimos 30 dias',
      value: data.recentBaptisms,
      icon: Droplets,
      color: 'text-[#090725]',
      bgColor: 'bg-[#090725]/5',
      borderColor: 'border-[#090725]/10',
      iconBg: 'bg-gray-100',
      iconColor: 'text-[#090725]',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-[#090725]/10 p-4 animate-pulse"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="h-8 w-8 bg-[#090725]/10 rounded-lg"></div>
                <div className="h-3 w-6 bg-[#090725]/10 rounded"></div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#090725]/10 rounded w-20"></div>
                <div className="h-6 bg-[#090725]/10 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Determina o texto do filtro aplicado
  const getFilterText = () => {
    if (!filterInfo?.congregation_id) return null;
    
    if (filterInfo.congregation_id === 'sede') {
      return 'Filtrado: Sede';
    }
    
    if (filterInfo.congregation_id && congregationName) {
      return `Filtrado: ${congregationName}`;
    }
    
    return `Filtrado: Congregação específica`;
  };

  const filterText = getFilterText();

  return (
    <div className="space-y-4">
      {/* Indicador de filtro aplicado */}
      {filterText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-500 font-medium">{filterText}</span>
          </div>
        </div>
      )}
      
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`bg-white rounded-xl border ${card.borderColor} p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group`}
          >
            <div className="flex flex-col h-full">
              {/* Header com ícone */}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={18} className={card.iconColor || card.color} />
                </div>
                {card.percentage !== undefined && (
                  <div className="text-right">
                    <span className="text-xs font-medium text-[#090725]">
                      {card.percentage}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* Conteúdo principal */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#090725] mb-1">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-xs text-[#090725] mb-2">{card.subtitle}</p>
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${card.color} leading-none`}>
                    {card.value.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
