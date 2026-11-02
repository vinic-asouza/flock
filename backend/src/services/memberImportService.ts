import { parseCSV, mapColumns, normalizeRow, CSVRow } from '../utils/csvParser';
import { validateMember } from '../validators/memberValidator';
import { Member } from '../types';
import { supabaseAdmin as supabase } from './supabase';
import {
  collectDuplicateWarnings,
  DUPLICATE_WARNING_MESSAGES,
  hasAnyContact,
  MemberIdentityRow,
  MISSING_CONTACT_WARNING,
  resolveConsentForCreate,
} from '../utils/memberIdentity';

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
  warnings: Array<{
    row: number;
    messages: string[];
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
  warnings: Array<{
    row: number;
    messages: string[];
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
        warnings: [],
        preview: []
      };
    }
    
    // Mapeia colunas
    const mappedRows = mapColumns(csvRows);
    
    // Normaliza dados
    const normalizedRows = mappedRows.map(normalizeRow);
    
    // Prepara todos os dados dos membros primeiro
    const memberDataList: Array<{ data: Partial<Member>; rowNumber: number }> = [];
    
    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0
      
      const memberData = buildMemberFromCSVRow(row, congregationId, rowNumber);
      memberDataList.push({ data: memberData, rowNumber });
    }
    
    const knownMembers = await loadChurchIdentities(churchId);
    const errors: Array<{ row: number; errors: ValidationError[] }> = [];
    const warnings: Array<{ row: number; messages: string[] }> = [];
    const validRows: Partial<Member>[] = [];
    
    for (const { data: memberData, rowNumber } of memberDataList) {
      const rowErrors: ValidationError[] = [];
      
      const { error: validationError } = validateMember(memberData, { mode: 'import' });
      
      if (validationError) {
        const validationRowErrors: ValidationError[] = validationError.details.map(detail => ({
          row: rowNumber,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value as string | undefined
        }));
        rowErrors.push(...validationRowErrors);
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors
        });
        continue;
      }

      const messages = memberRowWarnings(memberData, knownMembers);
      if (messages.length > 0) {
        warnings.push({ row: rowNumber, messages });
      }
      knownMembers.push({
        id: `csv-${rowNumber}`,
        name: memberData.name || '',
        birth: memberData.birth,
        email: memberData.email,
      });
      validRows.push(memberData);
    }
    
    // Preview de todas as linhas válidas
    const preview = validRows;
    
    return {
      valid: errors.length === 0,
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      errors,
      warnings,
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
      warnings: [],
      preview: []
    };
  }
}

async function loadChurchIdentities(churchId: string): Promise<MemberIdentityRow[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, birth, email')
    .eq('church_id', churchId);

  if (error) {
    console.error('Erro ao carregar membros para aviso de duplicidade:', error);
    return [];
  }

  return (data ?? []) as MemberIdentityRow[];
}

function memberRowWarnings(member: Partial<Member>, knownMembers: MemberIdentityRow[]): string[] {
  const messages: string[] = [];
  if (!hasAnyContact(member)) {
    messages.push(MISSING_CONTACT_WARNING);
  }
  for (const warning of collectDuplicateWarnings(member, knownMembers)) {
    messages.push(DUPLICATE_WARNING_MESSAGES[warning]);
  }
  return messages;
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
    communicationConsent?: boolean;
  } = {}
): Promise<ImportResult> {
  const communicationConsent = options.communicationConsent === true;

  try {
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
        skipped: [],
        warnings: [],
      };
    }

    const mappedRows = mapColumns(csvRows);
    const normalizedRows = mappedRows.map(normalizeRow);
    const errors: Array<{ row: number; errors: string[] }> = [];
    const warnings: Array<{ row: number; messages: string[] }> = [];
    const membersToImport: Array<{ rowNumber: number; member: Partial<Member> }> = [];
    const knownMembers = await loadChurchIdentities(churchId);
    const consent = resolveConsentForCreate(communicationConsent, 'import');

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const rowNumber = i + 2;
      const memberData = buildMemberFromCSVRow(row, congregationId, rowNumber);
      const { error: validationError } = validateMember(memberData, { mode: 'import' });

      if (validationError) {
        errors.push({
          row: rowNumber,
          errors: validationError.details.map(detail => detail.message)
        });
        continue;
      }

      const messages = memberRowWarnings(memberData, knownMembers);
      if (messages.length > 0) {
        warnings.push({ row: rowNumber, messages });
      }
      knownMembers.push({
        id: `csv-${rowNumber}`,
        name: memberData.name || '',
        birth: memberData.birth,
        email: memberData.email,
      });
      membersToImport.push({ rowNumber, member: memberData });
    }

    const batchSize = 100;
    let importedCount = 0;
    const importErrors: Array<{ row: number; errors: string[] }> = [];

    for (let i = 0; i < membersToImport.length; i += batchSize) {
      const batch = membersToImport.slice(i, i + batchSize);
      const batchForInsert = batch.map(({ member }) => ({
        ...member,
        ...consent,
        minor_without_own_contact: false,
        duplicate_review_pending: false,
        church_id: churchId,
        birth: member.birth ? member.birth.toISOString() : null,
        baptism_date: member.baptism_date ? member.baptism_date.toISOString() : null,
        admission_date: member.admission_date ? member.admission_date.toISOString() : null,
        wedding_date: member.wedding_date ? member.wedding_date.toISOString() : null,
        children: member.children && Array.isArray(member.children)
          ? member.children
          : [],
      }));

      const { error: insertError } = await supabase
        .from('members')
        .insert(batchForInsert);

      if (insertError) {
        batch.forEach(({ rowNumber }) => {
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
      skippedRows: 0,
      errors: [...errors, ...importErrors],
      skipped: [],
      warnings,
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
      skipped: [],
      warnings: [],
    };
  }
}

