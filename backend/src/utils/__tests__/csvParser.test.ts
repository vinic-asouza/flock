import {
  CSV_IMPORT_SKIP_FIELD_IDS,
  memberCsvFieldLabels,
} from '../pdf/listFields';
import {
  isImportSkippedHeader,
  mapColumns,
} from '../csvParser';

describe('csvParser mapColumns', () => {
  it('should map official CSV export labels to member fields', () => {
    const headers = Object.entries(memberCsvFieldLabels)
      .filter(([id]) => !(CSV_IMPORT_SKIP_FIELD_IDS as readonly string[]).includes(id))
      .map(([, label]) => label);

    const row: Record<string, string> = {};
    headers.forEach((header) => {
      row[header] = 'x';
    });

    const [mapped] = mapColumns([row]);

    expect(mapped.name).toBe('x');
    expect(mapped.birth).toBe('x');
    expect(mapped.hometown).toBe('x');
    expect(mapped.wedding_date).toBe('x');
    expect(mapped.spouse_is_member).toBe('x');
    expect(mapped.father_is_member).toBe('x');
    expect(mapped.mother_is_member).toBe('x');
    expect(mapped.address_number).toBe('x');
    expect(mapped.admission).toBe('x');
    expect(mapped.admission_date).toBe('x');
    expect(mapped.nationality).toBe('x');
    expect(mapped.age).toBeUndefined();
    expect(mapped.active).toBeUndefined();
    expect(mapped.congregation).toBeUndefined();
    expect(mapped.congregation_id).toBeUndefined();
  });

  it('should ignore idade, status and congregação headers', () => {
    expect(isImportSkippedHeader('Idade')).toBe(true);
    expect(isImportSkippedHeader('Status')).toBe(true);
    expect(isImportSkippedHeader('Congregação')).toBe(true);

    const [mapped] = mapColumns([{
      Nome: 'Ana',
      Idade: '30',
      Status: 'Ativo',
      Congregação: 'Sede',
    }]);

    expect(mapped.name).toBe('Ana');
    expect(mapped.age).toBeUndefined();
    expect(mapped.active).toBeUndefined();
    expect(mapped.congregation).toBeUndefined();
  });

  it('should still accept legacy nationality, document and baptism columns', () => {
    const [mapped] = mapColumns([{
      'Nacionalidade (legado)': 'Brasileira',
      'CPF/Documento (legado)': '123',
      'Data de Batismo': '01/01/2000',
    }]);

    expect(mapped.nationality).toBe('Brasileira');
    expect(mapped.document).toBe('123');
    expect(mapped.baptism_date).toBe('01/01/2000');
  });
});
