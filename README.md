# ARC - Architecture Review Copilot

ARC is a full-stack MVP that analyzes a public GitHub repository or uploaded ZIP project and generates a visual architecture review. It detects the project structure, summarizes important files, sends compact context to a configurable AI provider, and renders a clean dashboard with architecture insights, risks, recommendations, Mermaid diagrams, and Markdown export.

## Features

- Analyze a public GitHub repository URL.
- Analyze an uploaded ZIP project.
- Detect frontend, backend, database, auth, services, configuration, deployment, and API signals.
- Ignore generated or heavy folders such as `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, and cache directories.
- Prioritize high-signal files such as `package.json`, README files, routes, controllers, services, models, middleware, config, auth, database, and deployment files.
- Generate a structured architecture report with:
  - project overview
  - detected tech stack
  - folder structure explanation
  - frontend architecture
  - backend architecture
  - API flow
  - database architecture
  - authentication flow
  - deployment readiness
  - security issues
  - scalability issues
  - performance issues
  - recommendations
  - architecture score out of 10
- Render Mermaid diagrams for:
  - system architecture
  - API request flow
  - authentication flow
  - database relationship
  - deployment architecture
- Copy Mermaid diagram source.
- Export the generated report as Markdown.
- Use OpenAI, Gemini, or Groq through environment variables.
- Fall back to demo mode when no AI key is configured.
- Optionally save generated reports with MongoDB.

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- Mermaid.js
- Lucide React icons

### Backend

- Node.js
- Express
- Multer for ZIP uploads
- AdmZip for ZIP extraction
- simple-git for public GitHub repository cloning
- Axios for AI provider calls
- Mongoose for optional MongoDB persistence

### AI Providers

ARC supports:

- OpenAI
- Gemini
- Groq

If `AI_PROVIDER` is left blank, ARC automatically chooses an available provider in this order:

1. Groq
2. Gemini
3. OpenAI

## Project Structure

```text
arc/
  backend/
    src/
      data/
        mockReport.js
      routes/
        analyze.js
        report.js
      services/
        repoAnalyzer.js
        reportGenerator.js
        reportStore.js
      utils/
        projectScanner.js
      server.js
    package.json

  frontend/
    app/
      report/
        page.js
      globals.css
      layout.js
      page.js
    components/
      AnalyzeForm.js
      MermaidDiagram.js
      ReportDashboard.js
    lib/
      api.js
    package.json

  .env.example
  .gitignore
  README.md
```

## How ARC Works

1. The user submits either a GitHub repository URL or a ZIP project.
2. The backend clones the public repository or extracts the ZIP into a temporary directory.
3. The scanner walks the project while skipping generated, binary, cache, and heavy folders.
4. ARC detects stack signals from dependency files and important project paths.
5. ARC reads compact snippets from high-priority files instead of sending the entire project to the AI model.
6. The report generator sends the summarized context to the configured AI provider.
7. The AI returns structured JSON containing report sections, issues, recommendations, score, and Mermaid diagrams.
8. The backend sanitizes diagrams and provides fallback Mermaid when the AI returns invalid or plain-text diagrams.
9. The frontend renders the dashboard and allows the user to copy diagrams or export Markdown.

## Requirements

- Node.js 18 or newer
- npm
- Git installed and available in your terminal
- Optional: MongoDB connection string if you want saved report retrieval

## Environment Setup

Create an environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Example configuration:

```env
# Backend
PORT=5000
FRONTEND_URL=http://localhost:3000

# AI provider: openai, gemini, or groq
AI_PROVIDER=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# Optional persistence
MONGODB_URI=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### AI Provider Notes

To force a specific provider, set `AI_PROVIDER`:

```env
AI_PROVIDER=groq
```

Valid values:

- `groq`
- `gemini`
- `openai`

If no provider key is configured, ARC runs in demo mode and returns a mocked architecture report. This is useful for testing the UI without consuming API credits.

## Installation

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:5000/api/health
```

## Production Build Checks

Backend syntax check:

```bash
cd backend
npm run check
```

Frontend production build:

```bash
cd frontend
npm run build
```

## API Reference

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "ok": true,
  "service": "ARC API"
}
```

### Analyze GitHub Repository

```http
POST /api/analyze/github
Content-Type: application/json
```

Request:

