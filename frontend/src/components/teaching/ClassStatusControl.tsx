'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatApiError } from '@/services/api';
import type { TeachingClassStatus } from '@/types';
import { STATUS_LABELS } from './constants';
import { STATUS_BADGE_STYLES } from './TeachingUi';

const STATUSES = Object.keys(STATUS_LABELS) as TeachingClassStatus[];

type ConfirmKind = 'close' | 'archive' | 'reopen';

function confirmKind(
  from: TeachingClassStatus,
  to: TeachingClassStatus
): ConfirmKind | null {
  if (to === from) return null;
  if (to === 'closed') return 'close';
  if (to === 'archived') return 'archive';
  if (from === 'closed') return 'reopen';
  return null;
}

export function ClassStatusControl({
  status,
  readOnly,
  onChange,
}: {
  status: TeachingClassStatus;
  readOnly: boolean;
  onChange: (next: TeachingClassStatus) => Promise<void>;
}) {
  const label = STATUS_LABELS[status];
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<TeachingClassStatus | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const list = document.getElementById(listId);
      if (list?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(STATUSES.length - 1, index + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(STATUSES[activeIndex]);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, listId, activeIndex, status]);

  if (readOnly) {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${STATUS_BADGE_STYLES[status]}`}
      >
        {label}
      </span>
    );
  }

  const kind = pending ? confirmKind(status, pending) : null;

  async function apply(next: TeachingClassStatus) {
    setOpen(false);
    setPending(null);
    setSaving(true);
    try {
      await onChange(next);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSaving(false);
      buttonRef.current?.focus();
    }
  }

  function choose(next: TeachingClassStatus) {
    if (next === status) {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (confirmKind(status, next)) {
      setOpen(false);
      setPending(next);
      return;
    }
    void apply(next);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${STATUS_BADGE_STYLES[status]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-busy={saving}
        disabled={saving}
        aria-label={`Status da turma: ${label}`}
        onClick={() => {
          setActiveIndex(Math.max(0, STATUSES.indexOf(status)));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveIndex(Math.max(0, STATUSES.indexOf(status)));
            setOpen(true);
          }
        }}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Status da turma"
          className="absolute left-0 top-full z-30 mt-1 min-w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {STATUSES.map((value, index) => {
            const selected = value === status;
            return (
              <li key={value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                    index === activeIndex ? 'bg-gray-50' : ''
                  } ${STATUS_BADGE_STYLES[value].split(' ').find((token) => token.startsWith('text-')) || 'text-gray-700'}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(value)}
                >
                  {STATUS_LABELS[value]}
                  {selected ? <Check className="h-4 w-4" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Modal
        isOpen={pending !== null && kind !== null}
        onClose={() => !saving && setPending(null)}
        title={
          kind === 'close'
            ? 'Encerrar turma?'
            : kind === 'archive'
              ? 'Arquivar turma?'
              : 'Reabrir a turma?'
        }
        size="sm"
        closeOnEscape={!saving}
        closeOnOverlayClick={!saving}
        footer={
          <div className="flex flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={saving}
              onClick={() => setPending(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-11"
              isLoading={saving}
              onClick={() => pending && void apply(pending)}
            >
              {kind === 'close' ? 'Encerrar' : kind === 'archive' ? 'Arquivar' : 'Reabrir'}
            </Button>
          </div>
        }
      >
        <p className="px-4 py-5 text-sm text-gray-600 sm:p-6">
          {kind === 'close'
            ? 'Inscrições pelo link público deixam de ser aceitas. A aba Certificados passa a permitir gerar PDF.'
            : kind === 'archive'
              ? status === 'closed'
                ? 'A turma sai da operação do dia a dia. Inscrições pelo link público deixam de ser aceitas. Novos certificados deixam de poder ser gerados.'
                : 'A turma sai da operação do dia a dia. Inscrições pelo link público deixam de ser aceitas.'
              : 'Novos certificados deixam de poder ser gerados até a turma ser encerrada de novo. O PDF já baixado não é apagado.'}
        </p>
      </Modal>
    </div>
  );
}
