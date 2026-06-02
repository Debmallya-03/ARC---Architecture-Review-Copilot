const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'for',
  'with',
  'on',
  'by',
  'from',
  'is',
  'are',
  'this',
  'that',
  'project',
  'code'
]);

export function retrieveChunks(chunks = [], query, options = {}) {
  const queryTerms = tokenize(query);
  const filters = new Set(options.types || []);
  const topK = options.topK || 8;

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms, filters) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => ({
      ...entry.chunk,
      score: Number(entry.score.toFixed(2))
    }));
}

export function buildCitations(chunks = []) {
  return chunks.slice(0, 6).map((chunk) => ({
    path: chunk.path,
    lines: `${chunk.startLine}-${chunk.endLine}`,
    type: chunk.type
  }));
}

function scoreChunk(chunk, queryTerms, filters) {
  const haystack = `${chunk.path} ${chunk.type} ${chunk.content}`.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (haystack.includes(term)) score += 1;
    if (chunk.path.toLowerCase().includes(term)) score += 1.25;
    if (chunk.type.toLowerCase().includes(term)) score += 1.5;
  }

  if (filters.size && filters.has(chunk.type)) score += 4;
  if (/package\.json|readme/i.test(chunk.path)) score += 0.75;
  return score;
}

function tokenize(query = '') {
  return String(query)
    .toLowerCase()
    .split(/[^a-z0-9_@/-]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}