```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

Response:

```json
{
  "repoContext": {
    "source": "https://github.com/owner/repo",
    "fileCount": 120,
    "warnings": [],
    "techStack": {},
    "structure": "...",
    "categories": {},
    "priorityFiles": []
  },
  "warnings": []
}
```

Notes:

- Only public GitHub repositories are supported in the MVP.
- Private repositories are not supported.
- Invalid GitHub URLs return a validation error.

### Analyze ZIP Project

```http
POST /api/analyze/zip
Content-Type: multipart/form-data
```

Form field:

```text
projectZip
```

Notes:

- The MVP upload limit is 50 MB.
- Invalid or corrupt ZIP files return an extraction error.

### Generate Architecture Report

```http
POST /api/report/generate
Content-Type: application/json
```

Request:

```json
{
  "repoContext": {
    "source": "example",
    "fileCount": 10,
    "techStack": {},
    "categories": {},
    "priorityFiles": []
  }
}
```

Response:

```json
{
  "id": "arc-123456789",
  "title": "Architecture Review",
  "mode": "ai",
  "overview": "...",
  "techStack": {},
  "sections": {},
  "issues": {
    "security": [],
    "scalability": [],
    "performance": []
  },
  "recommendations": [],
  "score": 7,
  "diagrams": {
    "system": "flowchart LR\n...",
    "api": "sequenceDiagram\n...",
    "auth": "flowchart TD\n...",
    "database": "erDiagram\n...",
    "deployment": "flowchart LR\n..."
  }
}
```

### Get Saved Report

```http
GET /api/report/:id
```

This route works only when `MONGODB_URI` is configured. Without MongoDB, generated reports are returned directly but not persisted.

## Report Dashboard

The frontend dashboard includes:

- left sidebar navigation
- overview metrics
- architecture score card
- report sections
- tabs for Overview, Diagrams, Security, Scalability, and Recommendations
- Mermaid diagram rendering
- copy diagram source button
- Markdown export button

## Demo Mode

Demo mode activates when ARC cannot find a usable AI provider configuration. In demo mode, the backend returns a mocked architecture report using the scanned repository context.

Demo mode is useful for:

- UI testing
- frontend development
- local demos without API keys
- validating ZIP/GitHub analysis flow

## Error Handling

ARC handles common MVP errors:

- invalid GitHub repository URL
- private or inaccessible GitHub repository
- missing ZIP upload
- oversized ZIP upload
- ZIP extraction failure
- missing AI API key
- unsupported AI provider
- failed AI response
- missing MongoDB persistence for `GET /api/report/:id`

## Mermaid Diagram Handling

AI models sometimes return Mermaid inside markdown fences, plain text such as `No database`, or slightly invalid syntax. ARC includes a diagram cleanup layer that:

- removes Mermaid code fences
- repairs common arrow syntax issues
- converts plain text or missing diagrams into valid fallback Mermaid
- keeps the copy button aligned with the cleaned Mermaid source

## Current MVP Limitations

- Private GitHub repositories are not supported.
- Large projects are capped during scanning.
- Binary files and files over the scanner size limit are skipped.
- Report persistence is optional and requires MongoDB.
- The current analyzer uses static source signals, not runtime tracing.
- The AI output quality depends on the selected provider and model.
- Authentication is intentionally not included in the MVP.

## Security Notes

- Do not commit `.env`.
- Keep AI keys and MongoDB URIs private.
- Use request size limits in production.
- Add rate limiting before exposing this backend publicly.
- Run dependency audits regularly.
- Consider isolating ZIP extraction and repository cloning in a worker or sandbox for production.

## Troubleshooting

### Frontend Cannot Reach Backend

Check `NEXT_PUBLIC_API_URL` in `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Confirm the backend is running:

```text
http://localhost:5000/api/health
```

### GitHub Analysis Fails

Make sure:

- the URL is public
- the URL format is `https://github.com/owner/repo`
- Git is installed locally
- the repository is not private or deleted

### ZIP Upload Fails

Make sure:

- the file is a valid `.zip`
- the ZIP is below the configured MVP limit
- the ZIP contains the actual project files, not only a nested empty directory

### Report Uses Demo Mode

Check that at least one API key is set:

```env
GROQ_API_KEY=your_key
```

Then either set:

```env
AI_PROVIDER=groq
```

or leave `AI_PROVIDER` blank and let ARC auto-select an available provider.

### Mermaid Diagram Does Not Render

Regenerate the report after the latest diagram cleanup changes. If an AI provider returns unusual Mermaid syntax, use the copy button to inspect the cleaned source.

## Roadmap

- Saved report history UI
- Background job queue for large repository analysis
- Streaming progress updates during cloning, scanning, and AI generation
- Better framework-specific architecture detection
- Dependency graph extraction
- Route map generation for Express and Next.js apps
- Database schema extraction for Prisma, Mongoose, Sequelize, and SQL migrations
- GitHub branch and commit selection
- Private repository support through GitHub tokens
- Team/project workspaces
- PDF export
- Automated architecture comparison between two commits

Made with ❤️ by Debmallya Bhandari
