import {createHash} from 'node:crypto';
import {canonical, snapshot} from '../compare-frontmatter-baseline.mjs';
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const matter = require('gray-matter');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

// Content fixtures stay in memory: no publication, date rewrite or source edit.
describe('content parser and CSS dependency compatibility', () => {
  it('preserves quoted dates, tags, booleans, Unicode and multiline frontmatter', () => {
    const source = `---
title: "Parser: compatibility"
date: '2026-11-06'
tags: [mcp, "café"]
draft: false
description: >-
  First line
  second line
---
# Body
`;
    const {data, content} = matter(source);
    expect(data).toEqual({title: 'Parser: compatibility', date: '2026-11-06', tags: ['mcp', 'café'], draft: false, description: 'First line second line'});
    expect(content).toBe('# Body\n');
  });
  it('parses every existing MDX article without losing its body or title', () => {
    const dir = fileURLToPath(new URL('../../apps/web/content/blog/', import.meta.url));
    const files = readdirSync(dir).filter(f => f.endsWith('.mdx') && !f.startsWith('_'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(`${dir}/${file}`, 'utf8');
      const {data, content} = matter(source);
      expect(typeof data.title, file).toBe('string');
      expect(data.title.length, file).toBeGreaterThan(0);
      expect(content.trim().length, file).toBeGreaterThan(0);
      expect(source.endsWith(content), file).toBe(true);
    }
  });
  it('preserves unquoted YAML dates as Date objects and quoted dates as strings', () => {
    const {data} = matter("---\ndate: 2026-11-06\nquoted: '2026-11-06'\nupdatedAt: 2026-11-06T12:34:56Z\n---\nBody");
    expect(data.date).toBeInstanceOf(Date);
    expect(data.date.toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(data.quoted).toBe('2026-11-06');
    expect(data.updatedAt.toISOString()).toBe('2026-11-06T12:34:56.000Z');
  });
  it('matches the old-parser baseline for unchanged MDX files, including drafts', () => {
    const baseline = JSON.parse(readFileSync(new URL('./fixtures/frontmatter-baseline-3.14.2.json', import.meta.url), 'utf8'));
    const yaml = createRequire(require.resolve('gray-matter'))('js-yaml');
    const current = snapshot(yaml);
    for (const [file, value] of Object.entries(current)) {
      const previous = baseline.files[file];
      if (!previous || previous.sourceSha256 !== value.sourceSha256) {
        console.warn(`[frontmatter baseline] SKIP ${file}: new or edited article; regenerate the old-parser fixture to compare this revision.`);
        continue;
      }
      const hash = value => createHash('sha256').update(value).digest('hex');
      expect({sourceSha256: value.sourceSha256, dataSha256: hash(JSON.stringify(canonical(value.data))), contentSha256: hash(value.content)}, file).toEqual(baseline.files[file]);
    }
  });
  it('rejects malformed YAML rather than silently publishing partial metadata', () => {
    expect(() => matter('---\ntags: [unterminated\n---\nBody')).toThrow();
  });
  it('keeps PostCSS transforms and source-map serialization working', async () => {
    const result = await postcss([autoprefixer({overrideBrowserslist: ['Safari 8']})])
      .process('.fixture { user-select: none; display: flex; }', {from: 'fixture.css', to: 'output.css', map: {inline: false}});
    expect(result.css).toContain('-webkit-user-select');
    expect(result.css).toContain('user-select: none');
    const map = result.map.toJSON();
    expect(map.version).toBe(3);
    expect(map.sources).toEqual(['fixture.css']);
    expect(map.sourcesContent[0]).toContain('.fixture');
  });
});
