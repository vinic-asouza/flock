'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2, List, XCircle, Users, CheckCircle2, SkipForward } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useMemberImport } from '@/hooks/useMemberImport';
import { apiService } from '@/services/api';
import type { Congregation } from '@/types/congregation';
import { formatMemberName } from '@/utils/formatMemberName';

interface MemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'validation' | 'importing' | 'result';

export function MemberImportModal({ isOpen, onClose, onSuccess }: MemberImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [congregations, setCongregations] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('sede');
  const [loadingCongregations, setLoadingCongregations] = useState(false);

  const {
    validating,
    importing,
    validationResult,
    importResult,
    error,
    setError,
    validateImport,
    importMembers,
    reset,
  } = useMemberImport();

  // Carregar congregações
  useEffect(() => {
    if (isOpen) {
      loadCongregations();
    }
  }, [isOpen]);

  const loadCongregations = async () => {
    try {
      setLoadingCongregations(true);
      const data = await apiService.listCongregations();
      setCongregations([
        { value: 'sede', label: 'Sede' },
        ...data.map((cong: Congregation) => ({
          value: cong.id,
          label: cong.name,
        })),
      ]);
    } catch (err) {
      console.error('Erro ao carregar congregações:', err);
    } finally {
      setLoadingCongregations(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar se é CSV
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Por favor, selecione um arquivo CSV');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    try {
      const congregationId = selectedCongregationId === 'sede' ? null : selectedCongregationId;
      await validateImport(file, congregationId);
      setStep('validation');
    } catch (err) {
      console.error('Erro ao validar:', err);
      // O erro já foi definido pelo hook
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setStep('importing');
      const congregationId = selectedCongregationId === 'sede' ? null : selectedCongregationId;
      await importMembers(file, congregationId, true);
      setStep('result');
    } catch (err) {
      console.error('Erro ao importar:', err);
      // O erro já foi definido pelo hook
      setStep('validation'); // Voltar para validação em caso de erro
    }
  };

  const handleClose = () => {
    if (validating || importing) return;
    
    setStep('upload');
    setFile(null);
    setSelectedCongregationId('sede');
    reset();
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess();
  };

  const congregationOptions = [
    { value: 'sede', label: 'Sede' },
    ...congregations.filter(c => c.value !== 'sede'),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Membros via CSV"
      size="xl"
      closeOnOverlayClick={!validating && !importing}
      closeOnEscape={!validating && !importing}
    >
      <div className="p-6 space-y-6">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione o arquivo CSV
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload de um arquivo CSV com os dados dos membros que deseja importar.
              </p>
            </div>

            {/* Seleção de congregação */}
            <div>
              <Select
                label="Congregação"
                options={congregationOptions}
                value={selectedCongregationId}
                onChange={setSelectedCongregationId}
                placeholder="Selecione uma congregação"
                disabled={loadingCongregations}
                helperText="Todos os membros importados serão associados a esta congregação"
              />
            </div>

            {/* Upload de arquivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo CSV
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Selecione um arquivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileSelect}
                        disabled={validating}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV até 10MB</p>
                  {file && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-700">
                      <FileText size={16} />
                      <span>{file.name}</span>
                      <button
                        onClick={() => setFile(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-medium text-red-800">Erro</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={validating}>
                Cancelar
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!file || validating || loadingCongregations}
              >
                {validating ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Validando...
                  </>
                ) : (
                  'Validar Arquivo'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Validation Results */}
        {step === 'validation' && (
          <div className="space-y-6">
            {/* Exibir erro se houver */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Erro ao processar importação</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                    {error.toLowerCase().includes('limite') && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs text-red-700">
                          💡 <strong>Dica:</strong> Você pode reduzir a quantidade de membros no arquivo CSV ou{' '}
                          <a 
                            href="/settings?tab=payment" 
                            className="underline font-medium hover:text-red-800"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            alterar seu plano
                          </a>
                          {' '}para aumentar o limite de membros.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {validationResult && (
              <>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Resultado da Validação
                  </h3>
              <div className="flex gap-3 overflow-x-auto">
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg flex-shrink-0 min-w-0">
                  <List className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total de Linhas</p>
                    <p className="text-lg font-semibold text-gray-900">{validationResult.totalRows}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg flex-shrink-0 min-w-0">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Válidas</p>
                    <p className="text-lg font-semibold text-gray-900">{validationResult.validRows}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg flex-shrink-0 min-w-0">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Com Erros</p>
                    <p className="text-lg font-semibold text-gray-900">{validationResult.invalidRows}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {validationResult.preview.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Preview dos Dados ({validationResult.preview.length} {validationResult.preview.length === 1 ? 'linha válida' : 'linhas válidas'})
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Nome
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Data Nascimento
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Gênero
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {validationResult.preview.map((member, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900 uppercase">{formatMemberName(member.name)}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {member.birth ? new Date(member.birth).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">{member.gender || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Erros */}
            {validationResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Erros Encontrados:
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {/* Cabeçalho */}
                  <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <span className="w-16">Linha</span>
                      <span>Erro</span>
                    </div>
                  </div>
                  {/* Lista de erros */}
                  {validationResult.errors.map((errorGroup, index) => (
                    <div
                      key={index}
                      className="p-2 border-b border-gray-200 last:border-b-0 bg-red-50"
                    >
                      {errorGroup.errors.map((err, errIndex) => (
                        <div key={errIndex} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-xs w-16 justify-center">
                            {errorGroup.row}
                          </span>
                          <span className="text-red-600">{err.field}: {err.message}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setStep('upload')} disabled={importing}>
                    Voltar
                  </Button>
                  {validationResult.validRows > 0 && !error && (
                    <Button onClick={handleImport} disabled={importing}>
                      {importing ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={16} />
                          Importando...
                        </>
                      ) : (
                        `Importar ${validationResult.validRows} Membros`
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto text-primary mb-4" size={48} />
            <p className="text-lg font-medium text-gray-900">Importando membros...</p>
            <p className="text-sm text-gray-600 mt-2">Por favor, aguarde.</p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && importResult && (
          <div className="space-y-6">
            <div className="text-center">
              {importResult.success ? (
                <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
              ) : (
                <AlertCircle className="mx-auto text-yellow-600 mb-4" size={48} />
              )}
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {importResult.success ? 'Importação Concluída!' : 'Importação Parcial'}
              </h3>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Resultado da Importação
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total Processado</p>
                    <p className="text-lg font-semibold text-gray-900">{importResult.totalRows}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Importados</p>
                    <p className="text-lg font-semibold text-gray-900">{importResult.importedRows}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Com Erros</p>
                    <p className="text-lg font-semibold text-gray-900">{importResult.errorRows}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <SkipForward className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Ignorados</p>
                    <p className="text-lg font-semibold text-gray-900">{importResult.skippedRows}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Erros */}
            {importResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Erros Encontrados:
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {/* Cabeçalho */}
                  <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <span className="w-16">Linha</span>
                      <span>Erro</span>
                    </div>
                  </div>
                  {/* Lista de erros */}
                  {importResult.errors.map((errorGroup, index) => (
                    <div
                      key={index}
                      className="p-2 border-b border-gray-200 last:border-b-0 bg-red-50"
                    >
                      {errorGroup.errors.map((err, errIndex) => (
                        <div key={errIndex} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-xs w-16 justify-center">
                            {errorGroup.row}
                          </span>
                          <span className="text-red-600">{err}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicatas ignoradas */}
            {importResult.skipped.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Membros Ignorados (Duplicatas):
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {/* Cabeçalho */}
                  <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <span className="w-16">Linha</span>
                      <span>Motivo</span>
                    </div>
                  </div>
                  {/* Lista de ignorados */}
                  {importResult.skipped.map((skip, index) => (
                    <div
                      key={index}
                      className="p-2 border-b border-gray-200 last:border-b-0 bg-yellow-50"
                    >
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium text-xs w-16 justify-center">
                          {skip.row}
                        </span>
                        <span className="text-yellow-700">{skip.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSuccess}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

