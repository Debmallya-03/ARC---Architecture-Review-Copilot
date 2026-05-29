'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';

export default function MermaidDiagram({ title, code }) {
  const diagramId = useMemo(() => `diagram-${Math.random().toString(36).slice(2)}`, []);
  const cleanCode = useMemo(() => sanitizeMermaid(code, title), [code, title]);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        const result = await mermaid.render(diagramId, cleanCode);
        if (active) {
          setSvg(result.svg);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message || 'Diagram could not be rendered. Copy the Mermaid source to inspect it.');
      }
    }
    render();
    return () => {
      active = false;
    };
  }, [cleanCode, diagramId]);

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">{title}</h3>
        <button
          aria-label={`Copy ${title}`}
          title={`Copy ${title}`}
          onClick={() => navigator.clipboard.writeText(cleanCode)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-paper text-ink transition hover:border-moss hover:text-moss"
        >
          <Copy size={17} />
        </button>
      </div>
      {error ? <p className="text-sm text-clay">{error}</p> : <div className="mermaid overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />}
    </article>
  );
}

function sanitizeMermaid(value, title) {
  let clean = String(value || '').trim();
  clean = clean
    .replace(/^```mermaid/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  clean = clean.replace(/-->\|([^|]+)\|>\s*/g, '-->|$1| ');
  clean = clean.replace(/--\|([^|]+)\|>\s*/g, '-->|$1| ');
  clean = clean.replace(/;\s*/g, '\n');

  if (!/^(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram-v2|journey|gantt|pie|mindmap)\b/i.test(clean)) {
    return `flowchart TD\nA[${escapeLabel(title || 'No diagram evidence detected')}]`;
  }

  return clean;
}

function escapeLabel(label) {
  return String(label).replace(/[[\]"]/g, '');
}
