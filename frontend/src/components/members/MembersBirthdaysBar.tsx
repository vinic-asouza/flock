'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cake, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
        className="bg-white rounded-lg border border-[#090725]/10 px-2.5 py-1.5 sm:px-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-center gap-2 w-max min-w-full">
          <div className="flex items-center gap-2 shrink-0" aria-live="polite">
            <div className="p-1 rounded-md bg-pink-100 shrink-0" aria-hidden>
              <Cake size={14} className="text-pink-700" />
            </div>
            <span className="text-sm font-medium text-[#090725] whitespace-nowrap">Aniversariantes</span>
            {loading ? (
              <span className="inline-block h-4 w-6 rounded bg-[#090725]/10 animate-pulse shrink-0" aria-hidden />
            ) : (
              <span className="text-sm font-bold text-[#090725] tabular-nums leading-none shrink-0">
                {error ? '—' : (count ?? 0).toLocaleString('pt-BR')}
              </span>
            )}
            {!loading && error && (
              <span className="text-xs text-amber-700 whitespace-nowrap">Falha ao carregar</span>
            )}
            {!loading && !error && count === 0 && (
              <span className="text-xs text-gray-500 whitespace-nowrap">Nenhum neste mês</span>
            )}
            {showVer && (
              <button
                type="button"
                onClick={() => void loadList()}
                className="h-7 px-2 text-xs font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 rounded inline-flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Ver aniversariantes"
                title="Ver aniversariantes"
              >
                <Eye size={12} aria-hidden />
                Ver
              </button>
            )}
            {!loading && error && (
              <button
                type="button"
                onClick={() => void loadCount()}
                className="h-7 px-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Tentar
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[7.75rem] text-center text-xs sm:text-sm font-medium text-[#090725] whitespace-nowrap">
              {monthLabel(month, year)}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
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
