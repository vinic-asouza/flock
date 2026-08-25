'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  MEMBER_EXPORT_CATEGORIES,
  MEMBER_EXPORT_FIELD_OPTIONS,
  type MemberExportFieldCategory,
} from '@/components/members/memberExportFields';
import { formatApiError } from '@/services/api';
import toast from 'react-hot-toast';

const DEFAULT_FIELDS = ['name', 'phone', 'email'];
const FIELD_OPTIONS = MEMBER_EXPORT_FIELD_OPTIONS;
const CATEGORIES = MEMBER_EXPORT_CATEGORIES;

export interface ExportMemberFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedFields: string[]) => Promise<void>;
  title: string;
  description: string;
}

export function ExportMemberFieldsModal({
  isOpen,
  onClose,
  onExport,
  title,
  description,
}: ExportMemberFieldsModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const resetFields = () => {
    setSelectedFields(DEFAULT_FIELDS);
    setExportError(null);
  };

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
      resetFields();
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
      resetFields();
      onClose();
    } catch (err) {
      const message = formatApiError(err);
      setExportError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const getFieldsByCategory = (category: MemberExportFieldCategory) =>
    FIELD_OPTIONS.filter((f) => f.category === category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
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
          {(Object.keys(CATEGORIES) as MemberExportFieldCategory[]).map((category) => (
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
