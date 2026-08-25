import {
  buildCalendarPdfFilterSummary,
  congregationPdfLabel,
  findJoinedCongregation,
  findJoinedGroup,
  groupPdfLabel,
  normalizeCalendarTypeFilter,
} from '../calendarPdfFilters';

describe('normalizeCalendarTypeFilter', () => {
  it('should return empty array when type is omitted', () => {
    expect(normalizeCalendarTypeFilter(undefined)).toEqual([]);
    expect(normalizeCalendarTypeFilter('')).toEqual([]);
  });

  it('should wrap a single type string', () => {
    expect(normalizeCalendarTypeFilter('Evento')).toEqual(['Evento']);
  });

  it('should keep an array of types', () => {
    expect(normalizeCalendarTypeFilter(['Evento', 'Reunião'])).toEqual(['Evento', 'Reunião']);
  });
});

describe('buildCalendarPdfFilterSummary', () => {
  it('should return undefined when no recorte is applied', () => {
    expect(buildCalendarPdfFilterSummary({ types: [] })).toBeUndefined();
  });

  it('should join types, congregation and group', () => {
    expect(
      buildCalendarPdfFilterSummary({
        types: ['Evento', 'Reunião'],
        congregationLabel: 'Sede',
        groupLabel: 'Ministério: Louvor',
      })
    ).toBe('Evento, Reunião • Sede • Ministério: Louvor');
  });
});

describe('congregationPdfLabel / groupPdfLabel', () => {
  it('should prefer congregation abbreviation', () => {
    expect(congregationPdfLabel({ name: 'Congregação Central', abbreviation: 'Sede' })).toBe('Sede');
  });

  it('should format group as type: name', () => {
    expect(groupPdfLabel({ name: 'Louvor', type: 'Ministério' })).toBe('Ministério: Louvor');
  });
});

describe('findJoinedCongregation / findJoinedGroup', () => {
  const items = [
    {
      congregation: { id: 'cong-1', name: 'Igreja da Paz', abbreviation: 'IDP' },
      group: { id: 'grp-1', name: 'Jovens', type: 'Ministério' },
    },
    {
      congregation: { id: 'cong-2', name: 'Sede', abbreviation: null },
      group: null,
    },
  ];

  it('should reuse congregation and group already joined on items', () => {
    expect(findJoinedCongregation(items, 'cong-1')?.abbreviation).toBe('IDP');
    expect(findJoinedGroup(items, 'grp-1')?.name).toBe('Jovens');
  });

  it('should return null when the list is empty or the id is missing', () => {
    expect(findJoinedCongregation([], 'cong-1')).toBeNull();
    expect(findJoinedCongregation(items, 'cong-missing')).toBeNull();
    expect(findJoinedGroup(items, 'grp-missing')).toBeNull();
  });
});
