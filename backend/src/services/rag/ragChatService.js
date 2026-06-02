import axios from 'axios';
import { createRepoChunks } from './chunker.js';
import { buildCitations } from './retriever.js';
import { createVectorIndex, vectorSearch } from './vectorStore.js';

export async function answerRepoQuestion({ question, repoContext, report }) {
  if (!question?.trim()) {
    const error = new Error('question is required');
    error.status = 400;
    throw error;
  }

  const chunks = repoContext?.rag?.chunks?.length
    ? repoContext.rag.chunks
    : createRepoChunks(repoContext?.priorityFiles || []);

  if (!chunks.length) {
    return {
      mode: 'fallback',
      answer: 'ARC does not have enough repository chunks to answer this question. Run a fresh analysis first.',
      citations: []
    };
  }

  const index = await createVectorIndex(chunks);
  const retrieved = await vectorSearch(index, question, { topK: 8 });
  const citations = buildCitations(retrieved);
  const providers = resolveProviders();

  if (!providers.length) {
    return createFallbackAnswer(question, retrieved, citations);
  }

  try {
    const prompt = buildChatPrompt(question, repoContext, report, retrieved);
    const { answer, provider } = await callAvailableProvider(prompt, providers);

    return {
      mode: 'ai',
      provider,
      answer,
      citations,
      retrieved: retrieved.map(compactRetrievedChunk)
    };
  } catch (error) {
    console.error('RAG chat AI request failed:', error.response?.data || error.message);
    return createFallbackAnswer(question, retrieved, citations);
  }
}

function resolveProviders() {
  const configured = (process.env.AI_PROVIDER || '').toLowerCase();
  if (configured === 'gemini' && process.env.GEMINI_API_KEY) return ['gemini'];
  if (configured === 'groq' && process.env.GROQ_API_KEY) return ['groq'];
  if (configured === 'openai') return [];

  return [
    process.env.GROQ_API_KEY && 'groq',
    process.env.GEMINI_API_KEY && 'gemini'
  ].filter(Boolean);
}

async function callAvailableProvider(prompt, providers) {
  let lastError;

  for (const provider of providers) {
    try {
      const answer = provider === 'gemini'
        ? await callGemini(prompt)
        : await callGroq(prompt);
      return { answer, provider };
    } catch (error) {
      lastError = error;
      console.error(`RAG chat ${provider} request failed:`, error.response?.data || error.message);
    }
  }

  throw lastError || new Error('No chat provider succeeded');
}

function buildChatPrompt(question, repoContext, report, chunks) {
  return `You are ARC's repository chat assistant. Answer the user's question using only the retrieved repository evidence.

Rules:
- Be concise and specific.
- Cite source paths naturally in the answer.
- If evidence is weak, say what is missing.
- Do not invent files or behavior.

Repository: ${repoContext?.source || report?.source || 'unknown'}
Detected stack: ${JSON.stringify(repoContext?.techStack || report?.techStack || {})}

Question:
${question}

Retrieved evidence:
${JSON.stringify(chunks.map(compactRetrievedChunk)).slice(0, 22000)}

Answer:`;
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] }
  );
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No answer returned by Gemini.';
}

async function callGroq(prompt) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.15,
      max_tokens: 900
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return response.data.choices?.[0]?.message?.content?.trim() || 'No answer returned by Groq.';
}

function createFallbackAnswer(question, chunks, citations) {
  const evidence = chunks.slice(0, 4);
  return {
    mode: 'fallback',
    answer: `I found ${evidence.length} relevant repository chunks for "${question}". Review these files first: ${citations.map((citation) => `${citation.path}${citation.lines ? `:${citation.lines}` : ''}`).join(', ') || 'no citations available'}.`,
    citations,
    retrieved: evidence.map(compactRetrievedChunk)
  };
}

function compactRetrievedChunk(chunk) {
  return {
    path: chunk.path,
    type: chunk.type,
    lines: `${chunk.startLine}-${chunk.endLine}`,
    score: chunk.score,
    content: String(chunk.content || '').slice(0, 1800)
  };
}
