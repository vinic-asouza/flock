'use client';

import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MemberReports } from '@/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MemberReports;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
}

export function ExportModal({ isOpen, onClose, data, onExport }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);

  const handleExport = () => {
    onExport(selectedFormat);
    onClose();
  };

  const exportOptions = [
    {
      format: 'pdf' as const,
      label: 'PDF',
      description: 'Relatório completo com gráficos e tabelas',
      icon: FileText,
      recommended: true,
    },
    {
      format: 'excel' as const,
      label: 'Excel',
      description: 'Planilha com dados tabulares para análise',
      icon: Table,
      recommended: false,
    },
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Dados em formato texto para importação',
      icon: FileSpreadsheet,
      recommended: false,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Relatórios"
      size="md"
    >
      <div className="space-y-6">
        {/* Informações do Relatório */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Dados do Relatório</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Total de Membros:</span> {data.summary.totalMembers}
            </div>
            <div>
              <span className="font-medium">Membros Ativos:</span> {data.summary.activeMembers}
            </div>
            <div>
              <span className="font-medium">Última Atualização:</span> {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </div>
            <div>
              <span className="font-medium">Cargos:</span> {Object.keys(data.churchStructure.roles).length}
            </div>
          </div>
        </div>

        {/* Seleção de Formato */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Formato de Exportação</h3>
          <div className="space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  key={option.format}
                  className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedFormat === option.format
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.format}
                    checked={selectedFormat === option.format}
                    onChange={(e) => setSelectedFormat(e.target.value as any)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedFormat === option.format ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{option.label}</span>
                        {option.recommended && (
                          <span className="px-2 py-1 text-xs bg-primary text-white rounded-full">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Opções Adicionais */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Opções</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              Incluir gráficos e visualizações
            </span>
          </label>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Exportar {exportOptions.find(opt => opt.format === selectedFormat)?.label}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
