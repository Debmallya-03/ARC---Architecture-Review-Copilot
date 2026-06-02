const DEFAULT_CHUNK_LINES = 90;
const DEFAULT_OVERLAP_LINES = 18;
const MAX_CHUNKS = 180;

export function createRepoChunks(priorityFiles = [], options = {}) {
  const chunkLines = options.chunkLines || DEFAULT_CHUNK_LINES;
  const overlapLines = options.overlapLines || DEFAULT_OVERLAP_LINES;
  const chunks = [];

  for (const file of priorityFiles) {
    if (!file?.content || !file?.path) continue;
    const lines = String(file.content).split(/\r?\n/);
    const type = classifyFile(file.path);
    const step = Math.max(1, chunkLines - overlapLines);

    for (let start = 0; start < lines.length; start += step) {
      const end = Math.min(lines.length, start + chunkLines);
      const content = lines.slice(start, end).join('\n').trim();
      if (!content) continue;

      chunks.push({
        id: `${file.path}:${start + 1}-${end}`,
        path: file.path,
        type,
        startLine: start + 1,
        endLine: end,
        content,
        tokensApprox: approximateTokens(content)
      });

      if (chunks.length >= MAX_CHUNKS || end >= lines.length) break;
    }

    if (chunks.length >= MAX_CHUNKS) break;
  }

  return chunks;
}

export function classifyFile(filePath = '') {
  const lower = filePath.toLowerCase();
  if (/readme|docs?\//.test(lower)) return 'docs';
  if (/package\.json|pnpm-lock|yarn\.lock|package-lock/.test(lower)) return 'manifest';
  if (/app\/api\/|pages\/api\/|routes?\//.test(lower)) return 'route';
  if (/controllers?\//.test(lower)) return 'controller';
  if (/services?\//.test(lower)) return 'service';
  if (/models?\//.test(lower)) return 'model';
  if (/schemas?\//.test(lower)) return 'schema';
  if (/middleware\//.test(lower)) return 'middleware';
  if (/auth|login|jwt|session/.test(lower)) return 'auth';
  if (/db|database|prisma|migration|mongoose|sequelize/.test(lower)) return 'database';
  if (/config|\.env|docker|compose|vercel|netlify|render|github\/workflows/.test(lower)) return 'config';
  if (/components?|pages\/|app\/|src\/app|src\/pages/.test(lower)) return 'frontend';
  return 'source';
}

function approximateTokens(content) {
  return Math.ceil(String(content).length / 4);
}
