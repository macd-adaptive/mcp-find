import { describe, it, expect } from 'vitest';
import {
  isPlainGitHubRepoUrl,
  validateEntry,
  validateDocument,
} from '../lib/submission-validation.mjs';

const asciiBoundaryCodes = [...Array.from({ length: 33 }, (_, code) => code), 127];
const placements = [
  ['inside owner', character => `https://github.com/own${character}er/repo`],
  ['inside repository', character => `https://github.com/owner/re${character}po`],
  ['after repository', character => `https://github.com/owner/repo${character}`],
  ['after trailing slash', character => `https://github.com/owner/repo/${character}`],
];
const fixture = github_url => ({
  name: 'Synthetic ASCII boundary fixture',
  github_url,
  package_name: 'synthetic-ascii-fixture',
  description: 'Offline fixture for plain repository URL validation.',
});

// The exported regex checks shape only. Exercise the full predicate and both
// shared entry/document paths so a future caller cannot skip the ASCII gate.
describe('plain repository URL ASCII boundary', () => {
  for (const code of asciiBoundaryCodes) {
    const label = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
    for (const [placement, makeUrl] of placements) {
      it(`rejects ${label} ${placement} through all validation paths`, () => {
        const url = makeUrl(String.fromCodePoint(code));
        expect(isPlainGitHubRepoUrl(url)).toBe(false);
        const entry = fixture(url);
        expect(validateEntry(entry).some(error => error.includes('plain repo URL'))).toBe(true);
        expect(validateDocument('submissions/ascii-fixture.yml', { servers: [entry] })
          .some(error => error.includes('plain repo URL'))).toBe(true);
      });
    }
  }

  for (const value of [undefined, null, 0, false, {}, []]) {
    it(`returns false for non-string input ${JSON.stringify(value)}`, () => {
      expect(isPlainGitHubRepoUrl(value)).toBe(false);
    });
  }

  for (const url of [
    'https://github.com/owner/repo',
    'https://github.com/Owner-Name/repo_name.mcp.git/',
  ]) {
    it(`keeps a valid sibling when a document contains an invalid entry: ${url}`, () => {
      const valid = fixture(url);
      const invalid = fixture(`https://github.com/owner/repo${String.fromCodePoint(127)}`);
      expect(isPlainGitHubRepoUrl(url)).toBe(true);
      expect(validateEntry(valid)).toEqual([]);
      const errors = validateDocument('submissions/ascii-fixture.yml', { servers: [invalid, valid] });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('entry 1');
      expect(errors[0]).toContain('plain repo URL');
    });
  }
});
