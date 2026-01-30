'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Group, GroupType } from '@/types';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useMemberOptions } from '@/hooks/useMemberOptions';

// Schema de validação
const groupSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres'),
  type: z.enum([
    'Ministério',
    'Departamento',
    'Grupo',
    'Equipe',
    'Time',
    'Comissão',
    'Célula',
    'Grupo de Crescimento',
    'Pequeno Grupo',
    'Discipulado',
    'Classe',
    'Núcleo',
    'Região'
  ] as const),
  description: z.string()
    .optional()
    .or(z.literal(''))
    .max(5000, 'A descrição não pode ter mais de 5000 caracteres'),
  congregation_id: z.string()
    .optional()
    .or(z.literal(''))
    .or(z.literal('sede'))
    .nullable()
    .refine((val, ctx) => {
      if (!val || val === '' || val === 'sede') return true; // String vazia ou 'sede' é válida
      // Validar que é UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ID da congregação inválido'
        });
        return false;
      }
      return true;
    }, {
      message: 'Congregação inválida'
    }),
  responsible_id: z.string().uuid().optional().or(z.literal('')).nullable(),
  status: z.boolean(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface GroupFormProps {
  group?: Group | null;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  selectedCongregationId?: string; // Para filtrar membros por congregação
}

const GROUP_TYPES: GroupType[] = [
  'Ministério',
  'Departamento',
  'Grupo',
  'Equipe',
  'Time',
  'Comissão',
  'Célula',
  'Grupo de Crescimento',
  'Pequeno Grupo',
  'Discipulado',
  'Classe',
  'Núcleo',
  'Região'
];

export function GroupForm({ 
  group, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  mode,
  selectedCongregationId 
}: GroupFormProps) {
  const { congregations, loading: filtersLoading } = useFiltersData();
  const [selectedResponsibleLabel, setSelectedResponsibleLabel] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: mode === 'create' ? {
      status: true,
      congregation_id: selectedCongregationId || 'sede',
    } : {},
  });

  const selectedCongregation = watch('congregation_id');
  const responsibleId = watch('responsible_id') ?? '';

  // Determinar congregação a usar para busca de membros
  // Se selectedCongregationId é 'sede', usar null. Se selectedCongregation existe, usar ele (pode ser 'sede' também)
  let congregationIdForSearch: string | null = null;
  if (selectedCongregation) {
    congregationIdForSearch = selectedCongregation === 'sede' ? null : selectedCongregation;
  } else if (selectedCongregationId) {
    congregationIdForSearch = selectedCongregationId === 'sede' ? null : selectedCongregationId;
  }

  // Hook para buscar membros com busca
  const {
    options: memberOptionsData,
    loading: loadingMembers,
    setSearch: setMemberSearch,
  } = useMemberOptions({
    enabled: congregationIdForSearch !== undefined,
    congregationId: congregationIdForSearch,
  });

  // Criar opções do select de responsável
  const responsibleSelectOptions = useMemo(() => {
    const base = [
      { value: '', label: 'Nenhum' },
      ...memberOptionsData.map(option => ({
        value: option.id,
        label: option.name
      }))
    ];

    // Se há um responsável selecionado que não está na lista, adicionar
    if (responsibleId && !base.some(option => option.value === responsibleId)) {
      base.push({ value: responsibleId, label: selectedResponsibleLabel || 'Responsável selecionado' });
    }

    return base;
  }, [memberOptionsData, responsibleId, selectedResponsibleLabel]);

  // Atualizar label do responsável selecionado
  useEffect(() => {
    if (!responsibleId) {
      setSelectedResponsibleLabel('');
      return;
    }
    const match = memberOptionsData.find(option => option.id === responsibleId);
    if (match) {
      setSelectedResponsibleLabel(match.name);
    }
  }, [memberOptionsData, responsibleId]);

  // Handler para mudança de responsável
  const handleResponsibleChange = (value: string) => {
    setValue('responsible_id', value || null);
    const match = memberOptionsData.find(option => option.id === value);
    if (match) {
      setSelectedResponsibleLabel(match.name);
    } else if (!value) {
      setSelectedResponsibleLabel('');
    }
  };

  // Resetar formulário quando group mudar (para modo edit)
  useEffect(() => {
    if (group && mode === 'edit') {
      setValue('name', group.name);
      setValue('type', group.type);
      setValue('description', group.description || '');
      // Se não tem congregação, usar 'sede'
      setValue('congregation_id', group.congregation_id || 'sede');
      setValue('responsible_id', group.responsible_id || '');
      setValue('status', group.status);
      
      // Se há um responsável, buscar seu nome para exibir
      if (group.responsible_id && group.members?.name) {
        setSelectedResponsibleLabel(group.members.name);
      }
    } else if (mode === 'create' && selectedCongregationId) {
      // No modo create, definir a congregação padrão se fornecida
      setValue('congregation_id', selectedCongregationId);
    }
  }, [group, mode, setValue, selectedCongregationId]);

  const handleFormSubmit = async (data: GroupFormData) => {
    try {
      // Converter 'sede' para null antes de enviar
      const payload = {
        ...data,
        congregation_id: data.congregation_id === 'sede' ? null : (data.congregation_id || null),
      };
      await onSubmit(payload as GroupFormData);
      reset();
    } catch {
      // Erro será tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
      {/* Informações Básicas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Básicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Tipo do Grupo *"
              value={watch('type') || ''}
              onChange={(value) => setValue('type', value as GroupType)}
              options={[
                { value: '', label: 'Selecione o tipo' },
                ...GROUP_TYPES.map((type) => ({
                  value: type,
                  label: type
                }))
              ]}
              disabled={isLoading}
              error={errors.type?.message}
            />
          </div>

          <Input
            label="Nome do Grupo *"
            placeholder="Digite o nome do grupo"
            error={errors.name?.message}
            isLoading={isLoading}
            {...register('name')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              {...register('description')}
              placeholder="Descreva o propósito e função do grupo"
              rows={3}
              className={`block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-[15px] text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors ${
                errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Vínculos */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Vínculos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Congregação"
            value={watch('congregation_id') || (selectedCongregationId || 'sede')}
            onChange={(value) => {
              // Se não selecionou nada, usar 'sede'
              setValue('congregation_id', value || 'sede');
              // Limpar responsável quando mudar congregação para evitar inconsistências
              setValue('responsible_id', null);
              setSelectedResponsibleLabel('');
            }}
            options={[
              { value: 'sede', label: 'Sede' },
              ...(congregations || []).map((cong) => ({
                value: cong.id,
                label: cong.name
              }))
            ]}
            disabled={filtersLoading || isLoading}
            error={errors.congregation_id?.message}
          />

          <Select
            label="Responsável"
            value={responsibleId}
            onChange={handleResponsibleChange}
            options={responsibleSelectOptions}
            disabled={loadingMembers || isLoading || (!selectedCongregation && !selectedCongregationId)}
            error={errors.responsible_id?.message}
            placeholder={
              loadingMembers 
                ? 'Carregando membros...' 
                : (!selectedCongregation && !selectedCongregationId) 
                  ? 'Selecione uma congregação primeiro' 
                  : 'Digite para buscar o responsável'
            }
            searchable={true}
            onSearchChange={setMemberSearch}
            helperText="Digite o nome do membro para buscar"
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Status
        </h3>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="status"
            checked={watch('status')}
            onChange={(e) => setValue('status', e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="status" className="text-sm font-medium text-gray-700">
            Grupo ativo
          </label>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {mode === 'create' ? 'Criar Grupo' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}
