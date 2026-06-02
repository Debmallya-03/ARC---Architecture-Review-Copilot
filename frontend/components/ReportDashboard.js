'use client';

import { useMemo, useState } from 'react';
import { Download, Gauge, Layers, Loader2, RefreshCw, Send } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import { askRepoQuestion } from '../lib/api';

const tabs = ['Overview', 'Ask ARC', 'Static Analysis', 'Diagrams', 'Security', 'Scalability', 'Recommendations'];

export default function ReportDashboard({ report, repoContext, onReset }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const markdown = useMemo(() => toMarkdown(report), [report]);
  const issues = report.issues || {};

  function exportMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arc-architecture-report.md';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-line bg-ink p-5 text-paper lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-saffron">ARC</p>
              <h1 className="mt-2 text-2xl font-black">Architecture Report</h1>
            </div>
            <button
              onClick={onReset}
              title="Run another analysis"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-paper/10 transition hover:bg-paper/20 lg:mt-8"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  activeTab === tab ? 'bg-paper text-ink' : 'text-neutral-300 hover:bg-paper/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="p-5 sm:p-8">
          <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-moss">{report.source || 'Analyzed project'}</p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">{report.title || 'Architecture Review'}</h2>
              {report.note ? <p className="mt-3 text-sm text-clay">{report.note}</p> : null}
            </div>
            <button
              onClick={exportMarkdown}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-clay px-4 font-bold text-white transition hover:bg-[#9f4d2f]"
            >
              <Download size={18} />
              Export Markdown
            </button>
          </header>

          {activeTab === 'Overview' && <Overview report={report} />}
          {activeTab === 'Ask ARC' && <RepoChat report={report} repoContext={repoContext} />}
          {activeTab === 'Static Analysis' && <StaticAnalysis analysis={report.staticAnalysis || {}} />}
          {activeTab === 'Diagrams' && <Diagrams diagrams={report.diagrams || {}} />}
          {activeTab === 'Security' && <SecurityView issues={issues.security} findings={(report.staticAnalysis || {}).securityFindings || []} summary={(report.staticAnalysis || {}).securitySummary || {}} />}
          {activeTab === 'Scalability' && <IssueList title="Scalability Issues" items={issues.scalability} extra={issues.performance} />}
          {activeTab === 'Recommendations' && <IssueList title="Recommendations" items={report.recommendations} />}
        </section>
      </div>
    </main>
  );
}

