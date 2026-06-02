import { createRepoChunks } from './chunker.js';
import { buildCitations, retrieveChunks } from './retriever.js';

const SECTION_QUERIES = {
  overview: {
    query: 'project purpose readme package architecture main app entrypoint',
    types: ['docs', 'manifest', 'source']
  },
  frontend: {
    query: 'frontend components pages app layout state styling react next vue svelte tailwind',
    types: ['frontend', 'source', 'manifest']
  },
  backend: {
    query: 'backend server express routes controllers services middleware api',
    types: ['route', 'controller', 'service', 'middleware', 'source']
  },
  apiFlow: {
    query: 'api routes request response controller service handler endpoint',
    types: ['route', 'controller', 'service', 'middleware']
  },
  database: {
    query: 'database models schemas prisma mongoose sequelize sql migration relations',
    types: ['database', 'model', 'schema']
  },
  authentication: {
    query: 'authentication auth login jwt session middleware protected routes user',
    types: ['auth', 'middleware', 'route', 'service']
  },
  security: {
    query: 'security env secrets cors validation auth upload rate limit helmet jwt',
    types: ['auth', 'middleware', 'config', 'route']
  },
  scalability: {
    query: 'scalability services architecture queue cache modular deployment database api',
    types: ['service', 'route', 'database', 'config']
  },
  performance: {
    query: 'performance cache build bundle database query render optimization middleware',
    types: ['service', 'database', 'frontend', 'config']
  },
  deployment: {
    query: 'deployment docker vercel render netlify github actions env production build',
    types: ['config', 'manifest', 'docs']
  },
  diagrams: {
    query: 'system architecture api database auth deployment components services routes',
    types: ['route', 'service', 'database', 'auth', 'config', 'frontend']
  }
};

export function buildRagContext(repoContext) {
  const chunks = createRepoChunks(repoContext.priorityFiles || []);
  const sections = {};
  const citations = {};

  for (const [section, config] of Object.entries(SECTION_QUERIES)) {
    const retrieved = retrieveChunks(chunks, config.query, {
      types: config.types,
      topK: section === 'diagrams' ? 10 : 7
    });

    sections[section] = retrieved.map(toEvidenceChunk);
    citations[section] = buildCitations(retrieved);
  }

  return {
    enabled: chunks.length > 0,
    strategy: 'keyword-retrieval',
    chunkCount: chunks.length,
    chunks,
    sections,
    citations
  };
}

function toEvidenceChunk(chunk) {
  return {
    id: chunk.id,
    path: chunk.path,
    type: chunk.type,
    lines: `${chunk.startLine}-${chunk.endLine}`,
    score: chunk.score,
    content: chunk.content.slice(0, 2600)
  };
}
