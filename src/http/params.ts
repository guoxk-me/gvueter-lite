import { ApiError } from './api-error.ts';

export function assertQueryParams(params: unknown): void {
  const isScalar = (entry: unknown) =>
    entry === null ||
    entry === undefined ||
    typeof entry === 'string' ||
    typeof entry === 'boolean' ||
    (typeof entry === 'number' && Number.isFinite(entry));
  // AI modified: validate the project contract while Axios owns URL serialization.
  if (
    typeof params !== 'object' ||
    params === null ||
    Array.isArray(params) ||
    Object.values(params).some((entry: unknown) =>
      Array.isArray(entry) ? !entry.every(isScalar) : !isScalar(entry),
    )
  ) {
    throw new ApiError({ message: '查询参数必须是标量或标量数组', kind: 'config' });
  }
}
