import {
  columnsFromFields,
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
});
