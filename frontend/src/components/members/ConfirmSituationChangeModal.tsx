'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader, RefreshCw } from 'lucide-react';
import {
  MEMBER_SITUATIONS,
  MEMBER_SITUATION_LABELS,
  MemberSituation,
  situationToActive,
} from '@/lib/memberSituation';

interface ConfirmSituationChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  currentSituation: MemberSituation;
  /** Quando definido, pré-seleciona o destino (ex.: atalho Inativo). */
  initialNextSituation?: MemberSituation;
  onConfirm: (nextSituation: MemberSituation) => Promise<void>;
  isLoading?: boolean;
}

export function ConfirmSituationChangeModal({
  isOpen,
  onClose,
  memberName,
  currentSituation,
  initialNextSituation,
  onConfirm,
  isLoading = false,
}: ConfirmSituationChangeModalProps) {
  const [nextSituation, setNextSituation] = useState<MemberSituation>(
    initialNextSituation || currentSituation
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNextSituation(initialNextSituation || currentSituation);
  }, [isOpen, currentSituation, initialNextSituation]);

  const unchanged = nextSituation === currentSituation;
  const leavingActive = situationToActive(currentSituation) && !situationToActive(nextSituation);
  const becomingActive = !situationToActive(currentSituation) && situationToActive(nextSituation);

  const handleConfirm = async () => {
    if (unchanged) return;
    try {
      setIsSaving(true);
      await onConfirm(nextSituation);
      onClose();
    } catch {
      // toast já tratado pelo caller
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isLoading) onClose();
  };

  const busy = isSaving || isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Alterar situação"
      size="sm"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
    >
      <div className="flex flex-col">
        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Situação do membro</h3>
            <p className="text-sm text-gray-500">
              Alterar a situação de <strong>{memberName}</strong> de{' '}
              <strong>{MEMBER_SITUATION_LABELS[currentSituation]}</strong> para:
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Nova situação
            <select
              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800"
              value={nextSituation}
              onChange={(e) => setNextSituation(e.target.value as MemberSituation)}
              disabled={busy}
            >
              {MEMBER_SITUATIONS.map((value) => (
                <option key={value} value={value}>
                  {MEMBER_SITUATION_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {leavingActive && (
            <p className="text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
              O membro deixará de contar na cota do plano e será removido de eventos futuros na agenda.
            </p>
          )}
          {becomingActive && (
            <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
              A reativação respeita o limite de membros ativos do plano.
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={handleClose} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={busy || unchanged}>
              {busy ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
