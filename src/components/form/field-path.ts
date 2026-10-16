const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function readField(model: object, path: string): unknown {
  let current: unknown = model;
  for (const segment of path.split('.')) {
    if (
      forbidden.has(segment) ||
      !current ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, segment)
    )
      return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
export function omitField(model: object, path: string) {
  const segments = path.split('.');
  const last = segments.pop();
  let current: unknown = model;
  for (const segment of segments) {
    if (forbidden.has(segment) || !current || typeof current !== 'object') return;
    current = (current as Record<string, unknown>)[segment];
  }
  if (last && !forbidden.has(last) && current && typeof current === 'object')
    delete (current as Record<string, unknown>)[last];
}
