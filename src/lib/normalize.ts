const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to', 'of',
  'brand', 'new', 'listing', 'sale', 'used', 'oem', 'genuine', 'authentic',
]);

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s\-./]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

export function normalizeTitle(title: string): string {
  return normalizeQuery(title);
}

export function titleMatchScore(query: string, title: string): number {
  const qTokens = new Set(normalizeQuery(query).split(' '));
  const tTokens = new Set(normalizeTitle(title).split(' '));
  let matches = 0;
  qTokens.forEach(t => { if (tTokens.has(t)) matches++; });
  return qTokens.size > 0 ? matches / qTokens.size : 0;
}

export function searchListings<T extends { normalizedTitle: string; title: string; category: string }>(
  listings: T[],
  query: string,
  threshold = 0.3
): T[] {
  if (!query.trim()) return listings;
  return listings
    .map(l => ({ listing: l, score: titleMatchScore(query, l.title) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ listing }) => listing);
}
