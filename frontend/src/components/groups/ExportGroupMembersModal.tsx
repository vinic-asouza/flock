'use client';

import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
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
  { id: 'baptism_date', label: 'Data de Batismo', category: 'ecclesiastical' },
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
  address: 'Endereço'
};

export function ExportGroupMembersModal({ isOpen, onClose, onExport }: ExportGroupMembersModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'phone', 'email']);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(FIELD_OPTIONS.map(f => f.id));
  };

  const handleClearAll = () => {
    setSelectedFields([]);
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
    FIELD_OPTIONS.filter(f => f.category === category);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Exportar lista de membros do grupo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecione os campos dos membros que deseja incluir no PDF. O documento incluirá também o nome do grupo, tipo, congregação e dados do responsável.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={exporting}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {exportError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{exportError}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{selectedFields.length}</span> campos selecionados
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                disabled={exporting}
              >
                Selecionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={exporting}
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{CATEGORIES[category]}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {getFieldsByCategory(category).map((field) => (
                    <label
                      key={field.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
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

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedFields.length === 0}
            className="inline-flex items-center gap-2"
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
    </div>
  );
}
