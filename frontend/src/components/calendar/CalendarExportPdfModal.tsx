'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useFiltersData } from '@/hooks/useFiltersData';
import { apiService, formatApiError } from '@/services/api';
import { CalendarItemType } from '@/types/calendar';
import { Group } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

const CALENDAR_ITEM_TYPES: CalendarItemType[] = ['Programação', 'Evento', 'Encontro', 'Reunião'];

export type CalendarExportPeriod = 'month' | 'year';

export interface CalendarExportPdfRecorte {
  type?: CalendarItemType[];
  congregation_id?: string;
  group_id?: string;
}

interface CalendarExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: CalendarExportPeriod;
  year: number;
  month?: number;
  defaultRecorte: CalendarExportPdfRecorte;
  onExport: (recorte: CalendarExportPdfRecorte) => Promise<void>;
}

function formatPeriodLabel(period: CalendarExportPeriod, year: number, month?: number): string {
  if (period === 'year') {
    return `Ano ${year}`;
  }
  const label = format(new Date(year, (month ?? 1) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CalendarExportPdfModal({
  isOpen,
  onClose,
  period,
  year,
  month,
  defaultRecorte,
  onExport,
}: CalendarExportPdfModalProps) {
  const { congregations, loading: congregationsLoading, error: congregationsError } = useFiltersData();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<CalendarItemType[]>(defaultRecorte.type ?? []);
  const [congregationId, setCongregationId] = useState(defaultRecorte.congregation_id ?? '');
  const [groupId, setGroupId] = useState(defaultRecorte.group_id ?? '');
  const [exporting, setExporting] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      setGroupsError(null);
      const data = await apiService.listGroupsWithCalendarItems();
      setGroups(data || []);
    } catch (err) {
      setGroups([]);
      setGroupsError(formatApiError(err));
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadGroups();
  }, [isOpen, loadGroups]);

  const handleClose = () => {
    if (!exporting) onClose();
  };

  const toggleType = (type: CalendarItemType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await onExport({
        type: selectedTypes.length > 0 ? selectedTypes : undefined,
        congregation_id: congregationId || undefined,
        group_id: groupId || undefined,
      });
      onClose();
    } catch {
      // Toast já tratado na página
    } finally {
      setExporting(false);
    }
  };

  const periodLabel = formatPeriodLabel(period, year, month);
  const loadingOptions = congregationsLoading || loadingGroups;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Exportar PDF — ${periodLabel}`}
      description="O recorte abaixo vale só para este PDF. Os filtros da listagem não mudam."
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
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download size={18} aria-hidden />
                Baixar PDF
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Tipos</legend>
          <p className="text-xs text-gray-500">Nenhum tipo marcado inclui todos os tipos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CALENDAR_ITEM_TYPES.map((type) => {
              const checked = selectedTypes.includes(type);
              const inputId = `calendar-export-type-${type}`;
              return (
                <label
                  key={type}
                  htmlFor={inputId}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(type)}
                    disabled={exporting}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {type}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Select
          label="Congregação"
          value={congregationId}
          onChange={setCongregationId}
          disabled={exporting || congregationsLoading}
          placeholder={congregationsLoading ? 'Carregando...' : 'Todas as congregações'}
          options={[
            { value: '', label: 'Todas as congregações' },
            ...congregations.map((congregation) => ({
              value: congregation.id,
              label: getCongregationDisplayName(congregation) || congregation.name,
            })),
          ]}
        />

        <Select
          label="Grupo / Ministério"
          value={groupId}
          onChange={setGroupId}
          disabled={exporting || loadingGroups}
          placeholder={loadingGroups ? 'Carregando...' : 'Todos os grupos'}
          options={[
            { value: '', label: 'Todos os grupos' },
            ...groups.map((group) => ({
              value: group.id,
              label: `${group.type}: ${group.name}`,
            })),
          ]}
        />

        {(congregationsError || groupsError) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800 mb-1">
              {congregationsError || groupsError}
            </p>
            {groupsError && (
              <button
                type="button"
                onClick={loadGroups}
                disabled={loadingOptions || exporting}
                className="text-xs font-medium text-amber-800 underline hover:text-amber-900 min-h-9"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
