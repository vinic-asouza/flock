'use client';

import { useState, useEffect, useRef } from 'react';
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
}

export function ViewSelector({ selectedView, selectedCongregationId, onViewChange }: ViewSelectorProps) {
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
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-gray-700">Visualização</h3>
        <p className="text-sm text-gray-600">
          Visualizando dados de <span className="font-medium text-gray-900">{name}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-gray-700">Visualização</h3>

      <div className="flex flex-row flex-wrap items-center gap-3">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedView === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleViewChange(option.value)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={option.description}
            >
              <Icon size={16} />
              {option.label}
            </button>
          );
        })}

        {selectedView === 'congregation' && (
          <div className="w-48 sm:w-64 flex-shrink-0">
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
