import axios from 'axios';

const LOCAL_DIMENSIONS = 384;

export async function embedTexts(texts = []) {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    try {
      return await embedWithGemini(texts);
    } catch (error) {
      console.error('Gemini embedding failed, falling back to local embeddings:', error.response?.data || error.message);
    }
  }

  return texts.map((text) => localHashEmbedding(text));
}

export async function embedText(text = '') {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

async function embedWithGemini(texts) {
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  const embeddings = [];

  for (const text of texts) {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        model: `models/${model}`,
        content: { parts: [{ text: String(text).slice(0, 9000) }] }
      }
    );
    embeddings.push(response.data.embedding?.values || localHashEmbedding(text));
  }

  return embeddings;
}

function localHashEmbedding(text = '') {
  const vector = new Array(LOCAL_DIMENSIONS).fill(0);
  const tokens = String(text).toLowerCase().match(/[a-z0-9_/-]{2,}/g) || [];

  for (const token of tokens) {
    const index = positiveHash(token) % LOCAL_DIMENSIONS;
    const sign = positiveHash([...token].reverse().join('')) % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  return normalize(vector);
}

function positiveHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}
