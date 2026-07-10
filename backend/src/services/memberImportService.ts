import { parseCSV, mapColumns, normalizeRow, CSVRow } from '../utils/csvParser';
import { validateMember } from '../validators/memberValidator';
import { Member } from '../types';
import { supabaseAdmin as supabase } from './supabase';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    errors: ValidationError[];
  }>;
  preview: Partial<Member>[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
  skipped: Array<{
    row: number;
    reason: string;
  }>;
}

function parseChildrenFromRow(
  row: CSVRow,
  rowNumber: number
): Array<{ name: string; birth?: string; dependent?: boolean }> | undefined {
  if (!row.children) return undefined;

  try {
    if (Array.isArray(row.children)) {
      return row.children;
    }
    if (typeof row.children === 'string' && row.children.trim() !== '') {
      const parsed = JSON.parse(row.children);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Erro ao processar filhos na linha', rowNumber, ':', error);
  }
  return undefined;
}

function parseSpouseIsMember(value: string | undefined): boolean | string | undefined {
  if (!value || value.trim() === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Valor preenchido mas inválido: devolve o bruto para o Joi.boolean() rejeitar a linha
  return value;
}

function buildMemberFromCSVRow(
  row: CSVRow,
  congregationId: string | null,
  rowNumber: number
): Partial<Member> {
  const birthDate = row.birth ? new Date(row.birth) : undefined;
  const baptismDate = row.baptism_date ? new Date(row.baptism_date) : undefined;
  const admissionDate = row.admission_date ? new Date(row.admission_date) : undefined;
  const weddingDate = row.wedding_date ? new Date(row.wedding_date) : undefined;

  const maritalStatus = row.marital_status && row.marital_status.trim() !== ''
    ? row.marital_status
    : undefined;

  const fatherIsMember = row.father_is_member && row.father_is_member.trim() !== ''
    ? (row.father_is_member as 'sim' | 'nao' | 'falecido')
    : undefined;

  const motherIsMember = row.mother_is_member && row.mother_is_member.trim() !== ''
    ? (row.mother_is_member as 'sim' | 'nao' | 'falecido')
    : undefined;

  return {
    name: row.name || '',
    birth: birthDate,
    gender: row.gender as 'Masculino' | 'Feminino' | undefined,
    marital_status: maritalStatus as Member['marital_status'],
    hometown: row.hometown || undefined,
    wedding_date: weddingDate,
    nationality: row.nationality || '',
    document: row.document || '',
    spouse: row.spouse || undefined,
    spouse_is_member: parseSpouseIsMember(row.spouse_is_member) as any,
    address: row.address || '',
    address_number: row.address_number || undefined,
    complement: row.complement || undefined,
    cep: row.cep || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || undefined,
    email: row.email || undefined,
    baptism_date: baptismDate,
    admission: row.admission || '',
    admission_date: admissionDate,
    congregation_id: congregationId || undefined,
    occupation: row.occupation || undefined,
    father_name: row.father_name || undefined,
    father_is_member: fatherIsMember,
    mother_name: row.mother_name || undefined,
    mother_is_member: motherIsMember,
    children: parseChildrenFromRow(row, rowNumber),
    active: true
    // church_id NÃO é incluído aqui - será adicionado automaticamente na inserção
  };
}

/**
 * Valida a estrutura do CSV e retorna preview dos dados
 */
export async function validateCSV(
  buffer: Buffer,
  churchId: string,
  congregationId: string | null = null
): Promise<ValidationResult> {
  try {
    // Parse do CSV
    const csvRows = parseCSV(buffer);
    
    if (csvRows.length === 0) {
      return {
        valid: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{
          row: 0,
          errors: [{
            row: 0,
            field: 'file',
            message: 'O arquivo CSV está vazio'
          }]
        }],
        preview: []
      };
    }
    
    // Mapeia colunas
    const mappedRows = mapColumns(csvRows);
    
    // Normaliza dados
    const normalizedRows = mappedRows.map(normalizeRow);
    
    // Prepara todos os dados dos membros primeiro
    const memberDataList: Array<{ data: Partial<Member>; rowNumber: number }> = [];
    const nameOccurrences = new Map<string, number[]>(); // nome (lowercase) -> array de números de linha
    
    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0
      
      const memberData = buildMemberFromCSVRow(row, congregationId, rowNumber);

      memberDataList.push({ data: memberData, rowNumber });
      
      // Verifica duplicatas dentro do próprio CSV (por nome em lowercase)
      if (memberData.name && memberData.name.trim() !== '') {
        const normalizedName = memberData.name.trim().toLowerCase();
        if (nameOccurrences.has(normalizedName)) {
          nameOccurrences.get(normalizedName)!.push(rowNumber);
        } else {
          nameOccurrences.set(normalizedName, [rowNumber]);
        }
      }
    }
    
    // Busca duplicatas no banco de dados em batch (otimização)
    const existingDuplicates = await checkDuplicatesBatch(
      memberDataList.map(m => m.data),
      churchId
    );
    
    // Valida cada linha
    const errors: Array<{ row: number; errors: ValidationError[] }> = [];
    const validRows: Partial<Member>[] = [];
    
    for (const { data: memberData, rowNumber } of memberDataList) {
      const rowErrors: ValidationError[] = [];
      
      // Valida usando o validator existente
      const { error: validationError } = validateMember(memberData);
      
      if (validationError) {
        const validationRowErrors: ValidationError[] = validationError.details.map(detail => ({
          row: rowNumber,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value as string | undefined
        }));
        rowErrors.push(...validationRowErrors);
      }
      
      // Verifica duplicatas dentro do próprio CSV (por nome em lowercase)
      if (memberData.name && memberData.name.trim() !== '') {
        const normalizedName = memberData.name.trim().toLowerCase();
        const occurrences = nameOccurrences.get(normalizedName);
        if (occurrences && occurrences.length > 1) {
          const otherRows = occurrences.filter(r => r !== rowNumber);
          if (otherRows.length > 0) {
            rowErrors.push({
              row: rowNumber,
              field: 'name',
              message: `Nome duplicado no arquivo CSV. Aparece também nas linhas: ${otherRows.join(', ')}`,
              value: memberData.name
            });
          }
        }
      }
      
      // Verifica duplicatas no banco de dados (usando resultado do batch)
      // Verifica apenas por nome (lowercase)
      let isDuplicate = false;
      if (memberData.name && memberData.name.trim()) {
        const normalizedName = memberData.name.trim().toLowerCase();
        isDuplicate = existingDuplicates.has(`name:${normalizedName}`);
      }
      
      if (isDuplicate) {
        rowErrors.push({
          row: rowNumber,
          field: 'name',
          message: 'Membro já está cadastrado no sistema (mesmo nome completo).',
          value: memberData.name || ''
        });
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors
        });
      } else {
        validRows.push(memberData);
      }
    }
    
    // Preview de todas as linhas válidas
    const preview = validRows;
    
    return {
      valid: errors.length === 0,
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      errors,
      preview
    };
    
  } catch (error) {
    return {
      valid: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{
        row: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Erro ao processar arquivo CSV'
        }]
      }],
      preview: []
    };
  }
}

