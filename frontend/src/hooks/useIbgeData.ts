import { useState, useEffect, useCallback, useRef } from 'react';

interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

interface UseIbgeDataReturn {
  states: IbgeState[];
  cities: IbgeCity[];
  loadingStates: boolean;
  loadingCities: boolean;
  errorStates: string | null;
  errorCities: string | null;
  fetchStates: () => Promise<void>;
  fetchCities: (stateId: string) => Promise<void>;
}

export function useIbgeData(): UseIbgeDataReturn {
  const [states, setStates] = useState<IbgeState[]>([]);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [errorStates, setErrorStates] = useState<string | null>(null);
  const [errorCities, setErrorCities] = useState<string | null>(null);
  const citiesRequestIdRef = useRef(0);

  const fetchStates = useCallback(async () => {
    setLoadingStates(true);
    setErrorStates(null);

    try {
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');

      if (!response.ok) {
        throw new Error('Não foi possível carregar os estados.');
      }

      const data: IbgeState[] = await response.json();
      setStates(data);
    } catch (error) {
      setStates([]);
      setErrorStates(error instanceof Error ? error.message : 'Erro desconhecido ao buscar estados.');
    } finally {
      setLoadingStates(false);
    }
  }, []);

  // Buscar estados
  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  // Função para buscar cidades de um estado
  const fetchCities = useCallback(async (stateId: string) => {
    const requestId = ++citiesRequestIdRef.current;
    if (!stateId) {
      setCities([]);
      setLoadingCities(false);
      setErrorCities(null);
      return;
    }

    setCities([]);
    setLoadingCities(true);
    setErrorCities(null);

    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`);

      if (!response.ok) {
        throw new Error('Não foi possível carregar as cidades deste estado.');
      }

      const data: IbgeCity[] = await response.json();
      if (requestId !== citiesRequestIdRef.current) {
        return;
      }
      setCities(data);
    } catch (error) {
      if (requestId !== citiesRequestIdRef.current) {
        return;
      }
      setCities([]);
      setErrorCities(error instanceof Error ? error.message : 'Erro desconhecido ao buscar cidades.');
    } finally {
      if (requestId === citiesRequestIdRef.current) {
        setLoadingCities(false);
      }
    }
  }, []);

  return {
    states,
    cities,
    loadingStates,
    loadingCities,
    errorStates,
    errorCities,
    fetchStates,
    fetchCities,
  };
} 