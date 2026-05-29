const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function analyzeGithub(repoUrl) {
  const response = await fetch(`${API_URL}/api/analyze/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl })
  });
  return parseResponse(response);
}

export async function analyzeZip(file) {
  const form = new FormData();
  form.append('projectZip', file);
  const response = await fetch(`${API_URL}/api/analyze/zip`, {
    method: 'POST',
    body: form
  });
  return parseResponse(response);
}

export async function generateReport(repoContext) {
  const response = await fetch(`${API_URL}/api/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoContext })
  });
  return parseResponse(response);
}
