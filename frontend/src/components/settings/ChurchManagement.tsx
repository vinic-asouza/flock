'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { Church } from '@/types';
import { DENOMINATIONS, formatPhone } from '@/utils';
import { Building2, MapPin, Mail, Phone, FileText, CreditCard } from 'lucide-react';

interface ChurchFormData {
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  email_church: string;
  phone_church: string;
}

const states = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

const denominations = DENOMINATIONS.map(denomination => ({
  value: denomination,
  label: denomination
}));

const planNames: Record<string, string> = {
  '100': 'Plano 100 Membros',
  '200': 'Plano 200 Membros',
  '500': 'Plano 500 Membros',
  '800': 'Plano 800 Membros',
};

export function ChurchManagement() {
  const { user, updateChurch } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ChurchFormData>({
    name: '',
    denomination: '',
    address: '',
    city: '',
    state: '',
    cnpj: '',
    email_church: '',
    phone_church: ''
  });

  // Carregar dados da igreja
  useEffect(() => {
    const loadChurchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Usar dados do contexto ou buscar da API
        if (user) {
          setFormData({
            name: user.name || '',
            denomination: user.denomination || '',
            address: user.address || '',
            city: user.city || '',
            state: user.state || '',
            cnpj: user.cnpj || '',
            email_church: user.email_church || '',
            phone_church: user.phone_church || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados da igreja:', error);
        setError('Erro ao carregar dados da igreja');
      } finally {
        setIsLoading(false);
      }
    };

    loadChurchData();
  }, [user]);

  const handleInputChange = (field: keyof ChurchFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Filtrar apenas campos que foram alterados
      const changedFields: Partial<ChurchFormData> = {};
      Object.keys(formData).forEach(key => {
        const field = key as keyof ChurchFormData;
        const userValue = user?.[field as keyof Church] || '';
        if (formData[field] !== userValue) {
          changedFields[field] = formData[field];
        }
      });

      if (Object.keys(changedFields).length === 0) {
        setSuccess('Nenhuma alteração foi feita');
        setIsEditing(false);
        return;
      }

      // Chamar API para atualizar via contexto
      await updateChurch(changedFields);
      
      setSuccess('Dados da igreja atualizados com sucesso!');
      setIsEditing(false);
      
    } catch (error: unknown) {
      console.error('Erro ao salvar dados da igreja:', error);
      const errorObj = error as { details?: string | string[]; message?: string };
      const errorMessage = errorObj.details 
        ? (Array.isArray(errorObj.details) ? errorObj.details.join(', ') : errorObj.details)
        : (errorObj.message || 'Erro ao salvar dados');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurar dados originais
    if (user) {
      setFormData({
        name: user.name || '',
        denomination: user.denomination || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        cnpj: user.cnpj || '',
        email_church: user.email_church || '',
        phone_church: user.phone_church || ''
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const handleCNPJChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 14) {
      setFormData(prev => ({
        ...prev,
        cnpj: cleaned
      }));
    }
  };

  const handlePhoneChange = (field: 'phone_church', value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      setFormData(prev => ({
        ...prev,
        [field]: cleaned
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const planType = user?.plan_type;
  const planName = planType ? planNames[planType] || 'Plano não definido' : 'Nenhum plano ativo';

  return (
    <div className="space-y-4">
      {/* Card com informações da igreja */}
      <Card>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Dados da Igreja
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações básicas da sua igreja
              </p>
            </div>
            
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="primary"
              >
                Editar Dados
              </Button>
            )}
          </div>

          {/* Mensagens de feedback */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Modo visualização (card com informações) */}
          {!isEditing ? (
            <div className="space-y-6">
              {/* Nome e Denominação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Nome da Igreja</span>
                  </div>
                  <p className="text-base text-gray-900">{formData.name || 'Não informado'}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Denominação</span>
                  </div>
                  <p className="text-base text-gray-900">{formData.denomination || 'Não informado'}</p>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Endereço</span>
                </div>
                <p className="text-base text-gray-900">
                  {formData.address || 'Não informado'}
                  {formData.city && formData.state && (
                    <span className="text-gray-600">
                      {formData.address ? ', ' : ''}
                      {formData.city} - {formData.state}
                    </span>
                  )}
                </p>
              </div>

              {/* CNPJ */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">CNPJ</span>
                </div>
                <p className="text-base text-gray-900">{formatCNPJ(formData.cnpj) || 'Não informado'}</p>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Email da Igreja</span>
                  </div>
                  <p className="text-base text-gray-900">{formData.email_church || 'Não informado'}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Telefone da Igreja</span>
                  </div>
                  <p className="text-base text-gray-900">
                    {formData.phone_church ? formatPhone(formData.phone_church) : 'Não informado'}
                  </p>
                </div>
              </div>

              {/* Plano */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Plano Atual</span>
                    </div>
                    <p className="text-base text-gray-900">{planName}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Modo edição (formulário) */
            <div className="space-y-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Igreja *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Nome da igreja"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Denominação *
                  </label>
                  <Select
                    value={formData.denomination}
                    onChange={(value) => handleInputChange('denomination', value)}
                    options={denominations}
                    placeholder="Selecione a denominação"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço *
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <Select
                    value={formData.state}
                    onChange={(value) => handleInputChange('state', value)}
                    options={states}
                    placeholder="Selecione o estado"
                  />
                </div>
              </div>

              {/* CNPJ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ *
                </label>
                <Input
                  value={formatCNPJ(formData.cnpj)}
                  onChange={(e) => handleCNPJChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email da Igreja
                  </label>
                  <Input
                    type="email"
                    value={formData.email_church}
                    onChange={(e) => handleInputChange('email_church', e.target.value)}
                    placeholder="contato@igreja.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone da Igreja
                  </label>
                  <Input
                    value={formatPhone(formData.phone_church)}
                    onChange={(e) => handlePhoneChange('phone_church', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleCancel}
                  variant="secondary"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
