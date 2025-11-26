import { parseCSV, mapColumns, normalizeRow, CSVRow } from '../utils/csvParser';
import { validateMember } from '../validators/memberValidator';
import { Member } from '../types';
import supabase from './supabase';

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
    
    // Valida cada linha
    const errors: Array<{ row: number; errors: ValidationError[] }> = [];
    const validRows: Partial<Member>[] = [];
    
    // Map para rastrear documentos duplicados dentro do próprio CSV
    const documentOccurrences = new Map<string, number[]>(); // document -> array de números de linha
    
    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0
      
      // Prepara dados do membro para validação (SEM church_id, que é adicionado automaticamente)
      const birthDate = row.birth ? new Date(row.birth) : undefined;
      const baptismDate = row.baptism_date ? new Date(row.baptism_date) : undefined;
      const admissionDate = row.admission_date ? new Date(row.admission_date) : undefined;
      
      // Garante que marital_status não seja string vazia (deve ser undefined se vazio)
      const maritalStatus = row.marital_status && row.marital_status.trim() !== '' 
        ? row.marital_status 
        : undefined;
      
      const memberData: Partial<Member> = {
        name: row.name || '',
        birth: birthDate,
        gender: row.gender as 'Masculino' | 'Feminino' | undefined,
        marital_status: maritalStatus as any,
        nationality: row.nationality || '',
        document: row.document || '',
        spouse: row.spouse || undefined,
        address: row.address || '',
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
        role_id: undefined, // Sempre undefined conforme requisitos
        occupation: row.occupation || undefined,
        active: true
        // church_id NÃO é incluído aqui - será adicionado automaticamente na inserção
      };
      
      // Valida usando o validator existente
      const { error: validationError } = validateMember(memberData);
      
      const rowErrors: ValidationError[] = [];
      
      if (validationError) {
        const validationRowErrors: ValidationError[] = validationError.details.map(detail => ({
          row: rowNumber,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value as string | undefined
        }));
        rowErrors.push(...validationRowErrors);
      }
      
      // Verifica duplicatas dentro do próprio CSV (por documento)
      if (memberData.document && memberData.document.trim() !== '') {
        const document = memberData.document.trim();
        if (documentOccurrences.has(document)) {
          const existingRows = documentOccurrences.get(document)!;
          existingRows.push(rowNumber);
          rowErrors.push({
            row: rowNumber,
            field: 'document',
            message: `Documento duplicado no arquivo CSV. Aparece também nas linhas: ${existingRows.slice(0, -1).join(', ')}`,
            value: document
          });
        } else {
          documentOccurrences.set(document, [rowNumber]);
        }
      }
      
      // Verifica duplicatas no banco de dados (por documento)
      if (memberData.document && memberData.document.trim() !== '') {
        const isDuplicate = await checkDuplicate(memberData, churchId);
        if (isDuplicate) {
          rowErrors.push({
            row: rowNumber,
            field: 'document',
            message: 'Documento já está cadastrado no sistema, provavelmente você está tentando importar um membro que já existe.',
            value: memberData.document
          });
        }
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
 * Verifica se um membro já existe (duplicata)
 */
async function checkDuplicate(
  memberData: Partial<Member>,
  churchId: string
): Promise<boolean> {
  try {
    // Verifica por documento (se fornecido)
    if (memberData.document) {
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('church_id', churchId)
        .eq('document', memberData.document)
        .single();
      
      if (!error && data) {
        return true;
      }
    }
    
    // Verifica por nome + data de nascimento (se ambos fornecidos)
    if (memberData.name && memberData.birth) {
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('church_id', churchId)
        .eq('name', memberData.name)
        .eq('birth', memberData.birth.toISOString())
        .single();
      
      if (!error && data) {
        return true;
      }
    }
    
    // Verifica por email (se fornecido)
    if (memberData.email) {
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('church_id', churchId)
        .eq('email', memberData.email)
        .single();
      
      if (!error && data) {
        return true;
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
      
      // Prepara dados do membro (SEM church_id, que é adicionado automaticamente)
      const birthDate = row.birth ? new Date(row.birth) : undefined;
      const baptismDate = row.baptism_date ? new Date(row.baptism_date) : undefined;
      const admissionDate = row.admission_date ? new Date(row.admission_date) : undefined;
      
      // Garante que marital_status não seja string vazia (deve ser undefined se vazio)
      const maritalStatus = row.marital_status && row.marital_status.trim() !== '' 
        ? row.marital_status 
        : undefined;
      
      const memberData: Partial<Member> = {
        name: row.name || '',
        birth: birthDate,
        gender: row.gender as 'Masculino' | 'Feminino' | undefined,
        marital_status: maritalStatus as any,
        nationality: row.nationality || '',
        document: row.document || '',
        spouse: row.spouse || undefined,
        address: row.address || '',
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
        role_id: undefined, // Sempre undefined conforme requisitos
        occupation: row.occupation || undefined,
        active: true
        // church_id NÃO é incluído aqui - será adicionado automaticamente na inserção
      };
      
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
            reason: 'Membro duplicado (mesmo documento, nome+nascimento ou email)'
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

