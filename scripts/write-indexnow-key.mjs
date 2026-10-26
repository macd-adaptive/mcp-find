// Build-time writer for the IndexNow ownership key file.
// The key must be served at https://mcpfind.org/<key>.txt but never live in
// the repo, so the Vercel build materialises it from the INDEXNOW_KEY env var.
// Without the var (local dev, PR previews) it skips with a warning: the key
// file is only required on the production deployment.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.INDEXNOW_KEY;
const publicDir = join(process.cwd(), 'public');

if (!key) {
  console.warn('[indexnow] INDEXNOW_KEY not set; skipping key file (only needed in production).');
  process.exit(0);
}
if (!/^[0-9a-f]{32}$/.test(key)) {
  throw new Error('[indexnow] INDEXNOW_KEY must be 32 lowercase hex characters');
}
if (!existsSync(publicDir)) throw new Error(`[indexnow] no public dir at ${publicDir}`);
writeFileSync(join(publicDir, `${key}.txt`), key);
console.log('[indexnow] key file written for production verification.');
