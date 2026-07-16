'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { X } from 'lucide-react';
import { useIbgeData } from '@/hooks/useIbgeData';
import { useProfessions } from '@/hooks/useProfessions';
import { apiService } from '@/services/api';
import { Group } from '@/types';
import { validateDateFormat } from '@/utils/validations';
import { formatDateToISO } from '@/utils';
import { memberSchema, MemberFormData } from '@/components/members/memberFormSchema';
import { getCongregationDisplayName } from '@/utils/congregation';

function getDefaultCongregationId(congregations: { id: string; name: string; is_primary?: boolean }[]): string {
  if (!congregations.length) return '';
  return (congregations.find((c) => c.is_primary) || congregations[0]).id;
}

interface Child {
  name: string;
  birth?: string;
  dependent?: boolean;
}

interface PublicMemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  churchName?: string;
  error?: string | null;
  congregations?: { id: string; name: string; abbreviation?: string | null; is_primary?: boolean }[];
  registrationToken?: string;
  submitDisabled?: boolean;
}

const formatPhone = (value: string): string => {
  const n = value.replace(/\D/g, '');
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const formatCEP = (value: string): string => {
  const n = value.replace(/\D/g, '');
  return n.replace(/(\d{5})(\d{3})/, '$1-$2');
};

const applyDateMask = (value: string): string => {
  const n = value.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
};

const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  const birthDate = new Date(birth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

function RadioSimNao({ label, value, onChange, disabled }: { label: string; value?: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center min-h-[42px] gap-4 flex-wrap">
        {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
          <label key={l} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
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

function RadioSimNaoFalecido({ label, value, onChange, disabled }: { label: string; value?: 'sim' | 'nao' | 'falecido'; onChange: (v: 'sim' | 'nao' | 'falecido') => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center min-h-[42px] gap-4 flex-wrap">
        {[{ v: 'sim', l: 'Sim' }, { v: 'nao', l: 'Não' }, { v: 'falecido', l: 'Falecido(a)' }].map(({ v, l }) => (
          <label key={v} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={value === v}
              onChange={() => onChange(v as 'sim' | 'nao' | 'falecido')}
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

export function PublicMemberForm({
  onSubmit,
  onCancel,
  isLoading = false,
  churchName,
  error,
  congregations = [],
  registrationToken,
  submitDisabled = false,
}: PublicMemberFormProps) {
  const { states, cities, loadingStates, loadingCities, errorStates, errorCities, fetchCities } = useIbgeData();
  const { professions, loading: professionsLoading } = useProfessions();

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [weddingDateDisplay, setWeddingDateDisplay] = useState('');
  const [admissionDateDisplay, setAdmissionDateDisplay] = useState('');
  const [occupationOtherError, setOccupationOtherError] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenBirthDisplays, setChildrenBirthDisplays] = useState<Record<number, string>>({});
  const [isInfantMember, setIsInfantMember] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsLoadFailed, setGroupsLoadFailed] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
    watch,
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
      congregation_id: '',
    },
  });

  const selectedState = watch('state');
  const selectedOccupation = watch('occupation');
  const occupationOtherValue = watch('occupation_other');
  const selectedMaritalStatus = watch('marital_status');
  const selectedCongregationId = watch('congregation_id');
  const isBaptized = watch('is_baptized');
  const baptismType = watch('baptism_type');
  const weeklyActivities = watch('weekly_activities');

  const isCasado = selectedMaritalStatus === 'Casado' || selectedMaritalStatus === 'União Estável';
  const showPreviousChurchActive = baptismType === 'adulto_outra_igreja' || baptismType === 'crianca_outra_igreja';
  const showBaptismOtherChurch = baptismType === 'adulto_outra_igreja' || baptismType === 'crianca_outra_igreja';
  const showPreviousReligion = baptismType === 'novo_convertido';

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  // Definir congregação principal como padrão
  useEffect(() => {
    if (!selectedCongregationId && congregations.length > 0) {
      setValue('congregation_id', getDefaultCongregationId(congregations));
    }
  }, [congregations, selectedCongregationId, setValue]);

  useEffect(() => {
    const loadGroups = async () => {
      if (!registrationToken || !selectedCongregationId) { setAvailableGroups([]); return; }
      try {
        setLoadingGroups(true);
        setGroupsLoadFailed(false);
        const response = await apiService.listPublicRegistrationGroups(registrationToken, selectedCongregationId);
        setAvailableGroups(response);
      } catch {
        setGroupsLoadFailed(true);
        setAvailableGroups([]);
      } finally { setLoadingGroups(false); }
    };
    loadGroups();
  }, [selectedCongregationId, registrationToken]);

  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) fetchCities(state.id.toString());
    }
  }, [selectedState, states, fetchCities]);

  useEffect(() => {
    if (occupationOtherError && occupationOtherValue?.trim()) setOccupationOtherError('');
  }, [occupationOtherValue, occupationOtherError]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'whatsapp') => {
    const formatted = formatPhone(e.target.value);
    if (field === 'phone') { setPhoneDisplay(formatted); setValue('phone', e.target.value.replace(/\D/g, '')); }
    else { setWhatsappDisplay(formatted); setValue('whatsapp', e.target.value.replace(/\D/g, '')); }
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCepDisplay(formatCEP(e.target.value));
    setValue('cep', e.target.value.replace(/\D/g, ''));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'birth' | 'admission_date' | 'wedding_date') => {
    const formatted = applyDateMask(e.target.value);
    if (field === 'birth') {
      setBirthDisplay(formatted);
      setValue('birth', formatted);
      if (formatted.length === 10 && !validateDateFormat(formatted)) setError('birth', { type: 'manual', message: 'Data inválida. Use DD/MM/YYYY' });
      else if (formatted.length === 10) clearErrors('birth');
    } else if (field === 'admission_date') {
      setAdmissionDateDisplay(formatted);
      setValue('admission_date', formatted);
      if (formatted.length === 10 && !validateDateFormat(formatted)) setError('admission_date', { type: 'manual', message: 'Data inválida. Use DD/MM/YYYY' });
      else if (formatted.length === 10) clearErrors('admission_date');
    } else {
      setWeddingDateDisplay(formatted);
      setValue('wedding_date', formatted);
    }
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    if (data.occupation === 'Outra' && !data.occupation_other?.trim()) {
      setOccupationOtherError('Por favor, especifique a profissão');
      return;
    }
    setOccupationOtherError('');

    const childrenWithISO = children.map(c => ({
      name: c.name,
      birth: c.birth ? formatDateToISO(c.birth) || undefined : undefined,
      dependent: c.dependent,
    }));

    const admissionDateISO = formatDateToISO(data.admission_date) || '';
    let baptismDateISO: string | undefined;
    if (data.admission === 'Batismo' || data.admission === 'Batismo Infantil') baptismDateISO = admissionDateISO;

    const payload = {
      ...data,
      birth: formatDateToISO(data.birth) || '',
      baptism_date: baptismDateISO,
      admission_date: admissionDateISO,
      wedding_date: data.wedding_date ? formatDateToISO(data.wedding_date) || undefined : undefined,
      occupation: data.occupation === 'Outra' ? (data.occupation_other || '') : data.occupation,
      occupation_other: undefined,
      congregation_id: data.congregation_id,
      children: childrenWithISO,
      groups: selectedGroups,
    };

    await onSubmit(payload);

    setPhoneDisplay(''); setWhatsappDisplay(''); setCepDisplay('');
    setBirthDisplay(''); setAdmissionDateDisplay(''); setWeddingDateDisplay('');
    setOccupationOtherError('');
    setChildren([]); setChildrenBirthDisplays({});
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">

      {/* ─── INFORMAÇÕES BÁSICAS ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Básicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome Completo (obrigatório)"
            placeholder="Digite o nome completo"
            error={errors.name?.message}
            isLoading={isLoading}
            {...register('name')}
          />
          <Input
            label="Data de Nascimento (obrigatório)"
            placeholder="DD/MM/AAAA"
            value={birthDisplay}
            onChange={(e) => handleDateChange(e, 'birth')}
            maxLength={10}
            error={errors.birth?.message}
            isLoading={isLoading}
          />
          <Input
            label="Natural de (Cidade de origem)"
            placeholder="Ex: São Paulo - SP"
            error={errors.hometown?.message}
            isLoading={isLoading}
            {...register('hometown')}
          />
          <Select
            label="Gênero (obrigatório)"
            value={watch('gender') || ''}
            onChange={(value) => setValue('gender', value as 'Masculino' | 'Feminino')}
            options={[
              { value: 'Masculino', label: 'Masculino' },
              { value: 'Feminino', label: 'Feminino' },
            ]}
            placeholder="Selecione o gênero"
            disabled={isLoading}
          />
          <Select
            label="Profissão"
            value={selectedOccupation || ''}
            onChange={(value) => setValue('occupation', value)}
            options={[
              { value: '', label: 'Selecione a profissão' },
              ...professions.map(p => ({ value: p.name, label: p.name })),
              { value: 'Outra', label: 'Outra' },
            ]}
            placeholder="Selecione a profissão"
            disabled={professionsLoading || isLoading}
            searchable={true}
          />
          {selectedOccupation === 'Outra' && (
            <div className="md:col-span-2">
              <Input
                label="Especifique a profissão"
                placeholder="Digite a profissão"
                error={occupationOtherError}
                isLoading={isLoading}
                {...register('occupation_other')}
              />
            </div>
          )}

          <Select
            label="Estado Civil (obrigatório)"
            value={watch('marital_status') || ''}
            onChange={(value) => setValue('marital_status', value as MemberFormData['marital_status'])}
            options={[
              { value: 'Solteiro', label: 'Solteiro(a)' },
              { value: 'Casado', label: 'Casado(a)' },
              { value: 'União Estável', label: 'União Estável' },
              { value: 'Divorciado', label: 'Divorciado(a)' },
              { value: 'Viúvo', label: 'Viúvo(a)' },
              { value: 'Outro', label: 'Outro' },
            ]}
            placeholder="Selecione o estado civil"
            disabled={isLoading}
          />
          {isCasado && (
            <Input
              label={selectedMaritalStatus === 'União Estável' ? 'Data da União' : 'Data do Casamento'}
              placeholder="DD/MM/AAAA"
              value={weddingDateDisplay}
              onChange={(e) => handleDateChange(e, 'wedding_date')}
              maxLength={10}
              error={errors.wedding_date?.message}
              isLoading={isLoading}
            />
          )}

          {isCasado && (
            <>
              <Input
                label="Nome do Cônjuge"
                placeholder="Nome completo do cônjuge"
                error={errors.spouse?.message}
                isLoading={isLoading}
                {...register('spouse')}
              />
              <RadioSimNao
                label="Cônjuge é membro da igreja?"
                value={watch('spouse_is_member')}
                onChange={(v) => setValue('spouse_is_member', v)}
                disabled={isLoading}
              />
            </>
          )}

        </div>
      </div>

      {/* ─── FAMÍLIA ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Família
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome do Pai"
            placeholder="Nome completo do pai"
            error={errors.father_name?.message}
            isLoading={isLoading}
            {...register('father_name')}
          />
          <RadioSimNaoFalecido
            label="É membro da igreja?"
            value={watch('father_is_member')}
            onChange={(v) => setValue('father_is_member', v)}
            disabled={isLoading}
          />

          <Input
            label="Nome da Mãe"
            placeholder="Nome completo da mãe"
            error={errors.mother_name?.message}
            isLoading={isLoading}
            {...register('mother_name')}
          />
          <RadioSimNaoFalecido
            label="É membro da igreja?"
            value={watch('mother_is_member')}
            onChange={(v) => setValue('mother_is_member', v)}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 pb-2 pt-2">
          <h4 className="text-base font-medium text-gray-900">Filhos</h4>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setChildren([...children, { name: '', birth: '' }])}
            disabled={isLoading}
          >
            Adicionar Filho
          </Button>
        </div>

        {children.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum filho adicionado</p>
        ) : (
          <div className="space-y-4">
            {children.map((child, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Filho {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = children.filter((_, i) => i !== index);
                      setChildren(next);
                      setValue('children', next);
                      const displays = { ...childrenBirthDisplays };
                      delete displays[index];
                      const reindexed: Record<number, string> = {};
                      Object.keys(displays).forEach(k => {
                        const old = parseInt(k);
                        reindexed[old > index ? old - 1 : old] = displays[old];
                      });
                      setChildrenBirthDisplays(reindexed);
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <X size={16} />
                    Remover
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <Input
                      label="Nome do Filho (obrigatório)"
                      placeholder="Nome completo"
                      value={child.name}
                      onChange={(e) => {
                        const next = [...children];
                        next[index] = { ...child, name: e.target.value };
                        setChildren(next);
                        setValue('children', next);
                      }}
                      isLoading={isLoading}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Data de Nascimento"
                      placeholder="DD/MM/AAAA"
                      value={childrenBirthDisplays[index] || ''}
                      onChange={(e) => {
                        const formatted = applyDateMask(e.target.value);
                        setChildrenBirthDisplays(prev => ({ ...prev, [index]: formatted }));
                        const next = [...children];
                        next[index] = { ...child, birth: formatted };
                        setChildren(next);
                        setValue('children', next);
                      }}
                      maxLength={10}
                      isLoading={isLoading}
                    />
                    {child.birth && (() => {
                      const iso = formatDateToISO(child.birth);
                      const age = iso ? calcularIdade(iso) : null;
                      return age !== null ? <p className="text-xs text-gray-500 mt-1">{age} {age === 1 ? 'ano' : 'anos'}</p> : null;
                    })()}
                  </div>
                  <div className="md:col-span-1">
                    <RadioSimNao
                      label="Reside com você?"
                      value={child.dependent}
                      onChange={(v) => {
                        const next = [...children];
                        next[index] = { ...child, dependent: v };
                        setChildren(next);
                        setValue('children', next);
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── CONTATO E ENDEREÇO ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Contato e Endereço
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              error={errors.email?.message}
              isLoading={isLoading}
              {...register('email')}
            />
          </div>
          <div className="md:col-span-1">
            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={phoneDisplay}
              onChange={(e) => handlePhoneChange(e, 'phone')}
              maxLength={15}
              error={errors.phone?.message}
              isLoading={isLoading}
            />
          </div>
          <div className="md:col-span-1">
            <Input
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              value={whatsappDisplay}
              onChange={(e) => handlePhoneChange(e, 'whatsapp')}
              maxLength={15}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Input
            label="CEP"
            placeholder="12345-678"
            value={cepDisplay}
            onChange={handleCEPChange}
            maxLength={9}
            error={errors.cep?.message}
            isLoading={isLoading}
          />
          <Select
            label="Estado (obrigatório)"
            value={watch('state') || ''}
            onChange={(value) => setValue('state', value)}
            options={[
              { value: '', label: 'Selecione o estado' },
              ...states.map(s => ({ value: s.sigla, label: s.nome })),
            ]}
            disabled={isLoading || submitDisabled}
            searchable={true}
            error={errors.state?.message}
          />
          {errorStates && !loadingStates && (
            <p className="mt-1 text-xs text-amber-700 md:col-span-3">
              Não foi possível carregar estados pela API do IBGE. Usando lista padrão de UFs.
            </p>
          )}
          <Select
            label="Cidade (obrigatório)"
            value={watch('city') || ''}
            onChange={(value) => setValue('city', value)}
            options={[
              { value: '', label: !watch('state') ? 'Selecione o estado primeiro' : loadingCities ? 'Carregando...' : 'Selecione a cidade' },
              ...cities.map(c => ({ value: c.nome, label: c.nome })),
            ]}
            disabled={!watch('state') || loadingCities || isLoading || submitDisabled}
            searchable={true}
            error={errors.city?.message}
          />
          {errorCities && watch('state') && !loadingCities && (
            <p className="mt-1 text-xs text-amber-700 md:col-span-3">
              Não foi possível carregar cidades deste estado. Tente selecionar o estado novamente.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço (obrigatório)"
            placeholder="Rua das Flores"
            error={errors.address?.message}
            isLoading={isLoading}
            {...register('address')}
          />
          <Input
            label="Número"
            placeholder="123"
            error={errors.address_number?.message}
            isLoading={isLoading}
            {...register('address_number')}
          />
          <Input
            label="Bairro"
            placeholder="Centro"
            error={errors.neighborhood?.message}
            isLoading={isLoading}
            {...register('neighborhood')}
          />
          <Input
            label="Complemento"
            placeholder="Apartamento, bloco, etc."
            error={errors.complement?.message}
            isLoading={isLoading}
            {...register('complement')}
          />
        </div>
      </div>

      {/* ─── INFORMAÇÕES ECLESIÁSTICAS ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Eclesiásticas
        </h3>

        <div className="space-y-5">
          <Input
            label="É cristão(ã) evangélico(a) há quantos anos?"
            placeholder="Ex: 10"
            error={errors.years_evangelical?.message}
            isLoading={isLoading}
            {...register('years_evangelical')}
          />

          <RadioSimNao
            label="Vem de família Cristã Evangélica?"
            value={watch('evangelical_family')}
            onChange={(v) => setValue('evangelical_family', v)}
            disabled={isLoading}
          />

          <div className="space-y-3">
            <RadioSimNao
              label="Já é batizado(a)?"
              value={isBaptized}
              onChange={(v) => { setValue('is_baptized', v); if (!v) { setValue('baptism_type', undefined); setValue('baptism_other_church_name', ''); setValue('previous_religion', ''); } }}
              disabled={isLoading}
            />

            {isBaptized && (
              <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                <p className="text-sm font-medium text-gray-700">Selecione uma opção:</p>
                {[
                  { v: 'catolica', l: 'Fui batizado(a) na igreja católica' },
                  { v: 'adulto_nesta_igreja', l: 'Fui batizado(a) quando adulto — nesta igreja' },
                  { v: 'adulto_outra_igreja', l: 'Fui batizado(a) quando adulto — em outra igreja evangélica' },
                  { v: 'crianca_nesta_igreja', l: 'Fui batizado(a) quando criança — nesta igreja' },
                  { v: 'crianca_outra_igreja', l: 'Fui batizado(a) quando criança — em outra igreja evangélica' },
                  { v: 'novo_convertido', l: 'Sou novo(a) convertido(a) — minha religião anterior era:' },
                  { v: 'sem_religiao', l: 'Sou novo(a) convertido(a) — não tinha religião anterior' },
                ].map(({ v, l }) => (
                  <label key={v} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="baptism_type"
                      checked={baptismType === v}
                      onChange={() => { setValue('baptism_type', v as MemberFormData['baptism_type']); setValue('baptism_other_church_name', ''); setValue('previous_religion', ''); }}
                      disabled={isLoading}
                      className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{l}</span>
                  </label>
                ))}

                {showBaptismOtherChurch && (
                  <div className="pl-6">
                    <Input
                      label="Nome da igreja que foi batizado"
                      placeholder="Nome da igreja em que foi batizado(a)"
                      error={errors.baptism_other_church_name?.message}
                      isLoading={isLoading}
                      {...register('baptism_other_church_name')}
                    />
                  </div>
                )}
                {showPreviousReligion && (
                  <div className="pl-6">
                    <Input
                      label="Qual era sua religião anterior?"
                      placeholder="Ex: Espírita, Católica, etc."
                      error={errors.previous_religion?.message}
                      isLoading={isLoading}
                      {...register('previous_religion')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {showPreviousChurchActive && (
            <RadioSimNao
              label="Atualmente é ou era membro ativo da igreja anterior?"
              value={watch('previous_church_active')}
              onChange={(v) => setValue('previous_church_active', v)}
              disabled={isLoading}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descreva o(s) motivo(s) de ter decidido tornar-se membro de nossa Igreja
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
              placeholder="Escreva aqui..."
              disabled={isLoading}
              {...register('reason_joining')}
            />
          </div>

          <Input
            label="Há quanto tempo frequenta a nossa Igreja?"
            placeholder="Ex: 2 anos"
            error={errors.time_attending?.message}
            isLoading={isLoading}
            {...register('time_attending')}
          />

          <Select
            label="Frequenta nossos cultos?"
            value={watch('sunday_attendance') || ''}
            onChange={(value) => setValue('sunday_attendance', value as MemberFormData['sunday_attendance'])}
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
              label="Participa de alguma outra atividade semanal?"
              value={weeklyActivities}
              onChange={(v) => { setValue('weekly_activities', v); if (!v) setValue('weekly_activities_which', ''); }}
              disabled={isLoading}
            />
            {weeklyActivities && (
              <div className="pl-4 border-l-2 border-primary/30">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quais atividades?</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={2}
                  placeholder="Descreva as atividades..."
                  disabled={isLoading}
                  {...register('weekly_activities_which')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── INFORMAÇÕES DE RECEBIMENTO ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações de Recebimento
        </h3>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-1">
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Informe a forma e a data em que você foi recebido(a) na <strong>{churchName || 'igreja'}</strong>.</li>
            <li>Para <strong>crianças</strong> sem profissão de fé, selecione a opção abaixo.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="isInfantMember"
              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary/20 flex-shrink-0"
              disabled={isLoading}
              checked={isInfantMember}
              onChange={(e) => { setIsInfantMember(e.target.checked); setValue('admission', ''); }}
            />
            <label htmlFor="isInfantMember" className="text-sm font-medium text-gray-700 leading-relaxed">
              Membro Infantil (Criança / Sem Profissão de Fé)
            </label>
          </div>

          <Select
            label="Tipo de Recebimento (obrigatório)"
            value={watch('admission') || ''}
            onChange={(value) => setValue('admission', value)}
            options={isInfantMember ? [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo Infantil', label: 'Batismo Infantil' },
              { value: 'Apresentação (sem batismo)', label: 'Apresentação (sem batismo)' },
            ] : [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo', label: 'Batismo (se batizou nessa igreja)' },
              { value: 'Transferencia', label: 'Transferência (se batizou em outra igreja)' },
              { value: 'Reconciliação', label: 'Reconciliação' },
              { value: 'Profissão de fé', label: 'Profissão de fé' },
              { value: 'Outro', label: 'Outro' },
            ]}
            disabled={isLoading}
            error={errors.admission?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data de Recebimento (obrigatório)"
              placeholder="DD/MM/AAAA"
              value={admissionDateDisplay}
              onChange={(e) => handleDateChange(e, 'admission_date')}
              maxLength={10}
              error={errors.admission_date?.message}
              isLoading={isLoading}
            />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Se não souber a data exata, pode ser uma data aproximada!
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 leading-relaxed">
              Informe a <strong>congregação/filial</strong> da <strong>{churchName || 'igreja'}</strong> a qual você faz parte.
            </p>
          </div>

          <Select
            label="Congregação (obrigatório)"
            value={watch('congregation_id') || ''}
            onChange={(value) => { setValue('congregation_id', value); setSelectedGroups([]); }}
            options={congregations.map(c => ({ value: c.id, label: getCongregationDisplayName(c) }))}
            error={errors.congregation_id?.message}
            disabled={isLoading || submitDisabled}
          />

          {/* Grupos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grupos / Ministérios</label>
            {groupsLoadFailed && (
              <p className="mb-2 text-xs text-amber-700">
                Não foi possível carregar os grupos. Você ainda pode enviar o cadastro sem selecionar grupos.
              </p>
            )}
            <div className="border border-gray-300 rounded-md p-3 bg-gray-50 max-h-80 overflow-y-auto">
              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">Carregando grupos...</p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">Nenhum grupo disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableGroups.map((group) => {
                    const isSelected = selectedGroups.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`relative flex items-start gap-2 p-3 border rounded-md cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => setSelectedGroups(e.target.checked ? [...selectedGroups, group.id] : selectedGroups.filter(id => id !== group.id))}
                          disabled={isLoading}
                          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-500 block truncate">{group.type}{group.congregations && ` • ${getCongregationDisplayName(group.congregations)}`}</span>
                          <span className={`text-sm font-medium block truncate ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{group.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedGroups.length > 0 && (
              <p className="mt-1 text-xs text-primary font-medium">
                {selectedGroups.length} {selectedGroups.length === 1 ? 'grupo selecionado' : 'grupos selecionados'}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={isLoading || submitDisabled}>
          Enviar Cadastro
        </Button>
      </div>
    </form>
  );
}