/**
 * Verifica duplicatas em batch (otimização para validação)
 * Retorna um Set com chaves únicas dos membros que são duplicatas
 * Chave: "name:XXX" (nome em lowercase)
 */
async function checkDuplicatesBatch(
  memberDataList: Partial<Member>[],
  churchId: string
): Promise<Set<string>> {
  const duplicateKeys = new Set<string>();
  
  try {
    // Coleta todos os nomes únicos (em lowercase)
    const names = new Set<string>();
    
    for (const memberData of memberDataList) {
      if (memberData.name && memberData.name.trim()) {
        const normalizedName = memberData.name.trim().toLowerCase();
        names.add(normalizedName);
      }
    }
    
    // Busca membros existentes com esses nomes em batch
    if (names.size > 0) {
      // Busca todos os membros da igreja e compara nomes em lowercase
      const { data: existingMembers } = await supabase
        .from('members')
        .select('name')
        .eq('church_id', churchId);
      
      if (existingMembers) {
        for (const member of existingMembers) {
          if (member.name) {
            const normalizedName = member.name.trim().toLowerCase();
            if (names.has(normalizedName)) {
              duplicateKeys.add(`name:${normalizedName}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    // Em caso de erro, logar mas não bloquear
    console.error('Erro ao verificar duplicatas em batch:', error);
  }
  
  return duplicateKeys;
}

/**
 * Verifica se um membro já existe (duplicata) - usado na importação
 * Verifica apenas por nome completo (lowercase)
 */
async function checkDuplicate(
  memberData: Partial<Member>,
  churchId: string
): Promise<boolean> {
  try {
    // Verifica apenas por nome (lowercase)
    if (memberData.name && memberData.name.trim()) {
      const normalizedName = memberData.name.trim().toLowerCase();
      
      // Busca todos os membros da igreja e compara nomes em lowercase
      const { data: existingMembers, error } = await supabase
        .from('members')
        .select('name')
        .eq('church_id', churchId);
      
      if (!error && existingMembers) {
        for (const member of existingMembers) {
          if (member.name) {
            const existingNormalizedName = member.name.trim().toLowerCase();
            if (existingNormalizedName === normalizedName) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    // Em caso de erro, assume que não é duplicata para não bloquear importação
    console.error('Erro ao verificar duplicata:', error);
    return false;
  }
}

/**
 * Importa membros do CSV
 */
export async function importMembers(
  buffer: Buffer,
  churchId: string,
  congregationId: string | null = null,
  options: {
    skipDuplicates?: boolean;
  } = {}
): Promise<ImportResult> {
  const skipDuplicates = options.skipDuplicates !== false;
  
  try {
    // Parse do CSV
    const csvRows = parseCSV(buffer);
    
    if (csvRows.length === 0) {
      return {
        success: false,
        totalRows: 0,
        importedRows: 0,
        errorRows: 0,
        skippedRows: 0,
        errors: [{
          row: 0,
          errors: ['O arquivo CSV está vazio']
        }],
        skipped: []
      };
    }
    
    // Mapeia e normaliza colunas
    const mappedRows = mapColumns(csvRows);
    const normalizedRows = mappedRows.map(normalizeRow);
    
    const errors: Array<{ row: number; errors: string[] }> = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const membersToImport: Partial<Member>[] = [];
    
    // Processa cada linha
    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho
      
      const memberData = buildMemberFromCSVRow(row, congregationId, rowNumber);

      // Valida dados
      const { error: validationError } = validateMember(memberData);
      
      if (validationError) {
        const errorMessages = validationError.details.map(detail => detail.message);
        errors.push({
          row: rowNumber,
          errors: errorMessages
        });
        continue;
      }
      
      // Verifica duplicatas se necessário
      if (skipDuplicates) {
        const isDuplicate = await checkDuplicate(memberData, churchId);
        if (isDuplicate) {
          skipped.push({
            row: rowNumber,
            reason: 'Membro duplicado (mesmo nome completo)'
          });
          continue;
        }
      }
      
      membersToImport.push(memberData);
    }
    
    // Importa em lotes de 100
    const batchSize = 100;
    let importedCount = 0;
    const importErrors: Array<{ row: number; errors: string[] }> = [];
    
    for (let i = 0; i < membersToImport.length; i += batchSize) {
      const batch = membersToImport.slice(i, i + batchSize);
      
      // Converte datas para ISO string para inserção no banco
      // Adiciona church_id a cada membro (não estava na validação)
      const batchForInsert = batch.map(member => ({
        ...member,
        church_id: churchId, // Adiciona church_id aqui, na hora da inserção
        birth: member.birth ? member.birth.toISOString() : null,
        baptism_date: member.baptism_date ? member.baptism_date.toISOString() : null,
        admission_date: member.admission_date ? member.admission_date.toISOString() : null,
        wedding_date: member.wedding_date ? member.wedding_date.toISOString() : null,
        // Garante que children seja um array JSON válido
        children: member.children && Array.isArray(member.children) 
          ? member.children 
          : [],
      }));
      
      const { error: insertError } = await supabase
        .from('members')
        .insert(batchForInsert);
      
      if (insertError) {
        // Adiciona erro para cada membro do batch
        batch.forEach((_, index) => {
          const rowNumber = (i + index) + 2; // +2 para compensar cabeçalho
          importErrors.push({
            row: rowNumber,
            errors: [insertError.message]
          });
        });
      } else {
        importedCount += batch.length;
      }
    }
    
    return {
      success: importedCount > 0,
      totalRows: normalizedRows.length,
      importedRows: importedCount,
      errorRows: errors.length + importErrors.length,
      skippedRows: skipped.length,
      errors: [...errors, ...importErrors],
      skipped
    };
    
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errorRows: 0,
      skippedRows: 0,
      errors: [{
        row: 0,
        errors: [error instanceof Error ? error.message : 'Erro ao processar importação']
      }],
      skipped: []
    };
  }
}

