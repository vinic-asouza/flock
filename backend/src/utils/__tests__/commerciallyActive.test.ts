import {
  isCommerciallyActive,
  matchesCommerciallyActiveFilter,
} from '../commerciallyActive';

describe('isCommerciallyActive', () => {
  it('should treat active and trialing as commercially active', () => {
    expect(isCommerciallyActive('active')).toBe(true);
    expect(isCommerciallyActive('trialing')).toBe(true);
  });

  it('should treat other statuses and null as commercially inactive', () => {
    expect(isCommerciallyActive('canceled')).toBe(false);
    expect(isCommerciallyActive('past_due')).toBe(false);
    expect(isCommerciallyActive('unpaid')).toBe(false);
    expect(isCommerciallyActive(null)).toBe(false);
    expect(isCommerciallyActive(undefined)).toBe(false);
    expect(isCommerciallyActive('')).toBe(false);
  });
});

describe('matchesCommerciallyActiveFilter', () => {
  it('should keep only commercially active rows when filter is true', () => {
    expect(matchesCommerciallyActiveFilter('active', true)).toBe(true);
    expect(matchesCommerciallyActiveFilter('canceled', true)).toBe(false);
    expect(matchesCommerciallyActiveFilter(null, true)).toBe(false);
  });

  it('should keep inactive and null rows when filter is false', () => {
    expect(matchesCommerciallyActiveFilter('canceled', false)).toBe(true);
    expect(matchesCommerciallyActiveFilter(null, false)).toBe(true);
    expect(matchesCommerciallyActiveFilter('trialing', false)).toBe(false);
  });
});
