import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { Readable } from 'stream';

export interface CSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  [csvColumn: string]: string; // CSV column name -> Member field name
}

/**
 * Mapeamento padrão de colunas comuns do CSV para campos do sistema
 */
export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  // Nome
  'nome': 'name',
  'name': 'name',
  'NOME': 'name',
  'Nome': 'name',
  
  // Data de nascimento
  'data_nascimento': 'birth',
  'data nascimento': 'birth',
  'nascimento': 'birth',
  'birth': 'birth',
  'birth_date': 'birth',
  'birthdate': 'birth',
  'data de nascimento': 'birth',
  
  // Gênero
  'genero': 'gender',
  'gênero': 'gender',
  'gender': 'gender',
  'sexo': 'gender',
  'sex': 'gender',
  
  // Estado civil
  'estado_civil': 'marital_status',
  'estado civil': 'marital_status',
  'marital_status': 'marital_status',
  'civil': 'marital_status',
  
  // Nacionalidade
  'nacionalidade': 'nationality',
  'nationality': 'nationality',
  'pais': 'nationality',
  'país': 'nationality',
  
  // Documento
  'documento': 'document',
  'document': 'document',
  'cpf': 'document',
  'rg': 'document',
  'doc': 'document',
  
  // Cônjuge
  'conjuge': 'spouse',
  'cônjuge': 'spouse',
  'spouse': 'spouse',
  'esposo': 'spouse',
  'esposa': 'spouse',
  
  // Endereço
  'endereco': 'address',
  'endereço': 'address',
  'address': 'address',
  'rua': 'address',
  'logradouro': 'address',
  
  // Complemento
  'complemento': 'complement',
  'complement': 'complement',
  'complemento_endereco': 'complement',
  
  // CEP
  'cep': 'cep',
  'CEP': 'cep',
  'zip': 'cep',
  'zipcode': 'cep',
  
  // Bairro
  'bairro': 'neighborhood',
  'neighborhood': 'neighborhood',
  
  // Cidade
  'cidade': 'city',
  'city': 'city',
  
  // Estado
  'estado': 'state',
  'state': 'state',
  'uf': 'state',
  'UF': 'state',
  
  // Telefone
  'telefone': 'phone',
  'phone': 'phone',
  'tel': 'phone',
  'fone': 'phone',
  
  // WhatsApp
  'whatsapp': 'whatsapp',
  'WhatsApp': 'whatsapp',
  'whats': 'whatsapp',
  'wa': 'whatsapp',
  
  // Email
  'email': 'email',
  'e-mail': 'email',
  'mail': 'email',
  
  // Data de batismo
  'data_batismo': 'baptism_date',
  'data batismo': 'baptism_date',
  'batismo': 'baptism_date',
  'baptism_date': 'baptism_date',
  'baptism': 'baptism_date',
  'data de batismo': 'baptism_date',
  
  // Tipo de admissão
  'tipo_admissao': 'admission',
  'tipo admissão': 'admission',
  'admission': 'admission',
  'admissao': 'admission',
  'admissão': 'admission',
  'tipo de admissão': 'admission',
  
  // Data de admissão
  'data_admissao': 'admission_date',
  'data admissão': 'admission_date',
  'admission_date': 'admission_date',
  'data de admissão': 'admission_date',
  
  // Profissão
  'profissao': 'occupation',
  'profissão': 'occupation',
  'occupation': 'occupation',
  'trabalho': 'occupation',
  'cargo_profissional': 'occupation',
};

/**
 * Detecta o encoding do arquivo (UTF-8 ou ISO-8859-1)
 */
