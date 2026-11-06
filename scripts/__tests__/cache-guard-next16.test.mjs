import {expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
it('the cache guard matches one-argument and Next16 two-argument tag calls', () => {
  const source = readFileSync(new URL('../check-cache-invalidation.mjs', import.meta.url), 'utf8');
  const expression = source.match(/const callRe = (\/[^\n]+\/g);/)[1];
  const end = expression.lastIndexOf('/');
  const regex = new RegExp(expression.slice(1,end), expression.slice(end+1));
  const calls = [...`revalidateTag('servers', { expire: 0 }); revalidateTag('servers-listing'); revalidateTag(\`server-\${slug}\`, { expire: 0 });`.matchAll(regex)];
  expect(calls.map(c => c[1])).toEqual(["'servers'", "'servers-listing'", '`server-${slug}`']);
});
