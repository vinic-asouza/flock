'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import { Group, GroupType } from '@/types';
import { UserCog, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GroupsChartsProps {
  loading?: boolean;
  viewMode?: 'all' | 'sede' | 'congregation';
  selectedCongregationId?: string;
  totalMembers?: number;
}

interface ChartDataItem {
  label: string;
  value: number;
  id: string;
  color: string;
  totalMembers?: number;
  congregationName?: string | null;
}

export function GroupsCharts({ loading = false, viewMode = 'all', selectedCongregationId, totalMembers = 0 }: GroupsChartsProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar grupos baseado no viewMode
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        setError(null);

        let congregationId: string | undefined;
        if (viewMode === 'sede') {
          congregationId = 'sede';
        } else if (viewMode === 'congregation' && selectedCongregationId) {
          congregationId = selectedCongregationId;
        }
        // Para 'all', não passar congregationId (undefined) para buscar todos

        const data = await apiService.listGroups({ congregation_id: congregationId });
        // Filtrar apenas grupos ativos (status === true)
        const activeGroups = (data || []).filter((group: Group) => group.status === true);
        setGroups(activeGroups);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar grupos';
        toast.error(errorMessage);
        setError(errorMessage);
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    if (!loading) {
      loadGroups();
    }
  }, [viewMode, selectedCongregationId, loading]);

  // Agrupar grupos por tipo e preparar dados para gráficos
  const groupsByType = useMemo(() => {
    const grouped: Record<GroupType, Group[]> = {
      'Ministério': [],
      'Departamento': [],
      'Grupo': [],
      'Equipe': [],
      'Time': [],
      'Comissão': [],
      'Célula': [],
      'Grupo de Crescimento': [],
      'Pequeno Grupo': [],
      'Discipulado': [],
      'Classe': [],
      'Núcleo': [],
      'Região': [],
    };

    groups.forEach(group => {
      if (group.type && grouped[group.type]) {
        grouped[group.type].push(group);
      }
    });

    return grouped;
  }, [groups]);

  // Criar dados de gráfico para cada tipo que tem grupos
  const chartsData = useMemo(() => {
    return Object.entries(groupsByType)
      .filter(([, groups]) => groups.length > 0)
      .map(([type, groups]) => {
        const groupsData: ChartDataItem[] = groups
          .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
          .map(group => ({
            label: group.name,
            value: group.memberCount || 0,
            id: group.id,
            color: getGroupTypeColor(type as GroupType),
            totalMembers: totalMembers, // Adicionar total de membros para exibição
            congregationName: group.congregations?.name || (group.congregation_id ? null : 'Sede'),
          }));

        // Calcular total e adicionar como primeiro item
        const totalValue = groupsData.reduce((sum, item) => sum + item.value, 0);
        const totalItem: ChartDataItem = {
          label: 'Total de membros em ' + type,
          value: totalValue,
          id: '',
          color: getGroupTypeColor(type as GroupType),
          totalMembers: totalMembers,
        };

        // Total primeiro, depois os grupos individuais
        const chartData: ChartDataItem[] = [totalItem, ...groupsData];

        return {
          type: type as GroupType,
          data: chartData,
        };
      });
  }, [groupsByType, totalMembers]);

  const handleManageGroups = () => {
    router.push('/groups');
  };

  if (loading || loadingGroups) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Erro ao carregar grupos: {error}</p>
      </div>
    );
  }

  if (chartsData.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <UserCog size={16} className="text-[#090725]" />
          </div>
          Grupos/Ministérios
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <UserCog size={48} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">Nenhum grupo encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <UserCog size={16} className="text-[#090725]" />
          </div>
          Grupos/Ministérios
        </h2>
        <button
          onClick={handleManageGroups}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings size={14} />
          Gerenciar Grupos
        </button>
      </div>

      <div className="space-y-6">
        {chartsData.map(({ type, data }) => {
          // Filtrar o item "Total" e pegar apenas os grupos
          const groups = data.filter(item => item.id !== '');
          
          // Grid interno sempre com até 3 colunas
          const internalCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

          // Calcular total de membros
          const totalValue = data.find(item => item.id === '')?.value || 0;

          return (
            <div key={type} className="bg-white rounded-lg border border-gray-200 p-6 w-full">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {type}
                </h3>
                {totalValue > 0 && totalMembers > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {totalValue} {totalValue === 1 ? 'membro' : 'membros'} de {totalMembers} ({((totalValue / totalMembers) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${(totalValue / totalMembers) * 100}%`,
                          backgroundColor: getGroupTypeColor(type),
                        }}
                      />
                    </div>
                  </div>
                )}
                {totalValue > 0 && !totalMembers && (
                  <span className="text-sm text-gray-500">
                    Total: {totalValue} {totalValue === 1 ? 'membro' : 'membros'}
                  </span>
                )}
              </div>
              
              <div className={`grid ${internalCols} gap-3`}>
                {groups.map((group) => {
                  // Calcular porcentagem em relação ao total do grupo
                  const percentage = totalValue > 0 ? (group.value / totalValue) * 100 : 0;
                  
                  return (
                    <div
                      key={group.id}
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-gray-50"
                    >
                      {/* Linha com nome e badge da congregação */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 text-sm flex-1 truncate">
                          {group.label}
                        </h4>
                        {group.congregationName && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 whitespace-nowrap flex-shrink-0">
                            {group.congregationName}
                          </span>
                        )}
                      </div>
                      
                      {/* Gráfico de barra */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{group.value} membros</span>
                          <span className="text-gray-500">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: group.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Função auxiliar para cores por tipo de grupo
function getGroupTypeColor(type: GroupType): string {
  const colors: Record<GroupType, string> = {
    'Ministério': '#3B82F6',
    'Departamento': '#8B5CF6',
    'Grupo': '#10B981',
    'Equipe': '#F59E0B',
    'Time': '#EF4444',
    'Comissão': '#06B6D4',
    'Célula': '#EC4899',
    'Grupo de Crescimento': '#14B8A6',
    'Pequeno Grupo': '#84CC16',
    'Discipulado': '#F97316',
    'Classe': '#6366F1',
    'Núcleo': '#A855F7',
    'Região': '#090725',
  };
  return colors[type] || '#090725';
}
