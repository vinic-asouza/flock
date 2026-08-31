'use client';

import {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  IntegrationBaptismType,
  IntegrationMemberPayload,
  IntegrationSundayAttendance,
} from '@/types';

export const BAPTISM_TYPE_OPTIONS: { value: IntegrationBaptismType; label: string }[] = [
  { value: 'catolica', label: 'Fui batizado(a) na igreja católica' },
  { value: 'adulto_nesta_igreja', label: 'Fui batizado(a) quando adulto — nesta igreja' },
  { value: 'adulto_outra_igreja', label: 'Fui batizado(a) quando adulto — em outra igreja evangélica' },
  { value: 'crianca_nesta_igreja', label: 'Fui batizado(a) quando criança — nesta igreja' },
  { value: 'crianca_outra_igreja', label: 'Fui batizado(a) quando criança — em outra igreja evangélica' },
  { value: 'novo_convertido', label: 'Sou novo(a) convertido(a) — minha religião anterior era:' },
  { value: 'sem_religiao', label: 'Sou novo(a) convertido(a) — não tinha religião anterior' },
];

export const ecclesiasticalQuestionnaireSchema = z.object({
  years_evangelical: z.string().optional().or(z.literal('')),
  evangelical_family: z.boolean().optional(),
  is_baptized: z.boolean().optional(),
  baptism_type: z.union([
    z.literal(''),
    z.enum([
      'catolica',
      'adulto_nesta_igreja',
      'adulto_outra_igreja',
      'crianca_nesta_igreja',
      'crianca_outra_igreja',
      'novo_convertido',
      'sem_religiao',
    ]),
  ]).optional(),
  baptism_other_church_name: z.string().optional().or(z.literal('')),
  previous_religion: z.string().optional().or(z.literal('')),
  previous_church_active: z.boolean().optional(),
  reason_joining: z.string().optional().or(z.literal('')),
  time_attending: z.string().optional().or(z.literal('')),
  sunday_attendance: z.union([
    z.literal(''),
    z.enum(['todos_os_domingos', 'regularmente', 'as_vezes', 'nao']),
  ]).optional(),
  weekly_activities: z.boolean().optional(),
  weekly_activities_which: z.string().optional().or(z.literal('')),
});

export type EcclesiasticalQuestionnaireFields = z.infer<typeof ecclesiasticalQuestionnaireSchema>;

export const ecclesiasticalDefaultValues: EcclesiasticalQuestionnaireFields = {
  years_evangelical: '',
  evangelical_family: undefined,
  is_baptized: undefined,
  baptism_type: undefined,
  baptism_other_church_name: '',
  previous_religion: '',
  previous_church_active: undefined,
  reason_joining: '',
  time_attending: '',
  sunday_attendance: undefined,
  weekly_activities: undefined,
  weekly_activities_which: '',
};

function emptyToNull(value?: string | null): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

export function ecclesiasticalFieldsFromForm(
  data: EcclesiasticalQuestionnaireFields
): Pick<
  IntegrationMemberPayload,
  | 'years_evangelical'
  | 'evangelical_family'
  | 'is_baptized'
  | 'baptism_type'
  | 'baptism_other_church_name'
  | 'previous_religion'
  | 'previous_church_active'
  | 'reason_joining'
  | 'time_attending'
  | 'sunday_attendance'
  | 'weekly_activities'
  | 'weekly_activities_which'
> {
  return {
    years_evangelical: emptyToNull(data.years_evangelical),
    evangelical_family: data.evangelical_family ?? null,
    is_baptized: data.is_baptized ?? null,
    baptism_type: (data.baptism_type || null) as IntegrationMemberPayload['baptism_type'],
    baptism_other_church_name: emptyToNull(data.baptism_other_church_name),
    previous_religion: emptyToNull(data.previous_religion),
    previous_church_active: data.previous_church_active ?? null,
    reason_joining: emptyToNull(data.reason_joining),
    time_attending: emptyToNull(data.time_attending),
    sunday_attendance: (data.sunday_attendance || null) as IntegrationMemberPayload['sunday_attendance'],
    weekly_activities: data.weekly_activities ?? null,
    weekly_activities_which: emptyToNull(data.weekly_activities_which),
  };
}

export function timeAttendingLabel(churchName?: string | null): string {
  const name = churchName?.trim();
  if (!name) return 'Há quanto tempo frequenta a igreja?';
  return `Há quanto tempo frequenta a ${name}?`;
}