export function detectEncoding(buffer: Buffer): string {
  // Tenta decodificar como UTF-8 primeiro
  try {
    const utf8String = buffer.toString('utf8');
    // Verifica se há caracteres de substituição () que indicam encoding incorreto
    const hasReplacementChar = utf8String.includes('\ufffd');
    
    if (!hasReplacementChar) {
      // Verifica se há caracteres acentuados válidos em UTF-8
      const hasValidAccents = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(utf8String);
      // Se tiver acentos válidos ou não tiver caracteres suspeitos, provavelmente é UTF-8
      if (hasValidAccents) {
        return 'utf8';
      }
      // Se não tem acentos mas também não tem caracteres de substituição, pode ser UTF-8
      // Verifica se há padrões comuns de encoding incorreto (ex: Ã, Ã£, etc)
      const hasEncodingErrors = /[ÃÂÊÔÕÚ]/.test(utf8String);
      if (!hasEncodingErrors) {
        return 'utf8';
      }
    }
  } catch (e) {
    // Não é UTF-8 válido
  }
  
  // Se chegou aqui, provavelmente é ISO-8859-1 (Latin-1)
  // Tenta decodificar como Latin-1
  try {
    const latin1String = iconv.decode(buffer, 'latin1');
    // Verifica se decodificou corretamente (sem caracteres de substituição)
    if (!latin1String.includes('\ufffd')) {
      return 'latin1';
    }
  } catch (e) {
    // Erro ao decodificar
  }
  
  // Fallback: tenta UTF-8 mesmo assim
  return 'utf8';
}

/**
 * Converte o buffer para string usando o encoding correto
 */
export function convertBufferToString(buffer: Buffer, encoding?: string): string {
  const detectedEncoding = encoding || detectEncoding(buffer);
  if (detectedEncoding === 'utf8') {
    return buffer.toString('utf8');
  }
  return iconv.decode(buffer, detectedEncoding);
}

/**
 * Parse do CSV a partir de um buffer
 */
export function parseCSV(
  buffer: Buffer,
  options: {
    encoding?: string;
    delimiter?: string;
    skipEmptyLines?: boolean;
    columns?: boolean;
  } = {}
): CSVRow[] {
  let encoding = options.encoding || detectEncoding(buffer);
  let csvString = convertBufferToString(buffer, encoding);
  
  // Verifica se o encoding detectado está correto verificando caracteres comuns de encoding incorreto
  // Se encontrar padrões como "Ã£" ou "Ã©", provavelmente o encoding está errado
  if (!options.encoding) {
    const hasEncodingErrors = /[ÃÂÊÔÕÚ][a-z]/.test(csvString);
    if (hasEncodingErrors && encoding === 'utf8') {
      // Tenta como Latin-1
      try {
        const latin1String = iconv.decode(buffer, 'latin1');
        if (!latin1String.includes('\ufffd')) {
          encoding = 'latin1';
          csvString = latin1String;
        }
      } catch (e) {
        // Mantém o encoding original
      }
    } else if (hasEncodingErrors && encoding === 'latin1') {
      // Tenta como UTF-8
      try {
        const utf8String = buffer.toString('utf8');
        if (!utf8String.includes('\ufffd')) {
          encoding = 'utf8';
          csvString = utf8String;
        }
      } catch (e) {
        // Mantém o encoding original
      }
    }
  }
  
  // Detecta delimitador se não fornecido
  const delimiter = options.delimiter || detectDelimiter(csvString);
  
  const records = parse(csvString, {
    delimiter,
    skip_empty_lines: options.skipEmptyLines !== false,
    columns: options.columns !== false,
    trim: true,
    bom: true, // Remove BOM se presente
  });
  
  return records as unknown as CSVRow[];
}

/**
 * Detecta o delimitador do CSV (vírgula, ponto-e-vírgula ou tab)
 */
function detectDelimiter(csvString: string): string {
  const firstLine = csvString.split('\n')[0];
  const delimiters = [',', ';', '\t'];
  
  let maxCount = 0;
  let detectedDelimiter = ',';
  
  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  }
  
  return detectedDelimiter;
}

/**
 * Mapeia as colunas do CSV para os campos do sistema
 */
export function mapColumns(
  csvRows: CSVRow[],
  columnMapping: ColumnMapping = DEFAULT_COLUMN_MAPPING
): CSVRow[] {
  if (csvRows.length === 0) return [];
  
  // Normaliza o mapeamento (case-insensitive)
  const normalizedMapping: ColumnMapping = {};
  const csvHeaders = Object.keys(csvRows[0]);
  
  // Cria mapeamento normalizado
  csvHeaders.forEach(csvHeader => {
    const normalizedHeader = csvHeader.toLowerCase().trim();
    
    // Procura no mapeamento padrão
    for (const [key, value] of Object.entries(columnMapping)) {
      if (key.toLowerCase() === normalizedHeader) {
        normalizedMapping[csvHeader] = value;
        break;
      }
    }
  });
  
  // Mapeia as linhas
  return csvRows.map(row => {
    const mappedRow: CSVRow = {};
    
    Object.keys(row).forEach(csvColumn => {
      const mappedField = normalizedMapping[csvColumn];
      if (mappedField) {
        mappedRow[mappedField] = row[csvColumn];
      }
    });
    
    return mappedRow;
  });
}

