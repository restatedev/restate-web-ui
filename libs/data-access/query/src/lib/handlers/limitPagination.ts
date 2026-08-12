export const DEFAULT_LIMIT_PAGE_SIZE = 1000;
export const MAX_LIMIT_PAGE_SIZE = 1000;

export function limitPageSize(limit?: number) {
  return Math.min(
    Math.max(Math.floor(limit ?? DEFAULT_LIMIT_PAGE_SIZE), 1),
    MAX_LIMIT_PAGE_SIZE,
  );
}

export function limitPage<Row>(rows: Row[], limit: number) {
  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}