function RadioSimNao({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={label}>
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center min-h-[42px] gap-4 flex-wrap">
        {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
          <label key={l} className="flex items-center gap-2 cursor-pointer min-h-11">
            <input
              type="radio"
              name={name}
              value={v ? 'sim' : 'nao'}
              checked={value === v}
              onChange={() => onChange(v)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
            />
            <span className="text-sm text-gray-700">{l}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface EcclesiasticalQuestionnaireProps<T extends FieldValues> {
  churchName?: string | null;
  isLoading?: boolean;
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
}

export function EcclesiasticalQuestionnaire<T extends FieldValues>({
  churchName,
  isLoading = false,
  register,
  watch,
  setValue,
  errors,
}: EcclesiasticalQuestionnaireProps<T>) {
  const isBaptized = watch('is_baptized' as Path<T>) as boolean | undefined;
  const baptismType = watch('baptism_type' as Path<T>) as IntegrationBaptismType | undefined;
  const weeklyActivities = watch('weekly_activities' as Path<T>) as boolean | undefined;
  const showPreviousChurchActive =
    baptismType === 'adulto_outra_igreja' || baptismType === 'crianca_outra_igreja';
  const showBaptismOtherChurch = showPreviousChurchActive;
  const showPreviousReligion = baptismType === 'novo_convertido';

  const yearsError = (errors as FieldErrors<EcclesiasticalQuestionnaireFields>).years_evangelical?.message;
  const otherChurchError = (errors as FieldErrors<EcclesiasticalQuestionnaireFields>).baptism_other_church_name?.message;
  const previousReligionError = (errors as FieldErrors<EcclesiasticalQuestionnaireFields>).previous_religion?.message;
  const timeError = (errors as FieldErrors<EcclesiasticalQuestionnaireFields>).time_attending?.message;

  return (
    <div className="space-y-5">
      <Input
        label="É cristão evangélico há quantos anos?"
        placeholder="Ex: 10"
        error={yearsError}
        isLoading={isLoading}
        {...register('years_evangelical' as Path<T>)}
      />

      <RadioSimNao
        name="evangelical_family"
        label="Vem de família Cristã Evangélica?"
        value={watch('evangelical_family' as Path<T>) as boolean | undefined}
        onChange={(v) => setValue('evangelical_family' as Path<T>, v as T[Path<T>])}
        disabled={isLoading}
      />

      <div className="space-y-3">
        <RadioSimNao
          name="is_baptized"
          label="Já é batizado(a)?"
          value={isBaptized}
          onChange={(v) => {
            setValue('is_baptized' as Path<T>, v as T[Path<T>]);
            if (!v) {
              setValue('baptism_type' as Path<T>, undefined as T[Path<T>]);
              setValue('baptism_other_church_name' as Path<T>, '' as T[Path<T>]);
              setValue('previous_religion' as Path<T>, '' as T[Path<T>]);
              setValue('previous_church_active' as Path<T>, undefined as T[Path<T>]);
            }
          }}
          disabled={isLoading}
        />

        {isBaptized && (
          <div className="pl-4 border-l-2 border-primary/30 space-y-3">
            <p className="text-sm font-medium text-gray-700">Selecione uma opção:</p>
            {BAPTISM_TYPE_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer group min-h-11">
                <input
                  type="radio"
                  name="baptism_type"
                  checked={baptismType === value}
                  onChange={() => {
                    setValue('baptism_type' as Path<T>, value as T[Path<T>]);
                    setValue('baptism_other_church_name' as Path<T>, '' as T[Path<T>]);
                    setValue('previous_religion' as Path<T>, '' as T[Path<T>]);
                    setValue('previous_church_active' as Path<T>, undefined as T[Path<T>]);
                  }}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
              </label>
            ))}

            {showBaptismOtherChurch && (
              <div className="pl-6">
                <Input
                  label="Nome da igreja que foi batizado"
                  placeholder="Nome da igreja em que foi batizado(a)"
                  error={otherChurchError}
                  isLoading={isLoading}
                  {...register('baptism_other_church_name' as Path<T>)}
                />
              </div>
            )}

            {showPreviousReligion && (
              <div className="pl-6">
                <Input
                  label="Qual era sua religião anterior?"
                  placeholder="Ex: Espírita, Católica, etc."
                  error={previousReligionError}
                  isLoading={isLoading}
                  {...register('previous_religion' as Path<T>)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showPreviousChurchActive && (
        <RadioSimNao
          name="previous_church_active"
          label="Atualmente é ou era membro ativo da igreja anterior?"
          value={watch('previous_church_active' as Path<T>) as boolean | undefined}
          onChange={(v) => setValue('previous_church_active' as Path<T>, v as T[Path<T>])}
          disabled={isLoading}
        />
      )}

      <div>
        <label htmlFor="reason_joining" className="block text-sm font-medium text-gray-700 mb-1">
          Descreva o(s) motivo(s) de ter decidido tornar-se membro de nossa Igreja
        </label>
        <textarea
          id="reason_joining"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-[16px] md:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          rows={3}
          placeholder="Escreva aqui..."
          disabled={isLoading}
          {...register('reason_joining' as Path<T>)}
        />
      </div>

      <Input
        label={timeAttendingLabel(churchName)}
        placeholder="Ex: 2 anos"
        error={timeError}
        isLoading={isLoading}
        {...register('time_attending' as Path<T>)}
      />

      <Select
        label="Frequenta nossos cultos?"
        value={(watch('sunday_attendance' as Path<T>) as IntegrationSundayAttendance | undefined) || ''}
        onChange={(value) =>
          setValue(
            'sunday_attendance' as Path<T>,
            (value || undefined) as T[Path<T>]
          )
        }
        options={[
          { value: '', label: 'Selecione uma opção' },
          { value: 'regularmente', label: 'Regularmente' },
          { value: 'as_vezes', label: 'Às vezes' },
          { value: 'nao', label: 'Não' },
        ]}
        disabled={isLoading}
      />

      <div className="space-y-3">
        <RadioSimNao
          name="weekly_activities"
          label="Participa de alguma outra atividade semanal?"
          value={weeklyActivities}
          onChange={(v) => {
            setValue('weekly_activities' as Path<T>, v as T[Path<T>]);
            if (!v) setValue('weekly_activities_which' as Path<T>, '' as T[Path<T>]);
          }}
          disabled={isLoading}
        />
        {weeklyActivities && (
          <div className="pl-4 border-l-2 border-primary/30">
            <label htmlFor="weekly_activities_which" className="block text-sm font-medium text-gray-700 mb-1">
              Quais atividades?
            </label>
            <textarea
              id="weekly_activities_which"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-[16px] md:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={2}
              placeholder="Descreva as atividades..."
              disabled={isLoading}
              {...register('weekly_activities_which' as Path<T>)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
