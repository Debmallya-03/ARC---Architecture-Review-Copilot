import axios from 'axios';
import { createMockReport } from '../data/mockReport.js';
import { createScoreBreakdown } from '../utils/securityScanner.js';

export async function generateArchitectureReport(repoContext) {
  const provider = resolveProvider();
  const hasKey =
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY;

  if (!provider || !hasKey) {
    return createMockReport(repoContext, 'Demo mode: no AI provider/API key configured.');
  }

  const prompt = buildPrompt(repoContext);
  try {
    if (provider === 'openai') return await callOpenAI(prompt, repoContext);
    if (provider === 'gemini') return await callGemini(prompt, repoContext);
    if (provider === 'groq') return await callGroq(prompt, repoContext);
    return createMockReport(repoContext, `Demo mode: unsupported AI_PROVIDER "${provider}".`);
  } catch (error) {
    console.error('AI generation failed:', error.response?.data || error.message);
    return createMockReport(repoContext, 'Demo mode: AI request failed, showing mocked report.');
  }
}

function resolveProvider() {
  const configured = (process.env.AI_PROVIDER || '').toLowerCase();
  if (configured) return configured;
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return '';
}

function buildPrompt(repoContext) {
  return `You are ARC, an architecture review copilot. Analyze the summarized repository context and return strict JSON only.

Required JSON shape:
{
  "title": "string",
  "mode": "ai",
  "overview": "string",
  "techStack": {"frontend":[],"backend":[],"database":[],"auth":[],"deployment":[],"language":"string"},
  "sections": {"folderStructure":"string","frontend":"string","backend":"string","apiFlow":"string","database":"string","authentication":"string","deployment":"string"},
  "staticAnalysis": {"routes":[],"dependencyGraph":[],"databaseSchemas":[]},
  "citations": {"overview":[],"frontend":[],"backend":[],"apiFlow":[],"database":[],"authentication":[],"security":[],"scalability":[],"performance":[],"deployment":[],"diagrams":[]},
  "issues": {"security":[],"scalability":[],"performance":[]},
  "recommendations": [],
  "score": 0,
  "scoreBreakdown": {"overall":0,"security":0,"scalability":0,"maintainability":0,"performance":0,"deployment":0,"documentation":0},
  "diagrams": {"system":"mermaid","api":"mermaid","auth":"mermaid","database":"mermaid","deployment":"mermaid"}
}

Score must be a number from 0 to 10, not a percentage. For example, return 8, not 80.
Use scoreBreakdown for category-level scores from 0 to 10. Respect deterministic security findings from repoContext.staticAnalysis.securityFindings.
Use repoContext.rag.sections as retrieved evidence for each report section. Add citations using repoContext.rag.citations. Each citation must include path, lines, and type.
Prefer cited evidence over broad assumptions. If retrieved evidence is weak, say that evidence is limited.
Use valid Mermaid syntax without markdown fences. Every diagram value must start with one of: flowchart, graph, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, journey, gantt, pie, mindmap. If evidence is missing, return a small fallback Mermaid diagram that says no evidence was detected. Context:
${JSON.stringify(compactRepoContext(repoContext)).slice(0, 30000)}`;
}

async function callOpenAI(prompt, repoContext) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return normalizeReport(JSON.parse(response.data.choices[0].message.content), repoContext);
}

async function callGemini(prompt, repoContext) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] }
  );
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return normalizeReport(JSON.parse(stripJsonFence(text)), repoContext);
}

async function callGroq(prompt, repoContext) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return normalizeReport(JSON.parse(stripJsonFence(response.data.choices[0].message.content)), repoContext);
}

