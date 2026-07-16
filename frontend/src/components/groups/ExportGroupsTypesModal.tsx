'use client';

import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { GroupType } from '@/types';

export const GROUP_TYPES: GroupType[] = [
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
  'Região',
];

interface ExportGroupsTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tipos pré-selecionados ao abrir (filtro da listagem ou todos). */
  initialSelectedTypes: GroupType[];
  onExport: (selectedTypes: GroupType[]) => Promise<void>;
}

export function ExportGroupsTypesModal({
  isOpen,
  onClose,
  initialSelectedTypes,
  onExport,
}: ExportGroupsTypesModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<GroupType[]>(initialSelectedTypes);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTypes(
      initialSelectedTypes.length > 0 ? [...initialSelectedTypes] : [...GROUP_TYPES]
    );
    setExporting(false);
  }, [isOpen, initialSelectedTypes]);

  if (!isOpen) return null;

  const handleToggleType = (type: GroupType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSelectAll = () => {
    setSelectedTypes([...GROUP_TYPES]);
  };

  const handleClearAll = () => {
    setSelectedTypes([]);
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) return;

    try {
      setExporting(true);
      await onExport(selectedTypes);
      onClose();
    } catch {
      // Erro já tratado pelo toast no componente pai
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Exportar lista de grupos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Quais tipos incluir no PDF? A seleção afeta apenas o documento exportado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={exporting}
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{selectedTypes.length}</span> tipo(s)
              selecionado(s)
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                disabled={exporting}
              >
                Selecionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={exporting}
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GROUP_TYPES.map((type) => (
              <label
                key={type}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    selectedTypes.includes(type)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${exporting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => handleToggleType(type)}
                  disabled={exporting}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedTypes.length === 0}
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
