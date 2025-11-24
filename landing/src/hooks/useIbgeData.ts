import { useState, useEffect, useCallback } from 'react';

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
  fetchCities: (stateId: string) => void;
}

export function useIbgeData(): UseIbgeDataReturn {
  const [states, setStates] = useState<IbgeState[]>([]);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [errorStates, setErrorStates] = useState<string | null>(null);
  const [errorCities, setErrorCities] = useState<string | null>(null);

  // Buscar estados
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      setErrorStates(null);
      
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar estados');
        }
        
        const data: IbgeState[] = await response.json();
        setStates(data);
      } catch (error) {
        setErrorStates(error instanceof Error ? error.message : 'Erro desconhecido');
        console.error('Erro ao buscar estados:', error);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // Função para buscar cidades de um estado
  const fetchCities = useCallback(async (stateId: string) => {
    if (!stateId) {
      setCities([]);
      setLoadingCities(false);
      return;
    }

    setLoadingCities(true);
    setErrorCities(null);
    
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar cidades');
      }
      
      const data: IbgeCity[] = await response.json();
      setCities(data);
    } catch (error) {
      setErrorCities(error instanceof Error ? error.message : 'Erro desconhecido');
      console.error('Erro ao buscar cidades:', error);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  return {
    states,
    cities,
    loadingStates,
    loadingCities,
    errorStates,
    errorCities,
    fetchCities,
  };
}

