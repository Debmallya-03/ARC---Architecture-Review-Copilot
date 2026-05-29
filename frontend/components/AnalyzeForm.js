'use client';

import { CheckCircle2, Circle, Github, FileArchive, Loader2, Sparkles, ShieldAlert, XCircle } from 'lucide-react';

export default function AnalyzeForm({ onAnalyze, loading, error, steps = [] }) {
  return (
    <section className="min-h-screen px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">Architecture Review Copilot</p>
            <h1 className="mt-2 text-5xl font-black leading-none text-ink sm:text-7xl">ARC</h1>
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-ink sm:flex">
            <Sparkles size={18} className="text-clay" />
            Visual reports from real code
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-paper">
                <Github size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Analyze a repository</h2>
                <p className="mt-1 text-sm text-neutral-600">Use a public GitHub repo or upload a ZIP project.</p>
              </div>
            </div>

            <form className="mt-7 grid gap-4" onSubmit={(event) => onAnalyze(event, 'github')}>
              <label className="text-sm font-semibold" htmlFor="repoUrl">GitHub repository URL</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="repoUrl"
                  name="repoUrl"
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  className="h-12 min-w-0 flex-1 rounded-md border border-line bg-paper px-4 outline-none ring-moss/20 transition focus:ring-4"
                />
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 font-bold text-paper transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Github size={18} />}
                  Analyze URL
                </button>
              </div>
            </form>

            <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <form className="grid gap-4" onSubmit={(event) => onAnalyze(event, 'zip')}>
              <label className="text-sm font-semibold" htmlFor="projectZip">ZIP project upload</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="projectZip"
                  name="projectZip"
                  type="file"
                  accept=".zip,application/zip"
                  className="min-w-0 flex-1 rounded-md border border-dashed border-line bg-paper px-4 py-3 text-sm"
                />
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss px-5 font-bold text-white transition hover:bg-[#415d44] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <FileArchive size={18} />}
                  Analyze ZIP
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-6 flex gap-3 rounded-md border border-clay/30 bg-clay/10 p-4 text-sm text-clay">
                <ShieldAlert size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            <ProgressTimeline steps={steps} loading={loading} />
          </div>

          <aside className="rounded-lg border border-line bg-[#1f1f1b] p-6 text-paper shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-saffron">MVP scope</p>
            <h2 className="mt-4 text-3xl font-black">From source tree to architecture report.</h2>
            <div className="mt-8 grid gap-4 text-sm text-neutral-200">
              {[
                'Detects stack, folders, APIs, auth, database, config, and deployment signals.',
                'Summarizes priority files before sending compact context to the configured LLM.',
                'Falls back to a mocked report when no API key is present, so the UI stays testable.',
                'Renders Mermaid diagrams and exports a Markdown review.'
              ].map((item) => (
                <div key={item} className="border-l-2 border-saffron pl-4">{item}</div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ProgressTimeline({ steps, loading }) {
  return (
    <div className="mt-6 rounded-lg border border-line bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-700">Analysis Pipeline</h3>
        {loading ? <Loader2 size={17} className="animate-spin text-moss" /> : null}
      </div>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3 text-sm">
            <StepIcon status={step.status} />
            <span className={step.status === 'active' ? 'font-bold text-ink' : 'text-neutral-600'}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={18} className="text-moss" />;
  if (status === 'active') return <Loader2 size={18} className="animate-spin text-saffron" />;
  if (status === 'error') return <XCircle size={18} className="text-clay" />;
  return <Circle size={18} className="text-neutral-400" />;
}
