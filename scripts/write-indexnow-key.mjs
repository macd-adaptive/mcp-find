// Build-time writer for the IndexNow ownership key file.
// The key must be served at https://mcpfind.org/<key>.txt but never live in
// the repo, so the Vercel build materialises it from the INDEXNOW_KEY env var.
// Without the var, local development and previews skip with a warning.
// Production must fail closed instead of deploying without ownership proof.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.INDEXNOW_KEY;
const publicDir = join(process.cwd(), 'public');

if (!key) {
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_TARGET_ENV === 'production') {
    throw new Error('[indexnow] INDEXNOW_KEY is required for production builds');
  }
  console.warn('[indexnow] INDEXNOW_KEY not set; skipping key file (only needed in production).');
  process.exit(0);
}
if (!/^[0-9a-f]{32}$/.test(key)) {
  throw new Error('[indexnow] INDEXNOW_KEY must be 32 lowercase hex characters');
}
if (!existsSync(publicDir)) throw new Error(`[indexnow] no public dir at ${publicDir}`);
writeFileSync(join(publicDir, `${key}.txt`), key);
console.log('[indexnow] key file written for production verification.');
