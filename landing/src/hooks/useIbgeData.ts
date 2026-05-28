import { useState, useEffect, useCallback } from 'react';

export const FALLBACK_UF_STATES = [
  { id: 1, sigla: 'AC', nome: 'Acre' },
  { id: 2, sigla: 'AL', nome: 'Alagoas' },
  { id: 3, sigla: 'AP', nome: 'Amapá' },
  { id: 4, sigla: 'AM', nome: 'Amazonas' },
  { id: 5, sigla: 'BA', nome: 'Bahia' },
  { id: 6, sigla: 'CE', nome: 'Ceará' },
  { id: 7, sigla: 'DF', nome: 'Distrito Federal' },
  { id: 8, sigla: 'ES', nome: 'Espírito Santo' },
  { id: 9, sigla: 'GO', nome: 'Goiás' },
  { id: 10, sigla: 'MA', nome: 'Maranhão' },
  { id: 11, sigla: 'MT', nome: 'Mato Grosso' },
  { id: 12, sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { id: 13, sigla: 'MG', nome: 'Minas Gerais' },
  { id: 14, sigla: 'PA', nome: 'Pará' },
  { id: 15, sigla: 'PB', nome: 'Paraíba' },
  { id: 16, sigla: 'PR', nome: 'Paraná' },
  { id: 17, sigla: 'PE', nome: 'Pernambuco' },
  { id: 18, sigla: 'PI', nome: 'Piauí' },
  { id: 19, sigla: 'RJ', nome: 'Rio de Janeiro' },
  { id: 20, sigla: 'RN', nome: 'Rio Grande do Norte' },
  { id: 21, sigla: 'RS', nome: 'Rio Grande do Sul' },
  { id: 22, sigla: 'RO', nome: 'Rondônia' },
  { id: 23, sigla: 'RR', nome: 'Roraima' },
  { id: 24, sigla: 'SC', nome: 'Santa Catarina' },
  { id: 25, sigla: 'SP', nome: 'São Paulo' },
  { id: 26, sigla: 'SE', nome: 'Sergipe' },
  { id: 27, sigla: 'TO', nome: 'Tocantins' },
];

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
        setStates(FALLBACK_UF_STATES);
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

