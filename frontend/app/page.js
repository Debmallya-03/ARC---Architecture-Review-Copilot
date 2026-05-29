'use client';

import { useEffect, useState } from 'react';
import AnalyzeForm from '../components/AnalyzeForm';
import ReportDashboard from '../components/ReportDashboard';
import { analyzeGithub, analyzeZip, generateReport } from '../lib/api';

const initialSteps = [
  { label: 'Waiting for project input', status: 'idle' },
  { label: 'Scanning repository files', status: 'idle' },
  { label: 'Detecting architecture signals', status: 'idle' },
  { label: 'Generating AI report', status: 'idle' },
  { label: 'Rendering dashboard', status: 'idle' }
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState(initialSteps);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleAnalyze(event, mode) {
    event.preventDefault();
    setError('');
    setLoading(true);
    setSteps(updateStep(initialSteps, 0, 'active'));

    try {
      let analysis;
      if (mode === 'github') {
        const repoUrl = new FormData(event.currentTarget).get('repoUrl');
        setSteps(updateStep(initialSteps, 1, 'active', 0));
        analysis = await analyzeGithub(repoUrl);
      } else {
        const file = new FormData(event.currentTarget).get('projectZip');
        if (!file || !file.name) throw new Error('Choose a ZIP file first.');
        setSteps(updateStep(initialSteps, 1, 'active', 0));
        analysis = await analyzeZip(file);
      }
      setSteps(updateStep(initialSteps, 2, 'active', 0, 1));
      await new Promise((resolve) => setTimeout(resolve, 200));
      setSteps(updateStep(initialSteps, 3, 'active', 0, 1, 2));
      const generated = await generateReport(analysis.repoContext);
      setSteps(updateStep(initialSteps, 4, 'active', 0, 1, 2, 3));
      setReport(generated);
      setSteps(initialSteps);
    } catch (err) {
      setError(err.message || 'Analysis failed');
      setSteps((currentSteps) => markFailed(currentSteps));
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

  return <AnalyzeForm onAnalyze={handleAnalyze} loading={loading} error={error} steps={steps} />;
}

function updateStep(baseSteps, activeIndex, activeStatus, ...doneIndexes) {
  return baseSteps.map((step, index) => {
    if (doneIndexes.includes(index)) return { ...step, status: 'done' };
    if (index === activeIndex) return { ...step, status: activeStatus };
    return { ...step, status: 'idle' };
  });
}

function markFailed(currentSteps) {
  const activeIndex = currentSteps.findIndex((step) => step.status === 'active');
  if (activeIndex < 0) return currentSteps;
  return currentSteps.map((step, index) => index === activeIndex ? { ...step, status: 'error' } : step);
}
