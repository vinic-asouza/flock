// Utilitários gerais da aplicação

/** Fuso padrão do produto (MVP). */
export const APP_TIMEZONE = 'America/Sao_Paulo';

type TzParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function getTimeZoneParts(date: Date, timeZone: string): TzParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * Data civil (nascimento, recebimento etc.): sem deslocamento de fuso.
 * YYYY-MM-DD → DD/MM/YYYY; timestamps com hora usam America/Sao_Paulo.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    if (typeof date === 'string') {
      if (date.includes('/')) return date;

      // Data civil pura: nunca passar por Date() (UTC meia-noite desloca o dia em BRT)
      const dateOnly = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnly) {
        const [, year, month, day] = dateOnly;
        return `${day}/${month}/${year}`;
      }
    }

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    // Date-only ISO com T (ex.: 2015-03-01T00:00:00.000Z) → calendário UTC = dia civil
    if (typeof date === 'string' && /T00:00:00(\.\d+)?(Z|[+-]00:00)?$/.test(date)) {
      return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    return d.toLocaleDateString('pt-BR', { timeZone: APP_TIMEZONE });
  } catch {
    return '';
  }
}

/**
 * Data e hora no fuso America/Sao_Paulo (timestamps do painel).
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDateTimeParts(date, false);
}

/** Data e hora com segundos, para o relógio do Painel mudar no mesmo minuto. */
export function formatDateTimeWithSeconds(date: string | Date | null | undefined): string {
  return formatDateTimeParts(date, true);
}

function formatDateTimeParts(
  date: string | Date | null | undefined,
  withSeconds: boolean
): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' as const } : {}),
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return '';
  }
}

/**
 * Valor para input datetime-local no fuso do produto (não usar toISOString().slice).
 */
export function toDateTimeLocalValue(
  date: Date | string,
  timeZone: string = APP_TIMEZONE
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const p = getTimeZoneParts(d, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Interpreta YYYY-MM-DDTHH:mm como relógio de parede em America/Sao_Paulo → ISO UTC.
 */
export function dateTimeLocalToISO(
  value: string,
  timeZone: string = APP_TIMEZONE
): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? value : fallback.toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  // Converge UTC instant cujo wall-clock em `timeZone` = valor informado
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i++) {
    const parts = getTimeZoneParts(new Date(utcMs), timeZone);
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    utcMs += desired - asUtc;
  }

  return new Date(utcMs).toISOString();
}

/**
 * Converte data do formato DD/MM/YYYY para ISO (YYYY-MM-DD)
 * Valida se o formato está correto antes de converter
 * @param formattedDate - Data no formato DD/MM/YYYY
 * @returns Data no formato ISO (YYYY-MM-DD) ou null se inválida
 */
export function formatDateToISO(formattedDate: string): string | null {
  if (!formattedDate || typeof formattedDate !== 'string') {
    return null;
  }

  // Se já estiver no formato ISO (YYYY-MM-DD), retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
    return formattedDate;
  }

  // Validar formato DD/MM/YYYY exato (10 caracteres)
  if (formattedDate.length !== 10) {
    return null;
  }

  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = formattedDate.match(datePattern);
  
  if (!match) {
    return null;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validar ranges básicos
  if (month < 1 || month > 12) {
    return null;
  }

  if (day < 1 || day > 31) {
    return null;
  }

  // Validar ano (deve ser entre 1900 e ano atual + 1)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 1) {
    return null;
  }

  // Validar se a data existe (ex: 31/02/2024 não existe)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  // Converter para ISO
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Calcula a idade a partir de uma data de nascimento
 * Usa lógica robusta que evita problemas de timezone
 * @param birth - Data de nascimento em formato ISO (YYYY-MM-DD) ou Date
 * @returns Idade em anos ou null se data inválida
 */
export function calculateAge(birth: string | Date | null | undefined): number | null {
  if (!birth) return null;

  try {
    let date: Date;

    if (typeof birth === 'string') {
      // Tentar extrair data no formato YYYY-MM-DD (ou ISO) de forma segura
      const raw = birth.includes('T') ? birth.split('T')[0] : birth;
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        const [, year, month, day] = match;
        // Cria Date usando componentes locais para evitar problemas de timezone
        date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      } else {
        // Fallback para outros formatos
        date = new Date(birth);
      }
    } else {
      date = birth;
    }

    if (isNaN(date.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
}

/**
 * Extrai o nome do arquivo do header Content-Disposition de uma resposta HTTP.
 */
export function getFilenameFromContentDisposition(header?: string): string | null {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = header.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();

  return null;
}

/**
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
 * Formata telefone brasileiro para exibição
 * @param phone - Telefone com ou sem formatação (aceita null/undefined)
 * @returns Telefone formatado no padrão (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX, ou '—' se vazio
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '—';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone; // Retorna original se não tiver formato válido
}

/**
 * Máscara progressiva de telefone para campos de input.
 * Fixo (≤10 dígitos): (DD) XXXX-XXXX · Celular (11): (DD) XXXXX-XXXX
 */
export function maskPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
export function debounce<A extends unknown[], R>(
  func: (...args: A) => R,
  wait: number
): (...args: A) => void {
  let timeout: NodeJS.Timeout;
  return (...args: A) => {
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
    ([, name]) => name.toLowerCase() === stateName.toLowerCase()
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