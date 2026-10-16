import type { QueryFunction, QueryKey } from '@tanstack/vue-query';
import type { VNodeChild } from 'vue';
export interface PageResult<T> {
  records: T[];
  total: number;
}
export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}
export interface TableRequest<S, C> {
  search: S;
  context: C;
  page: number;
  pageSize: number;
  sort: TableSort | null;
}
export interface TableQuery<T> {
  queryKey: QueryKey;
  queryFn: QueryFunction<PageResult<T>>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}
export interface DataTableColumn<T> {
  id: string;
  title: string;
  field?: keyof T & string;
  read?: (row: T) => unknown;
  render?: (context: { row: T; value: unknown }) => VNodeChild;
  sortField?: keyof T & string;
  wrap?: boolean;
}
export type TableCommandOutcome = {
  status: 'success' | 'failed' | 'validation-failed' | 'not-executed' | 'superseded';
};

export interface DataTableHandle<T> {
  refresh: () => Promise<TableCommandOutcome>;
  submitSearch: () => Promise<TableCommandOutcome>;
  resetSearch: () => Promise<TableCommandOutcome>;
  clearSelection: (ids?: readonly (string | number)[]) => void;
  readonly selectedIds: readonly (string | number)[];
  readonly selectedRows: readonly T[];
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly error: Error | null;
}
