'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Calendar, MapPin, Briefcase } from 'lucide-react';
import { ReportFilters } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { debounce } from '@/utils';

interface ReportsFiltersProps {
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ReportsFilters({ filters, onApply, onClear, onClose }: ReportsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Função de validação de filtros
  const validateFilters = useCallback((filters: ReportFilters): string | null => {
    // Validar ranges de datas
    const validateDateRange = (from: string | undefined, to: string | undefined, fieldName: string): string | null => {
      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return `${fieldName}: datas inválidas`;
        }
        
        if (fromDate > toDate) {
          return `${fieldName}: data inicial deve ser anterior à data final`;
        }
      }
      return null;
    };

    // Validar ranges de datas
    const birthError = validateDateRange(filters.birth_date_from, filters.birth_date_to, 'Data de nascimento');
    if (birthError) return birthError;

    const baptismError = validateDateRange(filters.baptism_date_from, filters.baptism_date_to, 'Data de batismo');
    if (baptismError) return baptismError;

    const admissionError = validateDateRange(filters.admission_date_from, filters.admission_date_to, 'Data de admissão');
    if (admissionError) return admissionError;

    // Validar faixa etária
    if (filters.age_from !== undefined && filters.age_to !== undefined) {
      if (filters.age_from < 0 || filters.age_from > 150) {
        return 'Idade mínima deve estar entre 0 e 150 anos';
      }
      if (filters.age_to < 0 || filters.age_to > 150) {
        return 'Idade máxima deve estar entre 0 e 150 anos';
      }
      if (filters.age_from > filters.age_to) {
        return 'Idade mínima deve ser menor ou igual à idade máxima';
      }
    }

    return null;
  }, []);

  // Debounce para busca geral (500ms)
  const debouncedApply = useCallback(
    debounce((filtersToApply: ReportFilters) => {
      const validationError = validateFilters(filtersToApply);
      if (!validationError) {
        onApply(filtersToApply);
      } else {
        toast.error(validationError);
      }
    }, 500),
    [onApply, validateFilters]
  );

  // Carregar dados para os selects
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const congregationsData = await apiService.listCongregations();

        setCongregations([
          { value: '', label: 'Todas as congregações' },
          { value: 'sede', label: 'Sede' },
          ...congregationsData.map((congregation: { id: string; name: string }) => ({
            value: congregation.id,
            label: congregation.name,
          })),
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados dos filtros';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFilterChange = (key: keyof ReportFilters, value: string | boolean | number | undefined) => {
    const newFilters = {
      ...localFilters,
      [key]: value === '' ? undefined : value,
    };
    setLocalFilters(newFilters);

    // Se for busca geral, aplicar debounce automático
    if (key === 'search') {
      debouncedApply(newFilters);
    }
  };

  const handleApply = async () => {
    const validationError = validateFilters(localFilters);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setIsApplying(true);
    try {
      await onApply(localFilters);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filtros Avançados</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="p-2"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Busca Geral */}
        <div className="lg:col-span-3">
          <Input
            label="Busca Geral"
            placeholder="Nome, email, telefone..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            icon={<Search size={16} />}
            disabled={loading || isApplying}
            isLoading={isApplying}
            maxLength={255}
          />
        </div>

        {/* Filtros Básicos */}
        <div>
          <Select
            label="Status"
            value={localFilters.active?.toString() || ''}
            onChange={(value) => {
              const boolValue = value === 'true' ? true : value === 'false' ? false : undefined;
              handleFilterChange('active', boolValue);
            }}
            options={[
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Ativo' },
              { value: 'false', label: 'Inativo' },
            ]}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Select
            label="Congregação"
            value={localFilters.congregation_id || ''}
            onChange={(value) => handleFilterChange('congregation_id', value)}
            options={congregations}
            disabled={loading || isApplying}
          />
        </div>

        {/* Filtros Demográficos */}
        <div>
          <Select
            label="Gênero"
            value={localFilters.gender || ''}
            onChange={(value) => handleFilterChange('gender', value)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'Masculino', label: 'Masculino' },
              { value: 'Feminino', label: 'Feminino' },
            ]}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Select
            label="Estado Civil"
            value={localFilters.marital_status || ''}
            onChange={(value) => handleFilterChange('marital_status', value)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'Solteiro(a)', label: 'Solteiro(a)' },
              { value: 'Casado(a)', label: 'Casado(a)' },
              { value: 'Divorciado(a)', label: 'Divorciado(a)' },
              { value: 'Viúvo(a)', label: 'Viúvo(a)' },
              { value: 'União Estável', label: 'União Estável' },
            ]}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Ocupação"
            placeholder="Digite a ocupação"
            value={localFilters.occupation || ''}
            onChange={(e) => handleFilterChange('occupation', e.target.value)}
            icon={<Briefcase size={16} />}
            disabled={loading || isApplying}
            maxLength={100}
          />
        </div>

        {/* Filtros Geográficos */}
        <div>
          <Input
            label="Cidade"
            placeholder="Digite a cidade"
            value={localFilters.city || ''}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            icon={<MapPin size={16} />}
            disabled={loading || isApplying}
            maxLength={100}
          />
        </div>

        <div>
          <Input
            label="Estado"
            placeholder="Digite o estado"
            value={localFilters.state || ''}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            icon={<MapPin size={16} />}
            disabled={loading || isApplying}
            maxLength={2}
          />
        </div>

        <div>
          <Input
            label="Nacionalidade"
            placeholder="Digite a nacionalidade"
            value={localFilters.nationality || ''}
            onChange={(e) => handleFilterChange('nationality', e.target.value)}
            disabled={loading || isApplying}
            maxLength={50}
          />
        </div>

        {/* Filtros de Idade */}
        <div>
          <Input
            label="Idade Mínima"
            type="number"
            placeholder="0"
            value={localFilters.age_from?.toString() || ''}
            onChange={(e) => handleFilterChange('age_from', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Idade Máxima"
            type="number"
            placeholder="100"
            value={localFilters.age_to?.toString() || ''}
            onChange={(e) => handleFilterChange('age_to', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading || isApplying}
          />
        </div>

        {/* Filtros de Data */}
        <div>
          <Input
            label="Data de Nascimento (De)"
            type="date"
            value={localFilters.birth_date_from || ''}
            onChange={(e) => handleFilterChange('birth_date_from', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Data de Nascimento (Até)"
            type="date"
            value={localFilters.birth_date_to || ''}
            onChange={(e) => handleFilterChange('birth_date_to', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Data de Batismo (De)"
            type="date"
            value={localFilters.baptism_date_from || ''}
            onChange={(e) => handleFilterChange('baptism_date_from', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Data de Batismo (Até)"
            type="date"
            value={localFilters.baptism_date_to || ''}
            onChange={(e) => handleFilterChange('baptism_date_to', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Data de Admissão (De)"
            type="date"
            value={localFilters.admission_date_from || ''}
            onChange={(e) => handleFilterChange('admission_date_from', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>

        <div>
          <Input
            label="Data de Admissão (Até)"
            type="date"
            value={localFilters.admission_date_to || ''}
            onChange={(e) => handleFilterChange('admission_date_to', e.target.value)}
            icon={<Calendar size={16} />}
            disabled={loading || isApplying}
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={handleClear}
          disabled={loading || isApplying}
        >
          Limpar Filtros
        </Button>
        <Button
          onClick={handleApply}
          disabled={loading || isApplying}
          isLoading={isApplying}
        >
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );
}
