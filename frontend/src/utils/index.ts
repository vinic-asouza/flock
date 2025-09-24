// Utilitários gerais da aplicação

/**
 * Formata uma data para o formato brasileiro
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata um valor monetário para o formato brasileiro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata um CPF com máscara
 */
export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um CNPJ com máscara
 */
export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata um telefone com máscara
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Valida se um email é válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gera um ID único
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function para otimizar chamadas de API
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Capitaliza a primeira letra de uma string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Remove acentos de uma string
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte uma string para slug
 */
export function toSlug(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Lista de denominações religiosas
 */
export const DENOMINATIONS = [
  'Batista',
  'Presbiteriana',
  'Metodista',
  'Luterana',
  'Assembleia de Deus',
  'Igreja do Evangelho Quadrangular',
  'Igreja Universal do Reino de Deus',
  'Igreja Mundial do Poder de Deus',
  'Outra',
];

/**
 * Mapeamento de siglas de estados brasileiros para nomes completos
 */
export const STATE_NAMES: Record<string, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AP': 'Amapá',
  'AM': 'Amazonas',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MT': 'Mato Grosso',
  'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PR': 'Paraná',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'SC': 'Santa Catarina',
  'SP': 'São Paulo',
  'SE': 'Sergipe',
  'TO': 'Tocantins'
};

/**
 * Converte uma sigla de estado para o nome completo
 */
export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode.toUpperCase()] || stateCode;
}

/**
 * Converte um nome de estado para a sigla
 */
export function getStateCode(stateName: string): string {
  const entry = Object.entries(STATE_NAMES).find(
    ([code, name]) => name.toLowerCase() === stateName.toLowerCase()
  );
  return entry ? entry[0] : stateName;
}

/**
 * Organiza dados geográficos em estrutura hierárquica
 * Como não temos mapeamento direto cidade->estado nos dados de relatório,
 * vamos usar uma abordagem mais simples: mostrar todas as cidades quando um estado é selecionado
 */
export function organizeGeographicData(cities: Record<string, number>, states: Record<string, number>) {
  // Criar estrutura hierárquica: Estado -> Cidades
  const hierarchicalData: Record<string, { 
    name: string; 
    count: number; 
    cities: Record<string, number> 
  }> = {};

  // Organizar por estados
  Object.entries(states).forEach(([stateCode, stateCount]) => {
    hierarchicalData[stateCode] = {
      name: getStateName(stateCode),
      count: stateCount,
      cities: {}
    };
  });

  // Para cada estado, vamos mostrar todas as cidades disponíveis
  // O filtro real acontecerá na API quando o usuário selecionar cidade
  Object.keys(hierarchicalData).forEach(stateCode => {
    Object.entries(cities).forEach(([cityName, cityCount]) => {
      hierarchicalData[stateCode].cities[cityName] = cityCount;
    });
  });

  return hierarchicalData;
}

/**
 * Extrai lista de estados com membros, ordenados por quantidade
 */
export function getStatesWithMembers(geographicData: Record<string, { name: string; count: number; cities: Record<string, number> }>) {
  return Object.entries(geographicData)
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extrai lista de cidades de um estado específico, ordenadas por quantidade
 */
export function getCitiesOfState(geographicData: Record<string, { name: string; count: number; cities: Record<string, number> }>, stateCode: string) {
  const stateData = geographicData[stateCode];
  if (!stateData) return [];

  return Object.entries(stateData.cities)
    .map(([name, count]) => ({
      name,
      count
    }))
    .sort((a, b) => b.count - a.count);
}