'use client';

import { useState, useEffect } from 'react';
import { X, Search, Calendar, Users, MapPin, Briefcase } from 'lucide-react';
import { ReportFilters } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';

interface ReportsFiltersProps {
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ReportsFilters({ filters, onApply, onClear, onClose }: ReportsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);
  const [roles, setRoles] = useState<Array<{ value: string; label: string }>>([]);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados para os selects
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [rolesData, congregationsData] = await Promise.all([
          apiService.listRoles(),
          apiService.listCongregations(),
        ]);

        setRoles([
          { value: '', label: 'Todos os cargos' },
          ...rolesData.map((role: any) => ({
            value: role.id,
            label: role.name,
          })),
        ]);

        setCongregations([
          { value: '', label: 'Todas as congregações' },
          { value: 'sede', label: 'Sede' },
          ...congregationsData.map((congregation: any) => ({
            value: congregation.id,
            label: congregation.name,
          })),
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados dos filtros:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
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
          />
        </div>

        {/* Filtros Básicos */}
        <div>
          <Select
            label="Status"
            value={localFilters.active?.toString() || ''}
            onChange={(value) => handleFilterChange('active', value === 'true' ? true : value === 'false' ? false : undefined)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Ativo' },
              { value: 'false', label: 'Inativo' },
            ]}
            disabled={loading}
          />
        </div>

        <div>
          <Select
            label="Cargo"
            value={localFilters.role_id || ''}
            onChange={(value) => handleFilterChange('role_id', value)}
            options={roles}
            disabled={loading}
          />
        </div>

        <div>
          <Select
            label="Congregação"
            value={localFilters.congregation_id || ''}
            onChange={(value) => handleFilterChange('congregation_id', value)}
            options={congregations}
            disabled={loading}
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
          />
        </div>

        <div>
          <Input
            label="Ocupação"
            placeholder="Digite a ocupação"
            value={localFilters.occupation || ''}
            onChange={(e) => handleFilterChange('occupation', e.target.value)}
            icon={<Briefcase size={16} />}
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
          />
        </div>

        <div>
          <Input
            label="Estado"
            placeholder="Digite o estado"
            value={localFilters.state || ''}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            icon={<MapPin size={16} />}
          />
        </div>

        <div>
          <Input
            label="Nacionalidade"
            placeholder="Digite a nacionalidade"
            value={localFilters.nationality || ''}
            onChange={(e) => handleFilterChange('nationality', e.target.value)}
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
          />
        </div>

        <div>
          <Input
            label="Idade Máxima"
            type="number"
            placeholder="100"
            value={localFilters.age_to?.toString() || ''}
            onChange={(e) => handleFilterChange('age_to', e.target.value ? parseInt(e.target.value) : undefined)}
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
          />
        </div>

        <div>
          <Input
            label="Data de Nascimento (Até)"
            type="date"
            value={localFilters.birth_date_to || ''}
            onChange={(e) => handleFilterChange('birth_date_to', e.target.value)}
            icon={<Calendar size={16} />}
          />
        </div>

        <div>
          <Input
            label="Data de Batismo (De)"
            type="date"
            value={localFilters.baptism_date_from || ''}
            onChange={(e) => handleFilterChange('baptism_date_from', e.target.value)}
            icon={<Calendar size={16} />}
          />
        </div>

        <div>
          <Input
            label="Data de Batismo (Até)"
            type="date"
            value={localFilters.baptism_date_to || ''}
            onChange={(e) => handleFilterChange('baptism_date_to', e.target.value)}
            icon={<Calendar size={16} />}
          />
        </div>

        <div>
          <Input
            label="Data de Admissão (De)"
            type="date"
            value={localFilters.admission_date_from || ''}
            onChange={(e) => handleFilterChange('admission_date_from', e.target.value)}
            icon={<Calendar size={16} />}
          />
        </div>

        <div>
          <Input
            label="Data de Admissão (Até)"
            type="date"
            value={localFilters.admission_date_to || ''}
            onChange={(e) => handleFilterChange('admission_date_to', e.target.value)}
            icon={<Calendar size={16} />}
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={handleClear}
          disabled={loading}
        >
          Limpar Filtros
        </Button>
        <Button
          onClick={handleApply}
          disabled={loading}
        >
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );
}
