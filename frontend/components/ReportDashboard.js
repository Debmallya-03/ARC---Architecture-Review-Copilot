'use client';

import { useMemo, useState } from 'react';
import { Download, Gauge, Layers, RefreshCw } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

const tabs = ['Overview', 'Diagrams', 'Security', 'Scalability', 'Recommendations'];

export default function ReportDashboard({ report, onReset }) {
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
          {activeTab === 'Diagrams' && <Diagrams diagrams={report.diagrams || {}} />}
          {activeTab === 'Security' && <IssueList title="Security Issues" items={issues.security} />}
          {activeTab === 'Scalability' && <IssueList title="Scalability Issues" items={issues.scalability} extra={issues.performance} />}
          {activeTab === 'Recommendations' && <IssueList title="Recommendations" items={report.recommendations} />}
        </section>
      </div>
    </main>
  );
}

function Overview({ report }) {
  const tech = report.techStack || {};
  const sections = report.sections || {};
  return (
    <div className="mt-6 grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Gauge size={20} />} label="Architecture Score" value={`${report.score || 0}/10`} />
        <Metric icon={<Layers size={20} />} label="Mode" value={report.mode || 'ai'} />
        <Metric icon={<Layers size={20} />} label="Language" value={tech.language || 'Unknown'} />
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-xl font-bold">Project Overview</h3>
        <p className="mt-3 leading-7 text-neutral-700">{report.overview}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock title="Tech Stack" text={formatTech(tech)} />
        <InfoBlock title="Folder Structure" text={sections.folderStructure} />
        <InfoBlock title="Frontend Architecture" text={sections.frontend} />
        <InfoBlock title="Backend Architecture" text={sections.backend} />
        <InfoBlock title="API Flow" text={sections.apiFlow} />
        <InfoBlock title="Database Architecture" text={sections.database} />
        <InfoBlock title="Authentication Flow" text={sections.authentication} />
        <InfoBlock title="Deployment Readiness" text={sections.deployment} />
      </div>
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

function InfoBlock({ title, text }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap leading-7 text-neutral-700">{text || 'No strong evidence found.'}</p>
    </article>
  );
}

function IssueList({ title, items = [], extra = [] }) {
  const all = [...(items || []), ...(extra || [])];
  return (
    <div className="mt-6 rounded-lg border border-line bg-white p-5">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-5 grid gap-3">
        {all.length ? all.map((item) => <div key={item} className="rounded-md border border-line bg-paper p-4 text-neutral-800">{item}</div>) : <p>No issues reported.</p>}
      </div>
    </div>
  );
}

function formatTech(tech) {
  return Object.entries(tech)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') || 'None detected' : value}`)
    .join('\n');
}

function toMarkdown(report) {
  const sections = report.sections || {};
  const issues = report.issues || {};
  return `# ${report.title || 'ARC Architecture Report'}

Source: ${report.source || 'Unknown'}
Score: ${report.score || 0}/10

## Overview
${report.overview || ''}

## Tech Stack
${formatTech(report.techStack || {})}

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

## Security
${(issues.security || []).map((item) => `- ${item}`).join('\n')}

## Scalability
${(issues.scalability || []).map((item) => `- ${item}`).join('\n')}

## Performance
${(issues.performance || []).map((item) => `- ${item}`).join('\n')}

## Recommendations
${(report.recommendations || []).map((item) => `- ${item}`).join('\n')}

## Diagrams
${Object.entries(report.diagrams || {}).map(([name, code]) => `### ${name}\n\`\`\`mermaid\n${code}\n\`\`\``).join('\n\n')}
`;
}