/**
 * Normaliza uma data de múltiplos formatos para Date
 */
export function normalizeDate(dateString: string | undefined | null): Date | null {
  if (!dateString || dateString.trim() === '') return null;
  
  const trimmed = dateString.trim();
  
  // Tenta diferentes formatos
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY
  const ddmmyyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/; // DD-MM-YYYY
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD
  const ddmmyy = /^(\d{2})\/(\d{2})\/(\d{2})$/; // DD/MM/YY
  
  let match = trimmed.match(ddmmyyyy);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  match = trimmed.match(ddmmyyyyDash);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  match = trimmed.match(yyyymmdd);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  match = trimmed.match(ddmmyy);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    // Se ano tem 2 dígitos, assume 1900-2099
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Tenta parse direto
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

/**
 * Normaliza telefone removendo caracteres especiais
 */
export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone || phone.trim() === '') return null;
  
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 0) return null;
  
  return numbers;
}

/**
 * Normaliza CEP removendo caracteres especiais e garantindo 8 dígitos
 */
export function normalizeCEP(cep: string | undefined | null): string | null {
  if (!cep || cep.trim() === '') return null;
  
  // Remove todos os caracteres não numéricos
  const numbers = cep.replace(/\D/g, '');
  
  if (numbers.length === 0) return null;
  
  // Adiciona zeros à esquerda se necessário
  const normalized = numbers.padStart(8, '0');
  
  // Retorna apenas os primeiros 8 dígitos
  return normalized.substring(0, 8);
}

/**
 * Normaliza gênero para os valores aceitos pelo sistema
 */
export function normalizeGender(gender: string | undefined | null): 'Masculino' | 'Feminino' | null {
  if (!gender || gender.trim() === '') return null;
  
  const normalized = gender.trim().toLowerCase();
  
  const mappings: { [key: string]: 'Masculino' | 'Feminino' } = {
    'masculino': 'Masculino',
    'm': 'Masculino',
    'male': 'Masculino',
    'feminino': 'Feminino',
    'f': 'Feminino',
    'female': 'Feminino',
  };
  
  return mappings[normalized] || null;
}

/**
 * Normaliza estado civil para os valores aceitos pelo sistema
 */
export function normalizeMaritalStatus(
  status: string | undefined | null
): 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro' | null {
  if (!status || status.trim() === '') return null;
  
  const trimmed = status.trim();
  
  // Primeiro verifica se já está no formato correto (case-insensitive, com ou sem acento)
  const validValuesExact = ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro'];
  const trimmedLower = trimmed.toLowerCase();
  
  // Comparação case-insensitive com valores válidos
  for (const validValue of validValuesExact) {
    if (trimmedLower === validValue.toLowerCase()) {
      return validValue as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro'; // Retorna no formato correto
    }
  }
  
  // Normaliza para lowercase para comparação
  const normalized = trimmedLower
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos
  
  // Valores válidos já no formato correto (sem acentos para comparação)
  const validValues: { [key: string]: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro' } = {
    'solteiro': 'Solteiro',
    'casado': 'Casado',
    'divorciado': 'Divorciado',
    'viuvo': 'Viúvo',
    'outro': 'Outro',
  };
  
  // Se já está no formato correto, retorna direto
  if (validValues[normalized]) {
    return validValues[normalized];
  }
  
  // Mapeamentos de variações (também sem acentos para comparação)
  const mappings: { [key: string]: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro' } = {
    'solteira': 'Solteiro',
    'single': 'Solteiro',
    'casada': 'Casado',
    'married': 'Casado',
    'divorciada': 'Divorciado',
    'divorced': 'Divorciado',
    'viuva': 'Viúvo',
    'widowed': 'Viúvo',
    'other': 'Outro',
  };
  
  return mappings[normalized] || null;
}

/**
 * Normaliza estado (UF) para 2 caracteres maiúsculos
 */
