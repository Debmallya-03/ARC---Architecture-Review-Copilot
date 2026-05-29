import axios from 'axios';
import { createMockReport } from '../data/mockReport.js';

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
  "issues": {"security":[],"scalability":[],"performance":[]},
  "recommendations": [],
  "score": 0,
  "diagrams": {"system":"mermaid","api":"mermaid","auth":"mermaid","database":"mermaid","deployment":"mermaid"}
}

Score must be a number from 0 to 10, not a percentage. For example, return 8, not 80.
Use valid Mermaid syntax without markdown fences. Every diagram value must start with one of: flowchart, graph, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, journey, gantt, pie, mindmap. If evidence is missing, return a small fallback Mermaid diagram that says no evidence was detected. Context:
${JSON.stringify(repoContext).slice(0, 90000)}`;
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
      temperature: 0.2
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return normalizeReport(JSON.parse(stripJsonFence(response.data.choices[0].message.content)), repoContext);
}

function normalizeReport(report, repoContext) {
  return {
    id: report.id || `arc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: repoContext.source,
    ...report,
    mode: report.mode || 'ai',
    score: normalizeScore(report.score),
    staticAnalysis: report.staticAnalysis || repoContext.staticAnalysis || {},
    diagrams: normalizeDiagrams(report.diagrams)
  };
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
