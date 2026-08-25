import {
  CSV_IMPORT_SKIP_FIELD_IDS,
  columnsFromFields,
  memberCsvFieldLabels,
  memberCsvFieldValue,
  memberListFieldLabels,
  resolveExportColumns,
  rowsFromColumnKeys,
} from '../listFields';

describe('columnsFromFields / resolveExportColumns', () => {
  it('should ignore deprecated baptism_date and document fields', () => {
    const columns = columnsFromFields(
      ['name', 'baptism_date', 'document', 'email'],
      memberListFieldLabels
    );
    expect(columns.map((c) => c.key)).toEqual(['name', 'email']);
  });

  it('should sort fields by canonical form order', () => {
    const columns = columnsFromFields(
      ['email', 'name', 'phone'],
      memberListFieldLabels
    );
    expect(columns.map((c) => c.key)).toEqual(['name', 'phone', 'email']);
  });

  it('should return error when only deprecated fields remain', () => {
    const resolved = resolveExportColumns(
      ['baptism_date', 'document'],
      memberListFieldLabels
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.message).toMatch(/campo válido/i);
    }
  });

  it('should build rows from final column keys only', () => {
    const resolved = resolveExportColumns(
      ['name', 'baptism_date', 'email'],
      memberListFieldLabels
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const rows = rowsFromColumnKeys(
      [{ name: 'Ana', email: 'ana@example.com', baptism_date: '2000-01-01' }],
      resolved.columns,
      (item, field) => String((item as Record<string, string>)[field] ?? '')
    );

    expect(rows).toEqual([{ name: 'Ana', email: 'ana@example.com' }]);
    expect(rows[0]).not.toHaveProperty('baptism_date');
  });

  it('should include family flags in CSV catalog and ignore deprecated fields', () => {
    const resolved = resolveExportColumns(
      ['name', 'spouse_is_member', 'father_is_member', 'mother_is_member', 'baptism_date', 'document'],
      memberCsvFieldLabels
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.columns.map((c) => c.key)).toEqual([
      'name',
      'spouse_is_member',
      'father_is_member',
      'mother_is_member',
    ]);
    expect(resolved.columns.map((c) => c.label)).toEqual([
      'Nome',
      'Cônjuge é membro',
      'Pai é membro',
      'Mãe é membro',
    ]);
  });

  it('should serialize CSV values without PDF uppercase or dash placeholders', () => {
    const member = {
      name: 'Maria Silva',
      birth: '1990-03-15',
      spouse_is_member: true,
      father_is_member: 'nao',
      mother_is_member: 'falecido',
      children: [{ name: 'Pedro', birth: '2018-01-10', dependent: true }],
      congregation: { name: 'Sede' },
      phone: '11999998888',
    };

    expect(memberCsvFieldValue(member, 'name')).toBe('Maria Silva');
    expect(memberCsvFieldValue(member, 'birth')).toBe('15/03/1990');
    expect(memberCsvFieldValue(member, 'spouse_is_member')).toBe('sim');
    expect(memberCsvFieldValue(member, 'father_is_member')).toBe('nao');
    expect(memberCsvFieldValue(member, 'mother_is_member')).toBe('falecido');
    expect(memberCsvFieldValue(member, 'children')).toBe('Pedro|10/01/2018|Sim');
    expect(memberCsvFieldValue(member, 'congregation')).toBe('Sede');
    expect(memberCsvFieldValue(member, 'email')).toBe('');
    expect(CSV_IMPORT_SKIP_FIELD_IDS).toEqual(['age', 'active', 'congregation']);
  });
});
