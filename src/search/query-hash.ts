import { createHash } from 'crypto';

/** Trim, drop empties, dedupe, locale sort — used for hash & matching keys. */
export function normalizeIngredientNames(names: string[]): string[] {
  const unique = new Set<string>();
  for (const raw of names) {
    const name = raw?.trim();
    if (name) unique.add(name);
  }
  return [...unique].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Hash rule (docs/32_AI_MEMORY):
 * 鸡肉|土豆|青椒 → SHA256
 * Order-independent via normalize sort.
 */
export function computeQueryHash(names: string[]): string {
  const normalized = normalizeIngredientNames(names);
  return createHash('sha256')
    .update(normalized.join('|'), 'utf8')
    .digest('hex');
}
