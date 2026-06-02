import { embedText, embedTexts } from './embeddingService.js';

export async function createVectorIndex(chunks = []) {
  const texts = chunks.map((chunk) => chunkToEmbeddingText(chunk));
  const embeddings = await embedTexts(texts);
  return chunks.map((chunk, index) => ({
    chunk,
    embedding: embeddings[index]
  }));
}

export async function vectorSearch(index = [], query, options = {}) {
  const topK = options.topK || 8;
  const queryEmbedding = await embedText(query);

  return index
    .map((entry) => ({
      ...entry.chunk,
      score: cosineSimilarity(queryEmbedding, entry.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((chunk) => ({
      ...chunk,
      score: Number(chunk.score.toFixed(4))
    }));
}

function chunkToEmbeddingText(chunk) {
  return `${chunk.path}\n${chunk.type}\n${chunk.content}`;
}

function cosineSimilarity(a = [], b = []) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return denominator ? dot / denominator : 0;
}
