export const demoReport = {
  id: 'demo-readme',
  title: 'ARC Architecture Review',
  source: 'https://github.com/example/full-stack-app',
  mode: 'demo',
  overview: 'ARC detected a Next.js frontend, Express backend, service-layer modules, API routes, and database schema hints. This sample report is used for local previews and README screenshots.',
  score: 8,
  techStack: {
    frontend: ['next', 'react', 'tailwindcss'],
    backend: ['express'],
    database: ['mongoose'],
    auth: ['jsonwebtoken'],
    deployment: ['Vercel', 'Render', 'GitHub Actions'],
    language: 'JavaScript'
  },
  sections: {
    folderStructure: 'frontend/app contains the product UI. backend/src contains routes, services, utilities, and report generation logic.',
    frontend: 'The frontend is organized around reusable components and a dashboard-first user experience.',
    backend: 'The backend exposes analyzer and report routes, then delegates repository parsing and AI generation to services.',
    apiFlow: 'Client submits a repository, backend scans files, report generator sends compact context to the AI provider, and the dashboard renders the response.',
    database: 'MongoDB persistence is optional and used for saved report retrieval.',
    authentication: 'Authentication is intentionally out of MVP scope, but auth files are detected in analyzed repositories.',
    deployment: 'The app is deployment-ready with Vercel frontend config, Render backend config, and GitHub Actions CI.'
  },
  staticAnalysis: {
    routes: [
      { method: 'POST', path: '/api/analyze/github', source: 'backend/src/routes/analyze.js', framework: 'Express' },
      { method: 'POST', path: '/api/analyze/zip', source: 'backend/src/routes/analyze.js', framework: 'Express' },
      { method: 'POST', path: '/api/report/generate', source: 'backend/src/routes/report.js', framework: 'Express' }
    ],
    dependencyGraph: [
      { from: 'backend/src/routes/report.js', to: '../services/reportGenerator.js', type: 'service' },
      { from: 'backend/src/services/repoAnalyzer.js', to: '../utils/projectScanner.js', type: 'module' },
      { from: 'frontend/app/page.js', to: '../components/ReportDashboard', type: 'module' }
    ],
    databaseSchemas: [
      { type: 'Mongoose schema', name: 'Report', source: 'backend/src/services/reportStore.js', fields: ['title', 'source', 'mode', 'overview', 'score', 'diagrams'] }
    ]
  },
  issues: {
    security: ['Add rate limiting before public production usage.', 'Run ZIP extraction in an isolated worker for high-trust deployments.'],
    scalability: ['Move long repository analysis tasks to a queue for large projects.'],
    performance: ['Cache reports by repository URL and commit hash.']
  },
  recommendations: [
    'Add private GitHub repository support through tokens.',
    'Persist report history in MongoDB and expose shareable report URLs.',
    'Add route extraction tests and schema parser tests.'
  ],
  diagrams: {
    system: 'flowchart LR\nUser[User] --> Frontend[Next.js Frontend]\nFrontend --> API[Express Backend]\nAPI --> Scanner[Repository Scanner]\nAPI --> AI[Groq or Gemini]\nAPI -. optional .-> Mongo[(MongoDB)]',
    api: 'sequenceDiagram\nparticipant U as User\nparticipant F as Frontend\nparticipant B as Backend\nparticipant A as AI Provider\nU->>F: Submit repo or ZIP\nF->>B: Analyze source\nB-->>F: Repo context\nF->>B: Generate report\nB->>A: Compact prompt\nA-->>B: Report JSON\nB-->>F: Dashboard data',
    auth: 'flowchart TD\nRequest[Incoming request] --> Detect{Auth signals found?}\nDetect -->|Yes| Map[Map middleware and protected routes]\nDetect -->|No| Note[Report no auth evidence]',
    database: 'erDiagram\nREPORT ||--o{ DIAGRAM : contains\nREPORT ||--o{ ISSUE : includes\nREPORT ||--o{ RECOMMENDATION : produces',
    deployment: 'flowchart LR\nGitHub[GitHub Repo] --> Actions[GitHub Actions CI]\nGitHub --> Vercel[Vercel Frontend]\nGitHub --> Render[Render Backend]\nRender --> AI[AI Provider]\nRender -. optional .-> Atlas[(MongoDB Atlas)]'
  }
};
