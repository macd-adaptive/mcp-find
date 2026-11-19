import { test, expect } from 'vitest';
import { isPlainGitHubRepoUrl, validateEntry, validateDocument } from '../lib/submission-validation.mjs';
const fixture = github_url => ({name:'Synthetic URL fixture',github_url,package_name:'synthetic-fixture',description:'Offline synthetic repository validation fixture.'});
for (const segment of ['.','..','%2e','%2E','.%2e','%2e.','%2e%2e']) {
 for (const url of [`https://github.com/${segment}/repo`,`https://github.com/owner/${segment}`,`https://github.com/owner/${segment}/`]) {
  test(`dot-segment URL is rejected rather than normalized: ${url}`, () => {
   expect(isPlainGitHubRepoUrl(url)).toBe(false);
   expect(validateEntry(fixture(url)).some(e=>e.includes('plain repo URL'))).toBe(true);
   expect(validateDocument('submissions/fixture.yml',{servers:[fixture(url)]})).not.toEqual([]);
  });
 }
}
for (const url of ['https://github.com/owner/repo','https://github.com/Owner-Name/repo_name.mcp.git/','https://github.com/owner/re.po']) {
 test(`ordinary repository URL remains valid: ${url}`,()=>expect(isPlainGitHubRepoUrl(url)).toBe(true));
}
