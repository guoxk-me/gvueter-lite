// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface PaginatedResult<T> {
  rows: T[]
  total: number
}