function RepoChat({ report, repoContext }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me about architecture, APIs, auth, database, security, scalability, or where a feature lives in this repository.',
      citations: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitQuestion(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((current) => [...current, { role: 'user', content: trimmed, citations: [] }]);
    setQuestion('');
    setError('');
    setLoading(true);

    try {
      const answer = await askRepoQuestion({ question: trimmed, repoContext, report });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: answer.answer,
          citations: answer.citations || [],
          mode: answer.mode
        }
      ]);
    } catch (err) {
      setError(err.message || 'Repo chat failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-line bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-black">Ask ARC</h3>
          <p className="mt-1 text-sm text-neutral-600">RAG chat over retrieved repository chunks.</p>
        </div>
        <span className="rounded bg-paper px-3 py-2 text-xs font-bold text-moss">
          {repoContext?.rag?.chunkCount || report.rag?.chunkCount || 0} chunks indexed
        </span>
      </div>

      <div className="mt-5 grid max-h-[520px] gap-3 overflow-auto pr-1">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-md border border-line p-4 ${message.role === 'user' ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
            <p className="whitespace-pre-wrap leading-7">{message.content}</p>
            {message.mode ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] opacity-70">{message.mode}</p> : null}
            <CitationList citations={message.citations} />
          </div>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-md border border-clay/30 bg-clay/10 p-3 text-sm text-clay">{error}</p> : null}

      <form onSubmit={submitQuestion} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Where is authentication handled?"
          className="h-12 min-w-0 flex-1 rounded-md border border-line bg-paper px-4 outline-none ring-moss/20 transition focus:ring-4"
        />
        <button
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss px-5 font-bold text-white transition hover:bg-[#415d44] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Ask
        </button>
      </form>
    </div>
  );
}

function StaticAnalysis({ analysis }) {
  const routes = analysis.routes || [];
  const dependencies = analysis.dependencyGraph || [];
  const schemas = analysis.databaseSchemas || [];

  return (
    <div className="mt-6 grid gap-5">
      <article className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-xl font-bold">Route/API Map</h3>
        <div className="mt-4 grid gap-2">
          {routes.length ? routes.map((route) => (
            <div key={`${route.method}-${route.path}-${route.source}`} className="grid gap-2 rounded-md border border-line bg-paper p-3 text-sm md:grid-cols-[90px_1fr_1.2fr]">
              <span className="font-black text-moss">{route.method}</span>
              <span className="font-semibold">{route.path}</span>
              <span className="text-neutral-600">{route.framework} - {route.source}</span>
            </div>
          )) : <p className="text-neutral-700">No API routes were detected from static source signals.</p>}
        </div>
      </article>

      <article className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-xl font-bold">Dependency Graph Signals</h3>
        <div className="mt-4 grid gap-2">
          {dependencies.length ? dependencies.slice(0, 40).map((edge) => (
            <div key={`${edge.from}-${edge.to}`} className="rounded-md border border-line bg-paper p-3 text-sm">
              <span className="font-semibold">{edge.from}</span>
              <span className="px-2 text-moss">imports</span>
              <span className="text-neutral-700">{edge.to}</span>
            </div>
          )) : <p className="text-neutral-700">No relative import graph signals were detected in priority files.</p>}
        </div>
      </article>

      <article className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-xl font-bold">Database Schema Detection</h3>
        <div className="mt-4 grid gap-3">
          {schemas.length ? schemas.map((schema) => (
            <div key={`${schema.type}-${schema.name}-${schema.source}`} className="rounded-md border border-line bg-paper p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold">{schema.name}</p>
                <p className="text-sm text-neutral-600">{schema.type} - {schema.source}</p>
              </div>
              <p className="mt-3 text-sm text-neutral-700">{(schema.fields || []).join(', ') || 'Fields not inferred'}</p>
            </div>
          )) : <p className="text-neutral-700">No database schema files were detected.</p>}
        </div>
      </article>
    </div>
  );
}

function Overview({ report }) {
  const tech = report.techStack || {};
  const sections = report.sections || {};
  const citations = report.citations || {};
  return (
    <div className="mt-6 grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Gauge size={20} />} label="Architecture Score" value={`${report.score || 0}/10`} />
        <Metric icon={<Layers size={20} />} label="Mode" value={report.mode || 'ai'} />
        <Metric icon={<Layers size={20} />} label="Language" value={tech.language || 'Unknown'} />
      </div>
      {report.rag?.enabled ? (
        <div className="rounded-lg border border-line bg-white p-5">
          <h3 className="text-xl font-bold">RAG Evidence Layer</h3>
          <p className="mt-2 text-neutral-700">
            {report.rag.chunkCount || 0} repository chunks indexed with {report.rag.strategy || 'keyword'} retrieval.
          </p>
        </div>
      ) : null}
      <ScoreBreakdown breakdown={report.scoreBreakdown || {}} />
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-xl font-bold">Project Overview</h3>
        <p className="mt-3 leading-7 text-neutral-700">{report.overview}</p>
        <CitationList citations={citations.overview} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock title="Tech Stack" text={formatTech(tech)} />
        <InfoBlock title="Folder Structure" text={sections.folderStructure} citations={citations.overview} />
        <InfoBlock title="Frontend Architecture" text={sections.frontend} citations={citations.frontend} />
        <InfoBlock title="Backend Architecture" text={sections.backend} citations={citations.backend} />
        <InfoBlock title="API Flow" text={sections.apiFlow} citations={citations.apiFlow} />
        <InfoBlock title="Database Architecture" text={sections.database} citations={citations.database} />
        <InfoBlock title="Authentication Flow" text={sections.authentication} citations={citations.authentication} />
        <InfoBlock title="Deployment Readiness" text={sections.deployment} citations={citations.deployment} />
      </div>
    </div>
  );
}

function ScoreBreakdown({ breakdown }) {
  const items = [
    ['Security', breakdown.security],
    ['Scalability', breakdown.scalability],
    ['Maintainability', breakdown.maintainability],
    ['Performance', breakdown.performance],
    ['Deployment', breakdown.deployment],
    ['Documentation', breakdown.documentation]
  ];

  return (
    <article className="rounded-lg border border-line bg-white p-5">
      <h3 className="text-xl font-bold">Score Breakdown</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-neutral-700">{label}</span>
              <span className="text-lg font-black">{formatScore(value)}/10</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-moss" style={{ width: `${Math.max(0, Math.min(100, Number(value || 0) * 10))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SecurityView({ issues = [], findings = [], summary = {} }) {
  return (
    <div className="mt-6 grid gap-5">
      <article className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-2xl font-black">Deterministic Security Scan</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {['critical', 'high', 'medium', 'low'].map((level) => (
            <div key={level} className="rounded-md border border-line bg-paper p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">{level}</p>
              <p className="mt-2 text-3xl font-black">{summary[level] || 0}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {findings.length ? findings.map((finding) => (
            <div key={`${finding.severity}-${finding.title}-${finding.source}`} className="rounded-md border border-line bg-paper p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold">{finding.title}</p>
                <span className={`w-fit rounded px-2 py-1 text-xs font-black uppercase ${severityClass(finding.severity)}`}>{finding.severity}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">{finding.description}</p>
              <p className="mt-2 text-xs font-semibold text-moss">{finding.source}</p>
              <p className="mt-3 text-sm text-neutral-800">{finding.recommendation}</p>
            </div>
          )) : <p className="text-neutral-700">No deterministic security findings were detected.</p>}
        </div>
      </article>

      <IssueList title="AI Security Review" items={issues} />
    </div>
  );
}

function Diagrams({ diagrams }) {
  return (
    <div className="mt-6 grid gap-5">
      <MermaidDiagram title="System Architecture" code={diagrams.system} />
      <MermaidDiagram title="API Request Flow" code={diagrams.api} />
      <MermaidDiagram title="Authentication Flow" code={diagrams.auth} />
      <MermaidDiagram title="Database Relationship" code={diagrams.database} />
      <MermaidDiagram title="Deployment Architecture" code={diagrams.deployment} />
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center gap-2 text-moss">{icon}<span className="text-sm font-semibold">{label}</span></div>
      <p className="mt-3 text-3xl font-black capitalize">{value}</p>
    </div>
  );
}

function InfoBlock({ title, text, citations }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap leading-7 text-neutral-700">{text || 'No strong evidence found.'}</p>
      <CitationList citations={citations} />
    </article>
  );
}

function CitationList({ citations = [] }) {
  if (!citations?.length) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Evidence</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {citations.slice(0, 6).map((citation, index) => (
          <span key={`${citation.path}-${citation.lines}-${index}`} className="rounded bg-paper px-2 py-1 text-xs font-semibold text-moss">
            {citation.path}{citation.lines ? `:${citation.lines}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function IssueList({ title, items = [], extra = [] }) {
  const all = [...(items || []), ...(extra || [])];
  return (
    <div className="mt-6 rounded-lg border border-line bg-white p-5">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-5 grid gap-3">
        {all.length ? all.map((item, index) => (
          <div key={issueKey(item, index)} className="rounded-md border border-line bg-paper p-4 text-neutral-800">
            <IssueContent item={item} />
          </div>
        )) : <p>No issues reported.</p>}
      </div>
    </div>
  );
}

function IssueContent({ item }) {
  if (typeof item === 'string' || typeof item === 'number') {
    return <p>{item}</p>;
  }

  if (Array.isArray(item)) {
    return <p>{item.map((entry) => issueText(entry)).join(', ')}</p>;
  }

  if (item && typeof item === 'object') {
    return (
      <div>
        <p className="font-bold">{item.title || item.issue || item.name || 'Finding'}</p>
        {item.description ? <p className="mt-2 text-sm text-neutral-700">{item.description}</p> : null}
        {item.source ? <p className="mt-2 text-xs font-semibold text-moss">{item.source}</p> : null}
        {item.recommendation ? <p className="mt-3 text-sm">{item.recommendation}</p> : null}
        {!item.description && !item.recommendation ? <p className="mt-2 text-sm text-neutral-700">{issueText(item)}</p> : null}
      </div>
    );
  }

  return <p>{String(item || '')}</p>;
}

function issueKey(item, index) {
  if (typeof item === 'string' || typeof item === 'number') return `${item}-${index}`;
  if (item && typeof item === 'object') {
    return `${item.title || item.issue || item.name || item.source || 'issue'}-${index}`;
  }
  return `issue-${index}`;
}

function issueText(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (Array.isArray(item)) return item.map((entry) => issueText(entry)).join(', ');
  if (item && typeof item === 'object') {
    return Object.entries(item)
      .map(([key, value]) => `${key}: ${issueText(value)}`)
      .join('; ');
  }
  return String(item || '');
}

function formatTech(tech) {
  return Object.entries(tech)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') || 'None detected' : value}`)
    .join('\n');
}

function formatScore(value) {
  const score = Number(value || 0);
  return Number.isInteger(score) ? score : score.toFixed(1);
}

function severityClass(severity) {
  if (severity === 'critical') return 'bg-clay text-white';
  if (severity === 'high') return 'bg-clay/15 text-clay';
  if (severity === 'medium') return 'bg-saffron/20 text-[#80600d]';
  return 'bg-moss/15 text-moss';
}

function toMarkdown(report) {
  const sections = report.sections || {};
  const issues = report.issues || {};
  return `# ${report.title || 'ARC Architecture Report'}

Source: ${report.source || 'Unknown'}
Score: ${report.score || 0}/10

## Score Breakdown
${Object.entries(report.scoreBreakdown || {}).map(([key, value]) => `- ${key}: ${formatScore(value)}/10`).join('\n') || 'No score breakdown available.'}

## RAG Evidence
${report.rag?.enabled ? `Strategy: ${report.rag.strategy}\nChunks indexed: ${report.rag.chunkCount}` : 'RAG evidence was not available for this report.'}

## Overview
${report.overview || ''}

## Tech Stack
${formatTech(report.techStack || {})}

## Static Analysis
### Routes
${((report.staticAnalysis || {}).routes || []).map((route) => `- ${route.method} ${route.path} (${route.framework}, ${route.source})`).join('\n') || 'No routes detected.'}

### Dependency Graph Signals
${((report.staticAnalysis || {}).dependencyGraph || []).map((edge) => `- ${edge.from} -> ${edge.to}`).join('\n') || 'No dependency edges detected.'}

### Database Schemas
${((report.staticAnalysis || {}).databaseSchemas || []).map((schema) => `- ${schema.name} (${schema.type}): ${(schema.fields || []).join(', ')}`).join('\n') || 'No database schemas detected.'}

### Deterministic Security Findings
${((report.staticAnalysis || {}).securityFindings || []).map((finding) => `- [${finding.severity}] ${finding.title} (${finding.source}): ${finding.recommendation}`).join('\n') || 'No deterministic security findings detected.'}

## Architecture
### Folder Structure
${sections.folderStructure || ''}

### Frontend
${sections.frontend || ''}

### Backend
${sections.backend || ''}

### API Flow
${sections.apiFlow || ''}

### Database
${sections.database || ''}

### Authentication
${sections.authentication || ''}

### Deployment
${sections.deployment || ''}

## Citations
${formatCitations(report.citations || {})}

## Security
${(issues.security || []).map((item) => `- ${issueText(item)}`).join('\n')}

## Scalability
${(issues.scalability || []).map((item) => `- ${issueText(item)}`).join('\n')}

## Performance
${(issues.performance || []).map((item) => `- ${issueText(item)}`).join('\n')}

## Recommendations
${(report.recommendations || []).map((item) => `- ${issueText(item)}`).join('\n')}

## Diagrams
${Object.entries(report.diagrams || {}).map(([name, code]) => `### ${name}\n\`\`\`mermaid\n${code}\n\`\`\``).join('\n\n')}
`;
}

function formatCitations(citations) {
  const lines = [];
  for (const [section, sectionCitations] of Object.entries(citations)) {
    if (!sectionCitations?.length) continue;
    lines.push(`### ${section}`);
    lines.push(...sectionCitations.map((citation) => `- ${citation.path}${citation.lines ? `:${citation.lines}` : ''} (${citation.type || 'source'})`));
  }
  return lines.length ? lines.join('\n') : 'No citations available.';
}
