'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cake, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { BirthdaysModal, type Birthday } from '@/components/members/BirthdaysModal';

interface MembersBirthdaysBarProps {
  congregationId: string;
  onOpenMember: (id: string, name: string) => void;
}

function monthLabel(month: number, year: number) {
  const name = format(new Date(year, month - 1, 1), 'MMMM', { locale: ptBR });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function MembersBirthdaysBar({ congregationId, onOpenMember }: MembersBirthdaysBarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const query = useCallback(() => {
    const params: { month: number; year: number; congregation_id?: string } = { month, year };
    if (congregationId) params.congregation_id = congregationId;
    return params;
  }, [month, year, congregationId]);

  const countRequest = useRef(0);

  const loadCount = useCallback(async () => {
    const requestId = ++countRequest.current;
    setLoading(true);
    setError(false);
    try {
      const data = await apiService.getBirthdaysCount(query());
      if (requestId !== countRequest.current) return;
      setCount(typeof data?.count === 'number' ? data.count : 0);
    } catch {
      if (requestId !== countRequest.current) return;
      setCount(null);
      setError(true);
    } finally {
      if (requestId === countRequest.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const loadList = useCallback(async () => {
    setModalOpen(true);
    setListLoading(true);
    setListError(false);
    try {
      const response = await apiService.getBirthdaysList(query());
      setBirthdays(response.data || []);
    } catch {
      setBirthdays([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [query]);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const showVer = !loading && !error && (count ?? 0) > 0;

  return (
    <>
      <section
        aria-label="Aniversariantes"
        className="bg-white rounded-lg border border-[#090725]/10 px-3 py-3 sm:px-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-pink-100 shrink-0" aria-hidden>
              <Cake size={16} className="text-pink-700" />
            </div>
            <div className="min-w-0" aria-live="polite">
              <p className="text-sm font-medium text-[#090725] leading-tight">Aniversariantes</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {loading ? (
                  <span className="inline-block h-6 w-8 rounded bg-[#090725]/10 animate-pulse" aria-hidden />
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-[#090725] leading-none">
                    {error ? '—' : (count ?? 0).toLocaleString('pt-BR')}
                  </span>
                )}
                {!loading && error && (
                  <span className="text-xs text-amber-700">Falha ao carregar</span>
                )}
                {!loading && !error && count === 0 && (
                  <span className="text-xs text-gray-500">Nenhum neste mês</span>
                )}
                {showVer && (
                  <button
                    type="button"
                    onClick={() => void loadList()}
                    className="min-h-11 px-3 text-xs font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 rounded inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Ver aniversariantes"
                    title="Ver aniversariantes"
                  >
                    <Eye size={14} aria-hidden />
                    Ver
                  </button>
                )}
                {!loading && error && (
                  <button
                    type="button"
                    onClick={() => void loadCount()}
                    className="min-h-11 px-3 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Tentar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => shiftMonth(-1)}
              className="p-2 min-h-11 min-w-11"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={20} />
            </Button>
            <span className="min-w-[9.5rem] text-center text-sm font-medium text-[#090725]">
              {monthLabel(month, year)}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => shiftMonth(1)}
              className="p-2 min-h-11 min-w-11"
              aria-label="Próximo mês"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      <BirthdaysModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        birthdays={birthdays}
        loading={listLoading}
        error={listError}
        onRetry={() => void loadList()}
        onOpenMember={(id, name) => {
          setModalOpen(false);
          onOpenMember(id, name);
        }}
        month={month}
        year={year}
      />
    </>
  );
}
