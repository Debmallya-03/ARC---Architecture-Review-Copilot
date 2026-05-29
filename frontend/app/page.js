'use client';

import { useEffect, useState } from 'react';
import AnalyzeForm from '../components/AnalyzeForm';
import ReportDashboard from '../components/ReportDashboard';
import { analyzeGithub, analyzeZip, generateReport } from '../lib/api';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleAnalyze(event, mode) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      let analysis;
      if (mode === 'github') {
        const repoUrl = new FormData(event.currentTarget).get('repoUrl');
        analysis = await analyzeGithub(repoUrl);
      } else {
        const file = new FormData(event.currentTarget).get('projectZip');
        if (!file || !file.name) throw new Error('Choose a ZIP file first.');
        analysis = await analyzeZip(file);
      }
      const generated = await generateReport(analysis.repoContext);
      setReport(generated);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  if (report) {
    return <ReportDashboard report={report} onReset={() => setReport(null)} />;
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-paper px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl border-b border-line pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">Architecture Review Copilot</p>
          <h1 className="mt-2 text-5xl font-black leading-none text-ink sm:text-7xl">ARC</h1>
        </div>
      </main>
    );
  }

  return <AnalyzeForm onAnalyze={handleAnalyze} loading={loading} error={error} />;
}
