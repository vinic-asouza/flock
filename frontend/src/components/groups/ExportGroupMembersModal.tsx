'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatApiError } from '@/services/api';
import toast from 'react-hot-toast';

interface ExportGroupMembersModalProps {
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
  { id: 'name', label: 'Nome', category: 'personal' },
  { id: 'age', label: 'Idade', category: 'personal' },
  { id: 'birth', label: 'Data de Nascimento', category: 'personal' },
  { id: 'gender', label: 'Gênero', category: 'personal' },
  { id: 'marital_status', label: 'Estado Civil', category: 'personal' },
  { id: 'nationality', label: 'Nacionalidade', category: 'personal' },
  { id: 'spouse', label: 'Cônjuge', category: 'personal' },
  { id: 'father_name', label: 'Nome do Pai', category: 'personal' },
  { id: 'mother_name', label: 'Nome da Mãe', category: 'personal' },
  { id: 'occupation', label: 'Profissão', category: 'personal' },
  { id: 'children', label: 'Filhos', category: 'personal' },
  { id: 'phone', label: 'Telefone', category: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', category: 'contact' },
  { id: 'email', label: 'Email', category: 'contact' },
  { id: 'active', label: 'Status', category: 'ecclesiastical' },
  { id: 'congregation', label: 'Congregação', category: 'ecclesiastical' },
  { id: 'admission', label: 'Tipo de Recebimento', category: 'ecclesiastical' },
  { id: 'admission_date', label: 'Data de Recebimento', category: 'ecclesiastical' },
  { id: 'address', label: 'Endereço', category: 'address' },
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
  address: 'Endereço',
};

export function ExportGroupMembersModal({
  isOpen,
  onClose,
  onExport,
}: ExportGroupMembersModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'phone', 'email']);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleToggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(FIELD_OPTIONS.map((f) => f.id));
  };

  const handleClearAll = () => {
    setSelectedFields([]);
  };

  const handleClose = () => {
    if (!exporting) {
      setExportError(null);
      onClose();
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      const message = 'Selecione pelo menos um campo para exportar.';
      setExportError(message);
      toast.error(message);
      return;
    }
    try {
      setExporting(true);
      setExportError(null);
      await onExport(selectedFields);
      onClose();
    } catch (err) {
      const message = formatApiError(err);
      setExportError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const getFieldsByCategory = (category: FieldOption['category']) =>
    FIELD_OPTIONS.filter((f) => f.category === category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Exportar lista de membros do grupo"
      description="Selecione os campos dos membros que deseja incluir no PDF. O documento incluirá também o nome do grupo, tipo, congregação e dados do responsável."
      size="lg"
      closeOnOverlayClick={!exporting}
      closeOnEscape={!exporting}
      footer={
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:p-6">
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
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto"
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
        {exportError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="break-words text-sm text-red-700">{exportError}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{selectedFields.length}</span> campos
            selecionados
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="min-h-9 px-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              disabled={exporting}
            >
              Selecionar todos
            </button>
            <span className="hidden text-gray-300 sm:inline">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="min-h-9 px-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800"
              disabled={exporting}
            >
              Limpar seleção
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((category) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">{CATEGORIES[category]}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {getFieldsByCategory(category).map((field) => (
                  <label
                    key={field.id}
                    className={`
                        flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all
                        ${
                          selectedFields.includes(field.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                        ${exporting ? 'cursor-not-allowed opacity-50' : ''}
                      `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleToggleField(field.id)}
                      disabled={exporting}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
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
