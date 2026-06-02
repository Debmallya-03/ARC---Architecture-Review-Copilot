import path from 'node:path';

const SECRET_PATTERNS = [
  { name: 'OpenAI-style API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Groq-style API key', pattern: /\bgsk_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Google API key', pattern: /\bAIza[A-Za-z0-9_-]{20,}\b/g },
  { name: 'MongoDB connection string', pattern: /mongodb(?:\+srv)?:\/\/[^\s'"`]+/gi },
  { name: 'Private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g },
  { name: 'Likely hardcoded secret assignment', pattern: /\b(?:api[_-]?key|secret|token|password|jwt[_-]?secret)\b\s*[:=]\s*['"`][^'"`\s]{12,}['"`]/gi }
];

const VALIDATION_PACKAGES = ['zod', 'joi', 'yup', 'express-validator', 'validator'];
const AUTH_PACKAGES = ['jsonwebtoken', 'passport', 'next-auth', 'bcrypt', 'bcryptjs', 'clerk', '@supabase/supabase-js'];

export function scanSecurity(files, snippets, dependencies) {
  const findings = [];
  const paths = files.map((file) => file.relativePath);
  const pathSet = new Set(paths.map((filePath) => filePath.toLowerCase()));
  const depSet = new Set(dependencies || []);
  const combined = snippets.map((file) => `${file.path}\n${file.content || ''}`).join('\n\n');

  detectCommittedEnv(paths, findings);
  detectHardcodedSecrets(snippets, findings);
  detectCorsRisk(snippets, findings);
  detectMissingHelmet(depSet, combined, findings);
  detectMissingRateLimit(depSet, combined, findings);
  detectUploadRisk(depSet, combined, findings);
  detectValidationGap(depSet, combined, findings);
  detectJwtLiteralSecrets(snippets, findings);
  detectDangerousExecution(snippets, findings);
  detectMissingEnvExample(pathSet, findings);
  detectAuthWeakness(paths, depSet, findings);

  const uniqueFindings = dedupeFindings(findings).slice(0, 80);
  return {
    findings: uniqueFindings,
    summary: summarizeFindings(uniqueFindings)
  };
}

export function createScoreBreakdown(repoContext, reportScore) {
  const findings = repoContext.staticAnalysis?.securityFindings || [];
  const techStack = repoContext.techStack || {};
  const categories = repoContext.categories || {};
  const hasReadme = (repoContext.priorityFiles || []).some((file) => /readme\.md$/i.test(file.path));
  const hasEnvExample = (categories.config || []).some((filePath) => /\.env\.example$/i.test(filePath));
  const hasRoutes = (repoContext.staticAnalysis?.routes || []).length > 0;
  const hasServices = (categories.services || []).length > 0;
  const hasDeployment = (techStack.deployment || []).length > 0;
  const hasTests = (techStack.testing || []).length > 0;
  const hasDb = (repoContext.staticAnalysis?.databaseSchemas || []).length > 0 || (techStack.database || []).length > 0;

  const security = clampScore(10 - severityPenalty(findings));
  const deployment = clampScore(4 + (hasDeployment ? 3 : 0) + (hasEnvExample ? 1.5 : 0) + (hasTests ? 1 : 0));
  const maintainability = clampScore(5 + (hasServices ? 2 : 0) + (hasRoutes ? 1 : 0) + (hasReadme ? 1 : 0) + (hasTests ? 1 : 0));
  const scalability = clampScore(5 + (hasServices ? 1.5 : 0) + (hasDb ? 1 : 0) + (hasDeployment ? 1 : 0) - highSeverityCount(findings) * 0.6);
  const performance = clampScore(7 - (repoContext.warnings || []).length * 0.8 + (hasDeployment ? 0.5 : 0));
  const documentation = clampScore((hasReadme ? 7 : 4) + (hasEnvExample ? 1 : 0) + (hasDeployment ? 0.5 : 0));
  const overall = clampScore(Number.isFinite(reportScore) && reportScore > 0 ? reportScore : average([security, deployment, maintainability, scalability, performance, documentation]));

  return {
    overall,
    security,
    scalability,
    maintainability,
    performance,
    deployment,
    documentation
  };
}

function detectCommittedEnv(paths, findings) {
  for (const filePath of paths) {
    const base = path.basename(filePath).toLowerCase();
    if (/^\.env(?:\..+)?$/.test(base) && base !== '.env.example') {
      addFinding(findings, 'high', 'Committed environment file detected', `${filePath} appears to be an environment file.`, filePath, 'Move secrets to deployment environment variables and commit only .env.example.');
    }
  }
}

function detectHardcodedSecrets(snippets, findings) {
  for (const file of snippets) {
    if (/\.env\.example$/i.test(file.path)) continue;
    for (const { name, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content || '')) {
        addFinding(findings, 'critical', name, `Possible hardcoded secret found in ${file.path}.`, file.path, 'Remove the secret, rotate it if real, and load it from environment variables.');
      }
    }
  }
}

function detectCorsRisk(snippets, findings) {
  for (const file of snippets) {
    const content = file.content || '';
    if (/cors\s*\(\s*\)/.test(content) || /origin\s*:\s*['"`]\*['"`]/.test(content)) {
      addFinding(findings, 'medium', 'Permissive CORS configuration', `${file.path} appears to allow broad cross-origin access.`, file.path, 'Restrict CORS origins to trusted frontend domains.');
    }
  }
}

function detectMissingHelmet(depSet, combined, findings) {
  if (/\bexpress\b/i.test(combined) && !depSet.has('helmet') && !/helmet\s*\(/.test(combined)) {
    addFinding(findings, 'medium', 'Helmet security headers not detected', 'Express usage was detected without Helmet.', 'package.json', 'Add Helmet to set common HTTP security headers.');
  }
}

function detectMissingRateLimit(depSet, combined, findings) {
  if (/\bexpress\b/i.test(combined) && !depSet.has('express-rate-limit') && !/rateLimit\s*\(/.test(combined)) {
    addFinding(findings, 'medium', 'Rate limiting not detected', 'Public API routes may be vulnerable to abuse without rate limiting.', 'package.json', 'Add express-rate-limit or an API gateway rate limit.');
  }
}

function detectUploadRisk(depSet, combined, findings) {
  if ((depSet.has('multer') || /multer\s*\(/.test(combined)) && !/limits\s*:\s*\{/.test(combined)) {
    addFinding(findings, 'high', 'Upload size limits not detected', 'Multer upload handling was found without clear limits.', 'upload handling', 'Set file size limits and validate file type before processing uploads.');
  }
}

function detectValidationGap(depSet, combined, findings) {
  const hasValidation = VALIDATION_PACKAGES.some((name) => depSet.has(name)) || /\b(schema\.parse|validateSync|body\s*\(|query\s*\(|param\s*\()\b/.test(combined);
  if (/\b(?:app|router)\.(?:get|post|put|patch|delete)\s*\(/i.test(combined) && !hasValidation) {
    addFinding(findings, 'medium', 'Input validation library not detected', 'API routes were detected but no common validation layer was found.', 'routes', 'Validate request body, params, query strings, and uploads with a schema library.');
  }
}

function detectJwtLiteralSecrets(snippets, findings) {
  for (const file of snippets) {
    if (/jwt\.(?:sign|verify)\s*\([^)]*['"`][^'"`]{8,}['"`]/s.test(file.content || '')) {
      addFinding(findings, 'high', 'JWT literal secret detected', `JWT signing or verification in ${file.path} may use a literal secret.`, file.path, 'Use process.env.JWT_SECRET and rotate any exposed secret.');
    }
  }
}

function detectDangerousExecution(snippets, findings) {
  for (const file of snippets) {
    if (/\beval\s*\(|new\s+Function\s*\(/.test(file.content || '')) {
      addFinding(findings, 'high', 'Dynamic code execution detected', `${file.path} uses eval or Function constructor.`, file.path, 'Avoid dynamic code execution or isolate it with strict sandboxing.');
    }
  }
}

function detectMissingEnvExample(pathSet, findings) {
  if (!pathSet.has('.env.example') && ![...pathSet].some((filePath) => filePath.endsWith('/.env.example'))) {
    addFinding(findings, 'low', '.env.example not detected', 'No environment variable template was found.', 'project root', 'Add .env.example documenting required runtime configuration.');
  }
}

function detectAuthWeakness(paths, depSet, findings) {
  const hasAuthFiles = paths.some((filePath) => /auth|login|session|jwt|middleware/i.test(filePath));
  const hasAuthDeps = AUTH_PACKAGES.some((name) => depSet.has(name));
  if (hasAuthFiles && !hasAuthDeps) {
    addFinding(findings, 'low', 'Auth files found without common auth dependencies', 'Authentication-related files exist, but common auth libraries were not detected.', 'auth files', 'Verify password hashing, token/session handling, and route protection manually.');
  }
}

function addFinding(findings, severity, title, description, source, recommendation) {
  findings.push({ severity, title, description, source, recommendation });
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.title}:${finding.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeFindings(findings) {
  return findings.reduce((summary, finding) => {
    summary[finding.severity] = (summary[finding.severity] || 0) + 1;
    return summary;
  }, { critical: 0, high: 0, medium: 0, low: 0 });
}

function severityPenalty(findings) {
  return findings.reduce((score, finding) => {
    if (finding.severity === 'critical') return score + 3;
    if (finding.severity === 'high') return score + 2;
    if (finding.severity === 'medium') return score + 1;
    return score + 0.35;
  }, 0);
}

function highSeverityCount(findings) {
  return findings.filter((finding) => ['critical', 'high'].includes(finding.severity)).length;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))));
}
