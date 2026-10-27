#!/usr/bin/env node
// Verify that the narrow inherited baseline cannot hide a new synthetic token.
import { randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const binary = process.argv[2];
if (!binary) throw new Error('Usage: node scripts/check-gitleaks-baseline.mjs /path/to/gitleaks');
const baseline = resolve('.gitleaksignore');
const cwd = mkdtempSync(join(tmpdir(), 'gitleaks-baseline-'));
try {
  execFileSync('git', ['init', '-q'], { cwd });
  copyFileSync(baseline, join(cwd, '.gitleaksignore'));
  // Deliberately synthetic, never issued by GitHub. Assemble to avoid embedding
  // a token-shaped value in this repository or printing it in CI output.
  const token = 'ghp_' + randomBytes(36).toString('hex').slice(0, 36);
  writeFileSync(join(cwd, 'new-secret.txt'), 'github_token=' + token + '\n');
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-qm', 'Synthetic new-secret fixture'], { cwd });
  const result = spawnSync(resolve(binary), ['git', '.', '--log-opts=--all --full-history -m',
    '--ignore-gitleaks-allow', '--redact', '--no-banner'], { cwd, stdio: 'pipe' });
  if (result.error || result.status !== 1) throw new Error('New synthetic token was not rejected by Gitleaks');
  console.log('New synthetic token rejected with inherited baseline present.');
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
