export interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

export function parsePagination(searchParams: URLSearchParams): PaginationResult {
  let page = Number(searchParams.get('page'));
  if (!Number.isFinite(page) || page < 1) page = 1;

  let pageSize = Number(searchParams.get('pageSize'));
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  pageSize = Math.min(pageSize, MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
