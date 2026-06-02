export function createMockReport(repoContext, note = 'Demo mode') {
  const tech = repoContext.techStack || {};
  const staticAnalysis = repoContext.staticAnalysis || {
    routes: [],
    dependencyGraph: [],
    databaseSchemas: [],
    securityFindings: [],
    securitySummary: { critical: 0, high: 0, medium: 0, low: 0 }
  };
  const scoreBreakdown = {
    overall: 7,
    security: Math.max(0, 10 - (staticAnalysis.securityFindings || []).length),
    scalability: 7,
    maintainability: 8,
    performance: 7,
    deployment: (tech.deployment || []).length ? 8 : 5,
    documentation: 7
  };
  const citations = repoContext.rag?.citations || {
    overview: [],
    frontend: [],
    backend: [],
    apiFlow: [],
    database: [],
    authentication: [],
    security: [],
    scalability: [],
    performance: [],
    deployment: [],
    diagrams: []
  };
  return {
    id: `demo-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: repoContext.source,
    mode: 'demo',
    note,
    title: 'ARC Architecture Review',
    overview: `ARC scanned ${repoContext.fileCount || 0} files and produced a demo architecture review. Connect an AI API key for repository-specific narrative depth.`,
    techStack: tech,
    sections: {
      folderStructure: `Important areas detected:\n${JSON.stringify(repoContext.categories || {}, null, 2)}`,
      frontend: 'Frontend files are identified from app, pages, components, and JSX/React conventions. ARC recommends keeping UI, data fetching, and shared components separated.',
      backend: 'Backend files are identified from server, routes, controllers, services, and API directories. Business logic should live in services rather than route handlers.',
      apiFlow: 'Client requests should enter through route handlers, validate input, call services, and return normalized responses.',
      database: 'Database architecture is inferred from model, schema, Prisma, migration, and db configuration files when present.',
      authentication: 'Authentication flow is inferred from auth, JWT, session, passport, login, and middleware files.',
      deployment: 'Deployment readiness is inferred from Docker, Vercel, Netlify, Render, and GitHub Actions configuration.'
    },
    staticAnalysis,
    issues: {
      security: ['Validate all upload and API inputs.', 'Keep secrets in environment variables and out of committed files.'],
      scalability: ['Separate route orchestration from service logic.', 'Add queue/background processing for long-running analysis jobs.'],
      performance: ['Cache generated reports by repository commit hash.', 'Skip large binaries and generated output during analysis.']
    },
    recommendations: [
      'Add CI checks for linting, tests, and dependency audits.',
      'Document deployment environments and required variables.',
      'Add request size limits, rate limits, and structured logging before production use.'
    ],
    score: scoreBreakdown.overall,
    scoreBreakdown,
    citations,
    rag: {
      enabled: Boolean(repoContext.rag?.enabled),
      strategy: repoContext.rag?.strategy || 'keyword-retrieval',
      chunkCount: repoContext.rag?.chunkCount || 0
    },
    diagrams: {
      system: `flowchart LR
User[User] --> UI[Next.js Frontend]
UI --> API[Express API]
API --> Analyzer[Repository Analyzer]
Analyzer --> Files[GitHub or ZIP Source]
API --> LLM[Configurable AI Provider]
API -. optional .-> Mongo[(MongoDB Reports)]`,
      api: `sequenceDiagram
participant U as User
participant F as Frontend
participant A as Analyze API
participant R as Report API
participant L as LLM or Demo
U->>F: Submit GitHub URL or ZIP
F->>A: Analyze project
A-->>F: Summarized repo context
F->>R: Generate report
R->>L: Send compact context
L-->>R: Architecture JSON
R-->>F: Render dashboard`,
      auth: `flowchart TD
Start[Request] --> Check{Auth files detected?}
Check -->|Yes| Middleware[Middleware or session layer]
Middleware --> Routes[Protected routes]
Check -->|No| Public[No auth flow evidenced]`,
      database: `erDiagram
PROJECT ||--o{ FILE : contains
PROJECT ||--o{ SERVICE : exposes
SERVICE }o--o{ MODEL : uses
MODEL }o--|| DATABASE : persists`,
      deployment: `flowchart LR
Dev[Developer] --> Repo[GitHub]
Repo --> CI[CI/CD]
CI --> Web[Frontend Host]
CI --> Api[API Runtime]
Api --> Data[(Database)]
Api --> AI[AI Provider]`
    }
  };
}
