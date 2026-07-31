'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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

  const handleClose = () => {
    if (!exporting) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Exportar lista de grupos"
      description="Quais tipos incluir no PDF? A seleção afeta apenas o documento exportado."
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
            disabled={exporting || selectedTypes.length === 0}
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
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{selectedTypes.length}</span> tipo(s)
            selecionado(s)
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GROUP_TYPES.map((type) => (
            <label
              key={type}
              className={`
                  flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all
                  ${
                    selectedTypes.includes(type)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${exporting ? 'cursor-not-allowed opacity-50' : ''}
                `}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => handleToggleType(type)}
                disabled={exporting}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
