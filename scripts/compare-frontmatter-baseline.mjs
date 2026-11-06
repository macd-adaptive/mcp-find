#!/usr/bin/env node
// Run against an independently downloaded old js-yaml standalone bundle:
// npm pack js-yaml@3.14.2 --ignore-scripts; tar -xzf js-yaml-3.14.2.tgz
// node scripts/compare-frontmatter-baseline.mjs /absolute/path/package/dist/js-yaml.js
// Never install the vulnerable baseline into the workspace dependency tree.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const matter = require('gray-matter');
export function canonical(value) {
  if (value instanceof Date) return {$type: 'Date', value: value.toISOString()};
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function snapshot(parser) {
  const dir = fileURLToPath(new URL('../apps/web/content/blog/', import.meta.url));
  return Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.mdx')).sort().map(file => {
    const source = readFileSync(`${dir}/${file}`, 'utf8');
    // Disable gray-matter's string-only cache when switching engines.
    const parsed = matter(source, {engines: {yaml: text => parser.safeLoad(text)}});
    return [file, {sourceSha256: createHash('sha256').update(source).digest('hex'), data: canonical(parsed.data), content: parsed.content}];
  }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Pass standalone js-yaml 3.14.2 bundle path');
  const baseline = require(process.argv[2]);
  const current = createRequire(require.resolve('gray-matter'))('js-yaml');
  const old = snapshot(baseline), next = snapshot(current);
  if (JSON.stringify(old) !== JSON.stringify(next)) throw new Error('Frontmatter/content differs from old parser');
  console.log(JSON.stringify({baseline: '3.14.2', candidate: '3.15.2', count: Object.keys(old).length, identical: true, files: Object.fromEntries(Object.entries(old).map(([name, value]) => [name, {sourceSha256: value.sourceSha256, dataSha256: createHash('sha256').update(JSON.stringify(value.data)).digest('hex'), contentSha256: createHash('sha256').update(value.content).digest('hex')}]))}, null, 2));
}
