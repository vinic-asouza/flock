import { calculateAgeSafe, formatDateSafe, formatPhoneBR } from './format';
import {
  integrationAdmissionLabels,
  integrationGenderLabels,
  integrationMaritalLabels,
  integrationStatusLabels,
} from './integrationLabels';
import { PdfTableColumn } from './table';

/** Ordem canônica alinhada aos formulários / modais de export */
export const MEMBER_FIELD_ORDER = [
  'name',
  'age',
  'birth',
  'gender',
  'marital_status',
  'hometown',
  'wedding_date',
  'nationality',
  'spouse',
  'father_name',
  'mother_name',
  'occupation',
  'children',
  'phone',
  'whatsapp',
  'email',
  'active',
  'congregation',
  'admission',
  'admission_date',
  'address',
  'address_number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'cep',
] as const;

export const INTEGRATION_FIELD_ORDER = [
  'name',
  'birth',
  'gender',
  'marital_status',
  'status',
  'phone',
  'whatsapp',
  'expected_admission_type',
  'expected_congregation',
  'mentor',
  'mentor_contact',
  'notes',
  'created_at',
  'updated_at',
] as const;

/** Campos removidos do produto — ignorados se ainda vierem do cliente */
const DEPRECATED_MEMBER_FIELDS = new Set(['baptism_date', 'document']);

export const memberListFieldLabels: Record<string, string> = {
  name: 'Nome',
  age: 'Idade',
  birth: 'Nascimento',
  gender: 'Gênero',
  marital_status: 'Estado Civil',
  hometown: 'Natural de',
  nationality: 'Nacionalidade',
  wedding_date: 'Casamento',
  spouse: 'Cônjuge',
  father_name: 'Pai',
  mother_name: 'Mãe',
  occupation: 'Profissão',
  children: 'Filhos',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  active: 'Status',
  congregation: 'Congregação',
  admission: 'Recebimento',
  admission_date: 'Data Receb.',
  address: 'Endereço',
  address_number: 'Nº',
  complement: 'Compl.',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'UF',
  cep: 'CEP',
};

export const integrationListFieldLabels: Record<string, string> = {
  name: 'Nome',
  birth: 'Nascimento',
  gender: 'Gênero',
  marital_status: 'Estado Civil',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  expected_admission_type: 'Recebimento',
  expected_congregation: 'Congregação',
  mentor: 'Responsável',
  mentor_contact: 'Contato resp.',
  status: 'Status',
  notes: 'Notas',
  created_at: 'Criado em',
  updated_at: 'Atualizado em',
};

const wideFields = new Set([
  'name',
  'email',
  'address',
  'occupation',
  'children',
  'notes',
  'spouse',
  'father_name',
  'mother_name',
  'expected_congregation',
  'mentor',
]);

const narrowFields = new Set([
  'age',
  'state',
  'cep',
  'active',
  'gender',
  'address_number',
]);

function sortFieldsByFormOrder(fields: string[], order: readonly string[]): string[] {
  return [...fields]
    .filter((key) => !DEPRECATED_MEMBER_FIELDS.has(key))
    .sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      const sa = ia === -1 ? 9999 : ia;
      const sb = ib === -1 ? 9999 : ib;
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });
}

export function columnsFromFields(
  fields: string[],
  labels: Record<string, string>
): PdfTableColumn[] {
  const isIntegration = labels === integrationListFieldLabels;
  const order = isIntegration ? INTEGRATION_FIELD_ORDER : MEMBER_FIELD_ORDER;
  const sorted = sortFieldsByFormOrder(fields, order);

  return sorted.map((key) => ({
    key,
    label: labels[key] || key,
    width: wideFields.has(key) ? 2 : narrowFields.has(key) ? 0.7 : 1.2,
  }));
}

/**
 * Resolve colunas exportáveis após filtrar campos deprecated.
 * Retorna erro quando nenhum campo válido permanece (BR-REL-007).
 */
export function resolveExportColumns(
  fields: string[],
  labels: Record<string, string>
): { ok: true; columns: PdfTableColumn[] } | { ok: false; message: string } {
  const columns = columnsFromFields(fields, labels);
  if (columns.length === 0) {
    return {
      ok: false,
      message:
        'Nenhum campo válido para exportar. Remova campos obsoletos (ex.: batismo, documento) e selecione ao menos um campo suportado.',
    };
  }
  return { ok: true, columns };
}

export function rowsFromColumnKeys<T>(
  items: T[],
  columns: PdfTableColumn[],
  valueFn: (item: T, field: string) => string
): Array<Record<string, string>> {
  return items.map((item) =>
    columns.reduce((acc: Record<string, string>, col) => {
      acc[col.key] = valueFn(item, col.key);
      return acc;
    }, {})
  );
}

export function memberFieldValue(member: any, field: string): string {
  switch (field) {
    case 'name':
      return member.name ? String(member.name).toUpperCase() : '—';
    case 'age': {
      const age = calculateAgeSafe(member.birth);
      return age !== null ? String(age) : '—';
    }
    case 'birth':
    case 'wedding_date':
    case 'admission_date':
      return formatDateSafe(member[field]);
    case 'phone':
    case 'whatsapp':
      return formatPhoneBR(member[field]);
    case 'active':
      return member.active ? 'Ativo' : 'Inativo';
    case 'congregation':
      return member.congregation?.name || '—';
    case 'children':
      if (Array.isArray(member.children) && member.children.length > 0) {
        return member.children
          .map((child: any) => {
            const childAge = child.birth ? calculateAgeSafe(child.birth) : null;
            let text = child.name || '';
            if (childAge !== null) {
              text += ` (${childAge} ${childAge === 1 ? 'ano' : 'anos'})`;
            }
            if (child.dependent === true) text += ' - Reside junto';
            else if (child.dependent === false) text += ' - Não reside junto';
            return text;
          })
          .join('; ');
      }
      return '—';
    case 'address': {
      if (!member.address) return '—';
      return member.address_number
        ? `${member.address}, ${member.address_number}`
        : member.address;
    }
    default:
      return member[field] ? String(member[field]) : '—';
  }
}

export function integrationFieldValue(row: any, field: string): string {
  switch (field) {
    case 'name':
      return row.name ? String(row.name).toUpperCase() : '—';
    case 'birth':
    case 'created_at':
    case 'updated_at':
      return formatDateSafe(row[field]);
    case 'gender':
      return row.gender ? integrationGenderLabels[row.gender] ?? row.gender : '—';
    case 'marital_status':
      return row.marital_status
        ? integrationMaritalLabels[row.marital_status] ?? row.marital_status
        : '—';
    case 'phone':
    case 'whatsapp':
      return formatPhoneBR(row[field]);
    case 'expected_admission_type':
      return row.expected_admission_type
        ? integrationAdmissionLabels[row.expected_admission_type] ??
            row.expected_admission_type
        : '—';
    case 'expected_congregation':
      return row.expected_congregation?.name || '—';
    case 'mentor':
      return row.mentor?.name || '—';
    case 'mentor_contact': {
      const parts = [row.mentor?.phone, row.mentor?.whatsapp]
        .filter(Boolean)
        .map((p: string) => formatPhoneBR(p));
      return parts.join(' | ') || '—';
    }
    case 'status':
      return integrationStatusLabels[row.status] ?? row.status ?? '—';
    case 'notes': {
      const notes = row.notes ? String(row.notes) : '—';
      return notes.length > 80 ? `${notes.slice(0, 77)}…` : notes;
    }
    default:
      return row[field] ? String(row[field]) : '—';
  }
}
