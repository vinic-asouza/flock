'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService, formatApiError } from '@/services/api';
import { Group } from '@/types';
import { UserCog, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCongregationDisplayName } from '@/utils/congregation';

interface GroupsChartsProps {
  loading?: boolean;
  viewMode?: 'all' | 'congregation';
  selectedCongregationId?: string;
  totalMembers?: number;
}

interface ChartDataItem {
  label: string;
  value: number;
  id: string;
  color: string;
  congregationName?: string | null;
}

const MINISTRY_COLOR = '#3B82F6';

export function GroupsCharts({
  loading = false,
  viewMode = 'all',
  selectedCongregationId,
  totalMembers = 0,
}: GroupsChartsProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadGroupsRequestIdRef = useRef(0);

  const loadGroups = useCallback(async () => {
    const requestId = ++loadGroupsRequestIdRef.current;
    try {
      setLoadingGroups(true);
      setError(null);

      let congregationId: string | undefined;
      if (viewMode === 'congregation' && selectedCongregationId) {
        congregationId = selectedCongregationId;
      }

      const data = await apiService.listGroups({ congregation_id: congregationId });
      if (requestId !== loadGroupsRequestIdRef.current) {
        return;
      }
      const activeGroups = (data || []).filter((group: Group) => group.status === true);
      setGroups(activeGroups);
    } catch (err) {
      if (requestId !== loadGroupsRequestIdRef.current) {
        return;
      }
      const errorMessage = formatApiError(err);
      toast.error(errorMessage);
      setError(errorMessage);
      setGroups([]);
    } finally {
      if (requestId === loadGroupsRequestIdRef.current) {
        setLoadingGroups(false);
      }
    }
  }, [viewMode, selectedCongregationId]);

  useEffect(() => {
    setGroups([]);
    if (loading) {
      return;
    }
    loadGroups();
  }, [viewMode, selectedCongregationId, loading, loadGroups]);

  const ministriesData = useMemo((): ChartDataItem[] => {
    return groups
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
      .map((group) => ({
        label: group.name,
        value: group.memberCount || 0,
        id: group.id,
        color: MINISTRY_COLOR,
        congregationName:
          getCongregationDisplayName(group.congregations) || (group.congregation_id ? null : 'Todas as congregações'),
      }));
  }, [groups]);

  const totalValue = useMemo(
    () => ministriesData.reduce((sum, item) => sum + item.value, 0),
    [ministriesData]
  );

  const handleManageMinistries = () => {
    router.push('/ministries');
  };

  if (loading || loadingGroups) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600 mb-3">Erro ao carregar ministérios: {error}</p>
        <button
          type="button"
          onClick={loadGroups}
          className="text-sm font-medium text-red-700 hover:text-red-900 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (ministriesData.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#090725]/10">
            <UserCog size={16} className="text-[#090725]" />
          </div>
          Ministérios
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <UserCog size={48} className="mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">Nenhum ministério encontrado</p>
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
          Ministérios
        </h2>
        <button
          onClick={handleManageMinistries}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-3 py-2 text-sm font-medium text-[#090725] bg-gray-100 hover:bg-gray-200 rounded-lg touch-manipulation transition-colors"
        >
          <Settings size={14} />
          Gerenciar Ministérios
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 w-full">
        <div className="mb-4">
          {totalValue > 0 && totalMembers > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {totalValue} {totalValue === 1 ? 'membro' : 'membros'} de {totalMembers} (
                  {((totalValue / totalMembers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(totalValue / totalMembers) * 100}%`,
                    backgroundColor: MINISTRY_COLOR,
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ministriesData.map((ministry) => {
            const percentage = totalValue > 0 ? (ministry.value / totalValue) * 100 : 0;

            return (
              <div
                key={ministry.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 text-sm flex-1 truncate">
                    {ministry.label}
                  </h4>
                  {ministry.congregationName && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 whitespace-nowrap flex-shrink-0">
                      {ministry.congregationName}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{ministry.value} membros</span>
                    <span className="text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: ministry.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
