'use client';

import { MemberFilters } from '@/app/(dashboard)/members/page';
import { useIbgeData } from '@/hooks/useIbgeData';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface MemberFiltersAdvancedProps {
  filters: MemberFilters;
  onChange: (changes: Partial<MemberFilters>) => void;
}

export function MemberFiltersAdvanced({ filters, onChange }: MemberFiltersAdvancedProps) {
  const { 
    states, 
    cities, 
    loadingStates, 
    loadingCities, 
    errorStates, 
    errorCities, 
    fetchCities 
  } = useIbgeData();

  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns quando clicar fora
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

  // Buscar cidades quando o estado mudar
  useEffect(() => {
    if (filters.state) {
      // Encontrar o ID do estado pela sigla
      const state = states.find(s => s.sigla === filters.state);
      if (state) {
        fetchCities(state.id.toString());
      }
    } else {
      // Limpar cidades se não há estado selecionado
      fetchCities('');
    }
  }, [filters.state, states, fetchCities]);

  // Função para lidar com mudança de estado
  const handleStateChange = (newState: string) => {
    if (newState === '') {
      // Limpar cidade quando estado for limpo
      onChange({ state: newState, city: '' });
    } else {
      onChange({ state: newState });
    }
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
      {/* Gênero */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Gênero</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'gender' ? null : 'gender')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.gender || 'Todos'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'gender' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Gênero */}
          {openSelect === 'gender' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ gender: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.gender ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ gender: 'Masculino' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.gender === 'Masculino' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Masculino
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ gender: 'Feminino' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.gender === 'Feminino' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Feminino
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Estado Civil */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Estado Civil</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'maritalStatus' ? null : 'maritalStatus')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.maritalStatus || 'Todos'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'maritalStatus' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Estado Civil */}
          {openSelect === 'maritalStatus' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.maritalStatus ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: 'Solteiro' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.maritalStatus === 'Solteiro' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Solteiro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: 'Casado' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.maritalStatus === 'Casado' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Casado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: 'Divorciado' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.maritalStatus === 'Divorciado' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Divorciado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: 'Viúvo' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.maritalStatus === 'Viúvo' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Viúvo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ maritalStatus: 'Outro' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.maritalStatus === 'Outro' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Outro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Nacionalidade */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nacionalidade</label>
        <input
          type="text"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
          value={filters.nationality}
          onChange={e => onChange({ nationality: e.target.value })}
          placeholder="Ex: Brasileira"
        />
      </div>
      {/* Estado */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'state' ? null : 'state')}
            disabled={loadingStates}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {filters.state ? states.find(s => s.sigla === filters.state)?.nome || 'Selecione o estado' : 'Selecione o estado'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'state' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Estado */}
          {openSelect === 'state' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    handleStateChange('');
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.state ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Selecione o estado
                </button>
                {states.map(state => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => {
                      handleStateChange(state.sigla);
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.state === state.sigla ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {state.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {loadingStates && (
          <div className="text-xs text-gray-500 mt-1">Carregando estados...</div>
        )}
        {errorStates && (
          <div className="text-xs text-red-500 mt-1">Erro: {errorStates}</div>
        )}
      </div>
      {/* Cidade */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'city' ? null : 'city')}
            disabled={loadingCities || !filters.state}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {filters.city || 'Selecione a cidade'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'city' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Cidade */}
          {openSelect === 'city' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ city: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.city ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Selecione a cidade
                </button>
                {cities.map(city => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onChange({ city: city.nome });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.city === city.nome ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {city.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {loadingCities && (
          <div className="text-xs text-gray-500 mt-1">Carregando cidades...</div>
        )}
        {errorCities && (
          <div className="text-xs text-red-500 mt-1">Erro: {errorCities}</div>
        )}
        {!filters.state && (
          <div className="text-xs text-gray-500 mt-1">Selecione um estado primeiro</div>
        )}
      </div>
      {/* Bairro */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
        <input
          type="text"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
          value={filters.neighborhood}
          onChange={e => onChange({ neighborhood: e.target.value })}
          placeholder="Digite o bairro"
        />
      </div>
      {/* Faixa Etária */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Idade (de)</label>
          <input
            type="number"
            min={0}
            max={150}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.ageFrom}
            onChange={e => onChange({ ageFrom: e.target.value })}
            placeholder="Mín"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Idade (até)</label>
          <input
            type="number"
            min={0}
            max={150}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.ageTo}
            onChange={e => onChange({ ageTo: e.target.value })}
            placeholder="Máx"
          />
        </div>
      </div>
      {/* Ocupação */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ocupação</label>
        <input
          type="text"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
          value={filters.occupation}
          onChange={e => onChange({ occupation: e.target.value })}
          placeholder="Digite a ocupação"
        />
      </div>
      {/* Data de Batismo */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de Batismo (de)</label>
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.baptismDateFrom}
            onChange={e => onChange({ baptismDateFrom: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de Batismo (até)</label>
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.baptismDateTo}
            onChange={e => onChange({ baptismDateTo: e.target.value })}
          />
        </div>
      </div>
      {/* Data de Admissão */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de Admissão (de)</label>
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.admissionDateFrom}
            onChange={e => onChange({ admissionDateFrom: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de Admissão (até)</label>
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none hover:border-gray-300 transition-colors"
            value={filters.admissionDateTo}
            onChange={e => onChange({ admissionDateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
} 