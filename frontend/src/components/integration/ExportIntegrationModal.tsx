'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ExportIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedFields: string[]) => Promise<void>;
}

interface FieldOption {
  id: string;
  label: string;
  category: 'personal' | 'contact' | 'integration';
}

const FIELD_OPTIONS: FieldOption[] = [
  { id: 'name', label: 'Nome', category: 'personal' },
  { id: 'birth', label: 'Data de Nascimento', category: 'personal' },
  { id: 'gender', label: 'Gênero', category: 'personal' },
  { id: 'marital_status', label: 'Estado Civil', category: 'personal' },
  { id: 'status', label: 'Status', category: 'personal' },

  { id: 'phone', label: 'Telefone', category: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', category: 'contact' },

  { id: 'expected_admission_type', label: 'Tipo de Recebimento Previsto', category: 'integration' },
  { id: 'expected_congregation', label: 'Congregação Prevista', category: 'integration' },
  { id: 'mentor', label: 'Responsável/Discipulador', category: 'integration' },
  { id: 'mentor_contact', label: 'Contato do Responsável', category: 'integration' },
  { id: 'notes', label: 'Notas', category: 'integration' },
  { id: 'created_at', label: 'Criado em', category: 'integration' },
  { id: 'updated_at', label: 'Atualizado em', category: 'integration' }
];

const CATEGORIES: Record<FieldOption['category'], string> = {
  personal: 'Informações Pessoais',
  contact: 'Contato',
  integration: 'Processo de Integração'
};

export function ExportIntegrationModal({ isOpen, onClose, onExport }: ExportIntegrationModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'status', 'expected_congregation']);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleClose = () => {
    if (!exporting) {
      setExportError(null);
      onClose();
    }
  };

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(FIELD_OPTIONS.map(field => field.id));
  };

  const handleClearAll = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setExportError('Selecione pelo menos um campo para exportar.');
      return;
    }

    try {
      setExporting(true);
      setExportError(null);
      await onExport(selectedFields);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao exportar lista. Tente novamente.';
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };

  const getFieldsByCategory = (category: FieldOption['category']) =>
    FIELD_OPTIONS.filter(field => field.category === category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Exportar Lista de Integrantes"
      description="Selecione os campos que deseja incluir no PDF"
      size="lg"
      closeOnOverlayClick={!exporting}
      closeOnEscape={!exporting}
      footer={
        <div className="flex flex-col gap-2 p-4 sm:p-6">
          {exportError && (
            <p className="text-sm text-red-600 text-left sm:text-right break-words">{exportError}</p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
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
          {(Object.keys(CATEGORIES) as Array<FieldOption['category']>).map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{CATEGORIES[category]}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getFieldsByCategory(category).map(field => (
                  <label
                    key={field.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-11
                      ${selectedFields.includes(field.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'}
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