function normalizeReport(report, repoContext) {
  const score = normalizeScore(report.score);
  return {
    id: report.id || `arc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: repoContext.source,
    ...report,
    mode: report.mode || 'ai',
    score,
    scoreBreakdown: normalizeScoreBreakdown(report.scoreBreakdown, repoContext, score),
    staticAnalysis: mergeStaticAnalysis(repoContext.staticAnalysis, report.staticAnalysis),
    citations: normalizeCitations(report.citations, repoContext.rag?.citations),
    rag: {
      enabled: Boolean(repoContext.rag?.enabled),
      strategy: repoContext.rag?.strategy || 'none',
      chunkCount: repoContext.rag?.chunkCount || 0
    },
    diagrams: normalizeDiagrams(report.diagrams)
  };
}

function compactRepoContext(repoContext) {
  const { priorityFiles, ...rest } = repoContext;
  return {
    ...rest,
    structure: truncateText(repoContext.structure, 4500),
    staticAnalysis: compactStaticAnalysis(repoContext.staticAnalysis),
    rag: compactRag(repoContext.rag),
    priorityFiles: (priorityFiles || []).map((file) => ({
      path: file.path,
      size: file.size
    }))
  };
}

function compactStaticAnalysis(staticAnalysis = {}) {
  return {
    routes: (staticAnalysis.routes || []).slice(0, 35),
    dependencyGraph: (staticAnalysis.dependencyGraph || []).slice(0, 45),
    databaseSchemas: (staticAnalysis.databaseSchemas || []).slice(0, 25),
    securityFindings: (staticAnalysis.securityFindings || []).slice(0, 25),
    securitySummary: staticAnalysis.securitySummary || { critical: 0, high: 0, medium: 0, low: 0 }
  };
}

function compactRag(rag = {}) {
  const sections = {};
  for (const [section, chunks] of Object.entries(rag.sections || {})) {
    sections[section] = (chunks || []).slice(0, 2).map((chunk) => ({
      path: chunk.path,
      type: chunk.type,
      lines: chunk.lines,
      score: chunk.score,
      content: truncateText(chunk.content, 700)
    }));
  }

  return {
    enabled: Boolean(rag.enabled),
    strategy: rag.strategy || 'keyword-retrieval',
    chunkCount: rag.chunkCount || 0,
    sections,
    citations: rag.citations || {}
  };
}

function truncateText(value = '', maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n... [truncated]` : text;
}

function normalizeCitations(reportCitations = {}, fallbackCitations = {}) {
  const keys = ['overview', 'frontend', 'backend', 'apiFlow', 'database', 'authentication', 'security', 'scalability', 'performance', 'deployment', 'diagrams'];
  return Object.fromEntries(
    keys.map((key) => {
      const citations = Array.isArray(reportCitations[key]) && reportCitations[key].length
        ? reportCitations[key]
        : fallbackCitations[key] || [];
      return [key, citations.map(normalizeCitation).filter(Boolean).slice(0, 8)];
    })
  );
}

function normalizeCitation(citation) {
  if (!citation || typeof citation !== 'object') return null;
  return {
    path: String(citation.path || 'unknown'),
    lines: String(citation.lines || ''),
    type: String(citation.type || 'source')
  };
}

function mergeStaticAnalysis(repoAnalysis = {}, reportAnalysis = {}) {
  return {
    ...repoAnalysis,
    ...reportAnalysis,
    routes: reportAnalysis.routes?.length ? reportAnalysis.routes : repoAnalysis.routes || [],
    dependencyGraph: reportAnalysis.dependencyGraph?.length ? reportAnalysis.dependencyGraph : repoAnalysis.dependencyGraph || [],
    databaseSchemas: reportAnalysis.databaseSchemas?.length ? reportAnalysis.databaseSchemas : repoAnalysis.databaseSchemas || [],
    securityFindings: repoAnalysis.securityFindings || [],
    securitySummary: repoAnalysis.securitySummary || { critical: 0, high: 0, medium: 0, low: 0 }
  };
}

function normalizeScoreBreakdown(scoreBreakdown, repoContext, score) {
  const deterministic = createScoreBreakdown(repoContext, score);
  const merged = { ...deterministic, ...(scoreBreakdown || {}) };

  return Object.fromEntries(
    Object.entries(deterministic).map(([key, fallback]) => [
      key,
      normalizeScore(merged[key] ?? fallback)
    ])
  );
}

function normalizeScore(value) {
  const raw = Number.parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(raw)) return 0;

  const score = raw > 10 && raw <= 100 ? raw / 10 : raw;
  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

function stripJsonFence(text) {
  return text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
}

function normalizeDiagrams(diagrams = {}) {
  const labels = {
    system: 'System architecture',
    api: 'No API flow evidence detected',
    auth: 'No authentication flow evidence detected',
    database: 'No database relationship evidence detected',
    deployment: 'Deployment architecture'
  };

  return Object.fromEntries(
    Object.entries(labels).map(([key, label]) => [key, sanitizeMermaid(diagrams[key], label)])
  );
}

function sanitizeMermaid(value, fallbackLabel) {
  let code = String(value || '').trim();
  code = stripCodeFence(code);
  code = code.replace(/-->\|([^|]+)\|>\s*/g, '-->|$1| ');
  code = code.replace(/--\|([^|]+)\|>\s*/g, '-->|$1| ');
  code = code.replace(/;\s*/g, '\n');

  if (!isMermaid(code)) {
    return `flowchart TD\nA[${escapeMermaidLabel(fallbackLabel)}]`;
  }

  return code;
}

function stripCodeFence(value) {
  return value
    .replace(/^```mermaid/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function isMermaid(code) {
  return /^(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram-v2|journey|gantt|pie|mindmap)\b/i.test(code.trim());
}

function escapeMermaidLabel(label) {
  return String(label).replace(/[[\]"]/g, '');
}
