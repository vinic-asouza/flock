'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Role } from '@/types/role';

// Schema de validação
const roleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional().or(z.literal('')),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function RoleForm({ role, onSubmit, onCancel, isLoading = false, mode }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: mode === 'create' ? {
      name: '',
      description: '',
    } : {
      name: role?.name || '',
      description: role?.description || '',
    },
  });

  const handleFormSubmit = async (data: RoleFormData) => {
    try {
      await onSubmit(data);
      reset();
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
          <Input
            label="Nome do Cargo *"
            placeholder="Digite o nome do cargo"
            error={errors.name?.message}
            isLoading={isLoading}
            {...register('name')}
          />

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
