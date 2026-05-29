import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.cache',
  'vendor',
  'target'
]);

const IMPORTANT_PATTERNS = [
  /package\.json$/i,
  /readme\.md$/i,
  /app\.(js|jsx|mjs|cjs)$/i,
  /server\.(js|jsx|mjs|cjs)$/i,
  /index\.(js|jsx|mjs|cjs)$/i,
  /routes?\//i,
  /controllers?\//i,
  /services?\//i,
  /models?\//i,
  /schemas?\//i,
  /middleware\//i,
  /config\//i,
  /db|database|prisma|mongoose|sequelize/i,
  /auth|login|session|jwt|passport/i,
  /dockerfile|compose\.ya?ml|vercel\.json|netlify\.toml/i,
  /\.env\.example$/i
];

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.html',
  '.yml',
  '.yaml',
  '.env',
  '.txt',
  '.prisma'
]);

const MAX_FILES = 500;
const MAX_FILE_CHARS = 6000;

export async function walkProject(root) {
  const results = [];

  async function visit(current) {
    if (results.length >= MAX_FILES) return;
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= MAX_FILES) break;
      if (entry.name.startsWith('.') && entry.name !== '.env.example' && entry.name !== '.github') {
        if (entry.isDirectory()) continue;
      }

      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(root, fullPath).replaceAll(path.sep, '/');

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name.toLowerCase())) await visit(fullPath);
        continue;
      }

      const stats = await fs.stat(fullPath);
      if (stats.size > 1024 * 1024) continue;
      results.push({ fullPath, relativePath, size: stats.size });
    }
  }

  await visit(root);
  return results;
}

export async function summarizeProject(root, files, source) {
  const packageFiles = files.filter((file) => file.relativePath.endsWith('package.json'));
  const importantFiles = files
    .filter((file) => IMPORTANT_PATTERNS.some((pattern) => pattern.test(file.relativePath)))
    .slice(0, 80);

  const snippets = [];
  for (const file of importantFiles) {
    const extension = path.extname(file.relativePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension) && !file.relativePath.toLowerCase().endsWith('dockerfile')) continue;
    const text = await readTextSnippet(file.fullPath);
    snippets.push({ path: file.relativePath, size: file.size, content: text });
  }

  const techStack = await detectTechStack(packageFiles, files);
  const structure = buildFolderTree(files.map((file) => file.relativePath));
  const categories = categorizeFiles(files);
  const warnings = [];
  if (files.length >= MAX_FILES) warnings.push('Large project warning: analysis was capped at the first 500 scanned files.');

  return {
    source,
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    warnings,
    techStack,
    structure,
    categories,
    priorityFiles: snippets
  };
}

async function detectTechStack(packageFiles, files) {
  const dependencies = new Set();
  for (const file of packageFiles) {
    try {
      const raw = await fs.readFile(file.fullPath, 'utf8');
      const json = JSON.parse(raw);
      for (const section of ['dependencies', 'devDependencies']) {
        for (const name of Object.keys(json[section] || {})) dependencies.add(name);
      }
    } catch {
      dependencies.add('package.json unreadable');
    }
  }

  const names = [...dependencies];
  const has = (name) => names.includes(name);
  return {
    frontend: pick(names, ['next', 'react', 'vue', 'svelte', '@angular/core', 'tailwindcss']),
    backend: pick(names, ['express', 'fastify', 'koa', 'nestjs', 'hapi', 'socket.io']),
    database: pick(names, ['mongoose', 'mongodb', 'pg', 'mysql2', 'sequelize', 'prisma', 'redis', 'firebase']),
    auth: pick(names, ['next-auth', 'passport', 'jsonwebtoken', 'bcrypt', 'bcryptjs', 'clerk', '@supabase/supabase-js']),
    testing: pick(names, ['jest', 'vitest', 'mocha', 'cypress', 'playwright', '@testing-library/react']),
    deployment: detectDeployment(files),
    language: has('typescript') || files.some((file) => file.relativePath.endsWith('.ts')) ? 'TypeScript/JavaScript' : 'JavaScript'
  };
}

function pick(values, candidates) {
  return candidates.filter((candidate) => values.includes(candidate));
}

function detectDeployment(files) {
  const paths = files.map((file) => file.relativePath.toLowerCase());
  return [
    paths.some((name) => name.includes('dockerfile')) && 'Docker',
    paths.some((name) => name.includes('vercel.json')) && 'Vercel',
    paths.some((name) => name.includes('netlify.toml')) && 'Netlify',
    paths.some((name) => name.includes('render.yaml')) && 'Render',
    paths.some((name) => name.includes('.github/workflows')) && 'GitHub Actions'
  ].filter(Boolean);
}

function categorizeFiles(files) {
  const paths = files.map((file) => file.relativePath);
  const match = (pattern) => paths.filter((name) => pattern.test(name)).slice(0, 20);
  return {
    frontend: match(/app\/|pages\/|components\/|src\/components|\.jsx$/i),
    backend: match(/routes?\/|controllers?\/|server\.|app\.|api\//i),
    database: match(/models?\/|schemas?\/|prisma|migrations?|database|db\./i),
    auth: match(/auth|login|jwt|passport|session/i),
    config: match(/config|\.env|package\.json|docker|compose|vercel|tailwind|next\.config/i),
    services: match(/services?\//i)
  };
}

function buildFolderTree(paths) {
  const visible = paths.slice(0, 140);
  return visible.map((name) => name.split('/').map((part, index) => `${'  '.repeat(index)}${index ? '- ' : ''}${part}`).join('\n')).join('\n');
}

async function readTextSnippet(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.length > MAX_FILE_CHARS ? `${raw.slice(0, MAX_FILE_CHARS)}\n... [truncated]` : raw;
}
