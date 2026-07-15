'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building, Users } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';

export type ViewMode = 'all' | 'congregation';

interface ViewSelectorProps {
  selectedView: ViewMode;
  selectedCongregationId?: string;
  onViewChange: (view: ViewMode, congregationId?: string, congregationName?: string) => void;
}

export function ViewSelector({ selectedView, selectedCongregationId, onViewChange }: ViewSelectorProps) {
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Carregar congregações
  useEffect(() => {
    const loadCongregations = async () => {
      try {
        setLoading(true);
        const congregationsData = await apiService.listCongregations();

        setCongregations(
          congregationsData.map((congregation: { id: string; name: string }) => ({
            value: congregation.id,
            label: congregation.name,
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
      // Se selecionou congregação específica, não carregar dados até escolher uma congregação
      onViewChange('congregation', undefined);
    } else {
      onViewChange(value as ViewMode);
    }
  };

  const handleCongregationChange = (congregationId: string) => {
    // Encontrar o nome da congregação selecionada
    const selectedCongregation = congregations.find(c => c.value === congregationId);
    const congregationName = selectedCongregation?.label;
    
    onViewChange('congregation', congregationId, congregationName);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Label acima */}
      <h3 className="text-sm font-medium text-gray-700">Visualização</h3>
      
      {/* Bloco com botões e seletor alinhados horizontalmente */}
      <div className="flex flex-row flex-wrap items-center gap-3">
        {/* Botões de visualização */}
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

        {/* Seletor de Congregação (apenas quando congregação específica está selecionada) */}
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
