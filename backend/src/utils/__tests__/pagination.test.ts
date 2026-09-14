import { buildPagination, parsePageLimit } from '../pagination';

describe('parsePageLimit', () => {
  it('uses defaults and caps the limit', () => {
    expect(parsePageLimit({})).toEqual({ page: 1, limit: 50, offset: 0 });
    expect(parsePageLimit({ page: '2', limit: '20' })).toEqual({ page: 2, limit: 20, offset: 20 });
    expect(parsePageLimit({ page: '0', limit: '999' })).toEqual({ page: 1, limit: 100, offset: 0 });
  });
});

describe('buildPagination', () => {
  it('builds next/prev metadata', () => {
    expect(buildPagination(1, 50, 120)).toMatchObject({
      page: 1,
      limit: 50,
      total: 120,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
      nextPage: 2,
      prevPage: null,
    });
  });
});
