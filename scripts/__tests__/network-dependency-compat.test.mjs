import {expect, it} from 'vitest';
import {createRequire} from 'node:module';
import {once} from 'node:events';
const serverRequire = createRequire(new URL('../../packages/mcp-server/package.json', import.meta.url));
const sdkRequire = createRequire(serverRequire.resolve('@modelcontextprotocol/sdk/server/stdio.js'));
const limiterRequire = createRequire(sdkRequire.resolve('express-rate-limit'));
const {Address4, Address6} = limiterRequire('ip-address');
const webRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const supabaseRequire = createRequire(webRequire.resolve('@supabase/supabase-js'));
const realtimeRequire = createRequire(supabaseRequire.resolve('@supabase/realtime-js'));
const {WebSocket, WebSocketServer} = realtimeRequire('ws');

it('keeps valid IP/subnet parsing and rejects ambiguous IPv4 input', () => {
  expect(new Address4('192.0.2.5').isInSubnet(new Address4('192.0.2.0/24'))).toBe(true);
  expect(() => new Address4('010.0.0.1')).toThrow();
  expect(new Address6('fe90::1').isLinkLocal()).toBe(true);
  expect(new Address6('::1').isInSubnet(new Address4('0.0.0.0/0'))).toBe(false);
});
it('exchanges fragmented messages using Supabase-resolved ws on loopback only', async () => {
  const server = new WebSocketServer({host: '127.0.0.1', port: 0, maxPayload: 1024});
  await once(server, 'listening');
  const client = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
  try {
    const connected = once(server, 'connection');
    await once(client, 'open');
    const [peer] = await connected;
    peer.on('message', (data, binary) => peer.send(data, {binary}));
    const echoed = once(client, 'message');
    client.send('hello ', {fin: false});
    client.send('world', {fin: true});
    const [data] = await echoed;
    expect(data.toString()).toBe('hello world');
  } finally {
    client.terminate();
    for (const peer of server.clients) peer.terminate();
    await new Promise(resolve => server.close(resolve));
  }
});
