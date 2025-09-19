import { useState, useEffect, useMemo } from 'react';
import { useIbgeData } from './useIbgeData';
import { getStateName } from '@/utils';

interface GeographyDataHook {
  states: Array<{ code: string; name: string; count: number }>;
  cities: Array<{ name: string; count: number }>;
  loading: boolean;
  error: string | null;
  selectedState: string;
  selectedCity: string;
  setSelectedState: (state: string) => void;
  setSelectedCity: (city: string) => void;
  filteredCities: Array<{ name: string; count: number }>;
}

export function useGeographyData(
  citiesData: Record<string, number>,
  statesData: Record<string, number>
): GeographyDataHook {
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook do IBGE para buscar dados de estados e cidades
  const { states: ibgeStates, cities: ibgeCities, fetchCities, loadingCities } = useIbgeData();

  // Processar dados de estados com membros
  const states = useMemo(() => {
    return Object.entries(statesData)
      .map(([code, count]) => ({
        code,
        name: getStateName(code),
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [statesData]);

  // Processar dados de cidades com membros
  const cities = useMemo(() => {
    return Object.entries(citiesData)
      .map(([name, count]) => ({
        name,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [citiesData]);

  // Filtrar cidades baseado no estado selecionado
  const filteredCities = useMemo(() => {
    console.log(`Filtrando cidades para estado: ${selectedState}`);
    console.log(`Cidades disponíveis:`, cities.map(c => c.name));
    console.log(`Cidades do IBGE:`, ibgeCities.map(c => c.nome));
    
    if (!selectedState) {
      return cities; // Mostrar todas as cidades se nenhum estado estiver selecionado
    }

    // Se temos dados do IBGE, usar para filtrar cidades por estado
    if (ibgeCities.length > 0) {
      const stateCities = ibgeCities.map(city => city.nome);
      
      // Filtrar cidades que estão no estado selecionado
      const filtered = cities.filter(city => 
        stateCities.some(ibgeCity => 
          ibgeCity.toLowerCase() === city.name.toLowerCase()
        )
      );
      
      console.log(`Cidades filtradas:`, filtered.map(c => c.name));
      return filtered;
    }

    // Fallback: mostrar todas as cidades se não conseguir filtrar
    return cities;
  }, [selectedState, cities, ibgeCities]);

  // Buscar cidades do IBGE quando estado for selecionado
  useEffect(() => {
    if (selectedState) {
      const ibgeState = ibgeStates.find(state => state.sigla === selectedState);
      if (ibgeState) {
        console.log(`Buscando cidades para o estado: ${selectedState} (${ibgeState.nome})`);
        fetchCities(ibgeState.id.toString());
      } else {
        console.log(`Estado não encontrado no IBGE: ${selectedState}`);
      }
    } else {
      // Limpar cidades quando nenhum estado estiver selecionado
      fetchCities('');
    }
  }, [selectedState, ibgeStates, fetchCities]);

  // Limpar cidade quando estado mudar
  useEffect(() => {
    setSelectedCity('');
  }, [selectedState]);

  // Definir estado inicial
  useEffect(() => {
    if (states.length > 0 && !selectedState) {
      setSelectedState(states[0].code);
    }
  }, [states, selectedState]);

  return {
    states,
    cities,
    loading: loading || loadingCities,
    error,
    selectedState,
    selectedCity,
    setSelectedState,
    setSelectedCity,
    filteredCities
  };
}
