'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { CalendarItem, CreateCalendarItemData, CalendarItemType, CreateParticipantData } from '@/types/calendar';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import { apiService } from '@/services/api';
import { Group, Member } from '@/types';
import { endOfYear, getDay, lastDayOfMonth } from 'date-fns';
import { CalendarParticipantsManager, CalendarParticipantsManagerRef } from './CalendarParticipantsManager';
import { toast } from 'react-hot-toast';
import { getCongregationDisplayName } from '@/utils/congregation';

// Função para criar schema de validação (permite acesso às congregações)
const createCalendarItemSchema = (congregations: Array<{ id: string; name: string }> = []) => z.object({
  title: z.string()
    .min(2, 'Título deve ter pelo menos 2 caracteres')
    .max(100, 'Título não pode ter mais de 100 caracteres'),
  type: z.enum(['Programação', 'Evento', 'Encontro', 'Reunião'] as const),
  description: z.string()
    .max(5000, 'A descrição não pode ter mais de 5000 caracteres')
    .optional()
    .or(z.literal('')),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional().or(z.literal('')),
  is_recurring: z.boolean(),
  recurrence_pattern: z.enum(['weekly', 'monthly'] as const).optional().or(z.literal('')),
  recurrence_end_date: z.string().optional().or(z.literal('')),
  recurrence_time: z.string().optional().or(z.literal('')),
  recurrence_duration_minutes: z.number().optional().or(z.literal('')),
  recurrence_day_of_week: z.number().optional().or(z.literal('')),
  recurrence_day_of_month: z.number().optional().or(z.literal('')),
  recurrence_week_of_month: z.number().optional().or(z.literal('')),
  location: z.string()
    .max(255, 'O local não pode ter mais de 255 caracteres')
    .optional()
    .or(z.literal('')),
  congregation_id: z.string()
    .optional()
    .or(z.literal(''))
    .nullable()
    .refine((val: string | null | undefined) => {
      if (!val) return true; // null/empty (todas as congregações) é sempre válido
      // Check if it's a valid UUID format
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      if (!isUuid) return false;
      // Check if the congregation exists in the available list
      return congregations.some(cong => cong.id === val);
    }, {
      message: 'Congregação inválida ou não encontrada'
    }),
  group_id: z.string().uuid().optional().or(z.literal('')).nullable(),
  responsible_member_id: z.string().uuid().optional().or(z.literal('')).nullable(),
}).refine((data) => {
  // Se não é recorrente e end_date existe, deve ser posterior a start_date
  if (!data.is_recurring && data.end_date && data.start_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['end_date']
}).refine((data) => {
  // Se is_recurring é true, recurrence_pattern é obrigatório
  if (data.is_recurring && !data.recurrence_pattern) {
    return false;
  }
  return true;
}, {
  message: 'Padrão de recorrência é obrigatório quando o item é recorrente',
  path: ['recurrence_pattern']
}).refine((data) => {
  // Se é recorrente, recurrence_time é obrigatório
  if (data.is_recurring && !data.recurrence_time) {
    return false;
  }
  return true;
}, {
  message: 'Horário é obrigatório para eventos recorrentes',
  path: ['recurrence_time']
}).refine((data) => {
  // Se é weekly, recurrence_day_of_week é obrigatório
  if (data.is_recurring && data.recurrence_pattern === 'weekly' && (data.recurrence_day_of_week === '' || data.recurrence_day_of_week === null || data.recurrence_day_of_week === undefined)) {
    return false;
  }
  return true;
}, {
  message: 'Dia da semana é obrigatório para recorrência semanal',
  path: ['recurrence_day_of_week']
}).refine((data) => {
  // Se é monthly, deve ter OU day_of_month OU (week_of_month + day_of_week)
  if (data.is_recurring && data.recurrence_pattern === 'monthly') {
    const hasDayOfMonth = data.recurrence_day_of_month !== '' && data.recurrence_day_of_month !== null && data.recurrence_day_of_month !== undefined;
    const hasWeekOfMonth = data.recurrence_week_of_month !== '' && data.recurrence_week_of_month !== null && data.recurrence_week_of_month !== undefined;
    const hasDayOfWeek = data.recurrence_day_of_week !== '' && data.recurrence_day_of_week !== null && data.recurrence_day_of_week !== undefined;
    
    if (!hasDayOfMonth && !(hasWeekOfMonth && hasDayOfWeek)) {
      return false;
    }
    
    if (hasDayOfMonth && (hasWeekOfMonth || hasDayOfWeek)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Para recorrência mensal, informe o dia do mês (1-31) OU a semana do mês + dia da semana',
  path: ['recurrence_day_of_month']
}).refine((data) => {
  // Se é monthly com dia fixo, dia do mês deve estar entre 1 e 31
  if (data.is_recurring && data.recurrence_pattern === 'monthly') {
    const d = data.recurrence_day_of_month;
    if (d !== '' && d !== null && d !== undefined) {
      const n = typeof d === 'number' ? d : Number(d);
      if (Number.isNaN(n) || n < 1 || n > 31) return false;
    }
  }
  return true;
}, {
  message: 'Dia do mês deve ser entre 1 e 31',
  path: ['recurrence_day_of_month']
}).refine((data) => {
  // Se é recorrente e tem recurrence_end_date, deve ser posterior a start_date
  if (data.is_recurring && data.recurrence_end_date && data.start_date) {
    return new Date(data.recurrence_end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'A data de término da recorrência deve ser posterior à data de início',
  path: ['recurrence_end_date']
});

type CalendarItemFormData = z.infer<ReturnType<typeof createCalendarItemSchema>>;

interface CalendarItemFormProps {
  item?: CalendarItem | null;
  onSubmit: (data: CreateCalendarItemData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  defaultStartDate?: string; // Para criação rápida ao clicar no dia
}

const CALENDAR_ITEM_TYPES: CalendarItemType[] = ['Programação', 'Evento', 'Encontro', 'Reunião'];
const RECURRENCE_PATTERNS: { value: 'weekly' | 'monthly'; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
];

/**
 * Calcula a data de término padrão para eventos recorrentes sem data de término especificada.
 * A data será o último dia do ano atual que corresponde ao padrão de recorrência.
 */
function calculateDefaultRecurrenceEndDate(
  startDate: string,
  recurrencePattern: 'weekly' | 'monthly',
  recurrenceDayOfWeek?: number,
  recurrenceDayOfMonth?: number,
  recurrenceWeekOfMonth?: number
): string {
  const start = new Date(startDate);
  const currentYear = start.getFullYear();
  const yearEnd = endOfYear(start);

  if (recurrencePattern === 'weekly' && recurrenceDayOfWeek !== undefined && recurrenceDayOfWeek !== null) {
    // Para recorrência semanal: encontrar o último dia da semana do ano
    // Ex: último sábado de 2026
    const targetDayOfWeek = recurrenceDayOfWeek; // 0 = domingo, 6 = sábado
    
    // Começar do último dia do ano e ir voltando até encontrar o dia da semana correto
    const lastOccurrence = new Date(yearEnd);
    while (getDay(lastOccurrence) !== targetDayOfWeek) {
      lastOccurrence.setDate(lastOccurrence.getDate() - 1);
    }
    
    return lastOccurrence.toISOString().split('T')[0]; // Retorna apenas a data (YYYY-MM-DD)
  }

  if (recurrencePattern === 'monthly') {
    if (recurrenceDayOfMonth !== undefined && recurrenceDayOfMonth !== null) {
      // Para dia fixo do mês: usar 31 de dezembro (último dia do ano)
      return `${currentYear}-12-31`;
    }

    if (recurrenceWeekOfMonth !== undefined && recurrenceWeekOfMonth !== null && recurrenceDayOfWeek !== undefined && recurrenceDayOfWeek !== null) {
      // Para semana do mês: encontrar a última ocorrência do padrão no ano
      // Ex: última terça-feira da última semana de dezembro
      const targetDayOfWeek = recurrenceDayOfWeek;
      const targetWeekOfMonth = recurrenceWeekOfMonth; // -1 = última semana, 1-4 = primeira a quarta
      
      // Se for última semana (-1), buscar no último mês (dezembro)
      if (targetWeekOfMonth === -1) {
        const december = new Date(currentYear, 11, 1); // Dezembro (mês 11, índice 0)
        const lastDay = lastDayOfMonth(december);
        
        // Encontrar a última ocorrência do dia da semana em dezembro
        const lastOccurrence = new Date(lastDay);
        while (getDay(lastOccurrence) !== targetDayOfWeek) {
          lastOccurrence.setDate(lastOccurrence.getDate() - 1);
        }
        
        return lastOccurrence.toISOString().split('T')[0];
      } else {
        // Para semanas específicas (1-4), usar a última ocorrência em dezembro
        // Se dezembro não tiver essa semana, usar novembro
        const december = new Date(currentYear, 11, 1);
        const lastDay = lastDayOfMonth(december);
        
        // Tentar encontrar a ocorrência no mês de dezembro
        const lastOccurrence = new Date(lastDay);
        let found = false;
        
        // Ir voltando até encontrar o dia da semana correto
        while (!found && lastOccurrence.getMonth() === 11) {
          if (getDay(lastOccurrence) === targetDayOfWeek) {
            // Verificar se é a semana correta (simplificado: usar a última ocorrência)
            found = true;
          } else {
            lastOccurrence.setDate(lastOccurrence.getDate() - 1);
          }
        }
        
        return lastOccurrence.toISOString().split('T')[0];
      }
    }
  }

  // Para casos não cobertos: usar o último dia do ano
  return `${currentYear}-12-31`;
}

export function CalendarItemForm({
  item,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  defaultStartDate
}: CalendarItemFormProps) {
  const { congregations, loading: filtersLoading } = useFiltersData();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedResponsibleLabel, setSelectedResponsibleLabel] = useState<string>('');
  const [isAddingGroupMembers, setIsAddingGroupMembers] = useState(false); // Loading state
  const [tempParticipants, setTempParticipants] = useState<CreateParticipantData[]>([]); // Participantes temporários (modo criação)
  const participantsManagerRef = useRef<CalendarParticipantsManagerRef>(null); // Ref para acessar métodos do CalendarParticipantsManager

  // Criar schema dinamicamente com acesso às congregações
  const calendarItemSchema = useMemo(() => createCalendarItemSchema(congregations || []), [congregations]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
  } = useForm<CalendarItemFormData>({
    resolver: zodResolver(calendarItemSchema),
    defaultValues: mode === 'create' ? {
      is_recurring: false,
      congregation_id: '',
    } : {},
  });

  const selectedCongregation = watch('congregation_id');
  const responsibleId = watch('responsible_member_id') ?? '';
  const isRecurring = watch('is_recurring');
  const selectedGroupId = watch('group_id');
  const recurrenceDayOfMonth = watch('recurrence_day_of_month');
  const isMonthlyDayFixed =
    typeof recurrenceDayOfMonth === 'number' &&
    !Number.isNaN(recurrenceDayOfMonth) &&
    recurrenceDayOfMonth >= 1 &&
    recurrenceDayOfMonth <= 31;

  const {
    options: memberOptionsData,
    loading: membersLoading,
    setSearch: setMemberSearch,
  } = useMemberOptions({
    congregationId: selectedCongregation || undefined,
  });

  // Carregar grupos quando congregação mudar
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const data = await apiService.listGroups({ congregation_id: selectedCongregation || undefined });
        setGroups(data);
      } catch {
        toast.error('Erro ao carregar grupos');
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    if (selectedCongregation !== undefined) {
      loadGroups();
    }
  }, [selectedCongregation]);

  // Criar opções de membros (incluindo o membro selecionado mesmo que não esteja na lista atual)
  const memberOptions = useMemo(() => {
    const base = [
      { value: '', label: 'Nenhum' },
      ...memberOptionsData.map((m: { id: string; name: string }) => ({
        value: m.id,
        label: m.name
      }))
    ];

    // Se há um responsável selecionado que não está na lista, adicionar
    if (responsibleId && !base.some(option => option.value === responsibleId)) {
      base.push({ 
        value: responsibleId, 
        label: selectedResponsibleLabel || 'Responsável selecionado' 
      });
    }

    return base;
  }, [memberOptionsData, responsibleId, selectedResponsibleLabel]);

  // Função para adicionar membros do grupo selecionado como participantes
  const handleAddGroupMembers = async () => {
    if (!selectedGroupId) {
      toast.error('Selecione um grupo primeiro');
      return;
    }

    try {
      setIsAddingGroupMembers(true);

      // Buscar membros do grupo
      const groupMembers = await apiService.getGroupMembers(selectedGroupId);
      
      // Filtrar apenas membros ativos
      const activeMembers = groupMembers.filter((m: Member) => m.active);

      if (activeMembers.length === 0) {
        toast('Este grupo não possui membros ativos', { icon: 'ℹ️' });
        return;
      }

      // Preparar array de participantes
      const participantsData = activeMembers.map((member: Member) => ({
        member_id: member.id,
        // Dados temporários para exibição (não serão enviados ao backend)
        _tempMemberName: member.name,
        _tempMemberContact: member.whatsapp || member.phone || ''
      }));

      // Modo de criação (sem item.id): adicionar ao tempParticipants
      if (!item?.id) {
        // Filtrar duplicatas
        const existingMemberIds = tempParticipants
          .filter((p: CreateParticipantData) => p.member_id)
          .map((p: CreateParticipantData) => p.member_id);
        
        const newParticipants = participantsData.filter(
          (p: CreateParticipantData) => !existingMemberIds.includes(p.member_id)
        );

        if (newParticipants.length === 0) {
          toast('Todos os membros do grupo já foram adicionados', { icon: 'ℹ️' });
          return;
        }

        setTempParticipants([...tempParticipants, ...newParticipants]);
        toast.success(`${newParticipants.length} ${newParticipants.length === 1 ? 'membro adicionado' : 'membros adicionados'} do grupo!`);
        return;
      }

      // Modo de edição (com item.id): chamar endpoint bulk
      // Remover campos temporários antes de enviar (mesmo tratamento do modo de criação)
      const participantsDataClean = participantsData.map((participant: CreateParticipantData) => {
        const { _tempMemberName, _tempMemberContact, ...rest } = participant;
        void _tempMemberName;
        void _tempMemberContact;
        return rest;
      });
      const result = await apiService.addCalendarParticipantsBulk(item.id, participantsDataClean);

      // Notificar resultado baseado no summary
      const { added, duplicates, errors } = result.summary;
      
      if (added > 0) {
        toast.success(`${added} ${added === 1 ? 'membro adicionado' : 'membros adicionados'} do grupo!`);
      }
      
      if (duplicates > 0) {
        toast(`${duplicates} ${duplicates === 1 ? 'membro já estava' : 'membros já estavam'} na lista`, { icon: 'ℹ️' });
      }
      
      if (errors > 0) {
        toast.error(`Não foi possível adicionar ${errors} ${errors === 1 ? 'membro' : 'membros'}`);
      }

      // Atualizar lista de participantes no componente filho
      if (participantsManagerRef.current?.loadParticipants) {
        participantsManagerRef.current.loadParticipants();
      }
    } catch {
      toast.error('Não foi possível adicionar membros do grupo');
    } finally {
      setIsAddingGroupMembers(false);
    }
  };

  // Função auxiliar para converter data para input (evita dia a menos por UTC)
  const formatDateForInput = (dateString: string, includeTime: boolean = true): string => {
    if (!dateString) return '';
    const dateOnly = dateString.slice(0, 10);
    if (!includeTime) {
      // Para campo só data (ex: Data de Início da Recorrência): usar a parte da data como está,
      // para não interpretar UTC e exibir dia anterior no fuso local
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    if (includeTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return `${year}-${month}-${day}`;
  };

  // Preencher formulário quando item for fornecido (modo edição)
  useEffect(() => {
    if (mode === 'edit' && item) {
      if (item.is_recurring) {
        // Para eventos recorrentes: start_date é apenas data
        reset({
          title: item.title,
          type: item.type,
          description: item.description || '',
          start_date: formatDateForInput(item.start_date, false),
          end_date: '',
          is_recurring: item.is_recurring,
          recurrence_pattern: (item.recurrence_pattern === 'weekly' || item.recurrence_pattern === 'monthly') ? item.recurrence_pattern : '',
          recurrence_end_date: item.recurrence_end_date ? formatDateForInput(item.recurrence_end_date, false) : '',
          recurrence_time: item.recurrence_time ? item.recurrence_time.slice(0, 5) : '',
          recurrence_duration_minutes: item.recurrence_duration_minutes || '',
          recurrence_day_of_week: item.recurrence_day_of_week !== null && item.recurrence_day_of_week !== undefined ? item.recurrence_day_of_week : '',
          recurrence_day_of_month: item.recurrence_day_of_month !== null && item.recurrence_day_of_month !== undefined ? item.recurrence_day_of_month : '',
          recurrence_week_of_month: item.recurrence_week_of_month !== null && item.recurrence_week_of_month !== undefined ? item.recurrence_week_of_month : '',
          location: item.location || '',
          congregation_id: item.congregation_id || '',
          group_id: item.group_id || '',
          responsible_member_id: item.responsible_member_id || '',
        });
      } else {
        // Para eventos não recorrentes: start_date é datetime completo
        reset({
          title: item.title,
          type: item.type,
          description: item.description || '',
          start_date: formatDateForInput(item.start_date, true),
          end_date: item.end_date ? formatDateForInput(item.end_date, true) : '',
          is_recurring: item.is_recurring,
          recurrence_pattern: '',
          recurrence_end_date: '',
          recurrence_time: '',
          recurrence_duration_minutes: '',
          recurrence_day_of_week: '',
          recurrence_day_of_month: '',
          recurrence_week_of_month: '',
          location: item.location || '',
          congregation_id: item.congregation_id || '',
          group_id: item.group_id || '',
          responsible_member_id: item.responsible_member_id || '',
        });
      }

      // Definir label do responsável
      if (item.responsible_member?.name) {
        setSelectedResponsibleLabel(item.responsible_member.name);
      }
    } else if (mode === 'create' && defaultStartDate) {
      // Preencher data padrão quando criar a partir de um dia específico
      // Se for datetime-local, extrair apenas a data se for recorrente
      if (isRecurring) {
        setValue('start_date', defaultStartDate.slice(0, 10));
      } else {
        setValue('start_date', defaultStartDate);
      }
    }
  }, [item, mode, reset, setValue, defaultStartDate, isRecurring]);

  // Atualizar label do responsável quando selecionado
  useEffect(() => {
    if (responsibleId && memberOptionsData.length > 0) {
      const selectedMember = memberOptionsData.find((m: { id: string; name: string }) => m.id === responsibleId);
      if (selectedMember) {
        setSelectedResponsibleLabel(selectedMember.name);
      }
    } else {
      setSelectedResponsibleLabel('');
    }
  }, [responsibleId, memberOptionsData]);

  const onSubmitForm = async (data: CalendarItemFormData) => {
    try {
      const submitData: CreateCalendarItemData = {
        title: data.title,
        type: data.type,
        description: data.description || undefined,
        is_recurring: data.is_recurring,
        location: data.location || undefined,
        congregation_id: data.congregation_id || null,
        // status não é mais enviado, sempre será 'active' no backend
        group_id: data.group_id || null,
        responsible_member_id: data.responsible_member_id || null,
        // start_date sempre será definido abaixo
        start_date: '',
      };

      if (data.is_recurring) {
        // Para eventos recorrentes: start_date é apenas data (YYYY-MM-DD)
        submitData.start_date = data.start_date.includes('T') ? data.start_date.slice(0, 10) : data.start_date;
        submitData.recurrence_pattern = data.recurrence_pattern || undefined;
        
        // Se não há data de término especificada, calcular a data padrão (último dia do ano)
        if (!data.recurrence_end_date || data.recurrence_end_date === '') {
          const recurrenceDayOfWeek = data.recurrence_day_of_week !== '' && data.recurrence_day_of_week !== null && data.recurrence_day_of_week !== undefined 
            ? Number(data.recurrence_day_of_week) 
            : undefined;
          const recurrenceDayOfMonth = data.recurrence_day_of_month !== '' && data.recurrence_day_of_month !== null && data.recurrence_day_of_month !== undefined 
            ? Number(data.recurrence_day_of_month) 
            : undefined;
          const recurrenceWeekOfMonth = data.recurrence_week_of_month !== '' && data.recurrence_week_of_month !== null && data.recurrence_week_of_month !== undefined 
            ? Number(data.recurrence_week_of_month) 
            : undefined;
          
          const defaultEndDate = calculateDefaultRecurrenceEndDate(
            submitData.start_date,
            data.recurrence_pattern as 'weekly' | 'monthly',
            recurrenceDayOfWeek,
            recurrenceDayOfMonth,
            recurrenceWeekOfMonth
          );
          submitData.recurrence_end_date = new Date(defaultEndDate).toISOString();
        } else {
          submitData.recurrence_end_date = new Date(data.recurrence_end_date).toISOString();
        }
        
        submitData.recurrence_time = data.recurrence_time ? data.recurrence_time.slice(0, 5) : undefined;
        // Duração removida - não utilizada no momento
        submitData.recurrence_day_of_week = data.recurrence_day_of_week !== '' && data.recurrence_day_of_week !== null && data.recurrence_day_of_week !== undefined 
          ? Number(data.recurrence_day_of_week) 
          : undefined;
        submitData.recurrence_day_of_month = data.recurrence_day_of_month !== '' && data.recurrence_day_of_month !== null && data.recurrence_day_of_month !== undefined 
          ? Number(data.recurrence_day_of_month) 
          : undefined;
        submitData.recurrence_week_of_month = data.recurrence_week_of_month !== '' && data.recurrence_week_of_month !== null && data.recurrence_week_of_month !== undefined 
          ? Number(data.recurrence_week_of_month) 
          : undefined;
      } else {
        // Para eventos não recorrentes: start_date e end_date são datetime completos
        submitData.start_date = new Date(data.start_date).toISOString();
        submitData.end_date = data.end_date ? new Date(data.end_date).toISOString() : undefined;
      }

      // Adicionar participantes temporários se estivermos criando (modo create)
      if (mode === 'create' && tempParticipants.length > 0) {
        // Remover campos temporários antes de enviar ao backend
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        submitData.participants = tempParticipants.map(({ _tempMemberName: _, _tempMemberContact: __, ...rest }) => rest);
      }

      clearErrors();
      await onSubmit(submitData);
    } catch (error: unknown) {
      // Tratar erro mantendo dados do formulário
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar item do calendário';
      setError('root', { 
        message: errorMessage
      });
      throw error;
    }
  };

  const handleFormSubmit = handleSubmit(
    onSubmitForm,
    (errors) => {
      // Scroll para o primeiro erro
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        const element = document.querySelector(`[name="${firstError}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  );

  return (
    <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
      {/* Mensagem de erro geral */}
      {errors.root && (
        <Alert
          variant="error"
          message={errors.root.message || 'Erro ao processar formulário'}
          onClose={() => clearErrors('root')}
        />
      )}

      {/* Título e Tipo - lado a lado */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Ex: Culto Dominical"
            error={errors.title?.message}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo <span className="text-red-500">*</span>
          </label>
          <Select
            value={watch('type') || ''}
            onChange={(value) => setValue('type', value as CalendarItemType)}
            options={CALENDAR_ITEM_TYPES.map(type => ({ value: type, label: type }))}
            error={errors.type?.message}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Descrição - largura total */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Descrição detalhada do evento..."
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Checkbox Evento Recorrente - apenas no modo de criação */}
      {mode === 'create' && (
        <div className="flex items-center">
          <input
            id="is_recurring"
            type="checkbox"
            {...register('is_recurring')}
            className="h-4 w-4 accent-primary focus:ring-primary border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700 cursor-pointer">
            Evento recorrente
          </label>
        </div>
      )}

      {/* Data/Hora - diferente para recorrentes e não recorrentes */}
      {!isRecurring ? (
        // Eventos não recorrentes: Data e Hora de Início e Fim
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Data e Hora de Início <span className="text-red-500">*</span>
            </label>
            <Input
              id="start_date"
              type="datetime-local"
              {...register('start_date')}
              error={errors.start_date?.message}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              Data e Hora de Fim (opcional)
            </label>
            <Input
              id="end_date"
              type="datetime-local"
              {...register('end_date')}
              error={errors.end_date?.message}
              disabled={isLoading}
            />
          </div>
        </div>
      ) : (
        // Eventos recorrentes: Data de início da recorrência e Horário
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Data de Início da Recorrência <span className="text-red-500">*</span>
            </label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                error={errors.start_date?.message}
                disabled={isLoading}
              />
          </div>
          <div>
            <label htmlFor="recurrence_time" className="block text-sm font-medium text-gray-700 mb-1">
              Horário <span className="text-red-500">*</span>
            </label>
            <Input
              id="recurrence_time"
              type="time"
              {...register('recurrence_time')}
              error={errors.recurrence_time?.message}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Recorrência - campos aparecem abaixo dos campos de data/hora */}
      {isRecurring && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">

          {/* Padrão de Recorrência */}
          <div>
            <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700 mb-1">
              Padrão de Recorrência <span className="text-red-500">*</span>
            </label>
            <Select
              value={watch('recurrence_pattern') || ''}
              onChange={(value) => {
                setValue('recurrence_pattern', value as 'weekly' | 'monthly' || '');
                if (value === 'monthly') {
                  // Padrão: "Dia fixo do mês" com dia 1, para exibir o campo de dia
                  setValue('recurrence_day_of_month', 1);
                  setValue('recurrence_week_of_month', '');
                  setValue('recurrence_day_of_week', '');
                } else {
                  setValue('recurrence_day_of_week', '');
                  setValue('recurrence_day_of_month', '');
                  setValue('recurrence_week_of_month', '');
                }
              }}
              options={RECURRENCE_PATTERNS}
              error={errors.recurrence_pattern?.message}
              disabled={isLoading}
            />
          </div>

          {/* Campos específicos por padrão */}
          {watch('recurrence_pattern') === 'weekly' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="recurrence_day_of_week" className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana <span className="text-red-500">*</span>
                </label>
                <Select
                  value={watch('recurrence_day_of_week')?.toString() || ''}
                  onChange={(value) => setValue('recurrence_day_of_week', value ? Number(value) : '')}
                  options={[
                    { value: '0', label: 'Domingo' },
                    { value: '1', label: 'Segunda-feira' },
                    { value: '2', label: 'Terça-feira' },
                    { value: '3', label: 'Quarta-feira' },
                    { value: '4', label: 'Quinta-feira' },
                    { value: '5', label: 'Sexta-feira' },
                    { value: '6', label: 'Sábado' }
                  ]}
                  error={errors.recurrence_day_of_week?.message}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Término da Recorrência (opcional)
                </label>
                <Input
                  id="recurrence_end_date"
                  type="date"
                  {...register('recurrence_end_date')}
                  error={errors.recurrence_end_date?.message}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

            {watch('recurrence_pattern') === 'monthly' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Recorrência Mensal
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="monthly_type"
                        value="day"
                        checked={isMonthlyDayFixed}
                        onChange={() => {
                          setValue('recurrence_day_of_month', 1);
                          setValue('recurrence_week_of_month', '');
                          setValue('recurrence_day_of_week', '');
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Dia fixo do mês</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="monthly_type"
                        value="week"
                        checked={!isMonthlyDayFixed}
                        disabled={isLoading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed"
                        onChange={() => {
                          setValue('recurrence_day_of_month', undefined as unknown as number);
                          setValue('recurrence_week_of_month', 1);
                          setValue('recurrence_day_of_week', 0);
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">Semana do mês</span>
                    </label>
                  </div>
                </div>

                {/* Dia fixo do mês: campo para informar o dia (1-31) em que o item se repete */}
                {isMonthlyDayFixed ? (
                  <div>
                    <label htmlFor="recurrence_day_of_month" className="block text-sm font-medium text-gray-700 mb-1">
                      Dia do mês <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Informe o dia do mês (1 a 31) em que o item irá se repetir.</p>
                    <Input
                      id="recurrence_day_of_month"
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Ex.: 15"
                      {...register('recurrence_day_of_month', { valueAsNumber: true })}
                      error={errors.recurrence_day_of_month?.message}
                      disabled={isLoading}
                    />
                  </div>
                ) : (
                  /* Semana do mês: dia da semana + ordem (Primeira, Segunda, Terceira ou Última) — ex.: todo terceiro sábado */
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Ex.: evento repete todo terceiro sábado do mês.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="recurrence_week_of_month" className="block text-sm font-medium text-gray-700 mb-1">
                          Ordem no mês <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={watch('recurrence_week_of_month')?.toString() || ''}
                          onChange={(value) => setValue('recurrence_week_of_month', value ? Number(value) : '')}
                          options={[
                            { value: '1', label: 'Primeira' },
                            { value: '2', label: 'Segunda' },
                            { value: '3', label: 'Terceira' },
                            { value: '4', label: 'Quarta' },
                            { value: '-1', label: 'Última' }
                          ]}
                          error={errors.recurrence_week_of_month?.message}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label htmlFor="recurrence_day_of_week_monthly" className="block text-sm font-medium text-gray-700 mb-1">
                          Dia da semana <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={watch('recurrence_day_of_week')?.toString() || ''}
                          onChange={(value) => setValue('recurrence_day_of_week', value ? Number(value) : '')}
                          options={[
                            { value: '0', label: 'Domingo' },
                            { value: '1', label: 'Segunda-feira' },
                            { value: '2', label: 'Terça-feira' },
                            { value: '3', label: 'Quarta-feira' },
                            { value: '4', label: 'Quinta-feira' },
                            { value: '5', label: 'Sexta-feira' },
                            { value: '6', label: 'Sábado' }
                          ]}
                          error={errors.recurrence_day_of_week?.message}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Data de Término para recorrência mensal */}
          {watch('recurrence_pattern') === 'monthly' && (
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                Término da Recorrência (opcional)
              </label>
              <Input
                id="recurrence_end_date"
                type="date"
                {...register('recurrence_end_date')}
                error={errors.recurrence_end_date?.message}
              />
            </div>
          )}
        </div>
      )}

      {/* Local e Congregação - duas colunas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Local
          </label>
          <Input
            id="location"
            {...register('location')}
            placeholder="Ex: Templo Principal..."
            error={errors.location?.message}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="congregation_id" className="block text-sm font-medium text-gray-700 mb-1">
            Congregação
          </label>
          <Select
            value={watch('congregation_id') || ''}
            onChange={(value) => setValue('congregation_id', value || '')}
            options={[
              { value: '', label: 'Todas as congregações' },
              ...(congregations || []).map((c: { id: string; name: string; abbreviation?: string | null }) => ({ value: c.id, label: getCongregationDisplayName(c) }))
            ]}
            error={errors.congregation_id?.message}
            disabled={filtersLoading}
          />
        </div>
      </div>

      {/* Grupo e Responsável - duas colunas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="group_id" className="block text-sm font-medium text-gray-700 mb-1">
            Grupo / Ministério (opcional)
          </label>
          <Select
            value={watch('group_id') || ''}
            onChange={(value) => setValue('group_id', value || null)}
            options={[
              { value: '', label: 'Nenhum' },
              ...groups.map((g: Group) => ({ value: g.id, label: `${g.type}: ${g.name}` }))
            ]}
            error={errors.group_id?.message}
            disabled={loadingGroups}
            searchable
          />
        </div>
        <div>
          <label htmlFor="responsible_member_id" className="block text-sm font-medium text-gray-700 mb-1">
            Responsável (opcional)
          </label>
          <Select
            value={watch('responsible_member_id') || ''}
            onChange={(value) => {
              setValue('responsible_member_id', value || null);
              const match = memberOptionsData.find((m: { id: string; name: string }) => m.id === value);
              if (match) {
                setSelectedResponsibleLabel(match.name);
              } else if (!value) {
                setSelectedResponsibleLabel('');
              }
            }}
            options={memberOptions}
            error={errors.responsible_member_id?.message}
            disabled={membersLoading}
            searchable
            onSearchChange={setMemberSearch}
            placeholder="Digite para buscar"
          />
        </div>
      </div>

      {/* Participantes */}
      <div className="border-t pt-4">
        <CalendarParticipantsManager
          ref={participantsManagerRef}
          calendarItemId={item?.id}
          congregationId={selectedCongregation}
          showAddGroupButton={!!selectedGroupId}
          onAddGroupMembers={handleAddGroupMembers}
          isAddingGroupMembers={isAddingGroupMembers}
          tempParticipants={tempParticipants}
          onTempParticipantsChange={setTempParticipants}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
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
          variant="primary"
          isLoading={isLoading}
          disabled={filtersLoading || loadingGroups}
        >
          {mode === 'create' ? 'Criar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
