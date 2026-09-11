export function parsePageLimit(
  query: { page?: unknown; limit?: unknown },
  defaults: { page?: number; limit?: number; max?: number } = {}
) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 50;
  const max = defaults.max ?? 100;

  const parsedPage = Number.parseInt(String(query.page ?? defaultPage), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : defaultPage;

  const parsedLimit = Number.parseInt(String(query.limit ?? defaultLimit), 10);
  let limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;
  if (limit > max) limit = max;

  return { page, limit, offset: (page - 1) * limit };
}

export function buildPagination(page: number, limit: number, total: number) {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit) || 1);
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
}
