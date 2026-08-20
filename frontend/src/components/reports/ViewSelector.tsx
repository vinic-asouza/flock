'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Building, Users } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { getCongregationDisplayName } from '@/utils/congregation';

export type ViewMode = 'all' | 'congregation';

interface ViewSelectorProps {
  selectedView: ViewMode;
  selectedCongregationId?: string;
  onViewChange: (view: ViewMode, congregationId?: string, congregationName?: string) => void;
  /** Ações alinhadas à direita do título (ex.: Atualizar / PDF) */
  actions?: ReactNode;
}

export function ViewSelector({
  selectedView,
  selectedCongregationId,
  onViewChange,
  actions,
}: ViewSelectorProps) {
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const singleCongregationApplied = useRef(false);

  useEffect(() => {
    const loadCongregations = async () => {
      try {
        setLoading(true);
        const congregationsData = await apiService.listCongregations();

        setCongregations(
          congregationsData.map((congregation: { id: string; name: string; abbreviation?: string | null }) => ({
            value: congregation.id,
            label: getCongregationDisplayName(congregation),
          }))
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar congregações';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadCongregations();
  }, []);

  // Usuário com acesso a apenas uma congregação: força visão e esconde seletor
  useEffect(() => {
    if (loading || congregations.length !== 1 || singleCongregationApplied.current) return;

    const only = congregations[0];
    singleCongregationApplied.current = true;
    onViewChange('congregation', only.value, only.label);
    // onViewChange é estável o suficiente para o one-shot; evita re-aplicação por identidade da callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, congregations]);

  const isSingleCongregation = !loading && congregations.length === 1;

  const viewOptions = [
    {
      value: 'all',
      label: 'Dados Gerais',
      description: 'Todos os membros da igreja',
      icon: Users,
    },
    {
      value: 'congregation',
      label: 'Congregação',
      description: 'Membros de uma congregação específica',
      icon: Building,
    },
  ];

  const handleViewChange = (value: string) => {
    if (value === 'congregation') {
      onViewChange('congregation', undefined);
    } else {
      onViewChange(value as ViewMode);
    }
  };

  const handleCongregationChange = (congregationId: string) => {
    const selectedCongregation = congregations.find(c => c.value === congregationId);
    const congregationName = selectedCongregation?.label;

    onViewChange('congregation', congregationId, congregationName);
  };

  if (isSingleCongregation) {
    const name = congregations[0].label;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-700">Visualização</h3>
          {actions}
        </div>
        <p className="text-sm text-gray-600 text-center sm:text-left">
          Visualizando dados de <span className="font-medium text-gray-900">{name}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-700">Visualização</h3>
        {actions}
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start sm:gap-3">
        <div className="flex flex-row flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedView === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleViewChange(option.value)}
                className={`inline-flex items-center justify-center gap-2 min-h-11 flex-1 sm:flex-initial max-w-[11rem] sm:max-w-none px-3 py-2 rounded-md text-sm font-medium touch-manipulation transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={option.description}
              >
                <Icon size={16} />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>

        {selectedView === 'congregation' && (
          <div className="w-full max-w-sm sm:max-w-none sm:w-64 flex-shrink-0 min-w-0 mx-auto sm:mx-0">
            <Select
              value={selectedCongregationId || ''}
              onChange={handleCongregationChange}
              options={[
                { value: '', label: 'Selecione uma congregação' },
                ...congregations,
              ]}
              placeholder="Escolha uma congregação"
              disabled={loading}
              label=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