export function normalizeState(state: string | undefined | null): string | null {
  if (!state || state.trim() === '') return null;
  
  const normalized = state.trim().toUpperCase();
  
  // Se já tem 2 caracteres, retorna
  if (normalized.length === 2) {
    return normalized;
  }
  
  // Tenta mapear nomes completos para UF
  const stateMap: { [key: string]: string } = {
    'acre': 'AC',
    'alagoas': 'AL',
    'amapa': 'AP',
    'amapá': 'AP',
    'amazonas': 'AM',
    'bahia': 'BA',
    'ceara': 'CE',
    'ceará': 'CE',
    'distrito federal': 'DF',
    'espirito santo': 'ES',
    'espírito santo': 'ES',
    'goias': 'GO',
    'goiás': 'GO',
    'maranhao': 'MA',
    'maranhão': 'MA',
    'mato grosso': 'MT',
    'mato grosso do sul': 'MS',
    'minas gerais': 'MG',
    'para': 'PA',
    'pará': 'PA',
    'paraiba': 'PB',
    'paraíba': 'PB',
    'parana': 'PR',
    'paraná': 'PR',
    'pernambuco': 'PE',
    'piaui': 'PI',
    'piauí': 'PI',
    'rio de janeiro': 'RJ',
    'rio grande do norte': 'RN',
    'rio grande do sul': 'RS',
    'rondonia': 'RO',
    'rondônia': 'RO',
    'roraima': 'RR',
    'santa catarina': 'SC',
    'sao paulo': 'SP',
    'são paulo': 'SP',
    'sergipe': 'SE',
    'tocantins': 'TO',
  };
  
  const mapped = stateMap[normalized.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  
  return normalized.substring(0, 2);
}

/**
 * Normaliza todos os dados de uma linha do CSV
 */
export function normalizeRow(row: CSVRow): CSVRow {
  const normalized: CSVRow = { ...row };
  
  // Normaliza datas (mantém como string ISO para facilitar conversão depois)
  if (normalized.birth) {
    const birthDate = normalizeDate(normalized.birth);
    normalized.birth = birthDate ? birthDate.toISOString().split('T')[0] : '';
  }
  
  if (normalized.baptism_date) {
    const baptismDate = normalizeDate(normalized.baptism_date);
    normalized.baptism_date = baptismDate ? baptismDate.toISOString().split('T')[0] : '';
  }
  
  if (normalized.admission_date) {
    const admissionDate = normalizeDate(normalized.admission_date);
    normalized.admission_date = admissionDate ? admissionDate.toISOString().split('T')[0] : '';
  }
  
  // Normaliza telefones
  if (normalized.phone) {
    normalized.phone = normalizePhone(normalized.phone) || '';
  }
  
  if (normalized.whatsapp) {
    normalized.whatsapp = normalizePhone(normalized.whatsapp) || '';
  }
  
  // Normaliza CEP
  if (normalized.cep) {
    normalized.cep = normalizeCEP(normalized.cep) || '';
  }
  
  // Normaliza gênero
  if (normalized.gender) {
    const gender = normalizeGender(normalized.gender);
    normalized.gender = gender || '';
  }
  
  // Normaliza estado civil
  if (normalized.marital_status && normalized.marital_status.trim() !== '') {
    const maritalStatus = normalizeMaritalStatus(normalized.marital_status);
    if (maritalStatus) {
      normalized.marital_status = maritalStatus;
    } else {
      // Se não encontrou no mapeamento, verifica se já está no formato correto (case-insensitive)
      const trimmed = normalized.marital_status.trim();
      const validValues = ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro'];
      const trimmedLower = trimmed.toLowerCase();
      const matchedValue = validValues.find(v => v.toLowerCase() === trimmedLower);
      if (matchedValue) {
        normalized.marital_status = matchedValue;
      } else {
        // Tenta normalizar removendo acentos para comparação
        const normalizedForCompare = trimmed
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const matchedWithoutAccent = validValues.find(v => 
          v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalizedForCompare
        );
        if (matchedWithoutAccent) {
          normalized.marital_status = matchedWithoutAccent;
        } else {
          // Se não encontrou, mantém o valor original (será validado depois)
          // Não define como vazio para não perder a informação
        }
      }
    }
  } else {
    // Se não tem valor ou está vazio, remove o campo (será undefined)
    delete normalized.marital_status;
  }
  
  // Normaliza estado
  if (normalized.state) {
    normalized.state = normalizeState(normalized.state) || '';
  }
  
  return normalized;
}

