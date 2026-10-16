import { toRaw } from 'vue';

// AI modified: form/query contracts use JSON business values, independent from Vue proxies.
export function copySnapshot<T>(source: T): T {
  if (source === undefined) return source;
  return JSON.parse(JSON.stringify(toRaw(source))) as T;
}
export function snapshotKey(source: unknown): string {
  return (
    JSON.stringify(source, (_key, entry: unknown) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return Object.fromEntries(
          Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)),
        );
      }
      return entry;
    }) ?? 'undefined'
  );
}
