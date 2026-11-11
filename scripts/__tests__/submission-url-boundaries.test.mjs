import {describe,it,expect} from 'vitest';
import {isPlainGitHubRepoUrl,validateEntry,validateDocument} from '../lib/submission-validation.mjs';
const fixture=url=>({name:'Synthetic MCP fixture',github_url:url,package_name:'synthetic-fixture',description:'Synthetic description for offline validation.'});
describe('plain submission repo URL boundaries shared by PR and sync',()=>{
 for(const suffix of ['?tab=readme','#readme','\\sub','\t','\r','\n','\u0000','\u007f',' extra']){
  it(`rejects non-repo suffix ${JSON.stringify(suffix)}`,()=>{
   const url=`https://github.com/owner/repo${suffix}`;
   expect(isPlainGitHubRepoUrl(url)).toBe(false);
   expect(validateEntry(fixture(url)).some(e=>e.includes('plain repo URL'))).toBe(true);
   expect(validateDocument('submissions/fixture.yml',{servers:[fixture(url)]})).not.toEqual([]);
  });
 }
 for(const url of ['https://github.com/own?er/repo','https://github.com/own#er/repo','https://github.com/own\\er/repo','https://github.com/own er/repo']){
  it(`rejects malformed owner ${JSON.stringify(url)}`,()=>expect(validateEntry(fixture(url))).not.toEqual([]));
 }
 for(const url of ['https://github.com/owner/repo','https://github.com/owner/repo/','https://github.com/Owner-Name/repo_name.mcp.git']){
  it(`preserves existing plain repo URL ${url}`,()=>{
   expect(isPlainGitHubRepoUrl(url)).toBe(true);expect(validateEntry(fixture(url))).toEqual([]);
  });
 }
});
