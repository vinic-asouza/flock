'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Role } from '@/types/role';
import { useState, useEffect } from 'react';

// Lista de cargos pré-definidos
const PREDEFINED_ROLES = [
  'Pastor(a) titular',
  'Pastor(a) auxiliar',
  'Licenciado(a)',
  'Presbítero(a)',
  'Bispo(a)',
  'Apóstolo(a)',
  'Missionário(a)',
  'Evangelista',
  'Diácono(isa)',
  'Obreiro(a)',
  'Liderança',
  'Líder de célula/pg',
  'Líder de ministério',
  'Conselho',
  'Secretário(a)',
  'Administrativo',
  'Outro'
];

// Schema de validação
const roleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional().or(z.literal('')),
  selectedRole: z.string().min(1, 'Selecione um cargo'),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function RoleForm({ role, onSubmit, onCancel, isLoading = false, mode }: RoleFormProps) {
  const isCustomRole = mode === 'edit' && role?.name && !PREDEFINED_ROLES.includes(role.name);
  const [selectedRole, setSelectedRole] = useState(mode === 'edit' && role?.name ? (isCustomRole ? 'Outro' : role.name) : '');
  const [showCustomInput, setShowCustomInput] = useState(isCustomRole);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: mode === 'create' ? {
      name: '',
      description: '',
      selectedRole: '',
    } : {
      name: role?.name || '',
      description: role?.description || '',
      selectedRole: isCustomRole ? 'Outro' : (role?.name || ''),
    },
  });

  const watchedName = watch('name');

  // Sincronizar estado quando role mudar (importante para edição)
  useEffect(() => {
    if (role && mode === 'edit') {
      const isCustom = !PREDEFINED_ROLES.includes(role.name);
      setSelectedRole(isCustom ? 'Outro' : role.name);
      setShowCustomInput(isCustom);
      setValue('name', role.name);
      setValue('selectedRole', isCustom ? 'Outro' : role.name);
    }
  }, [role, mode, setValue]);

  // Função para lidar com a seleção de cargo
  const handleRoleSelect = (value: string) => {
    setSelectedRole(value);
    setValue('selectedRole', value);
    
    if (value === 'Outro') {
      setShowCustomInput(true);
      setValue('name', '');
    } else {
      setShowCustomInput(false);
      setValue('name', value);
    }
  };

  // Função para lidar com mudanças no input customizado
  const handleCustomNameChange = (value: string) => {
    setValue('name', value);
  };

  const handleFormSubmit = async (data: RoleFormData) => {
    try {
      // Determinar o nome final do cargo
      let finalName = '';
      
      if (data.selectedRole === 'Outro') {
        finalName = data.name;
      } else {
        finalName = data.selectedRole;
      }
      
      // Criar objeto com os dados finais
      const finalData = {
        name: finalName,
        description: data.description || '',
      };
      
      await onSubmit(finalData);
      reset();
      setSelectedRole('');
      setShowCustomInput(false);
    } catch (error) {
      // Erro será tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações do Cargo
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Selecione o Cargo *"
            value={selectedRole}
            onChange={handleRoleSelect}
            options={PREDEFINED_ROLES.map(role => ({ value: role, label: role }))}
            placeholder="Selecione um cargo"
            searchable={true}
            disabled={isLoading}
            error={errors.selectedRole?.message}
          />
          
          {showCustomInput && (
            <Input
              label="Nome do Cargo Personalizado *"
              placeholder="Digite o nome do cargo"
              error={errors.name?.message}
              isLoading={isLoading}
              value={watchedName}
              onChange={(e) => handleCustomNameChange(e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Digite uma descrição do cargo (opcional)"
              disabled={isLoading}
              {...register('description')}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {mode === 'create' ? 'Criar Cargo' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}
