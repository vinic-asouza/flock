'use client';

import { useState, useEffect } from 'react';
import { Building, Home, Users } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';

export type ViewMode = 'all' | 'sede' | 'congregation';

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
        console.error('Erro ao carregar congregações:', error);
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
      value: 'sede',
      label: 'Sede',
      description: 'Membros da igreja sede',
      icon: Home,
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Título e botões de visualização */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Visualização</h3>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {/* Seletor de Congregação (apenas quando congregação específica está selecionada) */}
      {selectedView === 'congregation' && (
        <div className="sm:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Congregação
          </label>
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
  );
}
