'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ExportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedFields: string[]) => Promise<void>;
}

interface FieldOption {
  id: string;
  label: string;
  category: 'personal' | 'contact' | 'ecclesiastical' | 'address';
}

const FIELD_OPTIONS: FieldOption[] = [
  // Informações Pessoais
  { id: 'name', label: 'Nome', category: 'personal' },
  { id: 'age', label: 'Idade', category: 'personal' },
  { id: 'birth', label: 'Data de Nascimento', category: 'personal' },
  { id: 'gender', label: 'Gênero', category: 'personal' },
  { id: 'marital_status', label: 'Estado Civil', category: 'personal' },
  { id: 'hometown', label: 'Natural de', category: 'personal' },
  { id: 'wedding_date', label: 'Data do Casamento', category: 'personal' },
  { id: 'nationality', label: 'Nacionalidade (legado)', category: 'personal' },
  { id: 'spouse', label: 'Cônjuge', category: 'personal' },
  { id: 'father_name', label: 'Nome do Pai', category: 'personal' },
  { id: 'mother_name', label: 'Nome da Mãe', category: 'personal' },
  { id: 'occupation', label: 'Profissão', category: 'personal' },
  { id: 'children', label: 'Filhos', category: 'personal' },

  // Contato
  { id: 'phone', label: 'Telefone', category: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', category: 'contact' },
  { id: 'email', label: 'Email', category: 'contact' },

  // Informações Eclesiásticas (recebimento — sem questionário sensível)
  { id: 'active', label: 'Status', category: 'ecclesiastical' },
  { id: 'congregation', label: 'Congregação', category: 'ecclesiastical' },
  { id: 'admission', label: 'Tipo de Recebimento', category: 'ecclesiastical' },
  { id: 'admission_date', label: 'Data de Recebimento', category: 'ecclesiastical' },

  // Endereço
  { id: 'address', label: 'Endereço', category: 'address' },
  { id: 'address_number', label: 'Número', category: 'address' },
  { id: 'complement', label: 'Complemento', category: 'address' },
  { id: 'neighborhood', label: 'Bairro', category: 'address' },
  { id: 'city', label: 'Cidade', category: 'address' },
  { id: 'state', label: 'Estado', category: 'address' },
  { id: 'cep', label: 'CEP', category: 'address' },
];

const CATEGORIES = {
  personal: 'Informações Pessoais',
  contact: 'Contato',
  ecclesiastical: 'Informações Eclesiásticas',
  address: 'Endereço'
};

export function ExportMembersModal({ isOpen, onClose, onExport }: ExportMembersModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'phone', 'email']);
  const [exporting, setExporting] = useState(false);

  const handleClose = () => {
    if (!exporting) onClose();
  };

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      }
      return [...prev, fieldId];
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(FIELD_OPTIONS.map(f => f.id));
  };

  const handleClearAll = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para exportar');
      return;
    }

    try {
      setExporting(true);
      await onExport(selectedFields);
      onClose();
    } catch {
      // Erro já tratado pelo toast no componente pai
    } finally {
      setExporting(false);
    }
  };

  const getFieldsByCategory = (category: FieldOption['category']) => {
    return FIELD_OPTIONS.filter(f => f.category === category);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Exportar Lista de Membros"
      description="Selecione os campos que deseja incluir no PDF"
      size="lg"
      closeOnOverlayClick={!exporting}
      closeOnEscape={!exporting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 p-4 sm:p-6">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={exporting}
            className="min-h-11 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedFields.length === 0}
            className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={18} />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{selectedFields.length}</span> campos selecionados
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors min-h-9 px-2"
              disabled={exporting}
            >
              Selecionar todos
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors min-h-9 px-2"
              disabled={exporting}
            >
              Limpar seleção
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {CATEGORIES[category]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getFieldsByCategory(category).map((field) => (
                  <label
                    key={field.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-11
                      ${selectedFields.includes(field.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                      ${exporting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleToggleField(field.id)}
                      disabled={exporting}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {field.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
