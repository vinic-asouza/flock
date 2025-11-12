import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { IntegrationFilters } from '@/types';

interface IntegrationFiltersBarProps {
  filters: IntegrationFilters;
  onChange: (changes: Partial<IntegrationFilters>) => void;
  congregations: { id: string; name: string }[];
}

const statusLabels: Record<Exclude<IntegrationFilters['status'], 'descartado'>, string> = {
  todos: 'Todos',
  em_progresso: 'Em progresso',
  integrado: 'Integrado'
};

const statusOptions: Array<Exclude<IntegrationFilters['status'], 'descartado'>> = [
  'todos',
  'em_progresso',
  'integrado'
];

export function IntegrationFiltersBar({
  filters,
  onChange,
  congregations,
}: IntegrationFiltersBarProps) {
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenSelect(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (key: string) => {
    setOpenSelect(prev => (prev === key ? null : key));
  };

  const currentStatus = filters.status === 'descartado' ? 'todos' : filters.status;

  return (
    <div ref={containerRef} className="flex flex-wrap gap-4 items-start w-full">
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle('status')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <span>{statusLabels[currentStatus]}</span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'status' ? 'rotate-180' : ''}`}
            />
          </button>

          {openSelect === 'status' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                {statusOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange({ status: option });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${currentStatus === option ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {statusLabels[option]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600">Congregação prevista</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle('congregation')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <span>
              {filters.expectedCongregationId
                ? filters.expectedCongregationId === 'sede'
                  ? 'Sede'
                  : congregations.find(c => c.id === filters.expectedCongregationId)?.name || 'Congregação selecionada'
                : 'Todas as congregações'}
            </span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'congregation' ? 'rotate-180' : ''}`}
            />
          </button>

          {openSelect === 'congregation' && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ expectedCongregationId: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.expectedCongregationId ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todas as congregações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ expectedCongregationId: 'sede' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.expectedCongregationId === 'sede' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Sede
                </button>
                {congregations.map(congregation => (
                  <button
                    key={congregation.id}
                    type="button"
                    onClick={() => {
                      onChange({ expectedCongregationId: congregation.id });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.expectedCongregationId === congregation.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {congregation.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

