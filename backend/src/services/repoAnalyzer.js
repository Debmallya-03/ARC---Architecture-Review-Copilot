import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import simpleGit from 'simple-git';
import { walkProject, summarizeProject } from '../utils/projectScanner.js';

const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

export async function analyzeGithubRepository(repoUrl) {
  if (!repoUrl || !GITHUB_REPO_PATTERN.test(repoUrl.trim())) {
    const error = new Error('Invalid GitHub repository URL');
    error.status = 400;
    error.publicMessage = 'Enter a public GitHub URL like https://github.com/owner/repo';
    throw error;
  }

  const tempDir = await makeTempDir('arc-github-');
  try {
    await simpleGit().clone(repoUrl.trim(), tempDir, ['--depth', '1']);
    return await analyzeDirectory(tempDir, repoUrl.trim());
  } catch (error) {
    error.status = 400;
    error.publicMessage = 'Could not clone this repository. Private repositories are not supported in the MVP.';
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function analyzeZipBuffer(buffer, originalName = 'uploaded-project.zip') {
  const tempDir = await makeTempDir('arc-zip-');
  try {
    const zip = new AdmZip(buffer);
    zip.extractAllTo(tempDir, true);
    return await analyzeDirectory(tempDir, originalName);
  } catch (error) {
    error.status = 400;
    error.publicMessage = 'ZIP extraction failed. Upload a valid project ZIP file.';
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function analyzeDirectory(projectPath, source) {
  const files = await walkProject(projectPath);
  const context = await summarizeProject(projectPath, files, source);
  return {
    repoContext: context,
    warnings: context.warnings
  };
}

async function makeTempDir(prefix) {
  const token = crypto.randomBytes(6).toString('hex');
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}${token}-`));
}
